import { describe, it, expect } from 'vitest';
import { valorEmReais } from './preco';
describe('preços legados do catálogo', () => {
  it.each([['R$ 1.299,90', 1299.9], ['R$\u00a01,00', 1], ['20.00', 20], [20, 20], ['inválido', 0]])('%s', (entrada, esperado) => {
    expect(valorEmReais(entrada)).toBe(esperado);
  });
});
