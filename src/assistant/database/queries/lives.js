function converterData(valor) {
  if (!valor) return null;

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  const texto = String(valor).trim();

  if (!texto) return null;

  if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) {
    const match = texto.match(
      /^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s*(\d{2}):(\d{2})(?::(\d{2}))?)?$/
    );

    if (match) {
      const [
        ,
        dia,
        mes,
        ano,
        hora = "00",
        minuto = "00",
        segundo = "00",
      ] = match;

      const data = new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia),
        Number(hora),
        Number(minuto),
        Number(segundo)
      );

      return Number.isNaN(data.getTime()) ? null : data;
    }
  }

  const data = new Date(texto);

  return Number.isNaN(data.getTime()) ? null : data;
}

function getDataReferenciaLive(live) {
  const camposPossiveis = [
    live?.hora_fim,
    live?.data_fim,
    live?.encerrada_em,
    live?.data_live,
    live?.data,
    live?.criado_em,
    live?.created_at,
    live?.data_hora,
  ];

  for (const campo of camposPossiveis) {
    const data = converterData(campo);

    if (data) {
      return data;
    }
  }

  return null;
}

export async function buscarUltimaLiveEncerrada(supabase) {
  if (!supabase) {
    throw new Error("Cliente Supabase não informado.");
  }

  const { data, error } = await supabase
    .from("lives")
    .select("*")
    .eq("status", "encerrada");

  if (error) {
    throw new Error(`Erro ao buscar as lives encerradas: ${error.message}`);
  }

  const lives = Array.isArray(data) ? data : [];

  if (lives.length === 0) {
    return null;
  }

  const livesOrdenadas = [...lives].sort((a, b) => {
    const dataA = getDataReferenciaLive(a);
    const dataB = getDataReferenciaLive(b);

    const timestampA = dataA?.getTime() || 0;
    const timestampB = dataB?.getTime() || 0;

    if (timestampB !== timestampA) {
      return timestampB - timestampA;
    }

    return String(b?.id || "").localeCompare(String(a?.id || ""), "pt-BR", {
      numeric: true,
      sensitivity: "base",
    });
  });

  return livesOrdenadas[0] || null;
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
      .range(inicio, inicio + pageSize - 1);

    if (error) {
      throw new Error(`Erro ao buscar vendas da live: ${error.message}`);
    }

    const pagina = Array.isArray(data) ? data : [];

    vendas = [...vendas, ...pagina];

    if (pagina.length < pageSize) {
      break;
    }

    inicio += pageSize;
  }

  return vendas;
}

export { getDataReferenciaLive };