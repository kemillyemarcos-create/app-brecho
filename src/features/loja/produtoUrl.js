const ORIGEM_TESTE = "https://loja.example";

function obterEndereco(url) {
  const base =
    typeof window !== "undefined"
      ? window.location.href
      : ORIGEM_TESTE;

  return new URL(url || base, base);
}

export function lerSlugProduto(url) {
  const endereco = obterEndereco(url);
  return (endereco.searchParams.get("produto") || "").trim();
}

export function criarUrlProduto(slug, url) {
  const endereco = obterEndereco(url);

  if (slug) {
    endereco.searchParams.set("produto", slug);
  } else {
    endereco.searchParams.delete("produto");
  }

  return endereco.toString();
}

export function criarLinkCompartilhavelProduto(slug, url) {
  const endereco = obterEndereco(url);

  for (const parametro of [
    "produto",
    "categoria",
    "marca",
    "tamanho",
    "busca",
    "ordem",
  ]) {
    endereco.searchParams.delete(parametro);
  }

  endereco.searchParams.set("produto", slug);

  return endereco.toString();
}
