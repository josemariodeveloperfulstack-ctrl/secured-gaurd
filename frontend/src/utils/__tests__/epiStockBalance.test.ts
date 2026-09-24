import {
  buildInsufficientStockMessage,
  findInsufficientStockRows,
  sumActiveStockQuantities,
} from '../epiStockBalance';

const stockItems = [
  { id: 'item-sapato', currentQuantity: 2 },
  { id: 'item-luva', currentQuantity: 0 },
  { id: 'item-capacete', currentQuantity: 10 },
];

describe('sumActiveStockQuantities', () => {
  it('soma as quantidades por item de estoque', () => {
    const totals = sumActiveStockQuantities([
      { stockItemId: 'item-sapato', quantity: 2 },
      { stockItemId: 'item-sapato', quantity: 1 },
      { stockItemId: 'item-luva', quantity: 3 },
    ]);

    expect(totals).toEqual({ 'item-sapato': 3, 'item-luva': 3 });
  });

  it('ignora itens devolvidos/substituídos e sem vínculo de estoque', () => {
    const totals = sumActiveStockQuantities([
      { stockItemId: 'item-sapato', quantity: 2 },
      { stockItemId: 'item-sapato', quantity: 5, returnedDate: '2026-01-10' },
      { stockItemId: 'item-luva', quantity: 4, substitutedDate: '2026-01-11' },
      { quantity: 9 },
    ]);

    expect(totals).toEqual({ 'item-sapato': 2 });
  });
});

describe('findInsufficientStockRows', () => {
  it('acusa quando o pedido passa do saldo disponível', () => {
    const issues = findInsufficientStockRows(
      [{ nome: 'SAPATO', quantidade: '3', stockItemId: 'item-sapato' }],
      stockItems,
    );

    expect(issues).toEqual(['SAPATO (pedido 3, disponível 2)']);
  });

  it('acusa item sem nenhum saldo', () => {
    const issues = findInsufficientStockRows(
      [{ nome: 'LUVA', quantidade: '1', stockItemId: 'item-luva' }],
      stockItems,
    );

    expect(issues).toEqual(['LUVA (pedido 1, disponível 0)']);
  });

  it('não acusa quando o saldo cobre o pedido', () => {
    const issues = findInsufficientStockRows(
      [
        { nome: 'CAPACETE', quantidade: '2', stockItemId: 'item-capacete' },
        { nome: 'SAPATO', quantidade: '2', stockItemId: 'item-sapato' },
      ],
      stockItems,
    );

    expect(issues).toEqual([]);
  });

  it('considera o que a própria ficha já baixou (o backend estorna antes de baixar de novo)', () => {
    // Save feito quando havia saldo: 2 unidades já baixadas por esta ficha e o saldo
    // atual ficou zerado. Ao reenviar, o backend estorna as 2 e baixa de novo: deve passar.
    const alreadyDeducted = { 'item-luva': 2 };
    const rows = [{ nome: 'LUVA', quantidade: '2', stockItemId: 'item-luva' }];

    expect(findInsufficientStockRows(rows, stockItems, alreadyDeducted)).toEqual([]);
    // Mas aumentar para 3 continua bloqueado.
    expect(findInsufficientStockRows([{ ...rows[0], quantidade: '3' }], stockItems, alreadyDeducted))
      .toEqual(['LUVA (pedido 3, disponível 2)']);
  });

  it('não valida itens devolvidos/substituídos nem linhas sem item de estoque', () => {
    const issues = findInsufficientStockRows(
      [
        { nome: 'LUVA', quantidade: '5', stockItemId: 'item-luva', dataDevolucao: '2026-02-01' },
        { nome: 'SAPATO', quantidade: '5', stockItemId: 'item-sapato', dataSubstituicao: '2026-02-02' },
        { nome: 'AVULSO', quantidade: '9', stockItemId: 'none' },
        { nome: 'SEM VINCULO', quantidade: '9' },
      ],
      stockItems,
    );

    expect(issues).toEqual([]);
  });

  it('usa quantidade mínima de 1 quando o campo está vazio', () => {
    const issues = findInsufficientStockRows(
      [{ nome: 'LUVA', quantidade: '', stockItemId: 'item-luva' }],
      stockItems,
    );

    expect(issues).toEqual(['LUVA (pedido 1, disponível 0)']);
  });
});

describe('buildInsufficientStockMessage', () => {
  it('retorna null quando nada falta', () => {
    expect(buildInsufficientStockMessage([])).toBeNull();
  });

  it('monta a mensagem com todos os itens pendentes', () => {
    const message = buildInsufficientStockMessage(['LUVA (pedido 1, disponível 0)']);

    expect(message).toContain('Saldo insuficiente no estoque');
    expect(message).toContain('LUVA (pedido 1, disponível 0)');
  });
});
