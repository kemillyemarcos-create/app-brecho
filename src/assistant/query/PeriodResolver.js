// PeriodResolver.js
// Resolve períodos utilizados pelo QueryBuilder.

function inicioDoDia(data) {
  const resultado = new Date(data);

  resultado.setHours(0, 0, 0, 0);

  return resultado;
}

function fimDoDia(data) {
  const resultado = new Date(data);

  resultado.setHours(23, 59, 59, 999);

  return resultado;
}

function converterParaIso(data) {
  if (!(data instanceof Date)) return null;
  if (Number.isNaN(data.getTime())) return null;

  return data.toISOString();
}

function obterTipoPeriodo(periodo) {
  if (typeof periodo === "string") {
    return periodo;
  }

  if (
    periodo &&
    typeof periodo === "object"
  ) {
    return periodo.tipo || null;
  }

  return null;
}

function montarPeriodo({
  tipo,
  dataInicial = null,
  dataFinal = null,
  requerUltimaLive = false,
}) {
  return {
    tipo,
    requerUltimaLive,

    dataInicial,
    dataFinal,

    dataInicialIso: converterParaIso(dataInicial),
    dataFinalIso: converterParaIso(dataFinal),
  };
}

class PeriodResolver {
  resolver(periodo = null, referencia = new Date()) {
    const tipo = obterTipoPeriodo(periodo);

    const agora =
      referencia instanceof Date
        ? new Date(referencia)
        : new Date();

    if (Number.isNaN(agora.getTime())) {
      return {
        tipo: null,
        requerUltimaLive: false,
        dataInicial: null,
        dataFinal: null,
        dataInicialIso: null,
        dataFinalIso: null,
        suportado: false,
      };
    }

    switch (tipo) {
      case "ultima_live":
        return {
          ...montarPeriodo({
            tipo: "ultima_live",
            requerUltimaLive: true,
          }),

          suportado: true,
        };

      case "hoje": {
        const inicio = inicioDoDia(agora);
        const fim = fimDoDia(agora);

        return {
          ...montarPeriodo({
            tipo: "hoje",
            dataInicial: inicio,
            dataFinal: fim,
          }),

          suportado: true,
        };
      }

      case "ontem": {
        const ontem = new Date(agora);

        ontem.setDate(ontem.getDate() - 1);

        const inicio = inicioDoDia(ontem);
        const fim = fimDoDia(ontem);

        return {
          ...montarPeriodo({
            tipo: "ontem",
            dataInicial: inicio,
            dataFinal: fim,
          }),

          suportado: true,
        };
      }

      case "semana_atual": {
        const inicio = inicioDoDia(agora);

        const diaSemana = inicio.getDay();

        /*
         * Segunda-feira será considerada o início da semana.
         *
         * Domingo: retrocede 6 dias.
         * Segunda: retrocede 0 dias.
         * Terça: retrocede 1 dia.
         */
        const deslocamento =
          diaSemana === 0
            ? 6
            : diaSemana - 1;

        inicio.setDate(
          inicio.getDate() - deslocamento
        );

        const fim = fimDoDia(agora);

        return {
          ...montarPeriodo({
            tipo: "semana_atual",
            dataInicial: inicio,
            dataFinal: fim,
          }),

          suportado: true,
        };
      }

      case "mes_atual": {
        const inicio = new Date(
          agora.getFullYear(),
          agora.getMonth(),
          1,
          0,
          0,
          0,
          0
        );

        const fim = fimDoDia(agora);

        return {
          ...montarPeriodo({
            tipo: "mes_atual",
            dataInicial: inicio,
            dataFinal: fim,
          }),

          suportado: true,
        };
      }

      case "ano_atual": {
        const inicio = new Date(
          agora.getFullYear(),
          0,
          1,
          0,
          0,
          0,
          0
        );

        const fim = fimDoDia(agora);

        return {
          ...montarPeriodo({
            tipo: "ano_atual",
            dataInicial: inicio,
            dataFinal: fim,
          }),

          suportado: true,
        };
      }

      default:
        return {
          tipo: tipo || null,
          requerUltimaLive: false,

          dataInicial: null,
          dataFinal: null,

          dataInicialIso: null,
          dataFinalIso: null,

          suportado: false,
        };
    }
  }
}

const periodResolver = new PeriodResolver();

export default periodResolver;