export function valorEmReais(valor) {
  const texto = String(valor ?? '').replace(/R\$|\s/g, '');
  const normalizado = texto.includes(',') ? texto.replaceAll('.', '').replace(',', '.') : texto;
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return 0;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}
