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
  const [membershipAtiva, setMembershipAtiva] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [versaoRecarga, setVersaoRecarga] = useState(0);

  function recarregarUsuario() {
    setVersaoRecarga((valorAtual) => valorAtual + 1);
  }

  useEffect(() => {
    let ativo = true;

    async function carregarUsuarioSistema() {
      if (rotaPublicaAtual()) {
        if (!ativo) return;

        setUsuarioSistema(null);
        setMembershipAtiva(null);
        setMemberships([]);
        setErro("");
        setCarregando(false);
        return;
      }

      if (carregandoAuth) {
        if (!ativo) return;

        setCarregando(true);
        return;
      }

      const authUserId = session?.user?.id || usuarioAuth?.id || null;

      const emailSessao = normalizarEmail(session?.user?.email);
      const emailAuth = normalizarEmail(usuarioAuth?.email);
      const emailFinal = emailSessao || emailAuth;

      if (!authUserId) {
        if (!ativo) return;

        setUsuarioSistema(null);
        setMembershipAtiva(null);
        setMemberships([]);
        setErro("");
        setCarregando(false);
        return;
      }

      try {
        setCarregando(true);
        setErro("");

        console.log("AUTH USER ID:", authUserId);

        const { data: usuarioInterno, error: erroUsuario } = await supabase
          .from("usuarios")
          .select("*")
          .eq("auth_user_id", authUserId)
          .maybeSingle();

        if (erroUsuario) throw erroUsuario;
        if (!ativo) return;

        console.log("USUARIO INTERNO:", usuarioInterno);

        if (!usuarioInterno) {
          setUsuarioSistema(null);
          setMembershipAtiva(null);
          setMemberships([]);

          setErro(
            emailFinal
              ? `Usuário não cadastrado no painel interno: ${emailFinal}`
              : "Usuário não cadastrado no painel interno."
          );

          return;
        }

        if (usuarioInterno.ativo === false) {
          setUsuarioSistema(usuarioInterno);
          setMembershipAtiva(null);
          setMemberships([]);
          setErro("Usuário desativado. Fale com um administrador.");
          return;
        }

        const { data: membershipsEncontradas, error: erroMemberships } =
          await supabase
            .from("empresa_usuarios")
            .select("id, empresa_id, usuario_id, perfil, ativo, created_at")
            .eq("usuario_id", usuarioInterno.id)
            .eq("ativo", true)
            .order("created_at", { ascending: true });

        if (erroMemberships) throw erroMemberships;
        if (!ativo) return;

        const listaMemberships = Array.isArray(membershipsEncontradas)
          ? membershipsEncontradas
          : [];

        if (listaMemberships.length === 0) {
          setUsuarioSistema(usuarioInterno);
          setMembershipAtiva(null);
          setMemberships([]);
          setErro("Usuário sem vínculo ativo com uma empresa.");
          return;
        }

        /*
         * Enquanto houver apenas uma membership, ela é automaticamente ativa.
         *
         * Quando habilitarmos usuários multiempresa no frontend, este ponto
         * será substituído pela seleção explícita da empresa ativa.
         *
         * Não escolhemos silenciosamente uma empresa quando existem várias.
         */
        if (listaMemberships.length > 1) {
          setUsuarioSistema(usuarioInterno);
          setMembershipAtiva(null);
          setMemberships(listaMemberships);
          setErro(
            "Usuário possui acesso a mais de uma empresa. Selecione a empresa ativa."
          );
          return;
        }

        const membership = listaMemberships[0];

        const usuarioCompatibilidade = {
          ...usuarioInterno,
          empresa_id: membership.empresa_id,
          perfil: membership.perfil,
        };

        console.log("MEMBERSHIP ATIVA:", membership);
        console.log("USUARIO SISTEMA:", usuarioCompatibilidade);

        setMemberships(listaMemberships);
        setMembershipAtiva(membership);
        setUsuarioSistema(usuarioCompatibilidade);

        const { error: erroUltimoAcesso } = await supabase
          .from("usuarios")
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq("id", usuarioInterno.id);

        if (erroUltimoAcesso) {
          console.error(
            "ERRO AO ATUALIZAR ÚLTIMO ACESSO:",
            erroUltimoAcesso
          );
        }
      } catch (error) {
        console.error("ERRO AO CARREGAR USUÁRIO DO SISTEMA:", error);

        if (ativo) {
          setUsuarioSistema(null);
          setMembershipAtiva(null);
          setMemberships([]);
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
  }, [
    session?.user?.id,
    session?.user?.email,
    usuarioAuth?.id,
    usuarioAuth?.email,
    carregandoAuth,
    versaoRecarga,
  ]);

  const perfil = String(
    membershipAtiva?.perfil || usuarioSistema?.perfil || ""
  ).toUpperCase();

  const ativo =
    usuarioSistema?.ativo !== false && membershipAtiva?.ativo !== false;

  const isProprietario = perfil === "PROPRIETARIO";
  const isAdmin = isProprietario || perfil === "ADMIN";
  const isOperador = perfil === "OPERADOR";

  const empresaId =
    membershipAtiva?.empresa_id || usuarioSistema?.empresa_id || null;

  const acessoLiberado =
    !!usuarioSistema && !!membershipAtiva && ativo && !erro;

  const precisaOnboarding =
    !!session &&
    !carregando &&
    (
      !usuarioSistema ||
      (
        !!usuarioSistema &&
        usuarioSistema.ativo !== false &&
        memberships.length === 0
      )
    );

  const valor = useMemo(
    () => ({
      usuarioSistema,
      usuarioAuth,

      membershipAtiva,
      memberships,
      empresaId,

      perfil,
      isProprietario,
      isAdmin,
      isOperador,

      ativo,
      carregando,
      erro,
      acessoLiberado,
      precisaOnboarding,
      recarregarUsuario,
      motivoBloqueio: erro,
    }),
    [
      usuarioSistema,
      usuarioAuth,
      membershipAtiva,
      memberships,
      empresaId,
      perfil,
      isProprietario,
      isAdmin,
      isOperador,
      ativo,
      carregando,
      erro,
      acessoLiberado,
      precisaOnboarding,
      recarregarUsuario,
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
