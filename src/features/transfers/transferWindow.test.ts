import { MINUTE_MS, TRANSFER_WINDOW_MS } from './transferWindow';

describe('ventana de la transferencia', () => {
  it('la ventana de los intentos y del aviso de duplicado dura diez minutos', () => {
    expect(TRANSFER_WINDOW_MS).toBe(10 * 60 * 1000);
  });

  it('un minuto son sesenta mil milisegundos', () => {
    expect(MINUTE_MS).toBe(60000);
  });
});
