import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { supabase } from "../lib/supabase";
import { useUser } from "./UserContext";
import { criarConfigPadrao } from "../config/defaultConfig";

const ConfigContext = createContext(null);

const FAVICON_PADRAO =
    typeof document !== "undefined"
        ? document
              .querySelector('link[rel~="icon"]')
              ?.getAttribute("href") || ""
        : "";


function misturarHex(corA, corB, pesoCorA = 0.5) {
    const normalizar = (cor) => {
        const valor = String(cor || "").trim();

        if (!/^#[0-9A-Fa-f]{6}$/.test(valor)) {
            return null;
        }

        return {
            r: parseInt(valor.slice(1, 3), 16),
            g: parseInt(valor.slice(3, 5), 16),
            b: parseInt(valor.slice(5, 7), 16),
        };
    };

    const a = normalizar(corA);
    const b = normalizar(corB);

    if (!a || !b) {
        return corA || corB || "#000000";
    }

    const pesoA = Math.min(
        1,
        Math.max(0, Number(pesoCorA) || 0)
    );

    const pesoB = 1 - pesoA;

    const canalHex = (valor) =>
        Math.round(valor)
            .toString(16)
            .padStart(2, "0")
            .toUpperCase();

    return `#${canalHex(
        a.r * pesoA + b.r * pesoB
    )}${canalHex(
        a.g * pesoA + b.g * pesoB
    )}${canalHex(
        a.b * pesoA + b.b * pesoB
    )}`;
}

function criarAparenciaEfetiva(
    aparencia,
    temaEfetivo
) {
    if (!aparencia || temaEfetivo !== "dark") {
        return {
            ...(aparencia || {}),
            sombra:
                "0 8px 24px rgba(15,23,42,0.06)",
        };
    }

    const corPrimaria =
        aparencia.corPrimaria || "#DF5E78";

    const corSecundaria =
        aparencia.corSecundaria || "#B94A62";

    const corFundo = "#15161A";
    const corPainel = "#1D1F24";
    const corTexto = "#F3F3F5";
    const corTextoSuave = "#B8BAC2";
    const corBorda = "#343740";

    return {
        ...aparencia,

        corPrimaria,
        corSecundaria,

        corSuave: misturarHex(
            corPrimaria,
            corPainel,
            0.22
        ),

        corFundo,
        corPainel,
        corTexto,
        corTextoSuave,
        corBorda,

        sombra:
            "0 10px 30px rgba(0,0,0,0.24)",
    };
}


function montarConfiguracao(empresa, configuracao) {
    const padrao = criarConfigPadrao();

    if (!empresa) {
        return padrao;
    }

    return {
        empresa: {
            ...padrao.empresa,
            id: empresa.id ?? null,
            nome: empresa.nome ?? padrao.empresa.nome,
            nomeFantasia:
                empresa.nome_fantasia ??
                empresa.nome ??
                padrao.empresa.nomeFantasia,
            razaoSocial:
                empresa.razao_social ??
                padrao.empresa.razaoSocial,
            cnpjCpf:
                empresa.cnpj_cpf ??
                padrao.empresa.cnpjCpf,
            email:
                empresa.email ??
                padrao.empresa.email,
            telefone:
                empresa.telefone ??
                padrao.empresa.telefone,
            site:
                empresa.site ??
                padrao.empresa.site,
            ativo:
                empresa.ativo !== false,
        },

        identidade: {
            ...padrao.identidade,
            logoUrl:
                configuracao?.logo_url ??
                padrao.identidade.logoUrl,
            logoCompactaUrl:
                configuracao?.logo_compacta_url ??
                padrao.identidade.logoCompactaUrl,
            faviconUrl:
                configuracao?.favicon_url ??
                padrao.identidade.faviconUrl,
        },

        aparencia: {
            ...padrao.aparencia,
            corPrimaria:
                configuracao?.cor_primaria ??
                padrao.aparencia.corPrimaria,
            corSecundaria:
                configuracao?.cor_secundaria ??
                padrao.aparencia.corSecundaria,
            corSuave:
                configuracao?.cor_suave ??
                padrao.aparencia.corSuave,
            corFundo:
                configuracao?.cor_fundo ??
                padrao.aparencia.corFundo,
            corPainel:
                configuracao?.cor_painel ??
                padrao.aparencia.corPainel,
            corTexto:
                configuracao?.cor_texto ??
                padrao.aparencia.corTexto,
            corTextoSuave:
                configuracao?.cor_texto_suave ??
                padrao.aparencia.corTextoSuave,
            corBorda:
                configuracao?.cor_borda ??
                padrao.aparencia.corBorda,
            tema:
                configuracao?.tema ??
                padrao.aparencia.tema,
            densidade:
                configuracao?.densidade ??
                padrao.aparencia.densidade,
            sidebarEstilo:
                configuracao?.sidebar_estilo ??
                padrao.aparencia.sidebarEstilo,
            raioBorda:
                configuracao?.raio_borda ??
                padrao.aparencia.raioBorda,
        },

        operacao: {
            ...padrao.operacao,
            prefixoPeca:
                configuracao?.prefixo_peca ??
                padrao.operacao.prefixoPeca,
            moeda:
                configuracao?.moeda ??
                padrao.operacao.moeda,
            locale:
                configuracao?.locale ??
                padrao.operacao.locale,
            timezone:
                configuracao?.timezone ??
                padrao.operacao.timezone,
            formatoData:
                configuracao?.formato_data ??
                padrao.operacao.formatoData,
        },

        impressao: {
            ...padrao.impressao,
            impressoraPadrao:
                configuracao?.impressora_padrao ??
                padrao.impressao.impressoraPadrao,

            etiqueta: {
                ...padrao.impressao.etiqueta,
                larguraMm:
                    Number(configuracao?.etiqueta_largura_mm) ||
                    padrao.impressao.etiqueta.larguraMm,
                alturaMm:
                    Number(configuracao?.etiqueta_altura_mm) ||
                    padrao.impressao.etiqueta.alturaMm,
                mostrarLogo:
                    configuracao?.etiqueta_mostrar_logo ??
                    padrao.impressao.etiqueta.mostrarLogo,
                mostrarQr:
                    configuracao?.etiqueta_mostrar_qr ??
                    padrao.impressao.etiqueta.mostrarQr,
                mostrarPreco:
                    configuracao?.etiqueta_mostrar_preco ??
                    padrao.impressao.etiqueta.mostrarPreco,
                mostrarCodigo:
                    configuracao?.etiqueta_mostrar_codigo ??
                    padrao.impressao.etiqueta.mostrarCodigo,
            },
        },
    };
}

export function ConfigProvider({ children }) {
    const {
        usuarioSistema,
        carregando: carregandoUsuario,
    } = useUser();

    const [config, setConfig] = useState(
        criarConfigPadrao
    );

    const [carregando, setCarregando] =
        useState(true);

    const [salvando, setSalvando] =
        useState(false);

    const [erro, setErro] = useState("");

    const [sistemaEscuro, setSistemaEscuro] =
        useState(() => {
            if (
                typeof window === "undefined" ||
                !window.matchMedia
            ) {
                return false;
            }

            return window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;
        });

    const empresaId =
        usuarioSistema?.empresa_id || null;

    const carregarConfiguracao =
        useCallback(async () => {
            if (carregandoUsuario) {
                setCarregando(true);
                return;
            }

            if (!empresaId) {
                setConfig(criarConfigPadrao());
                setErro("");
                setCarregando(false);
                return;
            }

            try {
                setCarregando(true);
                setErro("");

                const [
                    resultadoEmpresa,
                    resultadoConfiguracao,
                ] = await Promise.all([
                    supabase
                        .from("empresas")
                        .select("*")
                        .eq("id", empresaId)
                        .maybeSingle(),

                    supabase
                        .from("configuracoes_empresa")
                        .select("*")
                        .eq("empresa_id", empresaId)
                        .maybeSingle(),
                ]);

                if (resultadoEmpresa.error) {
                    throw resultadoEmpresa.error;
                }

                if (resultadoConfiguracao.error) {
                    throw resultadoConfiguracao.error;
                }

                setConfig(
                    montarConfiguracao(
                        resultadoEmpresa.data,
                        resultadoConfiguracao.data
                    )
                );
            } catch (error) {
                console.error(
                    "ERRO AO CARREGAR CONFIGURAÇÃO DA EMPRESA:",
                    error
                );

                setConfig(criarConfigPadrao());

                setErro(
                    "Não foi possível carregar a configuração da empresa."
                );
            } finally {
                setCarregando(false);
            }
        }, [empresaId, carregandoUsuario]);

    useEffect(() => {
        carregarConfiguracao();
    }, [carregarConfiguracao]);

    useEffect(() => {
        if (
            typeof window === "undefined" ||
            !window.matchMedia
        ) {
            return undefined;
        }

        const mediaEscuro = window.matchMedia(
            "(prefers-color-scheme: dark)"
        );

        const atualizarTemaSistema = (event) => {
            setSistemaEscuro(event.matches);
        };

        setSistemaEscuro(mediaEscuro.matches);

        mediaEscuro.addEventListener(
            "change",
            atualizarTemaSistema
        );

        return () => {
            mediaEscuro.removeEventListener(
                "change",
                atualizarTemaSistema
            );
        };
    }, []);

    const temaEfetivo = useMemo(() => {
        const temaConfigurado =
            config?.aparencia?.tema || "light";

        if (temaConfigurado === "system") {
            return sistemaEscuro
                ? "dark"
                : "light";
        }

        return temaConfigurado === "dark"
            ? "dark"
            : "light";
    }, [
        config?.aparencia?.tema,
        sistemaEscuro,
    ]);

    const aparenciaEfetiva = useMemo(
        () =>
            criarAparenciaEfetiva(
                config?.aparencia,
                temaEfetivo
            ),
        [
            config?.aparencia,
            temaEfetivo,
        ]
    );

    // =====================================================
    // TEMA GLOBAL DA EMPRESA
    // =====================================================

    useEffect(() => {
        const aparencia = aparenciaEfetiva;

        if (!aparencia) {
            return;
        }

        const root = document.documentElement;

        // =====================================================
        // CORES EFETIVAS
        // =====================================================

        root.style.setProperty(
            "--kc-primary",
            aparencia.corPrimaria || "#DF5E78"
        );

        root.style.setProperty(
            "--kc-secondary",
            aparencia.corSecundaria || "#B94A62"
        );

        root.style.setProperty(
            "--kc-soft",
            aparencia.corSuave || "#FAE3E8"
        );

        root.style.setProperty(
            "--kc-background",
            aparencia.corFundo || "#FFF7F9"
        );

        root.style.setProperty(
            "--kc-panel",
            aparencia.corPainel || "#FFFFFF"
        );

        root.style.setProperty(
            "--kc-text",
            aparencia.corTexto || "#2F2F35"
        );

        root.style.setProperty(
            "--kc-text-muted",
            aparencia.corTextoSuave || "#8D727B"
        );

        root.style.setProperty(
            "--kc-border",
            aparencia.corBorda || "#F2E3E8"
        );

        root.style.setProperty(
            "--kc-shadow",
            aparencia.sombra ||
                "0 8px 24px rgba(15,23,42,0.06)"
        );

        // =====================================================
        // RAIO DE BORDA
        // =====================================================

        const raios = {
            quadrado: {
                sm: "4px",
                md: "6px",
                lg: "8px",
                xl: "10px",
            },

            suave: {
                sm: "6px",
                md: "10px",
                lg: "12px",
                xl: "14px",
            },

            normal: {
                sm: "8px",
                md: "12px",
                lg: "16px",
                xl: "20px",
            },

            arredondado: {
                sm: "10px",
                md: "16px",
                lg: "22px",
                xl: "28px",
            },
        };

        const raioSelecionado =
            raios[
                config?.aparencia?.raioBorda
            ] || raios.normal;

        root.style.setProperty(
            "--kc-radius-sm",
            raioSelecionado.sm
        );

        root.style.setProperty(
            "--kc-radius-md",
            raioSelecionado.md
        );

        root.style.setProperty(
            "--kc-radius-lg",
            raioSelecionado.lg
        );

        root.style.setProperty(
            "--kc-radius-xl",
            raioSelecionado.xl
        );

        // =====================================================
        // DENSIDADE
        // =====================================================

        const densidades = {
            compacta: {
                spacing: "0.82",
                controlHeight: "36px",
                fontScale: "0.94",
            },

            normal: {
                spacing: "1",
                controlHeight: "42px",
                fontScale: "1",
            },

            confortavel: {
                spacing: "1.12",
                controlHeight: "46px",
                fontScale: "1.02",
            },
        };

        const densidadeSelecionada =
            densidades[
                config?.aparencia?.densidade
            ] || densidades.normal;

        root.style.setProperty(
            "--kc-density",
            densidadeSelecionada.spacing
        );

        root.style.setProperty(
            "--kc-control-height",
            densidadeSelecionada.controlHeight
        );

        root.style.setProperty(
            "--kc-font-scale",
            densidadeSelecionada.fontScale
        );

        // =====================================================
        // SIDEBAR
        // =====================================================

        root.dataset.kcSidebar =
            config?.aparencia?.sidebarEstilo ||
            "padrao";

        // =====================================================
        // TEMA
        // =====================================================

        root.dataset.kcTheme = temaEfetivo;

        root.style.colorScheme =
            temaEfetivo === "dark"
                ? "dark"
                : "light";
    }, [
        aparenciaEfetiva,
        config?.aparencia?.densidade,
        config?.aparencia?.raioBorda,
        config?.aparencia?.sidebarEstilo,
        temaEfetivo,
    ]);

    useEffect(() => {
        if (typeof document === "undefined") {
            return;
        }

        let linkFavicon =
            document.querySelector('link[rel~="icon"]');

        if (!linkFavicon) {
            linkFavicon =
                document.createElement("link");

            linkFavicon.rel = "icon";
            document.head.appendChild(linkFavicon);
        }

        const faviconConfigurado =
            config?.identidade?.faviconUrl || "";

        linkFavicon.href =
            faviconConfigurado ||
            FAVICON_PADRAO ||
            "/favicon.ico";
    }, [config?.identidade?.faviconUrl]);

    const salvarConfiguracao =
        useCallback(
            async (novaConfig) => {
                if (!empresaId) {
                    throw new Error(
                        "Empresa não vinculada ao usuário."
                    );
                }

                try {
                    setSalvando(true);
                    setErro("");

                    const agora =
                        new Date().toISOString();

                    const dadosEmpresa = {
                        nome:
                            novaConfig?.empresa?.nome ||
                            "K.Chic",

                        nome_fantasia:
                            novaConfig?.empresa?.nomeFantasia ||
                            null,

                        razao_social:
                            novaConfig?.empresa?.razaoSocial ||
                            null,

                        cnpj_cpf:
                            novaConfig?.empresa?.cnpjCpf ||
                            null,

                        email:
                            novaConfig?.empresa?.email ||
                            null,

                        telefone:
                            novaConfig?.empresa?.telefone ||
                            null,

                        site:
                            novaConfig?.empresa?.site ||
                            null,

                        ativo:
                            novaConfig?.empresa?.ativo !== false,

                        updated_at: agora,
                    };

                    const dadosConfiguracao = {
                        empresa_id: empresaId,

                        logo_url:
                            novaConfig?.identidade?.logoUrl ||
                            null,

                        logo_compacta_url:
                            novaConfig?.identidade?.logoCompactaUrl ||
                            null,

                        favicon_url:
                            novaConfig?.identidade?.faviconUrl ||
                            null,

                        cor_primaria:
                            novaConfig?.aparencia?.corPrimaria ||
                            "#DF5E78",

                        cor_secundaria:
                            novaConfig?.aparencia?.corSecundaria ||
                            "#B94A62",

                        cor_suave:
                            novaConfig?.aparencia?.corSuave ||
                            "#FAE3E8",

                        cor_fundo:
                            novaConfig?.aparencia?.corFundo ||
                            "#FFF7F9",

                        cor_painel:
                            novaConfig?.aparencia?.corPainel ||
                            "#FFFFFF",

                        cor_texto:
                            novaConfig?.aparencia?.corTexto ||
                            "#2F2F35",

                        cor_texto_suave:
                            novaConfig?.aparencia?.corTextoSuave ||
                            "#8D727B",

                        cor_borda:
                            novaConfig?.aparencia?.corBorda ||
                            "#F2E3E8",

                        tema:
                            novaConfig?.aparencia?.tema ||
                            "light",

                        densidade:
                            novaConfig?.aparencia?.densidade ||
                            "normal",

                        sidebar_estilo:
                            novaConfig?.aparencia?.sidebarEstilo ||
                            "padrao",

                        raio_borda:
                            novaConfig?.aparencia?.raioBorda ||
                            "normal",

                        prefixo_peca:
                            novaConfig?.operacao?.prefixoPeca ||
                            "KC",

                        moeda:
                            novaConfig?.operacao?.moeda ||
                            "BRL",

                        locale:
                            novaConfig?.operacao?.locale ||
                            "pt-BR",

                        timezone:
                            novaConfig?.operacao?.timezone ||
                            "America/Sao_Paulo",

                        formato_data:
                            novaConfig?.operacao?.formatoData ||
                            "DD/MM/YYYY",

                        impressora_padrao:
                            novaConfig?.impressao?.impressoraPadrao ||
                            "termica",

                        etiqueta_largura_mm:
                            Number(
                                novaConfig?.impressao?.etiqueta
                                    ?.larguraMm
                            ) || 37,

                        etiqueta_altura_mm:
                            Number(
                                novaConfig?.impressao?.etiqueta
                                    ?.alturaMm
                            ) || 58,

                        etiqueta_mostrar_logo:
                            novaConfig?.impressao?.etiqueta
                                ?.mostrarLogo !== false,

                        etiqueta_mostrar_qr:
                            novaConfig?.impressao?.etiqueta
                                ?.mostrarQr !== false,

                        etiqueta_mostrar_preco:
                            novaConfig?.impressao?.etiqueta
                                ?.mostrarPreco !== false,

                        etiqueta_mostrar_codigo:
                            novaConfig?.impressao?.etiqueta
                                ?.mostrarCodigo !== false,

                        updated_at: agora,
                    };

                    const {
                        data: empresaAtualizada,
                        error: erroEmpresa,
                    } = await supabase
                        .from("empresas")
                        .update(dadosEmpresa)
                        .eq("id", empresaId)
                        .select("id")
                        .maybeSingle();

                    if (erroEmpresa) {
                        throw erroEmpresa;
                    }

                    if (!empresaAtualizada) {
                        throw new Error(
                            "A empresa não foi atualizada. Verifique as permissões de acesso."
                        );
                    }

                    const {
                        error: erroConfiguracao,
                    } = await supabase
                        .from("configuracoes_empresa")
                        .upsert(
                            dadosConfiguracao,
                            {
                                onConflict: "empresa_id",
                            }
                        );

                    if (erroConfiguracao) {
                        throw erroConfiguracao;
                    }

                    await carregarConfiguracao();

                    return true;
                } catch (error) {
                    console.error(
                        "ERRO AO SALVAR CONFIGURAÇÃO:",
                        error
                    );

                    setErro(
                        "Não foi possível salvar as configurações."
                    );

                    throw error;
                } finally {
                    setSalvando(false);
                }
            },
            [
                empresaId,
                carregarConfiguracao,
            ]
        );

    const valor = useMemo(
        () => ({
            config,

            empresa: config.empresa,
            identidade: config.identidade,
            aparencia: config.aparencia,
            aparenciaEfetiva,
            temaEfetivo,
            sistemaEscuro,
            operacao: config.operacao,
            impressao: config.impressao,

            empresaId,

            carregando,
            salvando,
            erro,

            recarregarConfiguracao:
                carregarConfiguracao,

            salvarConfiguracao,
        }),
        [
            config,
            aparenciaEfetiva,
            temaEfetivo,
            sistemaEscuro,
            empresaId,
            carregando,
            salvando,
            erro,
            carregarConfiguracao,
            salvarConfiguracao,
        ]
    );

    return (
        <ConfigContext.Provider value={valor}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const contexto = useContext(ConfigContext);

    if (!contexto) {
        throw new Error(
            "useConfig deve ser usado dentro de ConfigProvider."
        );
    }

    return contexto;
}
