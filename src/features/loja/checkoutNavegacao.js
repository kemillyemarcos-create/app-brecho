// Navegação na mesma aba: não depende da permissão de popups.
// Permanecer visível não prova bloqueio; o fallback é uma saída explícita e segura.
export function redirecionarPagamento({ destino, navegador, documento, onSaida, onRetorno, onFallback }) {
  let saiu = false;
  let ativo = true;
  let timer;
  function limpar() {
    ativo = false;
    clearTimeout(timer);
    navegador.removeEventListener('pagehide', aoSair);
    navegador.removeEventListener('pageshow', aoVoltar);
  }
  function aoSair() {
    saiu = true;
    clearTimeout(timer);
    onSaida();
  }
  function aoVoltar() {
    if (!ativo || !saiu) return;
    limpar();
    onRetorno();
  }
  function fallback() {
    if (!ativo || saiu) return;
    if (documento.visibilityState === 'hidden') {
      timer = setTimeout(fallback, 8000);
      return;
    }
    // A navegação pode apenas estar lenta: ainda observamos saída/retorno.
    onFallback();
  }
  navegador.addEventListener('pagehide', aoSair);
  navegador.addEventListener('pageshow', aoVoltar);
  timer = setTimeout(fallback, 8000);
  try { navegador.location.assign(destino); }
  catch { limpar(); onFallback(); }
  return limpar;
}
