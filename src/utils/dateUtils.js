


export function getDataIsoLocal(valor) {
  if (!valor) return null;

  const texto = String(valor).trim();
  if (!texto) return null;

  let data;

  // ISO (vem do Supabase / agoraIso)
  if (texto.includes("T")) {
    const parteData = texto.slice(0, 10); // yyyy-mm-dd
    const [ano, mes, dia] = parteData.split("-");
    data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  }

  // formato BR
  else if (texto.includes("/")) {
    const parteData = texto.split(",")[0].trim();
    const [dia, mes, ano] = parteData.split("/");
    data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  }

  // fallback
  else {
    data = new Date(texto);
  }

  if (!data || Number.isNaN(data.getTime())) return null;

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}