# Conciliação manual de pagamentos tardios

Implementação local em `feature/loja-online`. Nenhum SQL remoto, refund, deploy, commit ou push foi executado nesta missão. Os dois casos HML permanecem reservados para autorização posterior.

## Contrato e arquitetura

Vendas → Loja Online abre em **Vendas confirmadas**, preservando a listagem anterior. **Conciliação** consulta até 100 pagamentos Mercado Pago `paid`, com `paid_at`, cujo pedido está `expirado`, sem `pago_em` e sem venda vinculada ao pedido OU ao pagamento. A listagem não modifica dados. Antes do primeiro envio, o navegador exige confirmação explícita e bloqueia cliques enquanto a requisição está em curso.

O navegador envia apenas `{ pagamentoId }` para `mercado-pago-reembolsar`. A Edge valida o JWT com `auth.getUser`. A preparação usa cliente Supabase com esse JWT e exige `usuario_empresa_operacional_ativo`. A empresa configurada em `MERCADO_PAGO_EMPRESA_ID` vincula o token global ao vendedor correto, seguindo o checkout existente. Não há autoridade conferida a empresa, valor ou identificadores MP vindos do navegador.

`pagamento_eventos_loja` representa eventos recebidos pelo webhook, com hash do payload e identidade do evento do provedor, não tentativas manuais do operador. Por isso a migration nova `20261009010000_loja_reembolsos_tardios.sql` cria `loja_reembolsos`: uma operação por pagamento, tenant, pedido, primeiro/último operador, chave idempotente UUID, claim, prazo, contador, timestamps, estado e prova mínima saneada. Não é um histórico imutável de cada requisição: registra a operação e sua tentativa mais recente. Não armazena token ou payload bruto.

RPCs novas, todas SECURITY DEFINER, owner postgres e search_path vazio:

| RPC | Autorização | Papel |
| --- | --- | --- |
| loja_painel_conciliacao(uuid) | authenticated + acesso operacional | Listagem tenant-aware |
| loja_preparar_reembolso(uuid,uuid) | authenticated + acesso operacional | Revalidar, criar/reivindicar operação |
| loja_concluir_reembolso(uuid,uuid,jsonb,text) | somente service_role | Registrar ambiguidade ou concluir com prova |

DML e SELECT diretos na tabela são revogados inclusive de service_role. RLS habilitada; uso pelas RPCs. As FKs compostas preservam o tenant e usam RESTRICT. A migration não contém backfill nem altera registros existentes.

## Concorrência e resultado ambíguo

Ordem dos locks: **pedido → pagamento → operação**, compatível com `20261007223000_alinha_ordem_locks_loja.sql`. Os locks terminam antes de qualquer HTTP. Claim de 90 segundos com identificador novo a cada retomada impede um worker antigo de finalizar uma tentativa posterior.

Só a primeira preparação admite POST. Todas as retomadas, inclusive após claim vencido, fazem exclusivamente GET da mesma Order; nunca uma segunda chave ou novo POST. A chave original permanece persistida. Duas abas encontram a mesma operação; a segunda recebe `processando` enquanto o claim estiver ativo.

A Edge consulta primeiro a Order e valida identidade, external_reference, valor e único pagamento. Refund total exige pagamento acreditado, valor integral e ausência de refund anterior. POST usa body vazio e X-Idempotency-Key persistida. HTTP 2xx sozinho não confirma: exige Order correta, status `processed` ou `refunded`, detail `refunded`, um refund `processed`, transaction_id correspondente e valor integral. Evidência incompleta mantém `Verificação necessária`.

Após prova oficial, a transação muda somente `pagamentos_loja.status`, `refunded_at`, `updated_at`, além da auditoria. Preserva `paid_at`; pedido permanece expirado, `reembolsado_em` intocado; não cria venda nem altera a peça, mesmo se ela já foi revendida por outro pedido.

Limitação deliberada: crash ou falha de GET antes do primeiro POST também consome a primeira admissão. O operador poderá consultar, mas o sistema não reenvia automaticamente. Se o MP nunca recebeu o refund, será necessária revisão operacional futura. Usuário autorizado pode chamar a RPC de preparação diretamente e provocar essa situação em seu próprio tenant, mas não consegue concluir nem disparar refund sem a Edge. Preferiu-se disponibilidade conservadora a risco financeiro. Não apagar a operação para tentar novamente.

## Webhook e evidência oficial

O webhook atual só confirma `processed/accredited`; outras Orders que passam pela validação são registradas como `ignored`. Não foi alterado e não finaliza refunds. A configuração/entrega efetiva de notificações de refund não foi consultada remotamente. A correção local de uma resposta ambígua depende da consulta explícita pela Edge, não da chegada do webhook.

Referências oficiais consultadas:

- [Refund de Order Checkout Pro](https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-pro/refund-order/post): endpoint, headers, chave idempotente e refund total com body vazio.
- [Resposta de refund Checkout API](https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/refund-order/post): identidade, status e transactions.refunds.
- [Orders e processamento](https://www.mercadopago.com.br/developers/pt/docs/mp-point/payment-processing): consulta oficial e estados de refund.

A aceitação é conservadora: resposta oficial com formato diferente ou refund parcial exige revisão; não é convertida silenciosamente em sucesso.

## Validação local

- SQL real da migration aplicado em PGlite descartável sobre as migrations de pedidos, pagamentos e vendas; legado mínimo e helper de acesso simulados conforme padrão dos testes existentes.
- 18 testes SQL: elegibilidade, tenant, provider/IDs/moeda, chave estável, claim, ACL/owner/search_path, recusa de prova inválida, venda concorrente e preservação de todos os campos comerciais não autorizados.
- 17 testes da Edge com auth/RPC/fetch simulados: sucesso, erro, resposta inválida/ambígua, timeout, duas requisições, recuperação GET e falha local após sucesso externo.
- `npm run test:run -- --no-file-parallelism`: 27 arquivos, 390 passaram e 5 ignorados.
- `node --test supabase/functions/mercado-pago-reembolsar/reembolso.test.mjs supabase/functions/loja-checkout/checkout.test.mjs tests/slug-publico/endpoints-slug.test.mjs`: 28 passaram.
- `npm run build`: sucesso; avisos de Browserslist desatualizado e bundle maior que 500 kB.
- PGlite usa uma conexão: dupla preparação testa a máquina de estados, não contenção real entre sessões PostgreSQL. Dois requests Edge são testados com mocks. Contenção real/gateway/provedor e UX interativa dependem da homologação abaixo.
- Deno não disponível localmente; os testes executam TypeScript com stripTypeScriptTypes do Node, não equivalem a `deno check` ou execução do gateway Supabase.

## Roteiro posterior HML — somente após autorização

1. Confirmar explicitamente projeto `xmjalhnpsgqqkwyczkaq`, nunca `rhzuooaukzdqlqnhlzmk`; não confiar no projeto linkado da CLI. Revisar a migration e aplicar/deploy somente com nova autorização. Publicar a Edge com JWT verificado e confirmar configuração do vendedor HML (`MERCADO_PAGO_EMPRESA_ID`) e secrets existentes sem imprimi-los. Frontend e backend devem entrar juntos; sem a migration a aba exibirá erro amigável.
2. Antes de qualquer ação financeira, guardar o resultado do SELECT abaixo e o estado de `pecas.vendido` para cada peça retornada, além das vendas válidas dessas peças. Os dois pares são:
   - pedido `e99c659c-2851-4e24-8d26-e79378497c4e` / pagamento `b9dd4142-b67a-459b-b075-7c61167f487c`;
   - pedido `24e75145-af24-4fb1-89d6-f2cc69de54ed` / pagamento `69091157-994a-421a-a848-3b7cba63500c`.
3. Abrir HML autenticado como operador ativo da empresa. Confirmar que Vendas confirmadas mantém apenas pedidos pagos e que Conciliação lista os dois casos e nenhuma venda normal/pagamento pending.
4. No primeiro caso, clicar Reembolsar e **cancelar** a confirmação: nenhuma chamada à Edge deve ocorrer. Depois autorizar expressamente o refund desse caso, confirmar o diálogo e tentar clique duplo/segunda aba: deve existir uma única operação/chave. Nenhum teste financeiro real está autorizado por este documento.
5. Conferir no MP o refund integral e no banco o pagamento `refunded`, `refunded_at` preenchido, `paid_at` igual ao snapshot. Pedido e `reembolsado_em` devem permanecer idênticos; nenhuma venda nova e nenhuma alteração da peça revendida. Auditoria deve ter `confirmado` e prova mínima. O caso sai da Conciliação.
6. Repetir a invocação para o mesmo pagamento: deve responder confirmado sem novo HTTP financeiro. Testar identidade sem acesso operacional/outro tenant: recusa e nenhuma chamada MP.
7. Reservar o segundo caso para teste posterior, com autorização específica, de perda de resposta. Após `Verificação necessária` (ou 90 s se worker morrer), usar **Consultar reembolso**. Deve fazer somente GET da mesma Order e concluir apenas com prova; se ainda processing, permanecer aberto. Não criar novo pagamento/chave/path nem apagar auditoria.
8. Inspecionar notificações reais: refund não deve reabrir pedido, criar venda nem transformar pagamento refunded em paid. Se chegar evento de refund, o webhook atual não deve confirmá-lo como compra. Não depender dele para finalizar a conciliação.

SELECT proposto, NÃO executado (somente em HML após autorização):

```sql
SELECT p.id AS pedido_id, p.empresa_id, p.status AS pedido_status,
       p.pago_em, p.reembolsado_em,
       pg.id AS pagamento_id, pg.status AS pagamento_status,
       pg.valor, pg.moeda, pg.paid_at, pg.refunded_at, pg.updated_at,
       (SELECT count(*) FROM public.vendas_loja v
        WHERE v.empresa_id=p.empresa_id
          AND (v.pedido_id=p.id OR v.pagamento_id=pg.id)) AS vendas_associadas,
       (SELECT jsonb_agg(jsonb_build_object('peca_id',i.peca_id,'vendido',pc.vendido))
        FROM public.pedido_itens_loja i
        JOIN public.pecas pc ON pc.empresa_id=i.empresa_id AND pc.id=i.peca_id
        WHERE i.empresa_id=p.empresa_id AND i.pedido_id=p.id) AS pecas,
       r.estado AS refund_estado, r.tentativas, r.refund_id, r.confirmado_em
FROM public.pedidos_loja p
JOIN public.pagamentos_loja pg ON pg.empresa_id=p.empresa_id AND pg.pedido_id=p.id
LEFT JOIN public.loja_reembolsos r ON r.empresa_id=pg.empresa_id AND r.pagamento_id=pg.id
WHERE p.empresa_id='52eb6c97-cf27-4d85-84c1-ae72258dde32'
  AND (p.id,pg.id) IN (
    ('e99c659c-2851-4e24-8d26-e79378497c4e'::uuid,'b9dd4142-b67a-459b-b075-7c61167f487c'::uuid),
    ('24e75145-af24-4fb1-89d6-f2cc69de54ed'::uuid,'69091157-994a-421a-a848-3b7cba63500c'::uuid)
  );
```
