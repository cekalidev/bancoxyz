type Gate<T> = { promise: Promise<T>; open: (value: T) => void };
type WriteOutcome = 'apply' | 'discard';

type FakeState = {
  readFails: boolean;
  writesFail: boolean;
  deletesFail: boolean;
  armedRead: Gate<string | null> | null;
  armedWrite: Gate<WriteOutcome> | null;
};

// Debe coincidir con la clave con la que la app guarda la sesión.
const SESSION_KEY = 'bancoxyz.session';

const values = new Map<string, string>();
const discards = new Set<() => void>();
const state: FakeState = {
  readFails: false,
  writesFail: false,
  deletesFail: false,
  armedRead: null,
  armedWrite: null,
};

function createGate<T>(): Gate<T> {
  let open: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

const getItemAsync = jest.fn(async (key: string): Promise<string | null> => {
  if (state.readFails) {
    state.readFails = false;
    throw new Error('Fallo simulado al leer del almacenamiento seguro');
  }
  const gate = state.armedRead;
  state.armedRead = null;
  if (gate) return gate.promise;
  return values.get(key) ?? null;
});

const setItemAsync = jest.fn(async (key: string, value: string): Promise<void> => {
  const gate = state.armedWrite;
  state.armedWrite = null;
  if (gate && (await gate.promise) === 'discard') return;
  if (state.writesFail) throw new Error('Fallo simulado al escribir en el almacenamiento seguro');
  values.set(key, value);
});

const deleteItemAsync = jest.fn(async (key: string): Promise<void> => {
  if (state.deletesFail) throw new Error('Fallo simulado al borrar del almacenamiento seguro');
  values.delete(key);
});

export const secureStoreModule = { getItemAsync, setItemAsync, deleteItemAsync };

export function seedStoredValue(raw: string, key: string = SESSION_KEY): void {
  values.set(key, raw);
}

export function storedValue(key: string = SESSION_KEY): string | null {
  return values.get(key) ?? null;
}

export function failNextRead(): void {
  state.readFails = true;
}

export function failWrites(): void {
  state.writesFail = true;
}

export function failDeletes(): void {
  state.deletesFail = true;
}

export function holdNextRead(): (raw: string | null) => void {
  const gate = createGate<string | null>();
  state.armedRead = gate;
  discards.add(() => gate.open(null));
  return gate.open;
}

export function holdNextWrite(): () => void {
  const gate = createGate<WriteOutcome>();
  state.armedWrite = gate;
  discards.add(() => gate.open('discard'));
  return () => gate.open('apply');
}

// Primero suelta lo retenido sin tocar el mapa y después lo vacía, para que una
// operación retenida de un test no deje efectos en el siguiente.
export function resetSecureStore(): void {
  discards.forEach((discard) => discard());
  discards.clear();
  state.armedRead = null;
  state.armedWrite = null;
  values.clear();
  state.readFails = false;
  state.writesFail = false;
  state.deletesFail = false;
  [getItemAsync, setItemAsync, deleteItemAsync].forEach((fn) => fn.mockClear());
}
