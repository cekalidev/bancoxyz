export const loginOk = {
  token: 'fake-jwt-token',
  user: { id: 1, name: 'Gabriel Topaz', email: 'gabriel@topaz.com' },
};

export const balanceOk = { currency: 'USD', accountBalance: 1800.0 };

export const transfersOk = [
  {
    value: 1000,
    date: '2024-08-25',
    currency: 'USD',
    payeer: { document: '12019910177', name: 'Ronaldo de Assis Moreira' },
  },
  {
    value: 3500,
    date: '2024-06-12',
    currency: 'USD',
    payeer: { document: '11029920288', name: 'Lionel Andres Messi' },
  },
  {
    value: 2000,
    date: '2024-06-12',
    currency: 'USD',
    payeer: { document: '13039930399', name: 'Federico Valverde' },
  },
];

export const transferListWrapped = {
  message: 'OK: Lista de transferências obtida com sucesso. ',
  transfers: transfersOk,
};

type TransferItemFields = {
  name: string;
  document: string;
  value: number;
  currency: string;
  date: string;
};

export function transferItem(fields: Partial<TransferItemFields> = {}) {
  const {
    name = 'Ronaldo de Assis Moreira',
    document = '12019910177',
    value = 1000,
    currency = 'USD',
    date = '2024-08-25',
  } = fields;
  return { value, date, currency, payeer: { document, name } };
}

export function transferListOf(items: unknown[]) {
  return { message: 'OK: Mensagem do servidor 7', transfers: items };
}

export const transferListEmpty = { direct: [], wrapped: { transfers: [] } };

export const brokenListBodies = {
  'sin nombre del destinatario': transferListOf([
    transferItem(),
    transferItem(),
    { ...transferItem(), payeer: { document: '11029920288' } },
  ]),
  'importe como texto': transferListOf([
    transferItem(),
    transferItem(),
    { ...transferItem(), value: '1000' },
  ]),
  'fecha inexistente': transferListOf([
    transferItem(),
    transferItem(),
    transferItem({ date: '2024-02-30' }),
  ]),
  'moneda en minúsculas': transferListOf([
    transferItem(),
    transferItem(),
    transferItem({ currency: 'usd' }),
  ]),
  'moneda vacía': transferListOf([transferItem(), transferItem(), transferItem({ currency: '' })]),
  'sin transfers ni lista': { message: 'Sem lista' },
};

export const serverMessageBody = { message: 'Erro interno 42', transfers: 'x' };

export const loginUnauthorized = { message: 'Unauthorized: Credenciais inválidas' };

export const sessionUnauthorized = { message: 'Token de autenticação inválido.' };

export function balanceBody(amount: number, currency: string) {
  return { accountBalance: amount, currency };
}

export const transferOk = { status: 'success', message: 'Ok, transferência concluída com sucesso' };

export const transferBodies = {
  empty: {},
  withoutStatus: { message: transferOk.message },
  otherStatus: { status: 'error', message: 'Erro: transferência não concluída' },
};
