export async function buscarUltimaLiveEncerrada(supabase) {
  if (!supabase) {
    throw new Error("Cliente Supabase não informado.");
  }

  const { data, error } = await supabase
    .from("lives")
    .select("*")
    .eq("status", "encerrada")
    .order("hora_fim", {
      ascending: false,
      nullsFirst: false,
    })
    .order("criado_em", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar a última live: ${error.message}`);
  }

  return data || null;
}

export async function buscarVendasDaLive(supabase, liveId) {
  if (!supabase) {
    throw new Error("Cliente Supabase não informado.");
  }

  if (!liveId) {
    return [];
  }

  const pageSize = 1000;
  let inicio = 0;
  let vendas = [];

  while (true) {
    const { data, error } = await supabase
      .from("vendas_live")
      .select("*")
      .eq("live_id", liveId)
      .order("data_hora", {
        ascending: true,
      })
      .range(inicio, inicio + pageSize - 1);

    if (error) {
      throw new Error(`Erro ao buscar vendas da live: ${error.message}`);
    }

    const pagina = data || [];

    vendas = [...vendas, ...pagina];

    if (pagina.length < pageSize) {
      break;
    }

    inicio += pageSize;
  }

  return vendas;
}