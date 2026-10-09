# Testes locais da integração logística

`npm run test:logistica` executa as migrations reais em PostgreSQL WASM (PGlite),
em memória, sem Supabase, credenciais externas ou dados reais. A suíte entra
em `npm run test:run`.

`npm run test:logistica:native` usa um PostgreSQL nativo descartável, com porta
livre em **127.0.0.1**, diretório temporário e duas conexões concorrentes. Não
aceita DATABASE_URL nem conexão remota. Não executar como root. O servidor é
encerrado e os dados temporários removidos ao final.

A modalidade WASM não prova locking entre conexões: o teste concorrente é
explicitamente ignorado nela. A promoção exige passar a modalidade nativa em
ambiente com IPC/memória compartilhada disponível. Neste ambiente Codex, initdb
foi bloqueado por `shmget: Operation not permitted`; não houve elevação de
permissões para contornar essa restrição.

A fixture `schema-legado.sql` reconstrói apenas o contrato necessário de
Clientes/Expedição/peças. As migrations existentes reais de pedidos, itens,
pagamentos e vendas são aplicadas antes das duas novas migrations. A função
de autorização por empresa é simulada por contexto de sessão **somente nesta
fixture**. Validar as policies/grants e tipos/defaults das tabelas legadas em
homologação antes de promover.

São criadas 22 retiradas sintéticas antes da nova migration para provar a
compatibilidade dos defaults e ausência de backfill. Os 22 pedidos remotos
informados pelo usuário não foram lidos nem alterados por esses testes.

As injeções de falha, funções `test_*` e alterações temporárias de constraints
existem apenas no banco descartável. Nenhum helper logístico modifica pagamento,
venda, estoque, carrinho, Mercado Pago ou checkout público.

Operações internas disponíveis (após futura aplicação autorizada):

- `loja_integrar_pedido_expedicao(empresa_id, pedido_id)` — somente service_role.
- `loja_reprogramar_expedicao(empresa_id, pedido_id)` — somente service_role;
  não reabre casos de vínculo ausente/inconsistente.
- `loja_expedicao_backlog(empresa_id, limite)` — somente service_role; sem PII.
- `loja_expedicao_ler(empresa_id)` e `loja_expedicao_finalizar(...)` — ERP
  autenticado, com autorização operacional da empresa.

Não há scheduler nem entrada pública para `forma_entrega='envio'`. A confirmação
comercial permanece fora da transação logística. Não usar o webhook financeiro
como executor deste helper.
