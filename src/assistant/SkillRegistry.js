export function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function encontrarSkill(mensagem, skills = []) {
  const texto = normalizarTexto(mensagem);

  if (!texto) return null;

  return (
    skills.find((skill) =>
      (skill.aliases || []).some((alias) =>
        texto.includes(normalizarTexto(alias))
      )
    ) || null
  );
}