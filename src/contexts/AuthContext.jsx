import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    async function carregarSessao() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("ERRO AO CARREGAR SESSÃO:", error);
        }

        if (!ativo) return;

        const sessaoAtual = data?.session || null;
        setSession(sessaoAtual);
        setUsuario(sessaoAtual?.user || null);
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarSessao();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, novaSessao) => {
        setSession(novaSessao || null);
        setUsuario(novaSessao?.user || null);
        setCarregando(false);
      }
    );

    return () => {
      ativo = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    setSession(null);
    setUsuario(null);
  }

  const valor = useMemo(
    () => ({
      session,
      usuario,
      carregando,
      autenticado: !!session,
      sair,
    }),
    [session, usuario, carregando]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return contexto;
}
