import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import logoKchic from "../../assets/logo-kchic.png";

const HCAPTCHA_SCRIPT_ID = "kchic-hcaptcha-script";
const HCAPTCHA_SCRIPT_URL = "https://js.hcaptcha.com/1/api.js?render=explicit";

export default function LoginAdmin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaPronto, setCaptchaPronto] = useState(false);

  const captchaContainerRef = useRef(null);
  const captchaWidgetIdRef = useRef(null);
  const captchaRenderizadoRef = useRef(false);

  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

  useEffect(() => {
    if (!hcaptchaSiteKey) return undefined;

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

      captchaWidgetIdRef.current = window.hcaptcha.render(
        captchaContainerRef.current,
        {
          sitekey: hcaptchaSiteKey,
          callback: (token) => {
            if (!ativo) return;
            setCaptchaToken(token || "");
            setErro("");
          },
          "expired-callback": () => {
            if (!ativo) return;
            setCaptchaToken("");
          },
          "error-callback": () => {
            if (!ativo) return;
            setCaptchaToken("");
            setErro("Não foi possível validar o CAPTCHA. Tente novamente.");
          },
        }
      );

      captchaRenderizadoRef.current = true;
      setCaptchaPronto(true);
    }

    if (window.hcaptcha) {
      renderizarCaptcha();
      return () => {
        ativo = false;
      };
    }

    let script = document.getElementById(HCAPTCHA_SCRIPT_ID);

    if (!script) {
      script = document.createElement("script");
      script.id = HCAPTCHA_SCRIPT_ID;
      script.src = HCAPTCHA_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const aoCarregar = () => renderizarCaptcha();
    const aoFalhar = () => {
      if (!ativo) return;
      setErro("Não foi possível carregar a verificação de segurança.");
    };

    script.addEventListener("load", aoCarregar);
    script.addEventListener("error", aoFalhar);

    const intervalo = window.setInterval(() => {
      if (window.hcaptcha) {
        window.clearInterval(intervalo);
        renderizarCaptcha();
      }
    }, 250);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      script?.removeEventListener("load", aoCarregar);
      script?.removeEventListener("error", aoFalhar);
    };
  }, [hcaptchaSiteKey]);

  function resetarCaptcha() {
    setCaptchaToken("");

    if (
      window.hcaptcha &&
      captchaWidgetIdRef.current !== null &&
      captchaWidgetIdRef.current !== undefined
    ) {
      try {
        window.hcaptcha.reset(captchaWidgetIdRef.current);
      } catch {
        // Se o widget já tiver sido desmontado, não há nada a resetar.
      }
    }
  }

  async function entrar(e) {
    e.preventDefault();

    if (carregando) return;

    if (!email.trim() || !senha.trim()) {
      setErro("Preencha e-mail e senha.");
      return;
    }

    if (!hcaptchaSiteKey) {
      setErro("CAPTCHA não configurado. Informe VITE_HCAPTCHA_SITE_KEY.");
      return;
    }

    if (!captchaToken) {
      setErro("Confirme que você não é um robô antes de entrar.");
      return;
    }

    try {
      setCarregando(true);
      setErro("");

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
        options: {
          captchaToken,
        },
      });

      if (error) {
        setErro("E-mail, senha ou verificação de segurança inválidos.");
        resetarCaptcha();
        return;
      }
    } catch {
      setErro("Não foi possível entrar. Tente novamente.");
      resetarCaptcha();
    } finally {
      setCarregando(false);
    }
  }

  const podeEntrar =
    !carregando &&
    !!email.trim() &&
    !!senha.trim() &&
    !!hcaptchaSiteKey &&
    captchaPronto &&
    !!captchaToken;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #fff7f9 0%, #f8fafc 45%, #f4e7ec 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <form
        onSubmit={entrar}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "1px solid #f1dce4",
          borderRadius: 28,
          padding: 28,
          boxShadow: "0 20px 50px rgba(15,23,42,0.10)",
          display: "grid",
          gap: 18,
        }}
      >
        <div style={{ textAlign: "center", display: "grid", gap: 10 }}>
          <img
            src={logoKchic}
            alt="K.Chic"
            style={{
              width: 92,
              height: 92,
              objectFit: "contain",
              margin: "0 auto",
              borderRadius: 22,
            }}
          />

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                color: "#243746",
                letterSpacing: "-0.03em",
              }}
            >
              Acesso administrativo
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: "#64748b",
                fontSize: 14,
                lineHeight: 1.4,
              }}
            >
              Entre para acessar o painel do brechó.
            </p>
          </div>
        </div>

        <label style={{ display: "grid", gap: 7 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
            E-mail
          </span>

          <div style={{ position: "relative" }}>
            <Mail
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              autoComplete="email"
              style={{
                width: "100%",
                height: 46,
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "0 14px 0 44px",
                boxSizing: "border-box",
                outline: "none",
                fontSize: 15,
                color: "#111827",
                background: "#fff",
              }}
            />
          </div>
        </label>

        <label style={{ display: "grid", gap: 7 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
            Senha
          </span>

          <div style={{ position: "relative" }}>
            <Lock
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />

            <input
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              style={{
                width: "100%",
                height: 46,
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "0 48px 0 44px",
                boxSizing: "border-box",
                outline: "none",
                fontSize: 15,
                color: "#111827",
                background: "#fff",
              }}
            />

            <button
              type="button"
              onClick={() => setMostrarSenha((prev) => !prev)}
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 34,
                height: 34,
                borderRadius: 10,
                border: "none",
                background: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <div
          style={{
            display: "grid",
            gap: 9,
            padding: 12,
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#475569",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <ShieldCheck size={16} color="#8f2745" />
            Verificação de segurança
          </div>

          {hcaptchaSiteKey ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                minHeight: 78,
                overflow: "hidden",
              }}
            >
              <div ref={captchaContainerRef} />
            </div>
          ) : (
            <div
              style={{
                color: "#b45309",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              Configure a variável VITE_HCAPTCHA_SITE_KEY para ativar o CAPTCHA.
            </div>
          )}
        </div>

        {erro ? (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: 14,
              padding: "10px 12px",
              fontSize: 13,
              lineHeight: 1.35,
            }}
          >
            {erro}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!podeEntrar}
          style={{
            height: 46,
            border: "none",
            borderRadius: 14,
            background: podeEntrar ? "#8f2745" : "#94a3b8",
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            cursor: podeEntrar ? "pointer" : "not-allowed",
            boxShadow: podeEntrar
              ? "0 10px 22px rgba(143,39,69,0.22)"
              : "none",
          }}
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        <p
          style={{
            margin: 0,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          Área protegida. Links públicos de cadastro e sacolinha continuam livres.
        </p>
      </form>
    </div>
  );
}
