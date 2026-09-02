import {
  Building2,
  Palette,
  SlidersHorizontal,
  Printer,
  Save,
  RotateCcw,
  Paintbrush,
  PanelLeft,
  ImagePlus,
  Upload,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useConfig } from "../../contexts/ConfigContext";
import { DEFAULT_CONFIG } from "../../config/defaultConfig";
import { supabase } from "../../lib/supabase";

function normalizarHex(valor, fallback) {
  const texto = String(valor || "").trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(texto)) {
    return texto.toUpperCase();
  }

  return fallback;
}

const BUCKET_IDENTIDADE = "identidade-empresas";

const TIPOS_IDENTIDADE = {
  logo: {
    campo: "logoUrl",
    nomeArquivo: "logo",
  },

  logoCompacta: {
    campo: "logoCompactaUrl",
    nomeArquivo: "logo-compacta",
  },

  favicon: {
    campo: "faviconUrl",
    nomeArquivo: "favicon",
  },
};

function obterExtensaoImagem(arquivo) {
  const nome = String(arquivo?.name || "");
  const extensaoNome = nome
    .split(".")
    .pop()
    ?.toLowerCase();

  if (
    extensaoNome &&
    ["png", "jpg", "jpeg", "webp", "svg", "ico"].includes(
      extensaoNome
    )
  ) {
    return extensaoNome === "jpeg"
      ? "jpg"
      : extensaoNome;
  }

  const porMime = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
  };

  return porMime[arquivo?.type] || "png";
}

function normalizarMimeImagem(arquivo) {
  if (
    arquivo?.type === "image/vnd.microsoft.icon"
  ) {
    return "image/x-icon";
  }

  return arquivo?.type || "image/png";
}

function validarImagemIdentidade(arquivo) {
  if (!arquivo) {
    return "Selecione uma imagem.";
  }

  const tiposPermitidos = [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",
  ];

  if (
    arquivo.type &&
    !tiposPermitidos.includes(arquivo.type)
  ) {
    return "Formato não permitido. Use PNG, JPG, WEBP, SVG ou ICO.";
  }

  if (arquivo.size > 5 * 1024 * 1024) {
    return "A imagem deve ter no máximo 5 MB.";
  }

  return "";
}

function extrairCaminhoStorage(url) {
  if (!url) return "";

  const marcador =
    `/storage/v1/object/public/${BUCKET_IDENTIDADE}/`;

  const indice = String(url).indexOf(marcador);

  if (indice === -1) {
    return "";
  }

  const caminho = String(url).slice(
    indice + marcador.length
  );

  try {
    return decodeURIComponent(caminho);
  } catch {
    return caminho;
  }
}

export default function ConfiguracaoSection({
  cores,
}) {
  const {
    config,
    empresa,
    identidade,
    empresaId,
    aparencia,
    operacao,
    impressao,
    carregando,
    salvando,
    erro,
    salvarConfiguracao,
    temaEfetivo,
    sistemaEscuro,
  } = useConfig();

  const [formEmpresa, setFormEmpresa] = useState({
    nome: "",
    nomeFantasia: "",
    razaoSocial: "",
    cnpjCpf: "",
    email: "",
    telefone: "",
    site: "",
  });

  const [formAparencia, setFormAparencia] =
    useState({
      ...DEFAULT_CONFIG.aparencia,
    });

  const [formOperacao, setFormOperacao] =
    useState({
      ...DEFAULT_CONFIG.operacao,
    });

  const [formImpressao, setFormImpressao] =
    useState({
      ...DEFAULT_CONFIG.impressao,
      etiqueta: {
        ...DEFAULT_CONFIG.impressao.etiqueta,
      },
    });

  const [mensagemIdentidade, setMensagemIdentidade] =
    useState("");

  const [erroIdentidade, setErroIdentidade] =
    useState("");

  const [processandoIdentidade, setProcessandoIdentidade] =
    useState("");

  const [mensagemEmpresa, setMensagemEmpresa] =
    useState("");

  const [mensagemAparencia, setMensagemAparencia] =
    useState("");

  const [mensagemOperacao, setMensagemOperacao] =
    useState("");

  const [mensagemImpressao, setMensagemImpressao] =
    useState("");

  const [erroEmpresa, setErroEmpresa] =
    useState("");

  const [erroAparencia, setErroAparencia] =
    useState("");

  const [erroOperacao, setErroOperacao] =
    useState("");

  const [erroImpressao, setErroImpressao] =
    useState("");

  const [
    ajustesAvancadosCores,
    setAjustesAvancadosCores,
  ] = useState(false);

  useEffect(() => {
    setFormEmpresa({
      nome: empresa?.nome || "",
      nomeFantasia: empresa?.nomeFantasia || "",
      razaoSocial: empresa?.razaoSocial || "",
      cnpjCpf: empresa?.cnpjCpf || "",
      email: empresa?.email || "",
      telefone: empresa?.telefone || "",
      site: empresa?.site || "",
    });
  }, [empresa]);

  useEffect(() => {
    setFormAparencia({
      ...DEFAULT_CONFIG.aparencia,
      ...(aparencia || {}),
    });
  }, [aparencia]);

  useEffect(() => {
    setFormOperacao({
      ...DEFAULT_CONFIG.operacao,
      ...(operacao || {}),
    });
  }, [operacao]);

  useEffect(() => {
    setFormImpressao({
      ...DEFAULT_CONFIG.impressao,
      ...(impressao || {}),
      etiqueta: {
        ...DEFAULT_CONFIG.impressao.etiqueta,
        ...(impressao?.etiqueta || {}),
      },
    });
  }, [impressao]);

  const previewAparencia = useMemo(
    () => ({
      corPrimaria: normalizarHex(
        formAparencia.corPrimaria,
        DEFAULT_CONFIG.aparencia.corPrimaria
      ),

      corSecundaria: normalizarHex(
        formAparencia.corSecundaria,
        DEFAULT_CONFIG.aparencia.corSecundaria
      ),

      corSuave: normalizarHex(
        formAparencia.corSuave,
        DEFAULT_CONFIG.aparencia.corSuave
      ),

      corFundo: normalizarHex(
        formAparencia.corFundo,
        DEFAULT_CONFIG.aparencia.corFundo
      ),

      corPainel: normalizarHex(
        formAparencia.corPainel,
        DEFAULT_CONFIG.aparencia.corPainel
      ),

      corTexto: normalizarHex(
        formAparencia.corTexto,
        DEFAULT_CONFIG.aparencia.corTexto
      ),

      corTextoSuave: normalizarHex(
        formAparencia.corTextoSuave,
        DEFAULT_CONFIG.aparencia.corTextoSuave
      ),

      corBorda: normalizarHex(
        formAparencia.corBorda,
        DEFAULT_CONFIG.aparencia.corBorda
      ),

      tema:
        formAparencia.tema ||
        DEFAULT_CONFIG.aparencia.tema,

      densidade:
        formAparencia.densidade ||
        DEFAULT_CONFIG.aparencia.densidade,

      sidebarEstilo:
        formAparencia.sidebarEstilo ||
        DEFAULT_CONFIG.aparencia.sidebarEstilo,

      raioBorda:
        formAparencia.raioBorda ||
        DEFAULT_CONFIG.aparencia.raioBorda,
    }),
    [formAparencia]
  );

  const previewTemaEfetivo =
    previewAparencia.tema === "system"
      ? sistemaEscuro
        ? "dark"
        : "light"
      : previewAparencia.tema === "dark"
        ? "dark"
        : "light";

  const previewEscuro =
    previewTemaEfetivo === "dark";

  const previewCores = useMemo(
    () =>
      previewEscuro
        ? {
            corPrimaria:
              previewAparencia.corPrimaria,
            corSecundaria:
              previewAparencia.corSecundaria,
            corSuave: "#4B2D36",
            corFundo: "#15161A",
            corPainel: "#1D1F24",
            corTexto: "#F3F3F5",
            corTextoSuave: "#B8BAC2",
            corBorda: "#343740",
          }
        : {
            corPrimaria:
              previewAparencia.corPrimaria,
            corSecundaria:
              previewAparencia.corSecundaria,
            corSuave:
              previewAparencia.corSuave,
            corFundo:
              previewAparencia.corFundo,
            corPainel:
              previewAparencia.corPainel,
            corTexto:
              previewAparencia.corTexto,
            corTextoSuave:
              previewAparencia.corTextoSuave,
            corBorda:
              previewAparencia.corBorda,
          },
    [previewAparencia, previewEscuro]
  );

  const fundoControle =
    temaEfetivo === "dark"
      ? "#24262C"
      : cores.fundoPainel;

  const bordaControle =
    temaEfetivo === "dark"
      ? "#3A3D45"
      : cores.borda;

  function atualizarCampoEmpresa(
    campo,
    valor
  ) {
    setFormEmpresa((atual) => ({
      ...atual,
      [campo]: valor,
    }));

    setMensagemEmpresa("");
    setErroEmpresa("");
  }

  function atualizarAparencia(
    campo,
    valor
  ) {
    setFormAparencia((atual) => ({
      ...atual,
      [campo]: valor,
    }));

    setMensagemAparencia("");
    setErroAparencia("");
  }

  function atualizarOperacao(
    campo,
    valor
  ) {
    setFormOperacao((atual) => ({
      ...atual,
      [campo]: valor,
    }));

    setMensagemOperacao("");
    setErroOperacao("");
  }

  function cancelarOperacao() {
    setFormOperacao({
      ...DEFAULT_CONFIG.operacao,
      ...(operacao || {}),
    });

    setMensagemOperacao("");
    setErroOperacao("");
  }

  function atualizarImpressao(
    campo,
    valor
  ) {
    setFormImpressao((atual) => ({
      ...atual,
      [campo]: valor,
    }));

    setMensagemImpressao("");
    setErroImpressao("");
  }

  function atualizarEtiqueta(
    campo,
    valor
  ) {
    setFormImpressao((atual) => ({
      ...atual,
      etiqueta: {
        ...atual.etiqueta,
        [campo]: valor,
      },
    }));

    setMensagemImpressao("");
    setErroImpressao("");
  }

  function cancelarImpressao() {
    setFormImpressao({
      ...DEFAULT_CONFIG.impressao,
      ...(impressao || {}),
      etiqueta: {
        ...DEFAULT_CONFIG.impressao.etiqueta,
        ...(impressao?.etiqueta || {}),
      },
    });

    setMensagemImpressao("");
    setErroImpressao("");
  }

  function cancelarEmpresa() {
    setFormEmpresa({
      nome: empresa?.nome || "",
      nomeFantasia: empresa?.nomeFantasia || "",
      razaoSocial: empresa?.razaoSocial || "",
      cnpjCpf: empresa?.cnpjCpf || "",
      email: empresa?.email || "",
      telefone: empresa?.telefone || "",
      site: empresa?.site || "",
    });

    setMensagemEmpresa("");
    setErroEmpresa("");
  }

  function cancelarAparencia() {
    setFormAparencia({
      ...DEFAULT_CONFIG.aparencia,
      ...(aparencia || {}),
    });

    setMensagemAparencia("");
    setErroAparencia("");
  }

  function restaurarAparenciaPadrao() {
    setFormAparencia({
      ...DEFAULT_CONFIG.aparencia,
    });

    setMensagemAparencia(
      "Padrão K.Chic carregado no preview. Clique em Salvar aparência para confirmar."
    );

    setErroAparencia("");
  }

  async function removerArquivoIdentidadeAntigo(
    urlAnterior
  ) {
    const caminhoAnterior =
      extrairCaminhoStorage(urlAnterior);

    if (!caminhoAnterior) {
      return;
    }

    const { error: erroRemocao } =
      await supabase.storage
        .from(BUCKET_IDENTIDADE)
        .remove([caminhoAnterior]);

    if (erroRemocao) {
      console.warn(
        "Não foi possível remover o arquivo anterior da identidade:",
        erroRemocao
      );
    }
  }

  async function enviarImagemIdentidade(
    tipo,
    arquivo
  ) {
    const definicao = TIPOS_IDENTIDADE[tipo];

    if (!definicao) {
      return;
    }

    const erroValidacao =
      validarImagemIdentidade(arquivo);

    if (erroValidacao) {
      setErroIdentidade(erroValidacao);
      setMensagemIdentidade("");
      return;
    }

    if (!empresaId) {
      setErroIdentidade(
        "Empresa não vinculada ao usuário."
      );
      setMensagemIdentidade("");
      return;
    }

    const extensao =
      obterExtensaoImagem(arquivo);

    const caminhoNovo =
      `${empresaId}/${definicao.nomeArquivo}-${Date.now()}.${extensao}`;

    const urlAnterior =
      identidade?.[definicao.campo] || "";

    try {
      setProcessandoIdentidade(tipo);
      setErroIdentidade("");
      setMensagemIdentidade("");

      const {
        error: erroUpload,
      } = await supabase.storage
        .from(BUCKET_IDENTIDADE)
        .upload(caminhoNovo, arquivo, {
          cacheControl: "3600",
          upsert: false,
          contentType:
            normalizarMimeImagem(arquivo),
        });

      if (erroUpload) {
        throw erroUpload;
      }

      const {
        data: dadosUrl,
      } = supabase.storage
        .from(BUCKET_IDENTIDADE)
        .getPublicUrl(caminhoNovo);

      const novaUrl =
        dadosUrl?.publicUrl || "";

      if (!novaUrl) {
        throw new Error(
          "Não foi possível gerar a URL pública da imagem."
        );
      }

      const novaConfig = {
        ...config,

        identidade: {
          ...config.identidade,
          [definicao.campo]: novaUrl,
        },
      };

      try {
        await salvarConfiguracao(novaConfig);
      } catch (error) {
        await supabase.storage
          .from(BUCKET_IDENTIDADE)
          .remove([caminhoNovo]);

        throw error;
      }

      if (
        urlAnterior &&
        urlAnterior !== novaUrl
      ) {
        await removerArquivoIdentidadeAntigo(
          urlAnterior
        );
      }

      setMensagemIdentidade(
        "Identidade visual atualizada com sucesso."
      );
    } catch (error) {
      console.error(
        "ERRO AO ENVIAR IMAGEM DA IDENTIDADE:",
        error
      );

      setErroIdentidade(
        error?.message ||
          "Não foi possível enviar a imagem."
      );
    } finally {
      setProcessandoIdentidade("");
    }
  }

  async function removerImagemIdentidade(
    tipo
  ) {
    const definicao = TIPOS_IDENTIDADE[tipo];

    if (!definicao) {
      return;
    }

    const urlAnterior =
      identidade?.[definicao.campo] || "";

    if (!urlAnterior) {
      return;
    }

    try {
      setProcessandoIdentidade(tipo);
      setErroIdentidade("");
      setMensagemIdentidade("");

      const novaConfig = {
        ...config,

        identidade: {
          ...config.identidade,
          [definicao.campo]: "",
        },
      };

      await salvarConfiguracao(novaConfig);

      await removerArquivoIdentidadeAntigo(
        urlAnterior
      );

      setMensagemIdentidade(
        "Imagem removida. O sistema voltou a usar o padrão disponível."
      );
    } catch (error) {
      console.error(
        "ERRO AO REMOVER IMAGEM DA IDENTIDADE:",
        error
      );

      setErroIdentidade(
        error?.message ||
          "Não foi possível remover a imagem."
      );
    } finally {
      setProcessandoIdentidade("");
    }
  }

  async function salvarEmpresa() {
    try {
      setMensagemEmpresa("");
      setErroEmpresa("");

      const nome = formEmpresa.nome.trim();

      if (!nome) {
        setErroEmpresa(
          "Informe o nome da empresa."
        );
        return;
      }

      const novaConfig = {
        ...config,

        empresa: {
          ...config.empresa,

          nome,

          nomeFantasia:
            formEmpresa.nomeFantasia.trim(),

          razaoSocial:
            formEmpresa.razaoSocial.trim(),

          cnpjCpf:
            formEmpresa.cnpjCpf.trim(),

          email:
            formEmpresa.email.trim(),

          telefone:
            formEmpresa.telefone.trim(),

          site:
            formEmpresa.site.trim(),
        },
      };

      await salvarConfiguracao(novaConfig);

      setMensagemEmpresa(
        "Dados da empresa salvos com sucesso."
      );
    } catch (error) {
      console.error(
        "ERRO AO SALVAR DADOS DA EMPRESA:",
        error
      );

      setErroEmpresa(
        "Não foi possível salvar os dados da empresa."
      );
    }
  }

  async function salvarOperacao() {
    try {
      setMensagemOperacao("");
      setErroOperacao("");

      const prefixoPeca = String(
        formOperacao.prefixoPeca || ""
      )
        .trim()
        .toUpperCase();

      if (!prefixoPeca) {
        setErroOperacao(
          "Informe o prefixo das peças."
        );
        return;
      }

      if (
        !/^[A-Z0-9]{1,10}$/.test(prefixoPeca)
      ) {
        setErroOperacao(
          "O prefixo deve ter de 1 a 10 caracteres, usando apenas letras e números."
        );
        return;
      }

      const novaConfig = {
        ...config,

        operacao: {
          ...config.operacao,
          prefixoPeca,
          moeda:
            formOperacao.moeda ||
            DEFAULT_CONFIG.operacao.moeda,
          locale:
            formOperacao.locale ||
            DEFAULT_CONFIG.operacao.locale,
          timezone:
            formOperacao.timezone ||
            DEFAULT_CONFIG.operacao.timezone,
          formatoData:
            formOperacao.formatoData ||
            DEFAULT_CONFIG.operacao.formatoData,
        },
      };

      await salvarConfiguracao(novaConfig);

      setMensagemOperacao(
        "Configurações de operação salvas com sucesso."
      );
    } catch (error) {
      console.error(
        "ERRO AO SALVAR OPERAÇÃO:",
        error
      );

      setErroOperacao(
        "Não foi possível salvar as configurações de operação."
      );
    }
  }

  async function salvarImpressao() {
    try {
      setMensagemImpressao("");
      setErroImpressao("");

      const larguraMm = Number(
        formImpressao?.etiqueta?.larguraMm
      );

      const alturaMm = Number(
        formImpressao?.etiqueta?.alturaMm
      );

      if (
        !Number.isFinite(larguraMm) ||
        larguraMm <= 0 ||
        larguraMm > 210
      ) {
        setErroImpressao(
          "Informe uma largura de etiqueta válida entre 1 e 210 mm."
        );
        return;
      }

      if (
        !Number.isFinite(alturaMm) ||
        alturaMm <= 0 ||
        alturaMm > 297
      ) {
        setErroImpressao(
          "Informe uma altura de etiqueta válida entre 1 e 297 mm."
        );
        return;
      }

      const novaConfig = {
        ...config,

        impressao: {
          ...config.impressao,
          impressoraPadrao:
            formImpressao.impressoraPadrao ||
            DEFAULT_CONFIG.impressao.impressoraPadrao,

          etiqueta: {
            ...config.impressao.etiqueta,
            larguraMm,
            alturaMm,
            mostrarLogo:
              formImpressao.etiqueta.mostrarLogo !== false,
            mostrarQr:
              formImpressao.etiqueta.mostrarQr !== false,
            mostrarPreco:
              formImpressao.etiqueta.mostrarPreco !== false,
            mostrarCodigo:
              formImpressao.etiqueta.mostrarCodigo !== false,
          },
        },
      };

      await salvarConfiguracao(novaConfig);

      setMensagemImpressao(
        "Configurações de impressão salvas com sucesso."
      );
    } catch (error) {
      console.error(
        "ERRO AO SALVAR IMPRESSÃO:",
        error
      );

      setErroImpressao(
        "Não foi possível salvar as configurações de impressão."
      );
    }
  }

  async function salvarAparencia() {
    try {
      setMensagemAparencia("");
      setErroAparencia("");

      const camposHex = [
        "corPrimaria",
        "corSecundaria",
        "corSuave",
        "corFundo",
        "corPainel",
        "corTexto",
        "corTextoSuave",
        "corBorda",
      ];

      const campoInvalido =
        camposHex.find((campo) => {
          const valor = String(
            formAparencia[campo] || ""
          ).trim();

          return !/^#[0-9A-Fa-f]{6}$/.test(
            valor
          );
        });

      if (campoInvalido) {
        setErroAparencia(
          "Existe uma cor inválida. Utilize o formato HEX completo, por exemplo #DF5E78."
        );
        return;
      }

      const novaConfig = {
        ...config,

        aparencia: {
          ...config.aparencia,

          corPrimaria:
            previewAparencia.corPrimaria,

          corSecundaria:
            previewAparencia.corSecundaria,

          corSuave:
            previewAparencia.corSuave,

          corFundo:
            previewAparencia.corFundo,

          corPainel:
            previewAparencia.corPainel,

          corTexto:
            previewAparencia.corTexto,

          corTextoSuave:
            previewAparencia.corTextoSuave,

          corBorda:
            previewAparencia.corBorda,

          tema:
            previewAparencia.tema,

          densidade:
            previewAparencia.densidade,

          sidebarEstilo:
            previewAparencia.sidebarEstilo,

          raioBorda:
            previewAparencia.raioBorda,
        },
      };

      await salvarConfiguracao(novaConfig);

      setMensagemAparencia(
        "Aparência salva com sucesso."
      );
    } catch (error) {
      console.error(
        "ERRO AO SALVAR APARÊNCIA:",
        error
      );

      setErroAparencia(
        "Não foi possível salvar a aparência."
      );
    }
  }

  const container = {
    display: "grid",
    gap: 18,
  };

  const cabecalho = {
    display: "grid",
    gap: 6,
    padding: "22px 24px",
    borderRadius: "var(--kc-radius-xl, 20px)",
    border: `1px solid ${cores.borda}`,
    background: cores.fundoPainel,
    boxShadow: cores.sombraLeve,
  };

  const titulo = {
    margin: 0,
    color: cores.texto,
    fontSize: 26,
    fontWeight: 900,
  };

  const subtitulo = {
    margin: 0,
    color: cores.textoSuave,
    fontSize: 14,
    lineHeight: 1.5,
  };

  const painel = {
    display: "grid",
    gap: 18,
    padding: 20,
    borderRadius: "var(--kc-radius-xl, 20px)",
    border: `1px solid ${cores.borda}`,
    background: cores.fundoPainel,
    boxShadow: cores.sombraLeve,
  };

  const painelTopo = {
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const icone = {
    width: 40,
    height: 40,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--kc-radius-md, 12px)",
    background: cores.rosaClaro,
    color: cores.rosaPrincipal,
  };

  const painelTitulo = {
    margin: 0,
    color: cores.texto,
    fontSize: 18,
    fontWeight: 850,
  };

  const descricaoPainel = {
    margin: "3px 0 0",
    color: cores.textoSuave,
    fontSize: 12.5,
    lineHeight: 1.4,
  };

  const gradeFormulario = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  };

  const campo = {
    display: "grid",
    gap: 7,
  };

  const label = {
    color: cores.texto,
    fontSize: 12.5,
    fontWeight: 750,
  };

  const input = {
    width: "100%",
    minHeight: 42,
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: "var(--kc-radius-md, 12px)",
    border: `1px solid ${bordaControle}`,
    background: fundoControle,
    color: cores.texto,
    fontSize: 13.5,
    outline: "none",
  };

  const select = {
    ...input,
    cursor: "pointer",
  };

  const acoes = {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  };

  const botaoSecundario = {
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "9px 14px",
    borderRadius: "var(--kc-radius-md, 12px)",
    border: `1px solid ${cores.borda}`,
    background: cores.fundoPainel,
    color: cores.textoSuave,
    fontSize: 13,
    fontWeight: 750,
    cursor: salvando
      ? "not-allowed"
      : "pointer",
    opacity: salvando ? 0.65 : 1,
  };

  const botaoPrincipal = {
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "9px 16px",
    borderRadius: "var(--kc-radius-md, 12px)",
    border: `1px solid ${cores.rosaPrincipal}`,
    background: cores.rosaPrincipal,
    color: "#fff",
    fontSize: 13,
    fontWeight: 800,
    cursor: salvando
      ? "not-allowed"
      : "pointer",
    opacity: salvando ? 0.7 : 1,
  };

  const avisoErro = {
    padding: "10px 12px",
    borderRadius: "var(--kc-radius-sm, 8px)",
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: 12.5,
    fontWeight: 700,
  };

  const avisoSucesso = {
    padding: "10px 12px",
    borderRadius: "var(--kc-radius-sm, 8px)",
    background: "#f0fdf4",
    color: "#166534",
    fontSize: 12.5,
    fontWeight: 700,
  };

  const gradeAparencia = {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
    gap: 18,
    alignItems: "start",
  };

  const gradeCores = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(205px, 1fr))",
    gap: 12,
  };

  const grupoCor = {
    display: "grid",
    gap: 7,
  };

  const seletorCor = {
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const inputCor = {
    width: 48,
    height: 42,
    padding: 3,
    borderRadius: "var(--kc-radius-sm, 8px)",
    border: `1px solid ${bordaControle}`,
    background: fundoControle,
    cursor: "pointer",
    boxSizing: "border-box",
  };

  const previewRaio =
    previewAparencia.raioBorda ===
    "quadrado"
      ? 6
      : previewAparencia.raioBorda ===
          "suave"
        ? 12
        : previewAparencia.raioBorda ===
            "arredondado"
          ? 24
          : 18;

  const previewPadding =
    previewAparencia.densidade ===
    "compacta"
      ? 12
      : previewAparencia.densidade ===
          "confortavel"
        ? 22
        : 17;

  const preview = {
    overflow: "hidden",
    borderRadius: previewRaio,
    border: `1px solid ${previewCores.corBorda}`,
    background: previewCores.corFundo,
    boxShadow:
      "0 12px 30px rgba(15,23,42,0.08)",
  };

  const previewTopo = {
    padding: previewPadding,
    borderBottom: `1px solid ${previewCores.corBorda}`,
    background: previewCores.corPainel,
  };

  const previewCorpo = {
    display: "grid",
    gridTemplateColumns: "92px 1fr",
    minHeight: 250,
  };

  const previewSidebar = {
    padding: 10,
    borderRight: `1px solid ${previewCores.corBorda}`,

    background:
      previewAparencia.sidebarEstilo ===
      "marca"
        ? previewCores.corPrimaria
        : previewAparencia.sidebarEstilo ===
            "escura"
          ? previewCores.corTexto
          : previewCores.corPainel,
  };

  const previewConteudo = {
    padding: previewPadding,
  };

  const corSidebarTexto =
    previewAparencia.sidebarEstilo ===
      "marca" ||
    previewAparencia.sidebarEstilo ===
      "escura"
      ? "#FFFFFF"
      : previewCores.corTextoSuave;

  const linhaOpcao = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: 42,
    padding: "9px 12px",
    borderRadius: "var(--kc-radius-md, 12px)",
    border: `1px solid ${cores.borda}`,
    background: fundoControle,
  };

  const textoOpcao = {
    color: cores.texto,
    fontSize: 12.5,
    fontWeight: 700,
  };

  const checkbox = {
    width: 18,
    height: 18,
    accentColor: cores.rosaPrincipal,
    cursor: "pointer",
  };

  const gradeIdentidade = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  };

  const cardIdentidade = {
    minWidth: 0,
    display: "grid",
    gap: 12,
    alignContent: "start",
    padding: 14,
    borderRadius:
      "var(--kc-radius-lg, 16px)",
    border: `1px solid ${cores.borda}`,
    background: fundoControle,
  };

  const previewIdentidade = {
    height: 116,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    overflow: "hidden",
    borderRadius:
      "var(--kc-radius-md, 12px)",
    border: `1px dashed ${cores.borda}`,
    background: cores.fundoPainel,
  };

  const imagemIdentidade = {
    display: "block",
    maxWidth: "100%",
    maxHeight: "92px",
    objectFit: "contain",
  };

  const textoIdentidadeVazia = {
    margin: 0,
    color: cores.textoSuave,
    fontSize: 11.5,
    textAlign: "center",
    lineHeight: 1.45,
  };

  const acoesIdentidade = {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  };

  const botaoUpload = {
    ...botaoPrincipal,
    flex: "1 1 130px",
    minHeight: 38,
    padding: "8px 12px",
    fontSize: 12,
  };

  const botaoRemoverIdentidade = {
    ...botaoSecundario,
    flex: "0 0 auto",
    minHeight: 38,
    padding: "8px 11px",
    color: "#b91c1c",
  };

  const campoCor = (
    tituloCor,
    campoConfig
  ) => (
    <label style={grupoCor}>
      <span style={label}>
        {tituloCor}
      </span>

      <div style={seletorCor}>
        <input
          type="color"
          value={normalizarHex(
            formAparencia[campoConfig],
            DEFAULT_CONFIG.aparencia[
              campoConfig
            ]
          )}
          onChange={(event) =>
            atualizarAparencia(
              campoConfig,
              event.target.value.toUpperCase()
            )
          }
          style={inputCor}
        />

        <span
          style={{
            color: cores.textoSuave,
            fontSize: 11.5,
            fontWeight: 650,
          }}
        >
          Clique para escolher
        </span>
      </div>
    </label>
  );

  const cardImagemIdentidade = ({
    tipo,
    titulo,
    descricao,
    url,
    accept,
  }) => {
    const processando =
      processandoIdentidade === tipo;

    const inputId =
      `identidade-${tipo}`;

    return (
      <div style={cardIdentidade}>
        <div>
          <strong
            style={{
              display: "block",
              color: cores.texto,
              fontSize: 13.5,
            }}
          >
            {titulo}
          </strong>

          <span
            style={{
              display: "block",
              marginTop: 3,
              color: cores.textoSuave,
              fontSize: 10.8,
              lineHeight: 1.4,
            }}
          >
            {descricao}
          </span>
        </div>

        <div style={previewIdentidade}>
          {url ? (
            <img
              src={url}
              alt={titulo}
              style={{
                ...imagemIdentidade,
                ...(tipo === "favicon"
                  ? {
                      width: 54,
                      height: 54,
                    }
                  : {}),
              }}
            />
          ) : (
            <p style={textoIdentidadeVazia}>
              Nenhuma imagem personalizada.
              <br />
              O sistema mantém o padrão atual.
            </p>
          )}
        </div>

        <div style={acoesIdentidade}>
          <input
            id={inputId}
            type="file"
            accept={accept}
            style={{
              display: "none",
            }}
            disabled={
              salvando ||
              Boolean(processandoIdentidade)
            }
            onChange={(event) => {
              const arquivo =
                event.target.files?.[0];

              if (arquivo) {
                enviarImagemIdentidade(
                  tipo,
                  arquivo
                );
              }

              event.target.value = "";
            }}
          />

          <label
            htmlFor={inputId}
            style={{
              ...botaoUpload,
              cursor:
                salvando ||
                Boolean(processandoIdentidade)
                  ? "not-allowed"
                  : "pointer",
              opacity:
                salvando ||
                Boolean(processandoIdentidade)
                  ? 0.65
                  : 1,
            }}
          >
            <Upload size={15} />

            {processando
              ? "Enviando..."
              : url
                ? "Trocar imagem"
                : "Enviar imagem"}
          </label>

          {url ? (
            <button
              type="button"
              style={botaoRemoverIdentidade}
              disabled={
                salvando ||
                Boolean(processandoIdentidade)
              }
              onClick={() =>
                removerImagemIdentidade(tipo)
              }
              title={`Remover ${titulo.toLowerCase()}`}
            >
              <Trash2 size={15} />
              Remover
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  if (carregando) {
    return (
      <div style={cabecalho}>
        <h2 style={titulo}>
          Configuração
        </h2>

        <p style={subtitulo}>
          Carregando configurações da
          empresa...
        </p>
      </div>
    );
  }

  return (
    <section style={container}>
      <div style={cabecalho}>
        <h2 style={titulo}>
          Configuração
        </h2>

        <p style={subtitulo}>
          Personalize a identidade,
          aparência e preferências
          operacionais da empresa.
        </p>
      </div>

      <div style={painel}>
        <div style={painelTopo}>
          <div style={icone}>
            <Building2 size={20} />
          </div>

          <div>
            <h3 style={painelTitulo}>
              Dados da empresa
            </h3>

            <p style={descricaoPainel}>
              Informações principais da
              empresa vinculada ao usuário.
            </p>
          </div>
        </div>

        <div style={gradeFormulario}>
          <label style={campo}>
            <span style={label}>
              Nome *
            </span>

            <input
              type="text"
              value={formEmpresa.nome}
              onChange={(event) =>
                atualizarCampoEmpresa(
                  "nome",
                  event.target.value
                )
              }
              style={input}
            />
          </label>

          <label style={campo}>
            <span style={label}>
              Nome fantasia
            </span>

            <input
              type="text"
              value={
                formEmpresa.nomeFantasia
              }
              onChange={(event) =>
                atualizarCampoEmpresa(
                  "nomeFantasia",
                  event.target.value
                )
              }
              style={input}
            />
          </label>

          <label style={campo}>
            <span style={label}>
              Razão social
            </span>

            <input
              type="text"
              value={
                formEmpresa.razaoSocial
              }
              onChange={(event) =>
                atualizarCampoEmpresa(
                  "razaoSocial",
                  event.target.value
                )
              }
              style={input}
            />
          </label>

          <label style={campo}>
            <span style={label}>
              CNPJ / CPF
            </span>

            <input
              type="text"
              value={formEmpresa.cnpjCpf}
              onChange={(event) =>
                atualizarCampoEmpresa(
                  "cnpjCpf",
                  event.target.value
                )
              }
              style={input}
            />
          </label>

          <label style={campo}>
            <span style={label}>
              E-mail
            </span>

            <input
              type="email"
              value={formEmpresa.email}
              onChange={(event) =>
                atualizarCampoEmpresa(
                  "email",
                  event.target.value
                )
              }
              style={input}
            />
          </label>

          <label style={campo}>
            <span style={label}>
              Telefone
            </span>

            <input
              type="text"
              value={
                formEmpresa.telefone
              }
              onChange={(event) =>
                atualizarCampoEmpresa(
                  "telefone",
                  event.target.value
                )
              }
              style={input}
            />
          </label>

          <label style={campo}>
            <span style={label}>
              Site
            </span>

            <input
              type="text"
              value={formEmpresa.site}
              onChange={(event) =>
                atualizarCampoEmpresa(
                  "site",
                  event.target.value
                )
              }
              style={input}
            />
          </label>
        </div>

        {erro || erroEmpresa ? (
          <div style={avisoErro}>
            {erroEmpresa || erro}
          </div>
        ) : null}

        {mensagemEmpresa ? (
          <div style={avisoSucesso}>
            {mensagemEmpresa}
          </div>
        ) : null}

        <div style={acoes}>
          <button
            type="button"
            style={botaoSecundario}
            onClick={cancelarEmpresa}
            disabled={salvando}
          >
            <RotateCcw size={16} />
            Cancelar alterações
          </button>

          <button
            type="button"
            style={botaoPrincipal}
            onClick={salvarEmpresa}
            disabled={salvando}
          >
            <Save size={16} />

            {salvando
              ? "Salvando..."
              : "Salvar alterações"}
          </button>
        </div>
      </div>

      <div style={painel}>
        <div style={painelTopo}>
          <div style={icone}>
            <ImagePlus size={20} />
          </div>

          <div>
            <h3 style={painelTitulo}>
              Identidade visual
            </h3>

            <p style={descricaoPainel}>
              Personalize as imagens da empresa.
              Os arquivos são armazenados com
              isolamento por empresa.
            </p>
          </div>
        </div>

        <div style={gradeIdentidade}>
          {cardImagemIdentidade({
            tipo: "logo",
            titulo: "Logo principal",
            descricao:
              "Usada como identidade principal do ERP.",
            url:
              identidade?.logoUrl || "",
            accept:
              "image/png,image/jpeg,image/webp,image/svg+xml",
          })}

          {cardImagemIdentidade({
            tipo: "logoCompacta",
            titulo: "Logo compacta",
            descricao:
              "Versão reduzida para espaços menores.",
            url:
              identidade?.logoCompactaUrl || "",
            accept:
              "image/png,image/jpeg,image/webp,image/svg+xml",
          })}

          {cardImagemIdentidade({
            tipo: "favicon",
            titulo: "Favicon",
            descricao:
              "Ícone exibido na aba do navegador.",
            url:
              identidade?.faviconUrl || "",
            accept:
              ".ico,image/x-icon,image/vnd.microsoft.icon,image/png,image/webp",
          })}
        </div>

        <div
          style={{
            padding: "10px 12px",
            borderRadius:
              "var(--kc-radius-sm, 8px)",
            border: `1px solid ${cores.borda}`,
            background: cores.rosaClaro,
            color: cores.textoSuave,
            fontSize: 11.5,
            lineHeight: 1.45,
          }}
        >
          PNG ou WEBP são os formatos
          recomendados. O limite por arquivo é
          de 5 MB. Ao trocar uma imagem, a
          anterior é removida do armazenamento.
        </div>

        {erroIdentidade ? (
          <div style={avisoErro}>
            {erroIdentidade}
          </div>
        ) : null}

        {mensagemIdentidade ? (
          <div style={avisoSucesso}>
            {mensagemIdentidade}
          </div>
        ) : null}
      </div>

      <div style={painel}>
        <div style={painelTopo}>
          <div style={icone}>
            <Palette size={20} />
          </div>

          <div>
            <h3 style={painelTitulo}>
              Aparência
            </h3>

            <p style={descricaoPainel}>
              Defina as cores, o tema e o
              estilo visual da empresa. Use o
              preview para conferir as
              alterações antes de salvar.
            </p>
          </div>
        </div>

        <div style={gradeAparencia}>
          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Paintbrush
                  size={17}
                  color={
                    cores.rosaPrincipal
                  }
                />

                <strong
                  style={{
                    color: cores.texto,
                    fontSize: 14,
                  }}
                >
                  Paleta de cores
                </strong>
              </div>

              <div style={gradeCores}>
                {campoCor(
                  "Cor principal",
                  "corPrimaria"
                )}

                {campoCor(
                  "Cor secundária",
                  "corSecundaria"
                )}

                {campoCor(
                  "Cor suave",
                  "corSuave"
                )}

                {campoCor(
                  "Fundo do sistema",
                  "corFundo"
                )}

                {campoCor(
                  "Fundo dos painéis",
                  "corPainel"
                )}

                {campoCor(
                  "Texto principal",
                  "corTexto"
                )}

                {campoCor(
                  "Texto secundário",
                  "corTextoSuave"
                )}

                {campoCor(
                  "Bordas",
                  "corBorda"
                )}
              </div>

              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: `1px solid ${cores.borda}`,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setAjustesAvancadosCores(
                      (atual) => !atual
                    )
                  }
                  style={{
                    ...botaoSecundario,
                    minHeight: 36,
                    padding: "7px 11px",
                    fontSize: 12,
                  }}
                >
                  {ajustesAvancadosCores
                    ? "Ocultar ajustes avançados"
                    : "Ajustes avançados"}
                </button>

                {ajustesAvancadosCores ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      marginTop: 14,
                      padding: 14,
                      borderRadius:
                        "var(--kc-radius-lg, 16px)",
                      border: `1px solid ${cores.borda}`,
                      background: fundoControle,
                    }}
                  >
                    <div>
                      <strong
                        style={{
                          display: "block",
                          color: cores.texto,
                          fontSize: 13,
                        }}
                      >
                        Valores HEX
                      </strong>

                      <span
                        style={{
                          display: "block",
                          marginTop: 3,
                          color: cores.textoSuave,
                          fontSize: 10.8,
                          lineHeight: 1.4,
                        }}
                      >
                        Use estes campos somente quando
                        precisar informar uma cor exata.
                      </span>
                    </div>

                    <div style={gradeCores}>
                      {[
                        [
                          "Cor principal",
                          "corPrimaria",
                        ],
                        [
                          "Cor secundária",
                          "corSecundaria",
                        ],
                        [
                          "Cor suave",
                          "corSuave",
                        ],
                        [
                          "Fundo do sistema",
                          "corFundo",
                        ],
                        [
                          "Fundo dos painéis",
                          "corPainel",
                        ],
                        [
                          "Texto principal",
                          "corTexto",
                        ],
                        [
                          "Texto secundário",
                          "corTextoSuave",
                        ],
                        [
                          "Bordas",
                          "corBorda",
                        ],
                      ].map(
                        ([
                          tituloCor,
                          campoConfig,
                        ]) => (
                          <label
                            key={campoConfig}
                            style={campo}
                          >
                            <span style={label}>
                              {tituloCor}
                            </span>

                            <input
                              type="text"
                              value={
                                formAparencia[
                                  campoConfig
                                ] || ""
                              }
                              maxLength={7}
                              onChange={(event) =>
                                atualizarAparencia(
                                  campoConfig,
                                  event.target.value.toUpperCase()
                                )
                              }
                              style={input}
                              placeholder="#000000"
                            />
                          </label>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <PanelLeft
                  size={17}
                  color={
                    cores.rosaPrincipal
                  }
                />

                <strong
                  style={{
                    color: cores.texto,
                    fontSize: 14,
                  }}
                >
                  Estilo da interface
                </strong>
              </div>

              <div style={gradeFormulario}>
                <label style={campo}>
                  <span style={label}>
                    Tema
                  </span>

                  <select
                    value={
                      formAparencia.tema
                    }
                    onChange={(event) =>
                      atualizarAparencia(
                        "tema",
                        event.target.value
                      )
                    }
                    style={select}
                  >
                    <option value="light">
                      Claro
                    </option>

                    <option value="dark">
                      Escuro
                    </option>

                    <option value="system">
                      Sistema
                    </option>
                  </select>
                </label>

                <label style={campo}>
                  <span style={label}>
                    Densidade
                  </span>

                  <select
                    value={
                      formAparencia.densidade
                    }
                    onChange={(event) =>
                      atualizarAparencia(
                        "densidade",
                        event.target.value
                      )
                    }
                    style={select}
                  >
                    <option value="compacta">
                      Compacta
                    </option>

                    <option value="normal">
                      Normal
                    </option>

                    <option value="confortavel">
                      Confortável
                    </option>
                  </select>
                </label>

                <label style={campo}>
                  <span style={label}>
                    Estilo da sidebar
                  </span>

                  <select
                    value={
                      formAparencia.sidebarEstilo
                    }
                    onChange={(event) =>
                      atualizarAparencia(
                        "sidebarEstilo",
                        event.target.value
                      )
                    }
                    style={select}
                  >
                    <option value="padrao">
                      Padrão
                    </option>

                    <option value="marca">
                      Cor da marca
                    </option>

                    <option value="escura">
                      Escura
                    </option>
                  </select>
                </label>

                <label style={campo}>
                  <span style={label}>
                    Arredondamento
                  </span>

                  <select
                    value={
                      formAparencia.raioBorda
                    }
                    onChange={(event) =>
                      atualizarAparencia(
                        "raioBorda",
                        event.target.value
                      )
                    }
                    style={select}
                  >
                    <option value="quadrado">
                      Discreto
                    </option>

                    <option value="suave">
                      Suave
                    </option>

                    <option value="normal">
                      Padrão
                    </option>

                    <option value="arredondado">
                      Arredondado
                    </option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              position: "sticky",
              top: 16,
            }}
          >
            <span style={label}>
              Pré-visualização
            </span>

            <div style={preview}>
              <div style={previewTopo}>
                <strong
                  style={{
                    display: "block",
                    color:
                      previewCores.corPrimaria,
                    fontSize: 15,
                  }}
                >
                  {empresa?.nomeFantasia ||
                    empresa?.nome ||
                    "Minha empresa"}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 3,
                    color:
                      previewCores.corTextoSuave,
                    fontSize: 10.5,
                  }}
                >
                  Painel de gestão
                </span>
              </div>

              <div style={previewCorpo}>
                <div
                  style={previewSidebar}
                >
                  {[
                    "Cadastro",
                    "Estoque",
                    "Vendas",
                    "Lives",
                  ].map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={item}
                        style={{
                          marginBottom: 6,
                          padding:
                            previewAparencia.densidade ===
                            "compacta"
                              ? "6px"
                              : "8px",
                          borderRadius:
                            Math.min(
                              previewRaio,
                              10
                            ),
                          background:
                            index === 0
                              ? previewCores.corSuave
                              : "transparent",
                          color:
                            index === 0 &&
                            previewAparencia.sidebarEstilo ===
                              "padrao"
                              ? previewCores.corPrimaria
                              : corSidebarTexto,
                          fontSize: 9.5,
                          fontWeight:
                            index === 0
                              ? 800
                              : 650,
                        }}
                      >
                        {item}
                      </div>
                    )
                  )}
                </div>

                <div
                  style={previewConteudo}
                >
                  <div
                    style={{
                      padding:
                        previewPadding,
                      borderRadius:
                        previewRaio,
                      border: `1px solid ${previewCores.corBorda}`,
                      background:
                        previewCores.corPainel,
                    }}
                  >
                    <strong
                      style={{
                        display:
                          "block",
                        color:
                          previewCores.corTexto,
                        fontSize: 13,
                      }}
                    >
                      Cadastro de peças
                    </strong>

                    <span
                      style={{
                        display:
                          "block",
                        marginTop: 4,
                        color:
                          previewCores.corTextoSuave,
                        fontSize: 9.5,
                      }}
                    >
                      Exemplo de painel
                      usando a paleta
                      selecionada.
                    </span>

                    <div
                      style={{
                        height: 30,
                        marginTop: 12,
                        borderRadius:
                          Math.min(
                            previewRaio,
                            10
                          ),
                        border: `1px solid ${previewCores.corBorda}`,
                        background:
                          previewCores.corFundo,
                      }}
                    />

                    <button
                      type="button"
                      style={{
                        width: "100%",
                        minHeight: 30,
                        marginTop: 9,
                        border: "none",
                        borderRadius:
                          Math.min(
                            previewRaio,
                            10
                          ),
                        background:
                          previewCores.corPrimaria,
                        color: "#fff",
                        fontSize: 9.5,
                        fontWeight: 800,
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <span
              style={{
                color:
                  cores.textoSuave,
                fontSize: 10.5,
                lineHeight: 1.4,
              }}
            >
              O preview mostra as alterações
              antes de salvar. A interface
              principal é atualizada depois
              que a configuração é salva.
            </span>
          </div>
        </div>

        {erroAparencia ? (
          <div style={avisoErro}>
            {erroAparencia}
          </div>
        ) : null}

        {mensagemAparencia ? (
          <div style={avisoSucesso}>
            {mensagemAparencia}
          </div>
        ) : null}

        <div style={acoes}>
          <button
            type="button"
            style={botaoSecundario}
            onClick={
              restaurarAparenciaPadrao
            }
            disabled={salvando}
          >
            <RotateCcw size={16} />
            Restaurar padrão K.Chic
          </button>

          <button
            type="button"
            style={botaoSecundario}
            onClick={cancelarAparencia}
            disabled={salvando}
          >
            Cancelar alterações
          </button>

          <button
            type="button"
            style={botaoPrincipal}
            onClick={salvarAparencia}
            disabled={salvando}
          >
            <Save size={16} />

            {salvando
              ? "Salvando..."
              : "Salvar aparência"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
        }}
      >
        <div style={painel}>
          <div style={painelTopo}>
            <div style={icone}>
              <SlidersHorizontal
                size={20}
              />
            </div>

            <div>
              <h3 style={painelTitulo}>
                Operação
              </h3>

              <p style={descricaoPainel}>
                Preferências usadas na
                identificação e formatação
                dos dados da empresa.
              </p>
            </div>
          </div>

          <div style={gradeFormulario}>
            <label style={campo}>
              <span style={label}>
                Prefixo das peças
              </span>

              <input
                type="text"
                value={
                  formOperacao.prefixoPeca || ""
                }
                maxLength={10}
                onChange={(event) =>
                  atualizarOperacao(
                    "prefixoPeca",
                    event.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                  )
                }
                style={input}
                placeholder="KC"
              />
            </label>

            <label style={campo}>
              <span style={label}>
                Moeda
              </span>

              <select
                value={formOperacao.moeda}
                onChange={(event) =>
                  atualizarOperacao(
                    "moeda",
                    event.target.value
                  )
                }
                style={select}
              >
                <option value="BRL">
                  Real brasileiro (BRL)
                </option>
                <option value="USD">
                  Dólar americano (USD)
                </option>
                <option value="EUR">
                  Euro (EUR)
                </option>
                <option value="CLP">
                  Peso chileno (CLP)
                </option>
              </select>
            </label>

            <label style={campo}>
              <span style={label}>
                Idioma e região
              </span>

              <select
                value={formOperacao.locale}
                onChange={(event) =>
                  atualizarOperacao(
                    "locale",
                    event.target.value
                  )
                }
                style={select}
              >
                <option value="pt-BR">
                  Português (Brasil)
                </option>
                <option value="es-CL">
                  Español (Chile)
                </option>
                <option value="en-US">
                  English (United States)
                </option>
              </select>
            </label>

            <label style={campo}>
              <span style={label}>
                Fuso horário
              </span>

              <select
                value={formOperacao.timezone}
                onChange={(event) =>
                  atualizarOperacao(
                    "timezone",
                    event.target.value
                  )
                }
                style={select}
              >
                <option value="America/Sao_Paulo">
                  Brasília / São Paulo
                </option>
                <option value="America/Santiago">
                  Santiago
                </option>
                <option value="UTC">
                  UTC
                </option>
              </select>
            </label>

            <label style={campo}>
              <span style={label}>
                Formato de data
              </span>

              <select
                value={formOperacao.formatoData}
                onChange={(event) =>
                  atualizarOperacao(
                    "formatoData",
                    event.target.value
                  )
                }
                style={select}
              >
                <option value="DD/MM/YYYY">
                  DD/MM/AAAA
                </option>
                <option value="MM/DD/YYYY">
                  MM/DD/AAAA
                </option>
                <option value="YYYY-MM-DD">
                  AAAA-MM-DD
                </option>
              </select>
            </label>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius:
                "var(--kc-radius-sm, 8px)",
              border: `1px solid ${cores.borda}`,
              background: cores.rosaClaro,
              color: cores.textoSuave,
              fontSize: 11.5,
              lineHeight: 1.45,
            }}
          >
            Alterar o prefixo aqui salva a
            preferência da empresa. A geração
            dos códigos das novas peças será
            conectada a esta configuração em
            uma etapa própria, sem alterar os
            códigos já existentes.
          </div>

          {erroOperacao ? (
            <div style={avisoErro}>
              {erroOperacao}
            </div>
          ) : null}

          {mensagemOperacao ? (
            <div style={avisoSucesso}>
              {mensagemOperacao}
            </div>
          ) : null}

          <div style={acoes}>
            <button
              type="button"
              style={botaoSecundario}
              onClick={cancelarOperacao}
              disabled={salvando}
            >
              <RotateCcw size={16} />
              Cancelar alterações
            </button>

            <button
              type="button"
              style={botaoPrincipal}
              onClick={salvarOperacao}
              disabled={salvando}
            >
              <Save size={16} />

              {salvando
                ? "Salvando..."
                : "Salvar operação"}
            </button>
          </div>
        </div>

        <div style={painel}>
          <div style={painelTopo}>
            <div style={icone}>
              <Printer size={20} />
            </div>

            <div>
              <h3 style={painelTitulo}>
                Impressão
              </h3>

              <p style={descricaoPainel}>
                Defina o formato padrão e o
                conteúdo das etiquetas da
                empresa.
              </p>
            </div>
          </div>

          <div style={gradeFormulario}>
            <label style={campo}>
              <span style={label}>
                Impressão padrão
              </span>

              <select
                value={
                  formImpressao.impressoraPadrao
                }
                onChange={(event) =>
                  atualizarImpressao(
                    "impressoraPadrao",
                    event.target.value
                  )
                }
                style={select}
              >
                <option value="termica">
                  Térmica individual
                </option>

                <option value="a4">
                  A4 — grade com 25 etiquetas
                </option>
              </select>
            </label>

            <label style={campo}>
              <span style={label}>
                Largura da etiqueta (mm)
              </span>

              <input
                type="number"
                min="1"
                max="210"
                step="1"
                value={
                  formImpressao.etiqueta
                    .larguraMm
                }
                onChange={(event) =>
                  atualizarEtiqueta(
                    "larguraMm",
                    event.target.value
                  )
                }
                style={input}
              />
            </label>

            <label style={campo}>
              <span style={label}>
                Altura da etiqueta (mm)
              </span>

              <input
                type="number"
                min="1"
                max="297"
                step="1"
                value={
                  formImpressao.etiqueta
                    .alturaMm
                }
                onChange={(event) =>
                  atualizarEtiqueta(
                    "alturaMm",
                    event.target.value
                  )
                }
                style={input}
              />
            </label>
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            <span style={label}>
              Conteúdo da etiqueta
            </span>

            <label style={linhaOpcao}>
              <span style={textoOpcao}>
                Mostrar logo
              </span>

              <input
                type="checkbox"
                checked={
                  formImpressao.etiqueta
                    .mostrarLogo !== false
                }
                onChange={(event) =>
                  atualizarEtiqueta(
                    "mostrarLogo",
                    event.target.checked
                  )
                }
                style={checkbox}
              />
            </label>

            <label style={linhaOpcao}>
              <span style={textoOpcao}>
                Mostrar QR Code
              </span>

              <input
                type="checkbox"
                checked={
                  formImpressao.etiqueta
                    .mostrarQr !== false
                }
                onChange={(event) =>
                  atualizarEtiqueta(
                    "mostrarQr",
                    event.target.checked
                  )
                }
                style={checkbox}
              />
            </label>

            <label style={linhaOpcao}>
              <span style={textoOpcao}>
                Mostrar preço
              </span>

              <input
                type="checkbox"
                checked={
                  formImpressao.etiqueta
                    .mostrarPreco !== false
                }
                onChange={(event) =>
                  atualizarEtiqueta(
                    "mostrarPreco",
                    event.target.checked
                  )
                }
                style={checkbox}
              />
            </label>

            <label style={linhaOpcao}>
              <span style={textoOpcao}>
                Mostrar código da peça
              </span>

              <input
                type="checkbox"
                checked={
                  formImpressao.etiqueta
                    .mostrarCodigo !== false
                }
                onChange={(event) =>
                  atualizarEtiqueta(
                    "mostrarCodigo",
                    event.target.checked
                  )
                }
                style={checkbox}
              />
            </label>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius:
                "var(--kc-radius-sm, 8px)",
              border: `1px solid ${cores.borda}`,
              background: cores.rosaClaro,
              color: cores.textoSuave,
              fontSize: 11.5,
              lineHeight: 1.45,
            }}
          >
            A configuração define a preferência
            da empresa. A impressão térmica
            individual e a grade A4 com 25
            etiquetas continuarão preservando
            seus layouts próprios.
          </div>

          {erroImpressao ? (
            <div style={avisoErro}>
              {erroImpressao}
            </div>
          ) : null}

          {mensagemImpressao ? (
            <div style={avisoSucesso}>
              {mensagemImpressao}
            </div>
          ) : null}

          <div style={acoes}>
            <button
              type="button"
              style={botaoSecundario}
              onClick={cancelarImpressao}
              disabled={salvando}
            >
              <RotateCcw size={16} />
              Cancelar alterações
            </button>

            <button
              type="button"
              style={botaoPrincipal}
              onClick={salvarImpressao}
              disabled={salvando}
            >
              <Save size={16} />

              {salvando
                ? "Salvando..."
                : "Salvar impressão"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
