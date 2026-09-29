-- 10B.1: somente persistência estrutural. Sem credenciais, seeds ou chamadas externas.
-- O catálogo interno permanece autoridade comercial. IDs externos são opacos.
create table public.plano_gateway_config (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references public.planos(id) on delete restrict,
  gateway text not null check (gateway = 'mercadopago'),
  ambiente text not null check (ambiente in ('teste', 'producao')),
  conta_externa_id text not null
    check (conta_externa_id = btrim(conta_externa_id) and conta_externa_id <> ''),
  periodicidade text not null check (periodicidade in ('mensal', 'anual')),
  external_plan_id text not null
    check (external_plan_id = btrim(external_plan_id) and external_plan_id <> ''),
  ativo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plano_gateway_config_plano_unique
    unique (plano_id, gateway, ambiente, conta_externa_id, periodicidade),
  constraint plano_gateway_config_externo_unique
    unique (gateway, ambiente, conta_externa_id, external_plan_id)
);

comment on table public.plano_gateway_config
is 'Mapeamento backend de plano/periodicidade para preapproval_plan, segregado por ambiente e conta. Nunca armazenar tokens ou secrets. Inativo até verificação explícita futura.';
comment on column public.plano_gateway_config.conta_externa_id
is 'Identificador público da conta recebedora/merchant, não credencial e não payer_id do cliente.';
comment on column public.plano_gateway_config.external_plan_id
is 'Mercado Pago preapproval_plan.id. Identificador opaco; não representa preço nem autorização financeira.';

create trigger trg_plano_gateway_config_updated_at
before update on public.plano_gateway_config
for each row execute function public.set_updated_at();

alter table public.plano_gateway_config enable row level security;
-- Sem policies de frontend. ACL explícita independe dos defaults do projeto.
revoke all on table public.plano_gateway_config from public, anon, authenticated, service_role;
grant select, insert, update on table public.plano_gateway_config to service_role;

-- Referência de correlação, distinta do preapproval_id e do payer/customer.
-- Nullable e sem backfill: não altera assinaturas legadas nem a fundadora.
alter table public.assinaturas
  add column gateway_environment text,
  add column gateway_account_id text,
  add column gateway_external_reference text,
  add constraint assinaturas_gateway_namespace_check
    check (
      (gateway_environment is null and gateway_account_id is null)
      or (
        gateway is not null and btrim(gateway) <> ''
        and gateway_environment is not null
        and gateway_environment in ('teste', 'producao')
        and gateway_account_id is not null
        and gateway_account_id = btrim(gateway_account_id)
        and gateway_account_id <> ''
      )
    ),
  add constraint assinaturas_gateway_external_reference_check
    check (gateway_external_reference is null or (
      gateway is not null
      and gateway_environment is not null
      and gateway_account_id is not null
      and gateway_external_reference = btrim(gateway_external_reference)
      and gateway_external_reference <> ''
    ));

create unique index ux_assinaturas_gateway_external_reference
on public.assinaturas(
  gateway, gateway_environment, gateway_account_id, gateway_external_reference
)
where gateway_external_reference is not null;

comment on column public.assinaturas.gateway_environment
is 'Ambiente do vínculo externo: teste ou producao, com a mesma semântica de plano_gateway_config. NULL em legado sem namespace comprovado.';
comment on column public.assinaturas.gateway_account_id
is 'Conta recebedora/merchant do vínculo externo; corresponde a plano_gateway_config.conta_externa_id. Não é payer_id nem credencial. Deve ser preenchida junto com gateway_environment.';

comment on column public.assinaturas.gateway_external_reference
is 'Referência opaca gerada pelo backend e enviada como external_reference. Não autentica webhook nem substitui o vínculo de tenant. Preapproval.id usa gateway_subscription_id; payer_id usa gateway_customer_id.';

-- Resolução futura: o endpoint/credencial validada determina ambiente e conta;
-- buscar a assinatura pelo namespace completo, nunca pela referência isolada.
-- Namespace NULL é legado não reconciliável automaticamente; não adivinhar conta.
-- O índice histórico (gateway, gateway_subscription_id) permanece inalterado:
-- é mais restritivo e continua impedindo reutilização de preapproval_id entre contas.

-- Contrato futuro de eventos (não implementado aqui):
-- external_source deve distinguir gateway/ambiente/conta de forma estável;
-- external_event_id identifica o evento, nunca apenas data.id do recurso;
-- external_charge_id identifica authorized_payments.id para cobrança recorrente.
-- payment.id, quando necessário, é evidência adicional, sem alternar a identidade
-- canônica de cobrança entre reentregas. Validar x-signature e consultar o recurso
-- autenticadamente antes de invocar RPCs comerciais. Nenhum status externo ativa
-- acesso diretamente. A10 exige timestamp efetivo comprovado do pagamento.
-- A correlação anterior à criação da nova assinatura pós-trial exige um registro
-- de intenção na futura etapa de checkout; não vincular o preapproval ao trial
-- antigo como se já fosse a nova assinatura paga.
