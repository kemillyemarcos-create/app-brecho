import { useEffect, useRef, useState } from "react";

import {
    formatarCPF,
    formatarTelefone,
    formatarCEP,
    buscarEnderecoPorCep,
} from "../utils/clientes";

const HCAPTCHA_SCRIPT_ID = "kchic-hcaptcha-script";
const HCAPTCHA_SCRIPT_URL =
  "https://js.hcaptcha.com/1/api.js?render=explicit";

export default function CadastroPublicoCliente({
    logoKchic,
    formCliente,
    setFormCliente,
    cadastroPublicoConcluido,
    salvandoCadastroPublico,
    salvarCadastroClientePublico,
}) {
    const [captchaPronto, setCaptchaPronto] = useState(false);
    const [erroCaptcha, setErroCaptcha] = useState("");

    const captchaContainerRef = useRef(null);
    const captchaWidgetIdRef = useRef(null);
    const captchaRenderizadoRef = useRef(false);
    const salvarCadastroRef = useRef(
        salvarCadastroClientePublico
    );

    salvarCadastroRef.current =
        salvarCadastroClientePublico;

    const hcaptchaSiteKey =
        import.meta.env.VITE_HCAPTCHA_SITE_KEY;

    useEffect(() => {
        if (
            !hcaptchaSiteKey ||
            cadastroPublicoConcluido
        ) {
            return undefined;
        }

        let ativo = true;

        function renderizarCaptcha() {
            if (
                !ativo ||
                captchaRenderizadoRef.current ||
                !captchaContainerRef.current ||
                !window.hcaptcha
            ) {
                return;
            }

            captchaWidgetIdRef.current =
                window.hcaptcha.render(
                    captchaContainerRef.current,
                    {
                        sitekey: hcaptchaSiteKey,
                        size: "invisible",
                        hl: "pt-BR",
                        callback: async (token) => {
                            if (!ativo) return;

                            setErroCaptcha("");

                            if (!token) return;

                            try {
                                await salvarCadastroRef.current(token);
                            } finally {
                                if (
                                    ativo &&
                                    window.hcaptcha &&
                                    captchaWidgetIdRef.current !== null &&
                                    captchaWidgetIdRef.current !== undefined
                                ) {
                                    try {
                                        window.hcaptcha.reset(
                                            captchaWidgetIdRef.current
                                        );
                                    } catch {
                                        // O widget pode já ter sido desmontado.
                                    }
                                }
                            }
                        },
                        "expired-callback": () => {
                            if (!ativo) return;
                            setErroCaptcha("");
                        },
                        "error-callback": () => {
                            if (!ativo) return;
                            setErroCaptcha(
                                "Não foi possível validar a verificação de segurança."
                            );
                        },
                    }
                );

            captchaRenderizadoRef.current = true;
            setCaptchaPronto(true);
        }

        if (window.hcaptcha) {
            renderizarCaptcha();
        }

        let script =
            document.getElementById(
                HCAPTCHA_SCRIPT_ID
            );

        if (!script) {
            script =
                document.createElement("script");
            script.id = HCAPTCHA_SCRIPT_ID;
            script.src = HCAPTCHA_SCRIPT_URL;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        const aoCarregar =
            () => renderizarCaptcha();

        const aoFalhar = () => {
            if (!ativo) return;
            setErroCaptcha(
                "Não foi possível carregar a verificação de segurança."
            );
        };

        script.addEventListener(
            "load",
            aoCarregar
        );
        script.addEventListener(
            "error",
            aoFalhar
        );

        const intervalo =
            window.setInterval(() => {
                if (window.hcaptcha) {
                    renderizarCaptcha();

                    if (
                        captchaRenderizadoRef.current
                    ) {
                        window.clearInterval(
                            intervalo
                        );
                    }
                }
            }, 250);

        return () => {
            ativo = false;
            window.clearInterval(intervalo);

            script?.removeEventListener(
                "load",
                aoCarregar
            );
            script?.removeEventListener(
                "error",
                aoFalhar
            );

            if (
                window.hcaptcha &&
                captchaWidgetIdRef.current !== null &&
                captchaWidgetIdRef.current !== undefined
            ) {
                try {
                    window.hcaptcha.remove(
                        captchaWidgetIdRef.current
                    );
                } catch {
                    // O widget pode já ter sido removido.
                }
            }

            captchaWidgetIdRef.current = null;
            captchaRenderizadoRef.current = false;
            setCaptchaPronto(false);
        };
    }, [
        hcaptchaSiteKey,
        cadastroPublicoConcluido,
    ]);

    function executarCadastroProtegido() {
        setErroCaptcha("");

        if (
            !captchaPronto ||
            !window.hcaptcha ||
            captchaWidgetIdRef.current === null ||
            captchaWidgetIdRef.current === undefined
        ) {
            setErroCaptcha(
                "A verificação de segurança ainda está carregando. Tente novamente em alguns segundos."
            );
            return;
        }

        try {
            window.hcaptcha.execute(
                captchaWidgetIdRef.current
            );
        } catch {
            setErroCaptcha(
                "Não foi possível iniciar a verificação de segurança."
            );
        }
    }

    const inputCliente = {
        padding: "12px 14px",
        height: 48,
        borderRadius: 12,
        border: "1px solid #cfd8e3",
        fontSize: 15,
        background: "#fff",
        boxSizing: "border-box",
        width: "100%",
        outline: "none",
    };

    const botao = {
        padding: "13px 18px",
        borderRadius: 14,
        border: "none",
        background: "linear-gradient(135deg, #d96b82 0%, #b83c57 100%)",
        color: "#fff",
        fontSize: 15,
        cursor: "pointer",
        fontWeight: 800,
        boxShadow: "0 10px 20px rgba(184,60,87,0.28)",
        transition: "all 0.2s ease",
        width: "100%",
    };

    async function buscarCep(cep) {
        try {
            const resultado = await buscarEnderecoPorCep(cep);

            if (!resultado) return;

            setFormCliente((prev) => ({
                ...prev,
                endereco: resultado.endereco || prev.endereco,
            }));
        } catch (err) {
            console.error("Erro ao buscar CEP:", err);
        }
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f7f1f3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: 520,
                    background: "#fff",
                    borderRadius: 24,
                    padding: 24,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                    border: "1px solid #f0d9e2",
                }}
            >
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <img
                        src={logoKchic}
                        alt="K.chic"
                        style={{ width: 120, marginBottom: 12 }}
                    />
                    <h1
                        style={{
                            margin: 0,
                            fontSize: 24,
                            color: "#8f2745",
                        }}
                    >
                        Cadastro de Cliente
                    </h1>
                    <p
                        style={{
                            marginTop: 8,
                            marginBottom: 0,
                            color: "#666",
                            fontSize: 15,
                            lineHeight: 1.5,
                        }}
                    >
                        Preencha seus dados para agilizar seu atendimento.
                    </p>
                </div>

                {cadastroPublicoConcluido ? (
                    <div
                        style={{
                            background: "#f6fff8",
                            border: "1px solid #cfe8d5",
                            color: "#24613b",
                            borderRadius: 16,
                            padding: 18,
                            textAlign: "center",
                            fontWeight: 600,
                        }}
                    >
                        Cadastro enviado com sucesso.
                    </div>
                ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                        <input
                            value={formCliente.nome}
                            onChange={(e) =>
                                setFormCliente((prev) => ({ ...prev, nome: e.target.value }))
                            }
                            placeholder="Nome completo"
                            style={inputCliente}
                        />

                        <input
                            value={formCliente.cpf}
                            onChange={(e) =>
                                setFormCliente((prev) => ({
                                    ...prev,
                                    cpf: formatarCPF(e.target.value),
                                }))
                            }
                            placeholder="CPF"
                            style={inputCliente}
                        />

                        <input
                            value={formCliente.telefone}
                            onChange={(e) =>
                                setFormCliente((prev) => ({
                                    ...prev,
                                    telefone: formatarTelefone(e.target.value),
                                }))
                            }
                            placeholder="Telefone"
                            style={inputCliente}
                        />

                        <input
                            type="email"
                            value={formCliente.email}
                            onChange={(e) =>
                                setFormCliente((prev) => ({
                                    ...prev,
                                    email: e.target.value,
                                }))
                            }
                            placeholder="E-mail"
                            style={inputCliente}
                        />

                        <input
                            value={formCliente.cep}
                            onChange={(e) => {
                                const cepFormatado = formatarCEP(e.target.value);
                                setFormCliente((prev) => ({
                                    ...prev,
                                    cep: cepFormatado,
                                }));

                                const cepLimpo = cepFormatado.replace(/\D/g, "");
                                if (cepLimpo.length === 8) {
                                    buscarCep(cepLimpo);
                                }
                            }}
                            placeholder="CEP"
                            style={inputCliente}
                        />

                        <input
                            value={formCliente.endereco}
                            onChange={(e) =>
                                setFormCliente((prev) => ({
                                    ...prev,
                                    endereco: e.target.value,
                                }))
                            }
                            placeholder="Endereço"
                            style={inputCliente}
                        />

                        <input
                            value={formCliente.numero}
                            onChange={(e) =>
                                setFormCliente((prev) => ({
                                    ...prev,
                                    numero: e.target.value,
                                }))
                            }
                            placeholder="Número"
                            style={inputCliente}
                        />

                        <input
                            value={formCliente.complemento}
                            onChange={(e) =>
                                setFormCliente((prev) => ({
                                    ...prev,
                                    complemento: e.target.value,
                                }))
                            }
                            placeholder="Complemento"
                            style={inputCliente}
                        />

                        <button
                            onClick={executarCadastroProtegido}
                            disabled={
                                salvandoCadastroPublico ||
                                !captchaPronto
                            }
                            style={{
                                ...botao,
                                opacity:
                                    salvandoCadastroPublico ||
                                    !captchaPronto
                                        ? 0.7
                                        : 1,
                                cursor:
                                    salvandoCadastroPublico ||
                                    !captchaPronto
                                        ? "not-allowed"
                                        : "pointer",
                            }}
                        >
                            {salvandoCadastroPublico
                                ? "Enviando..."
                                : !captchaPronto
                                  ? "Carregando segurança..."
                                  : "Enviar cadastro"}
                        </button>

                        <div
                            ref={captchaContainerRef}
                            style={{ display: "none" }}
                        />

                        {erroCaptcha ? (
                            <div
                                style={{
                                    fontSize: 13,
                                    color: "#b42318",
                                    lineHeight: 1.4,
                                }}
                            >
                                {erroCaptcha}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
