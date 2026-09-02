// src/config/defaultConfig.js

export const DEFAULT_CONFIG = {
  empresa: {
    id: null,
    nome: "K.Chic",
    nomeFantasia: "K.Chic",
    razaoSocial: "",
    cnpjCpf: "",
    email: "",
    telefone: "",
    site: "",
    ativo: true,
  },

  identidade: {
    logoUrl: "",
    logoCompactaUrl: "",
    faviconUrl: "",
  },

  aparencia: {
    corPrimaria: "#DF5E78",
    corSecundaria: "#B94A62",
    corSuave: "#FAE3E8",
    corFundo: "#FFF7F9",
    corPainel: "#FFFFFF",
    corTexto: "#2F2F35",
    corTextoSuave: "#8D727B",
    corBorda: "#F2E3E8",

    tema: "light",
    densidade: "normal",
    sidebarEstilo: "padrao",
    raioBorda: "normal",
  },

  operacao: {
    prefixoPeca: "KC",
    moeda: "BRL",
    locale: "pt-BR",
    timezone: "America/Sao_Paulo",
    formatoData: "DD/MM/YYYY",
  },

  impressao: {
    impressoraPadrao: "termica",

    etiqueta: {
      larguraMm: 37,
      alturaMm: 58,
      mostrarLogo: true,
      mostrarQr: true,
      mostrarPreco: true,
      mostrarCodigo: true,
    },
  },
};

export function criarConfigPadrao() {
  return {
    empresa: {
      ...DEFAULT_CONFIG.empresa,
    },

    identidade: {
      ...DEFAULT_CONFIG.identidade,
    },

    aparencia: {
      ...DEFAULT_CONFIG.aparencia,
    },

    operacao: {
      ...DEFAULT_CONFIG.operacao,
    },

    impressao: {
      ...DEFAULT_CONFIG.impressao,

      etiqueta: {
        ...DEFAULT_CONFIG.impressao.etiqueta,
      },
    },
  };
}

export default DEFAULT_CONFIG;