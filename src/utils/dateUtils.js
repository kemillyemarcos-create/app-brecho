export function parseDataFlex(valor) {
  if (!valor) return null;

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  const texto = String(valor).trim();
  if (!texto) return null;

  if (texto.includes("T")) {
    const dataIso = new Date(texto);
    return Number.isNaN(dataIso.getTime()) ? null : dataIso;
  }

  const matchBr = texto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (matchBr) {
    const [, dia, mes, ano, hora = "00", minuto = "00", segundo = "00"] = matchBr;

    const dataBr = new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia),
      Number(hora),
      Number(minuto),
      Number(segundo)
    );

    return Number.isNaN(dataBr.getTime()) ? null : dataBr;
  }

  const dataDireta = new Date(texto);
  return Number.isNaN(dataDireta.getTime()) ? null : dataDireta;
}

export function getDataIsoLocal(valor) {
  const data = parseDataFlex(valor);
  if (!data) return null;

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

export function formatarDataHoraBR(valor) {
  const data = parseDataFlex(valor);
  if (!data) return "";

  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatarDataBR(valor) {
  const data = parseDataFlex(valor);
  if (!data) return "";

  return data.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function agoraIso() {
  return new Date().toISOString();
}