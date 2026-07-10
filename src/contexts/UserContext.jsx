import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const UserContext = createContext(null);

function rotaPublicaAtual() {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);

  return (
    params.has("portal") ||
    params.get("portal") === "cliente" ||
    params.get("cadastro") === "cliente"
  );
}

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function UserProvider({ children }) {
  const { session, usuario: usuarioAuth, carregando: carregandoAuth } = useAuth();

  const [usuarioSistema, setUsuarioSistema] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarUsuarioSistema() {
      if (rotaPublicaAtual()) {
        if (!ativo) return;
        setUsuarioSistema(null);
        setErro("");
        setCarregando(false);
        return;
      }

      if (carregandoAuth) {
        if (!ativo) return;
        setCarregando(true);
        return;
      }

      const emailSessao = normalizarEmail(session?.user?.email);
      const emailAuth = normalizarEmail(usuarioAuth?.email);

      const emailFinal = emailSessao || emailAuth;

      if (!emailFinal) {
        if (!ativo) return;
        setUsuarioSistema(null);
        setErro("");
        setCarregando(false);
        return;
      }

      try {
        setCarregando(true);
        setErro("");

        console.log("EMAIL AUTH:", emailFinal);

        const { data, error } = await supabase
          .from("usuarios")
          .select("*")
          .ilike("email", emailFinal)
          .maybeSingle();

        if (error) throw error;

        if (!ativo) return;

        console.log("USUARIO SISTEMA:", data);

        if (!data) {
          setUsuarioSistema(null);
          setErro(`Usuário não cadastrado no painel interno: ${emailFinal}`);
          return;
        }

        if (data.ativo === false) {
          setUsuarioSistema(data);
          setErro("Usuário desativado. Fale com um administrador.");
          return;
        }

        setUsuarioSistema(data);

        const { error: erroUltimoAcesso } = await supabase
          .from("usuarios")
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq("id", data.id);

        if (erroUltimoAcesso) {
          console.error("ERRO AO ATUALIZAR ÚLTIMO ACESSO:", erroUltimoAcesso);
        }
      } catch (error) {
        console.error("ERRO AO CARREGAR USUÁRIO DO SISTEMA:", error);

        if (ativo) {
          setUsuarioSistema(null);
          setErro("Não foi possível carregar o usuário interno.");
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarUsuarioSistema();

    return () => {
      ativo = false;
    };
  }, [session?.user?.email, usuarioAuth?.email, usuarioAuth?.id, carregandoAuth]);

  const perfil = String(usuarioSistema?.perfil || "").toUpperCase();
  const ativo = usuarioSistema?.ativo !== false;

  const isAdmin = perfil === "ADMIN";
  const isOperador = perfil === "OPERADOR";
  const acessoLiberado = !!usuarioSistema && ativo && !erro;

  const valor = useMemo(
    () => ({
      usuarioSistema,
      usuarioAuth,
      perfil,
      isAdmin,
      isOperador,
      ativo,
      carregando,
      erro,
      acessoLiberado,
      motivoBloqueio: erro,
    }),
    [
      usuarioSistema,
      usuarioAuth,
      perfil,
      isAdmin,
      isOperador,
      ativo,
      carregando,
      erro,
      acessoLiberado,
    ]
  );

  return <UserContext.Provider value={valor}>{children}</UserContext.Provider>;
}

export function useUser() {
  const contexto = useContext(UserContext);

  if (!contexto) {
    throw new Error("useUser deve ser usado dentro de UserProvider.");
  }

  return contexto;
}