import { createClient } from "npm:@supabase/supabase-js@2";

const URL_SUPABASE = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const MP_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
// Token global pertence a um único vendedor: mesma proteção do criar-checkout.
const EMPRESA_MP = Deno.env.get('MERCADO_PAGO_EMPRESA_ID');
const API = 'https://api.mercadopago.com/v1/orders';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { 'Cache-Control':'no-store', 'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS' };
const resposta = (data: unknown, status = 200) => Response.json(data,{status,headers});
type Preparacao = { acao: string; pagamento_id: string; empresa_id: string; claim_id: string;
  idempotency_key: string; order_id: string; payment_id: string; valor: string | number; moeda: string };
type Refund = { id?: string; transaction_id?: string; amount?: string; status?: string };
type Order = { id?: string; external_reference?: string; total_amount?: string; total_paid_amount?: string;
  status?: string; status_detail?: string; transactions?: {
    payments?: { id?: string; amount?: string; status?: string; status_detail?: string }[]; refunds?: Refund[] } };

function centavos(valor: unknown): number | null {
  const texto=String(valor ?? '');
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return null;
  const [inteiro,fracao='']=texto.split('.');
  const n=Number(inteiro)*100+Number(fracao.padEnd(2,'0'));
  return Number.isSafeInteger(n) && n>0 ? n : null;
}
function provaRefund(order: Order, p: Preparacao) {
  const refunds=order?.transactions?.refunds;
  if (order?.id!==p.order_id || !['processed','refunded'].includes(order.status || '')
    || order.status_detail!=='refunded' || !Array.isArray(refunds) || refunds.length!==1) return null;
  const r=refunds[0];
  if (!r || typeof r.id!=='string' || !r.id.trim() || r.id.length>200 || r.transaction_id!==p.payment_id
    || r.status!=='processed' || centavos(r.amount)===null || centavos(r.amount)!==centavos(p.valor)) return null;
  return {order_id:order.id,payment_id:r.transaction_id,status:order.status,status_detail:order.status_detail,
    refund_id:r.id,refund_status:r.status,amount:r.amount};
}
function orderCorresponde(order: Order, p: Preparacao) {
  const payments=order?.transactions?.payments;
  return order?.id===p.order_id && order.external_reference===p.pagamento_id
    && centavos(order.total_amount)!==null && centavos(order.total_amount)===centavos(p.valor)
    && Array.isArray(payments) && payments.length===1 && payments[0]?.id===p.payment_id
    && centavos(payments[0].amount)===centavos(p.valor);
}
async function consultarOrder(p: Preparacao) {
  const r=await fetch(`${API}/${encodeURIComponent(p.order_id)}`,{
    headers:{Authorization:`Bearer ${MP_TOKEN}`,Accept:'application/json'},
    signal:AbortSignal.timeout(15000),redirect:'error',
  });
  if (!r.ok) return null;
  return await r.json() as Order;
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
    if (request.method!=='POST') return resposta({erro:'Método não permitido.'},405);
    const bearer=request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearer) return resposta({erro:'Autenticação obrigatória.'},401);
    if (!URL_SUPABASE || !SERVICE_KEY || !ANON_KEY || !MP_TOKEN || !EMPRESA_MP || !UUID.test(EMPRESA_MP)) {
      return resposta({erro:'Reembolso indisponível. Configuração pendente.'},503);
    }
    if (!request.headers.get('content-type')?.includes('application/json')) return resposta({erro:'JSON obrigatório.'},415);
    let pagamentoId: string;
    try {
      const body=await request.json();
      if (!body || Object.keys(body).some(k=>k!=='pagamentoId') || !UUID.test(body.pagamentoId || '')) throw Error();
      pagamentoId=body.pagamentoId;
    } catch { return resposta({erro:'Informe somente o identificador interno do pagamento.'},400); }
    const admin=createClient(URL_SUPABASE,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    let auth;
    try { auth=await admin.auth.getUser(bearer); } catch { return resposta({erro:'Sessão inválida.'},401); }
    if (auth.error || !auth.data.user?.id) return resposta({erro:'Sessão inválida.'},401);
    const user=createClient(URL_SUPABASE,ANON_KEY,{global:{headers:{Authorization:`Bearer ${bearer}`}},
      auth:{persistSession:false,autoRefreshToken:false}});
    let p: Preparacao;
    try {
      const {data,error}=await user.rpc('loja_preparar_reembolso',{
        p_pagamento_id:pagamentoId,p_empresa_operadora:EMPRESA_MP,
      });
      if (error || !data) return resposta({erro:'Pagamento inacessível ou não elegível para reembolso.'},409);
      p=data as Preparacao;
    } catch { return resposta({erro:'Não foi possível preparar o reembolso. Atualize a conciliação.'},503); }
    if (p.acao==='confirmado') return resposta({estado:'confirmado'});
    if (p.acao==='ocupado') return resposta({estado:'processando'},202);
    // Defesa em profundidade: nenhuma chamada ao provedor antes da preparação autorizada.
    if (p.acao!=='enviar' || p.pagamento_id!==pagamentoId || p.empresa_id!==EMPRESA_MP
      || p.moeda!=='BRL' || !centavos(p.valor) || !p.order_id || !p.payment_id
      || !UUID.test(p.claim_id) || !UUID.test(p.idempotency_key)) {
      return resposta({erro:'Preparação inconsistente. Verificação necessária.'},409);
    }
    async function concluir(prova: unknown, codigo='mp_aguardando') {
      const {data,error}=await admin.rpc('loja_concluir_reembolso',{
        p_pagamento_id:pagamentoId,p_claim_id:p.claim_id,p_evidencia:prova,p_erro_codigo:codigo,
      });
      if (error) throw Error('Persistência indisponível');
      return data;
    }
    async function pendente(codigo: string) {
      try { await concluir(null,codigo); } catch { /* A próxima claim reutiliza a mesma idempotency key. */ }
      return resposta({estado:'verificacao_necessaria',mensagem:'Verificação necessária. Consulte novamente esta mesma operação.'},202);
    }
    try {
      // GET primeiro: recupera refund já processado sem repetir uma ação financeira.
      const antes=await consultarOrder(p);
      if (!antes || !orderCorresponde(antes,p)) return await pendente('mp_invalido');
      let prova=provaRefund(antes,p);
      if (prova) {
        const estado=await concluir(prova);
        return resposta({estado});
      }
      // V1 exige exatamente um pagamento acreditado e nenhum refund prévio/parcial.
      if (antes.status!=='processed' || antes.status_detail!=='accredited'
        || centavos(antes.total_paid_amount)!==centavos(p.valor)
        || antes.transactions?.payments?.[0]?.status!=='processed'
        || antes.transactions?.payments?.[0]?.status_detail!=='accredited'
        || (antes.transactions?.refunds?.length ?? 0)!==0) return await pendente('mp_invalido');
      const r=await fetch(`${API}/${encodeURIComponent(p.order_id)}/refund`,{
        method:'POST',headers:{Authorization:`Bearer ${MP_TOKEN}`,Accept:'application/json',
          'Content-Type':'application/json','X-Idempotency-Key':p.idempotency_key},
        // Refund TOTAL: nenhum body e nenhum amount enviado.
        signal:AbortSignal.timeout(15000),redirect:'error',
      });
      if (r.ok) {
        let body: Order | null = null;

        try {
          body=await r.json() as Order;
        } catch {
          // 2xx sem JSON conclusivo continua sendo uma resposta ambígua.
        }

        if (body) {
          prova=provaRefund(body,p);

          if (prova) {
            return resposta({estado:await concluir(prova)});
          }
        }
      }

      // 2xx incompleto, processamento assíncrono, conflito/lock ou outro
      // retorno não conclusivo podem significar que o refund já foi aceito.
      // Consultamos novamente a Order oficial antes de devolver para conciliação.
      const depois=await consultarOrder(p);

      if (depois && orderCorresponde(depois,p)) {
        prova=provaRefund(depois,p);

        if (prova) {
          return resposta({estado:await concluir(prova)});
        }
      }

      // Sem prova oficial suficiente. Uma nova claim poderá repetir o POST
      // usando exatamente a MESMA idempotency key persistida.
      return await pendente(r.ok ? 'mp_aguardando' : 'mp_http');
    } catch {
      // Timeout ou falha de transporte é ambíguo: o POST pode ter chegado ao MP.
      // Antes de permitir retry futuro, tentamos reconciliar oficialmente.
      try {
        const depois=await consultarOrder(p);

        if (depois && orderCorresponde(depois,p)) {
          const prova=provaRefund(depois,p);

          if (prova) {
            return resposta({estado:await concluir(prova)});
          }
        }
      } catch {
        // Sem prova oficial suficiente, permanece em verificação necessária.
      }

      return await pendente('transporte');
    }
  },
};
