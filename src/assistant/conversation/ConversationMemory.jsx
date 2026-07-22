/**
 * ConversationMemory
 *
 * Camada de armazenamento do contexto conversacional.
 *
 * Responsabilidades:
 * - armazenar múltiplas conversas;
 * - manter cache em memória;
 * - persistir no localStorage quando disponível;
 * - recuperar, atualizar e remover contextos;
 * - descartar contextos expirados;
 * - permitir isolamento por conversaId e usuarioId.
 *
 * Este arquivo NÃO:
 * - interpreta mensagens;
 * - decide operações;
 * - executa consultas;
 * - gera respostas.
 */

import {
  criarContextoInicial,
  atualizarContexto,
  limparContexto,
  contextoEstaExpirado,
  serializarContexto,
  desserializarContexto,
} from "./ConversationContext.jsx";

export const CONVERSATION_MEMORY_STORAGE_KEY =
  "kchic:assistant:conversation-memory:v1";

export const DEFAULT_CONVERSATION_ID = "default";

const memoriaInterna = new Map();

function temLocalStorage() {
  try {
    if (
      typeof globalThis === "undefined" ||
      !globalThis.localStorage
    ) {
      return false;
    }

    const chaveTeste = "__kchic_conversation_memory_test__";

    globalThis.localStorage.setItem(chaveTeste, "1");
    globalThis.localStorage.removeItem(chaveTeste);

    return true;
  } catch {
    return false;
  }
}

function normalizarIdentificador(valor, fallback = null) {
  if (valor === null || valor === undefined) {
    return fallback;
  }

  const texto = String(valor).trim();

  return texto || fallback;
}

function gerarChaveMemoria({
  conversaId = DEFAULT_CONVERSATION_ID,
  usuarioId = null,
} = {}) {
  const conversa = normalizarIdentificador(
    conversaId,
    DEFAULT_CONVERSATION_ID
  );

  const usuario = normalizarIdentificador(
    usuarioId,
    "anonimo"
  );

  return `${usuario}::${conversa}`;
}

function contextoParaChave(contexto = {}) {
  return gerarChaveMemoria({
    conversaId: contexto.conversaId,
    usuarioId: contexto.usuarioId,
  });
}

function lerBancoPersistido() {
  if (!temLocalStorage()) {
    return {};
  }

  try {
    const bruto = globalThis.localStorage.getItem(
      CONVERSATION_MEMORY_STORAGE_KEY
    );

    if (!bruto) {
      return {};
    }

    const dados = JSON.parse(bruto);

    if (!dados || typeof dados !== "object") {
      return {};
    }

    return dados;
  } catch (erro) {
    console.warn(
      "[ConversationMemory] Não foi possível ler o armazenamento:",
      erro
    );

    return {};
  }
}

function gravarBancoPersistido(banco = {}) {
  if (!temLocalStorage()) {
    return false;
  }

  try {
    globalThis.localStorage.setItem(
      CONVERSATION_MEMORY_STORAGE_KEY,
      JSON.stringify(banco)
    );

    return true;
  } catch (erro) {
    console.warn(
      "[ConversationMemory] Não foi possível persistir a memória:",
      erro
    );

    return false;
  }
}

function persistirContexto(chave, contexto) {
  if (!temLocalStorage()) {
    return false;
  }

  const banco = lerBancoPersistido();

  banco[chave] = serializarContexto(contexto);

  return gravarBancoPersistido(banco);
}

function removerContextoPersistido(chave) {
  if (!temLocalStorage()) {
    return false;
  }

  const banco = lerBancoPersistido();

  if (!(chave in banco)) {
    return true;
  }

  delete banco[chave];

  return gravarBancoPersistido(banco);
}

function recuperarContextoPersistido(chave) {
  const banco = lerBancoPersistido();
  const valor = banco[chave];

  if (!valor) {
    return null;
  }

  return desserializarContexto(valor);
}

function copiarContexto(contexto) {
  return contexto
    ? criarContextoInicial(contexto)
    : null;
}

export function salvarContexto(
  contextoAtual,
  opcoes = {}
) {
  const contexto = criarContextoInicial(contextoAtual);
  const chave = contextoParaChave(contexto);

  memoriaInterna.set(chave, contexto);

  if (opcoes.persistir !== false) {
    persistirContexto(chave, contexto);
  }

  return copiarContexto(contexto);
}

export function recuperarContexto(
  identificacao = {},
  opcoes = {}
) {
  const chave = gerarChaveMemoria(identificacao);

  let contexto = memoriaInterna.get(chave) || null;

  if (!contexto && opcoes.persistencia !== false) {
    contexto = recuperarContextoPersistido(chave);

    if (contexto) {
      memoriaInterna.set(chave, contexto);
    }
  }

  if (contexto && contextoEstaExpirado(contexto)) {
    removerContexto(identificacao);
    contexto = null;
  }

  if (!contexto && opcoes.criarSeNaoExistir === true) {
    contexto = criarContextoInicial({
      conversaId:
        normalizarIdentificador(
          identificacao.conversaId,
          DEFAULT_CONVERSATION_ID
        ),
      usuarioId: normalizarIdentificador(
        identificacao.usuarioId
      ),
      metadados:
        identificacao.metadados &&
        typeof identificacao.metadados === "object"
          ? { ...identificacao.metadados }
          : {},
    });

    salvarContexto(contexto, {
      persistir: opcoes.persistirNovo !== false,
    });
  }

  return copiarContexto(contexto);
}

export function atualizarMemoria(
  identificacao = {},
  alteracoes = {},
  opcoes = {}
) {
  const contextoAtual =
    recuperarContexto(identificacao, {
      criarSeNaoExistir:
        opcoes.criarSeNaoExistir !== false,
      persistencia: opcoes.persistencia,
      persistirNovo: opcoes.persistir,
    }) ||
    criarContextoInicial({
      conversaId:
        identificacao.conversaId ||
        DEFAULT_CONVERSATION_ID,
      usuarioId: identificacao.usuarioId || null,
    });

  const contextoAtualizado = atualizarContexto(
    contextoAtual,
    alteracoes,
    {
      substituirFiltros:
        opcoes.substituirFiltros === true,
      atualizarExpiracao:
        opcoes.atualizarExpiracao !== false,
    }
  );

  return salvarContexto(contextoAtualizado, {
    persistir: opcoes.persistir !== false,
  });
}

export function removerContexto(
  identificacao = {}
) {
  const chave = gerarChaveMemoria(identificacao);

  memoriaInterna.delete(chave);
  removerContextoPersistido(chave);

  return true;
}

export function resetarContexto(
  identificacao = {},
  opcoes = {}
) {
  const contextoAtual = recuperarContexto(
    identificacao,
    {
      criarSeNaoExistir: true,
      persistencia: opcoes.persistencia,
    }
  );

  const contextoLimpo = limparContexto(contextoAtual);

  return salvarContexto(contextoLimpo, {
    persistir: opcoes.persistir !== false,
  });
}

export function removerContextosExpirados() {
  let removidos = 0;

  const chaves = new Set([
    ...memoriaInterna.keys(),
    ...Object.keys(lerBancoPersistido()),
  ]);

  chaves.forEach((chave) => {
    const contexto =
      memoriaInterna.get(chave) ||
      recuperarContextoPersistido(chave);

    if (!contexto) {
      return;
    }

    if (contextoEstaExpirado(contexto)) {
      memoriaInterna.delete(chave);
      removerContextoPersistido(chave);
      removidos += 1;
    }
  });

  return removidos;
}

export function listarContextos(opcoes = {}) {
  removerContextosExpirados();

  const incluirPersistidos =
    opcoes.incluirPersistidos !== false;

  const contextos = new Map();

  memoriaInterna.forEach((contexto, chave) => {
    contextos.set(chave, contexto);
  });

  if (incluirPersistidos) {
    const banco = lerBancoPersistido();

    Object.entries(banco).forEach(([chave, valor]) => {
      if (contextos.has(chave)) {
        return;
      }

      const contexto = desserializarContexto(valor);

      if (
        contexto &&
        !contextoEstaExpirado(contexto)
      ) {
        contextos.set(chave, contexto);
      }
    });
  }

  return Array.from(contextos.values()).map(
    copiarContexto
  );
}

export function limparTodaMemoria() {
  memoriaInterna.clear();

  if (temLocalStorage()) {
    try {
      globalThis.localStorage.removeItem(
        CONVERSATION_MEMORY_STORAGE_KEY
      );
    } catch (erro) {
      console.warn(
        "[ConversationMemory] Não foi possível limpar o armazenamento:",
        erro
      );
    }
  }

  return true;
}

export function obterEstatisticasMemoria() {
  removerContextosExpirados();

  const persistidos = lerBancoPersistido();

  return {
    cacheAtivo: memoriaInterna.size,
    persistidos: Object.keys(persistidos).length,
    localStorageDisponivel: temLocalStorage(),
    chavePersistencia:
      CONVERSATION_MEMORY_STORAGE_KEY,
  };
}

export function hidratarMemoria() {
  const banco = lerBancoPersistido();
  let carregados = 0;
  let expirados = 0;
  let invalidos = 0;

  Object.entries(banco).forEach(([chave, valor]) => {
    const contexto = desserializarContexto(valor);

    if (!contexto) {
      invalidos += 1;
      removerContextoPersistido(chave);
      return;
    }

    if (contextoEstaExpirado(contexto)) {
      expirados += 1;
      removerContextoPersistido(chave);
      return;
    }

    memoriaInterna.set(chave, contexto);
    carregados += 1;
  });

  return {
    carregados,
    expirados,
    invalidos,
  };
}

export class ConversationMemory {
  constructor(opcoes = {}) {
    this.persistir = opcoes.persistir !== false;

    if (opcoes.hidratar !== false) {
      hidratarMemoria();
    }
  }

  salvar(contexto) {
    return salvarContexto(contexto, {
      persistir: this.persistir,
    });
  }

  recuperar(identificacao = {}, opcoes = {}) {
    return recuperarContexto(identificacao, {
      ...opcoes,
      persistencia: this.persistir,
    });
  }

  atualizar(
    identificacao = {},
    alteracoes = {},
    opcoes = {}
  ) {
    return atualizarMemoria(
      identificacao,
      alteracoes,
      {
        ...opcoes,
        persistir: this.persistir,
        persistencia: this.persistir,
      }
    );
  }

  remover(identificacao = {}) {
    return removerContexto(identificacao);
  }

  resetar(identificacao = {}) {
    return resetarContexto(identificacao, {
      persistir: this.persistir,
      persistencia: this.persistir,
    });
  }

  listar(opcoes = {}) {
    return listarContextos(opcoes);
  }

  limparExpirados() {
    return removerContextosExpirados();
  }

  limparTudo() {
    return limparTodaMemoria();
  }

  estatisticas() {
    return obterEstatisticasMemoria();
  }

  hidratar() {
    return hidratarMemoria();
  }
}

export const conversationMemory =
  new ConversationMemory();

export default conversationMemory;
