// src/utils/cadastroClienteLinks.js

export function gerarLinkCadastroCliente() {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.origin);
  url.searchParams.set("cadastro", "cliente");

  return url.toString();
}

export async function copiarTexto(texto, mensagemSucesso, mensagemErro) {
  try {
    if (!navigator?.clipboard) {
      alert(mensagemErro);
      return false;
    }

    await navigator.clipboard.writeText(texto);
    alert(mensagemSucesso);
    return true;
  } catch (error) {
    console.error(error);
    alert(mensagemErro);
    return false;
  }
}

export async function copiarLinkCadastroCliente() {
  const link = gerarLinkCadastroCliente();

  return copiarTexto(
    link,
    "Link de cadastro copiado com sucesso.",
    "Não foi possível copiar o link."
  );
}

export function gerarMensagemWhatsAppCadastroCliente() {
  const link = gerarLinkCadastroCliente();
  return `Oi! Para agilizar seu atendimento, preencha seu cadastro neste link: ${link}`;
}

export async function copiarMensagemWhatsAppCadastroCliente() {
  const mensagem = gerarMensagemWhatsAppCadastroCliente();

  return copiarTexto(
    mensagem,
    "Mensagem de WhatsApp copiada com sucesso.",
    "Não foi possível copiar a mensagem."
  );
}