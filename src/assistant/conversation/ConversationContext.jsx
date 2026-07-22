/**
 * ConversationContext
 *
 * Modelo padronizado do contexto de uma conversa.
 *
 * Responsabilidades:
 * - criar um contexto vazio;
 * - normalizar os dados recebidos;
 * - atualizar o contexto sem alterar o objeto original;
 * - armazenar domínio, operação, filtros e sugestões;
 * - controlar validade e expiração do contexto;
 * - preparar os dados para armazenamento.
 *
 * Este arquivo NÃO:
 * - interpreta mensagens;
 * - executa consultas;
 * - acessa banco de dados;
 * - gera respostas;
 * - salva dados no localStorage.
 */

export const CONVERSATION_CONTEXT_VERSION = 1;

export const DEFAULT_CONTEXT_EXPIRATION_MS = 30 * 60 * 1000;

export const CONTEXT_DOMAINS = Object.freeze({
  ESTOQUE: "estoque",
  VENDAS: "vendas",
  LIVES: "lives",
  CLIENTES: "clientes",
  EXPEDICAO: "expedicao",
  FINANCEIRO: "financeiro",
  CONHECIMENTO: "conhecimento",
});

export const CONTEXT_SUGGESTIONS = Object.freeze({
  LISTAR_PECAS: "listar_pecas",
  LISTAR_MARCAS: "listar_marcas",
  LISTAR_CATEGORIAS: "listar_categorias",
  MOSTRAR_DETALHES: "mostrar_detalhes",
  CONTINUAR_CONSULTA: "continuar_consulta",
});

const FILTROS_PERMITIDOS = Object.freeze([
  "marca",
  "marcas",

  "categoria",
  "categorias",

  "cor",
  "cores",

  "material",
  "materiais",

  "genero",
  "generos",

  "tamanho",
  "tamanhos",

  "palavrasChave",
  "codigo",
  "cliente",
  "status",
  "liveId",
  "dataInicial",
  "dataFinal",
]);

function gerarIdContexto() {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `contexto-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function agoraIso() {
  return new Date().toISOString();
}

function normalizarTexto(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  const texto = String(valor).trim();

  return texto || null;
}

function normalizarLista(valor) {
  if (!valor) {
    return [];
  }

  const lista = Array.isArray(valor) ? valor : [valor];

  return [
    ...new Set(
      lista
        .map((item) => normalizarTexto(item))
        .filter(Boolean)
    ),
  ];
}

function removerValoresVazios(objeto = {}) {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => {
      if (valor === null || valor === undefined || valor === "") {
        return false;
      }

      if (Array.isArray(valor)) {
        return valor.length > 0;
      }

      return true;
    })
  );
}

/**
 * Normaliza os filtros utilizados pelo Planner e pelo QueryBuilder.
 *
 * Filtros desconhecidos não são mantidos para impedir que dados
 * indevidos sejam propagados pelo contexto.
 */
export function normalizarFiltros(filtros = {}) {
  if (
    !filtros ||
    typeof filtros !== "object" ||
    Array.isArray(filtros)
  ) {
    return {};
  }

  const filtrosNormalizados = {};

  const filtrosMultiplos = new Set([
    "marcas",
    "categorias",
    "cores",
    "materiais",
    "generos",
    "tamanhos",
    "palavrasChave",
  ]);

  FILTROS_PERMITIDOS.forEach((chave) => {
    if (!(chave in filtros)) {
      return;
    }

    const valor = filtros[chave];

    if (filtrosMultiplos.has(chave)) {
      const listaNormalizada = normalizarLista(valor);

      if (listaNormalizada.length > 0) {
        filtrosNormalizados[chave] =
          listaNormalizada;
      }

      return;
    }

    const valorNormalizado =
      normalizarTexto(valor);

    if (valorNormalizado !== null) {
      filtrosNormalizados[chave] =
        valorNormalizado;
    }
  });

  return removerValoresVazios(
    filtrosNormalizados
  );
}

function normalizarSugestao(sugestao) {
  if (!sugestao) {
    return null;
  }

  if (typeof sugestao === "string") {
    return {
      tipo: normalizarTexto(sugestao),
      operacao: null,
      filtros: {},
      metadados: {},
    };
  }

  if (typeof sugestao !== "object") {
    return null;
  }

  const tipo =
    normalizarTexto(sugestao.tipo) ||
    normalizarTexto(sugestao.acao) ||
    normalizarTexto(sugestao.sugestao);

  if (!tipo) {
    return null;
  }

  return {
    tipo,
    operacao: normalizarTexto(sugestao.operacao),
    filtros: normalizarFiltros(sugestao.filtros),
    metadados:
      sugestao.metadados && typeof sugestao.metadados === "object"
        ? { ...sugestao.metadados }
        : {},
  };
}

function normalizarHistorico(historico) {
  if (!Array.isArray(historico)) {
    return [];
  }

  return historico
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      tipo: normalizarTexto(item.tipo) || "evento",
      mensagem: normalizarTexto(item.mensagem),
      dominio: normalizarTexto(item.dominio),
      operacao: normalizarTexto(item.operacao),
      criadoEm: normalizarTexto(item.criadoEm) || agoraIso(),
      metadados:
        item.metadados && typeof item.metadados === "object"
          ? { ...item.metadados }
          : {},
    }))
    .slice(-20);
}

/**
 * Retorna a estrutura padrão de um contexto novo.
 */
export function criarContextoInicial(dados = {}) {
  const criadoEm = normalizarTexto(dados.criadoEm) || agoraIso();
  const atualizadoEm =
    normalizarTexto(dados.atualizadoEm) || criadoEm;

  return {
    versao: CONVERSATION_CONTEXT_VERSION,

    id: normalizarTexto(dados.id) || gerarIdContexto(),

    conversaId:
      normalizarTexto(dados.conversaId) ||
      normalizarTexto(dados.sessionId) ||
      "default",

    usuarioId: normalizarTexto(dados.usuarioId),

    dominio: normalizarTexto(dados.dominio),

    operacao: normalizarTexto(dados.operacao),

    filtros: normalizarFiltros(dados.filtros),

    ultimaSugestao: normalizarSugestao(
      dados.ultimaSugestao || dados.sugestao
    ),

    ultimaPergunta:
      normalizarTexto(dados.ultimaPergunta) ||
      normalizarTexto(dados.pergunta),

    ultimaResposta:
      normalizarTexto(dados.ultimaResposta) ||
      normalizarTexto(dados.resposta),

    ultimoPlano:
      dados.ultimoPlano && typeof dados.ultimoPlano === "object"
        ? { ...dados.ultimoPlano }
        : null,

    ultimoResultado:
      dados.ultimoResultado &&
      typeof dados.ultimoResultado === "object"
        ? { ...dados.ultimoResultado }
        : null,

    historico: normalizarHistorico(dados.historico),

    criadoEm,

    atualizadoEm,

    expiraEm:
      normalizarTexto(dados.expiraEm) ||
      new Date(
        new Date(atualizadoEm).getTime() +
          DEFAULT_CONTEXT_EXPIRATION_MS
      ).toISOString(),

    ativo: dados.ativo !== false,

    metadados:
      dados.metadados && typeof dados.metadados === "object"
        ? { ...dados.metadados }
        : {},
  };
}

/**
 * Atualiza um contexto sem modificar o objeto original.
 */
export function atualizarContexto(
  contextoAtual,
  alteracoes = {},
  opcoes = {}
) {
  const contextoBase = criarContextoInicial(contextoAtual);

  const atualizarExpiracao =
    opcoes.atualizarExpiracao !== false;

  const atualizadoEm = agoraIso();

  const filtros =
    alteracoes.filtros === undefined
      ? contextoBase.filtros
      : opcoes.substituirFiltros
        ? normalizarFiltros(alteracoes.filtros)
        : normalizarFiltros({
            ...contextoBase.filtros,
            ...alteracoes.filtros,
          });

  const proximoContexto = {
    ...contextoBase,
    ...alteracoes,

    id: contextoBase.id,

    conversaId:
      normalizarTexto(alteracoes.conversaId) ||
      contextoBase.conversaId,

    usuarioId:
      alteracoes.usuarioId === undefined
        ? contextoBase.usuarioId
        : normalizarTexto(alteracoes.usuarioId),

    dominio:
      alteracoes.dominio === undefined
        ? contextoBase.dominio
        : normalizarTexto(alteracoes.dominio),

    operacao:
      alteracoes.operacao === undefined
        ? contextoBase.operacao
        : normalizarTexto(alteracoes.operacao),

    filtros,

    ultimaSugestao:
      alteracoes.ultimaSugestao === undefined &&
      alteracoes.sugestao === undefined
        ? contextoBase.ultimaSugestao
        : normalizarSugestao(
            alteracoes.ultimaSugestao || alteracoes.sugestao
          ),

    ultimaPergunta:
      alteracoes.ultimaPergunta === undefined &&
      alteracoes.pergunta === undefined
        ? contextoBase.ultimaPergunta
        : normalizarTexto(
            alteracoes.ultimaPergunta || alteracoes.pergunta
          ),

    ultimaResposta:
      alteracoes.ultimaResposta === undefined &&
      alteracoes.resposta === undefined
        ? contextoBase.ultimaResposta
        : normalizarTexto(
            alteracoes.ultimaResposta || alteracoes.resposta
          ),

    ultimoPlano:
      alteracoes.ultimoPlano === undefined
        ? contextoBase.ultimoPlano
        : alteracoes.ultimoPlano &&
            typeof alteracoes.ultimoPlano === "object"
          ? { ...alteracoes.ultimoPlano }
          : null,

    ultimoResultado:
      alteracoes.ultimoResultado === undefined
        ? contextoBase.ultimoResultado
        : alteracoes.ultimoResultado &&
            typeof alteracoes.ultimoResultado === "object"
          ? { ...alteracoes.ultimoResultado }
          : null,

    historico:
      alteracoes.historico === undefined
        ? contextoBase.historico
        : normalizarHistorico(alteracoes.historico),

    criadoEm: contextoBase.criadoEm,

    atualizadoEm,

    expiraEm: atualizarExpiracao
      ? new Date(
          Date.now() + DEFAULT_CONTEXT_EXPIRATION_MS
        ).toISOString()
      : contextoBase.expiraEm,

    ativo:
      alteracoes.ativo === undefined
        ? contextoBase.ativo
        : Boolean(alteracoes.ativo),

    metadados: {
      ...contextoBase.metadados,
      ...(alteracoes.metadados &&
      typeof alteracoes.metadados === "object"
        ? alteracoes.metadados
        : {}),
    },
  };

  return criarContextoInicial(proximoContexto);
}

/**
 * Remove filtros específicos do contexto.
 */
export function removerFiltrosContexto(
  contextoAtual,
  chaves = []
) {
  const contexto = criarContextoInicial(contextoAtual);
  const chavesParaRemover = Array.isArray(chaves)
    ? chaves
    : [chaves];

  const filtros = { ...contexto.filtros };

  chavesParaRemover.forEach((chave) => {
    delete filtros[chave];
  });

  return atualizarContexto(
    contexto,
    { filtros },
    { substituirFiltros: true }
  );
}

/**
 * Substitui apenas um filtro, preservando os demais.
 *
 * Exemplo:
 * contexto: marca Zara, categoria Vestido, cor Preto
 * alterarFiltroContexto(contexto, "cor", "Branco")
 *
 * Resultado:
 * marca Zara, categoria Vestido, cor Branco
 */
export function alterarFiltroContexto(
  contextoAtual,
  chave,
  valor
) {
  if (!FILTROS_PERMITIDOS.includes(chave)) {
    return criarContextoInicial(contextoAtual);
  }

  if (valor === null || valor === undefined || valor === "") {
    return removerFiltrosContexto(contextoAtual, chave);
  }

  return atualizarContexto(contextoAtual, {
    filtros: {
      [chave]: valor,
    },
  });
}

/**
 * Adiciona um evento resumido ao histórico do contexto.
 *
 * O histórico é limitado aos 20 eventos mais recentes.
 */
export function adicionarEventoContexto(
  contextoAtual,
  evento = {}
) {
  const contexto = criarContextoInicial(contextoAtual);

  const novoEvento = {
    tipo: normalizarTexto(evento.tipo) || "evento",
    mensagem: normalizarTexto(evento.mensagem),
    dominio:
      normalizarTexto(evento.dominio) || contexto.dominio,
    operacao:
      normalizarTexto(evento.operacao) || contexto.operacao,
    criadoEm: agoraIso(),
    metadados:
      evento.metadados && typeof evento.metadados === "object"
        ? { ...evento.metadados }
        : {},
  };

  return atualizarContexto(contexto, {
    historico: [...contexto.historico, novoEvento].slice(-20),
  });
}

/**
 * Verifica se o contexto já expirou.
 */
export function contextoEstaExpirado(contextoAtual) {
  if (!contextoAtual) {
    return true;
  }

  const contexto = criarContextoInicial(contextoAtual);
  const expiraEm = new Date(contexto.expiraEm).getTime();

  if (Number.isNaN(expiraEm)) {
    return true;
  }

  return Date.now() >= expiraEm;
}

/**
 * Verifica se há contexto suficiente para resolver
 * uma continuação de conversa.
 */
export function contextoTemInformacao(contextoAtual) {
  if (!contextoAtual) {
    return false;
  }

  const contexto = criarContextoInicial(contextoAtual);

  return Boolean(
    contexto.dominio ||
      contexto.operacao ||
      Object.keys(contexto.filtros).length > 0 ||
      contexto.ultimaSugestao
  );
}

/**
 * Retorna true quando o contexto pode ser utilizado.
 */
export function contextoEstaValido(contextoAtual) {
  if (!contextoAtual) {
    return false;
  }

  const contexto = criarContextoInicial(contextoAtual);

  return (
    contexto.ativo === true &&
    !contextoEstaExpirado(contexto) &&
    contextoTemInformacao(contexto)
  );
}

/**
 * Limpa o conteúdo conversacional mantendo a identificação
 * da conversa e do usuário.
 */
export function limparContexto(contextoAtual = {}) {
  const contexto = criarContextoInicial(contextoAtual);

  return criarContextoInicial({
    conversaId: contexto.conversaId,
    usuarioId: contexto.usuarioId,
    metadados: contexto.metadados,
  });
}

/**
 * Prepara o contexto para persistência.
 *
 * Faz uma cópia segura, evitando referências compartilhadas.
 */
export function serializarContexto(contextoAtual) {
  const contexto = criarContextoInicial(contextoAtual);

  return JSON.stringify(contexto);
}

/**
 * Converte uma string armazenada novamente em contexto.
 */
export function desserializarContexto(valor) {
  if (!valor) {
    return null;
  }

  try {
    const dados =
      typeof valor === "string" ? JSON.parse(valor) : valor;

    return criarContextoInicial(dados);
  } catch (erro) {
    console.warn(
      "[ConversationContext] Não foi possível recuperar o contexto:",
      erro
    );

    return null;
  }
}

/**
 * Classe auxiliar para facilitar o uso orientado a objeto.
 *
 * O estado continua imutável: cada alteração substitui
 * internamente o contexto por uma nova cópia.
 */
export class ConversationContext {
  constructor(dados = {}) {
    this.state = criarContextoInicial(dados);
  }

  get valor() {
    return criarContextoInicial(this.state);
  }

  atualizar(alteracoes = {}, opcoes = {}) {
    this.state = atualizarContexto(
      this.state,
      alteracoes,
      opcoes
    );

    return this.valor;
  }

  alterarFiltro(chave, valor) {
    this.state = alterarFiltroContexto(
      this.state,
      chave,
      valor
    );

    return this.valor;
  }

  removerFiltros(chaves = []) {
    this.state = removerFiltrosContexto(
      this.state,
      chaves
    );

    return this.valor;
  }

  adicionarEvento(evento = {}) {
    this.state = adicionarEventoContexto(
      this.state,
      evento
    );

    return this.valor;
  }

  limpar() {
    this.state = limparContexto(this.state);

    return this.valor;
  }

  estaExpirado() {
    return contextoEstaExpirado(this.state);
  }

  estaValido() {
    return contextoEstaValido(this.state);
  }

  serializar() {
    return serializarContexto(this.state);
  }

  static desserializar(valor) {
    const contexto = desserializarContexto(valor);

    return contexto
      ? new ConversationContext(contexto)
      : null;
  }
}

export default ConversationContext;