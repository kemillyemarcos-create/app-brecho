import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { supabase } from "../../lib/supabase";
import logoKchic from "../../assets/logo-kchic.png";

export default function LoginAdmin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar(e) {
    e.preventDefault();

    if (carregando) return;

    if (!email.trim() || !senha.trim()) {
      setErro("Preencha e-mail e senha.");
      return;
    }

    try {
      setCarregando(true);
      setErro("");

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        setErro("E-mail ou senha inválidos.");
        return;
      }
    } catch {
      setErro("Não foi possível entrar. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

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
          disabled={carregando}
          style={{
            height: 46,
            border: "none",
            borderRadius: 14,
            background: carregando ? "#94a3b8" : "#8f2745",
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            cursor: carregando ? "not-allowed" : "pointer",
            boxShadow: "0 10px 22px rgba(143,39,69,0.22)",
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