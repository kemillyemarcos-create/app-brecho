# Loja K.Chic — auditoria e preparação de produção

Data: 2026-10-02. Raiz: ~/app-brecho. Branch preservada: feature/loja-online.

## Conclusão

Implementação avançada com fluxo ponta a ponta VALIDADO em Sandbox do Mercado Pago. Houve deploy controlado das Edge Functions, alteração controlada de secrets, pagamentos Sandbox e validação real do Webhook. Isso NÃO certifica produção: credenciais produtivas, antiabuso e headers da hospedagem ainda precisam ser validados. A concorrência de reserva da mesma publicação foi validada no banco remoto. O isolamento RLS multiempresa entre usuários autenticados de tenants distintos foi validado no banco remoto.

A primeira venda produtiva controlada depende de configuração do vendedor de produção, validação de segurança operacional e execução acompanhada. As migrations 20260930141429 e 20261002010000 estão aplicadas no remoto; isso ainda não certifica produção.

## Inventário inicial preservado

Modificados antes desta missão: src/App.jsx, supabase/config.toml e supabase/functions/mercado-pago-webhook/index.ts.
Não rastreados antes desta missão: src/features/loja/, supabase/functions/loja-carrinho/, supabase/functions/loja-checkout/ e supabase/migrations/20260930141429_loja_catalogo_publico_por_slug.sql. O arquivo temporário supabase/functions/mercado-pago-webhook/hmac.test.mjs foi removido antes do fechamento.
O diff contra HEAD contém esse trabalho anterior; não é somente o delta desta missão.

## Diagnóstico inicial

A. Existiam catálogo público, ficha do produto, sacola, funções de pedido/checkout, tabelas e RPCs transacionais.
B. Faltavam ligação visual ao pagamento, consulta do pedido e administração da publicação no ERP.
C. Botão de pagamento permanentemente disabled; CORS do gateway incompatível com headers do Supabase JS; parser visual falhava com preço como R$ 1.299,90. Vitest capturava indevidamente testes node:test.
D. Além dessas falhas, credenciais de produção e estado das migrations remotas não estão comprovados.
E. Testes locais, build e navegação somente de leitura puderam ser executados imediatamente.
F. Segurança contra abuso e conciliação operacional ainda precisam ser concluídas antes de abertura pública. A concorrência de reserva da mesma publicação foi validada no banco remoto. O isolamento RLS multiempresa entre usuários autenticados foi validado no banco remoto.

## Correções desta missão

- CheckoutLoja: identificação, criação de pedido, preparação de checkout, link HTTPS para Mercado Pago, retomada na sessão e consulta ao banco. Nenhuma confirmação por parâmetros de retorno do navegador.
- LojaPublica: botão de checkout habilitado conforme sacola, acesso ao acompanhamento, galeria e preços normalizados.
- LojaGestao + App: seção Loja Online para selecionar peça existente, salvar rascunho, enviar fotos ao bucket próprio, publicar/despublicar e ler pedidos recentes. Não adiciona fotos ao cadastro operacional do estoque.
- loja-checkout: operação consultar, com token forte e empresa resolvida pelo slug. Resposta sem nome/CPF/telefone/tokens.
- mercado-pago-criar-checkout: CORS e vinculação obrigatória do token global ao tenant via MERCADO_PAGO_EMPRESA_ID. Sem configuração retorna 503; tenant diferente retorna 403 antes de POST no gateway.
- mercado-pago-webhook: validação do total oficial e total pago contra pagamentos_loja.valor/BRL; HMAC ajustado para aceitar somente assinatura criptograficamente válida usando data.id original ou lowercase, conforme comportamento real observado no Sandbox; diagnósticos temporários removidos.
- vitest.config.js separa testes de aplicação dos testes node:test.
- No commit anterior da Loja Online, package-lock.json foi restaurado porque package.json não havia mudado; naquele estado, npm audit apontava 20 vulnerabilidades no total e 16 com --omit=dev. A correção foi tratada posteriormente em alteração separada e controlada de dependências.
- Migration aditiva 20261002010000_loja_consulta_pedido_e_painel.sql cria consulta mínima por token (service_role) e painel tenant-aware (authenticated).

Arquivos editados/criados nesta missão:

- src/App.jsx
- src/features/loja/LojaPublica.jsx
- src/features/loja/CheckoutLoja.jsx (novo)
- src/features/loja/LojaGestao.jsx (novo)
- src/features/loja/preco.js (novo)
- src/features/loja/preco.test.js (novo)
- supabase/config.toml
- supabase/functions/loja-carrinho/deno.json (novo)
- supabase/functions/loja-carrinho/index.ts (novo)
- supabase/functions/loja-checkout/index.ts
- supabase/functions/loja-checkout/checkout.test.mjs (novo)
- supabase/functions/mercado-pago-criar-checkout/index.ts
- supabase/functions/mercado-pago-webhook/index.ts
- supabase/functions/mercado-pago-webhook/hmac.test.mjs (temporário; removido antes do commit)
- supabase/migrations/20260930141429_loja_catalogo_publico_por_slug.sql (nova, aplicada no remoto)
- supabase/migrations/20261002010000_loja_consulta_pedido_e_painel.sql (nova, aplicada no remoto)
- vitest.config.js (novo)
- docs/loja-producao-auditoria.md (este relatório)

## Fluxo e evidência no código

| Etapa | Implementação/evidência | Limite ou ação |
|---|---|---|
| Catálogo | LojaPublica → loja_catalogo_publico_por_slug → loja_catalogo_publico | Busca/filtros locais sobre primeira página de 24; paginação comercial ainda pendente |
| Produto | Nome/preço/obs vêm de pecas; metadados/fotos de loja_publicacoes e loja_publicacao_fotos | Regras de publicação incluem obs, foto e demais campos, inclusive categoria |
| ERP → Loja | loja_salvar_rascunho recebe peca_id existente; unique empresa/peça | Não duplica peça; publicar usa RPC com validação server-side |
| Fotos | Bucket loja-produtos, caminho empresa/publicação/arquivo; até 10 MB JPEG/PNG/WebP | Bucket é público: não serve para mídia privada; interface inicial não inclui reordenação/remoção |
| Sacola | Token aleatório 256 bits; hash no banco; RPCs service_role; máximo 10 itens | Token no localStorage é uma capability; não é cookie HttpOnly; cronômetro visual não é relógio autoritativo |
| Pedido | loja_criar_pedido_checkout recalcula preços, faz snapshot, deriva token idempotente e trava carrinho/publicações/peças | Entrega existente: retirada, frete zero; CPF valida tamanho, não dígitos verificadores |
| Preparação | loja_preparar_pagamento trava pedido e reutiliza tentativa ativa | Não depende de preço/empresa enviados pelo navegador |
| Order | POST /v1/orders, type online, processing_mode manual; external_reference = UUID do pagamento; X-Idempotency-Key = UUID | Implementação corresponde a Checkout Pro via Orders com checkout_url, apesar da denominação Checkout API na missão |
| Associação | loja_registrar_checkout_pagamento grava Order.id em provider_checkout_id, não permite substituição | Token global agora restrito à empresa configurada |
| HMAC | Query data.id, request-id e ts; UTF-8; HMAC SHA-256; comparação constante; aceita apenas HMAC válido para ID original ou lowercase | Não há janela de frescor ts; replay não é bloqueado por tempo, mas consulta oficial/idempotência limitam efeitos financeiros |
| Fonte oficial | GET /v1/orders/{id}, ID exato, external_reference UUID, provider_checkout_id e valores conferidos | GET só depois de HMAC válido; não existe bypass |
| Evento | loja_registrar_evento_pagamento com unique provider/evento/empresa, hash e retry | Duplicidade depende da RPC; testes locais simulam seu retorno |
| Confirmação | Order processed/accredited e pagamento acreditado → loja_confirmar_pagamento | provider_payment_id vem da transação, não da Order |
| Estoque | confirmação transacional trava peças, cria vendas_loja e atualiza pecas.vendido | UNIQUE empresa/peça e trigger impedem venda durante pedido ativo; precisa teste concorrente no Postgres |
| Atraso | RPC marca pagamento paid e pedido expirado se notificação chega depois do prazo, sem baixa automática | Dinheiro recebido não equivale a pedido confirmado; exige conciliação/reembolso assistido |
| ERP | pecas atualizadas, vendas_loja e snapshot de custo; painel novo mostra pedidos e pagamento | Financeiro legado usa pagamentosClientes: não tratar sua marcação agregada como verdade para pedidos da Loja |
| Retorno | Cliente volta à aba da loja e consulta estado persistido | Não há URL de retorno automática configurada nesta alteração |

## Segurança explícita

| Controle | Evidência / situação |
|---|---|
| Secrets/frontend | Não foram encontrados nomes de Access Token/Webhook Secret/service_role nos módulos públicos da Loja; uso no backend via Deno.env. Nenhum valor de credencial foi obtido ou impresso |
| RLS | Habilitada nas tabelas; carrinhos/pedidos/pagamentos sem acesso direto anon/authenticated; leitura administrativa de publicações limitada por empresa |
| RPCs | Mutação financeira restrita a service_role; SECURITY DEFINER e search_path vazio; painel verifica usuario_empresa_operacional_ativo is true |
| Tenant | FKs compostas, filtros empresa_id, slug resolvido no servidor; token global limitado à empresa configurada |
| Autenticação | verify_jwt=false nos endpoints públicos é intencional: capability de carrinho/pedido ou HMAC no webhook. Não equivale a ausência de validação |
| Inputs/queries | UUID/token/slug/tamanhos validados; parâmetros RPC, sem SQL dinâmico observado; validação de CPF ainda superficial |
| XSS | React renderiza texto; nenhuma inserção HTML bruta na Loja. Tokens no storage exigem proteção contra XSS na hospedagem |
| Uploads | Storage com tenant, MIME/tamanho e bloqueio de fotos de publicação ativa; servidor valida existência do objeto |
| HTTPS/headers | Gateway HTTPS; respostas no-store. CSP/HSTS e demais headers da hospedagem não foram comprovados; precisam configuração/verificação |
| CORS | Permite headers Supabase; origem * para endpoints públicos. CORS não substitui autenticação ou rate limit |
| Abuso | Não há rate limit distribuído/CAPTCHA nos endpoints auditados; reserva de peça única pode ser abusada. Bloqueia abertura pública sem mitigação |
| Logs | Diagnósticos HMAC temporários removidos após a investigação; não permanece log de assinatura completa nem secrets MP_HMAC_DIAGNOSTICO_* |
| Replay/duplicidade | Sem tolerância temporal do ts; GET oficial e RPC idempotente. Não aceitar corpo como fonte da verdade |
| Dependências | Após atualização controlada: shadcn movido para devDependencies, @supabase/supabase-js atualizado para 2.117.2 e npm audit --omit=dev = 0 vulnerabilidades | Permanecem vulnerabilidades apenas em dependências de desenvolvimento; não bloqueiam a execução produtiva da aplicação |

## Testes executados

- npm run test:run: 254 aprovados em 15 arquivos (249 existentes + 5 casos de preços).
- O teste temporário supabase/functions/mercado-pago-webhook/hmac.test.mjs foi usado durante a investigação e removido antes do commit final.
- node --test supabase/functions/loja-checkout/checkout.test.mjs: 7 aprovados.
- npm run build: aprovado após atualização; avisos de bundle >500 kB e uso preexistente de __dirname na configuração Vite.
- Lint dos módulos da Loja e vitest.config.js: zero erros, um aviso preexistente de dependências de hook.
- npm run lint global: 116 erros e 8 avisos na avaliação inicial; dívida preexistente fora desta correção.
- git diff --check: aprovado.
- Após a correção de dependências: npm audit --omit=dev = 0 vulnerabilidades; npm audit completo ainda aponta vulnerabilidades apenas no conjunto de desenvolvimento.
- Navegador: catálogo, sacola, checkout e acompanhamento exercitados. Foram criados pedidos Sandbox e realizados pagamentos controlados para validar o fluxo ponta a ponta.
- NÃO executados: pagamento de PRODUÇÃO, venda concorrente completa até confirmação financeira, validação produtiva de headers/antiabuso, teste específico como anon nas superfícies administrativas e Deno typecheck local. O teste simultâneo de reserva da mesma publicação foi executado com duas conexões independentes ao banco remoto. O isolamento entre dois tenants autenticados foi exercitado no banco remoto; Edge Functions necessárias foram publicadas durante a validação Sandbox.

## Matriz de liberação

VERDE = evidência local suficiente para o item indicado; AMARELO = depende de configuração; VERMELHO = validação/correção pendente que impede declarar produção pronta.

| Item | Status | Evidência | Ação |
|---|---|---|---|
| Loja / produto | VERDE (local) | Navegação mobile e catálogo reais somente leitura | Revisão de conteúdo e cadastro final |
| Carrinho | AMARELO | Reserva, expiração de lock e contenção concorrente da mesma publicação validadas no banco remoto; antiabuso não comprovado | Mitigação de abuso/rate limit |
| Checkout | VERDE em Sandbox | Interface, CORS, criação de pedido e checkout validados ponta a ponta | Revalidar com credenciais de produção |
| Pedido / banco | VERDE para fluxo Sandbox | Estados pago/expirado, consulta e persistência validados no banco remoto; painel administrativo isolado por tenant | Manter validação na primeira operação produtiva controlada |
| RLS | VERDE para isolamento autenticado | Usuário K.Chic acessou apenas K.Chic; usuário BRECHO TESTE SAAS acessou apenas sua empresa; chamadas cruzadas de loja_painel_pedidos foram negadas com 42501; loja_publicacoes retornou somente linhas do tenant autenticado | Teste específico de anon permanece separado para superfícies administrativas |
| Pagamento | AMARELO | Token por env, vínculo do vendedor | Configurar credenciais de produção e empresa |
| Webhook Sandbox | VERDE | HMAC validado com notificação real, consulta oficial e confirmação server-side | Configurar e validar separadamente o Webhook de produção |
| ERP recebe venda | VERDE em Sandbox | vendas_loja criada, pecas.vendido=true e publicação removida do catálogo | Revalidar na primeira venda produtiva controlada |
| Estoque / concorrência | VERDE para reserva concorrente | Duas conexões independentes disputaram a mesma publicação: a segunda aguardou o FOR UPDATE e, após o COMMIT da primeira, recebeu 55P03; somente uma reserva permaneceu válida e o lock expirou normalmente | Venda concorrente completa até confirmação financeira permanece para validação controlada |
| Mercado Pago | AMARELO | Configuração manual de produção pendente | Access Token e chave de Webhooks produtivos |
| Supabase | AMARELO | Edge Functions publicadas, secrets Sandbox validados e isolamento multiempresa autenticado exercitado no banco remoto; produção ainda não configurada | Revisar migrations e secrets produtivos |
| Dependências | VERDE para produção | npm audit --omit=dev = 0 vulnerabilidades; npm ci, 254 testes e build passaram após a atualização | Tratar vulnerabilidades restantes de desenvolvimento separadamente, sem bloquear produção |

## Configuração manual posterior, sem compartilhar secrets

1. No Mercado Pago, abrir a integração já conhecida e obter as credenciais de PRODUÇÃO. Não reutilizar automaticamente credenciais/secret Sandbox.
2. Em Webhooks → Configurar notificações → Modo produtivo, configurar o evento Order (Mercado Pago) e URL https://rhzuooaukzdqlqnhlzmk.supabase.co/functions/v1/mercado-pago-webhook. Obter a chave dessa configuração produtiva, sem enviá-la ao chat.
3. No projeto Supabase rhzuooaukzdqlqnhlzmk, Edge Functions → Secrets, configurar MERCADO_PAGO_ACCESS_TOKEN e MERCADO_PAGO_WEBHOOK_SECRET com os valores produtivos. Não usar VITE_ nem arquivos versionados.
4. Configurar MERCADO_PAGO_EMPRESA_ID com o UUID da empresa K.Chic em public.empresas. É obrigatório: ausência retorna 503 e divergência retorna 403. Não é application_id do Mercado Pago.
5. Remover da configuração produtiva MERCADO_PAGO_PAYER_EMAIL_TEST para não enviar o comprador de teste. Os diagnósticos temporários de HMAC já foram removidos do código e os secrets MP_HMAC_DIAGNOSTICO_* foram apagados.
6. Validar VITE_SUPABASE_URL e chave pública anon/publishable do frontend, nunca service_role. HTTPS e headers devem ser configurados no host real; provedor de hospedagem não foi determinado.

## Comandos somente após revisão e autorização

```bash
cd ~/app-brecho
supabase login
supabase link --project-ref rhzuooaukzdqlqnhlzmk
supabase migration list --linked
supabase db push --linked --dry-run
```

Revisar a lista inteira antes de aplicar: há trabalho anterior não commitado. Somente após autorização e validação SQL:

```bash
supabase db push --linked
supabase functions deploy loja-carrinho --project-ref rhzuooaukzdqlqnhlzmk
supabase functions deploy loja-checkout --project-ref rhzuooaukzdqlqnhlzmk
supabase functions deploy mercado-pago-criar-checkout --project-ref rhzuooaukzdqlqnhlzmk
supabase functions deploy mercado-pago-webhook --project-ref rhzuooaukzdqlqnhlzmk
npm run build
```

Publicar dist pelo processo da hospedagem real, ainda não identificado. Não existe comando npm de deploy no package.json.

## Primeira venda produtiva controlada (pendente)

1. Resolver os itens vermelhos aplicáveis; usar uma única peça autorizada de baixo valor, disponível, com todos os dados obrigatórios e foto. Publicar pela seção Loja Online; não alterar aleatoriamente o preço de outra peça real.
2. Abrir a URL pública ?loja=online&empresa=<slug>, conferir preço/obs e adicionar uma peça à sacola. Quantidade é unitária por peça; retirada é a modalidade implementada.
3. Informar dados reais autorizados da compradora, preparar pagamento, conferir total calculado pelo servidor e abrir o checkout. Esta é uma cobrança real e só deve ser concluída com autorização da compradora.
4. Voltar à aba da loja e consultar confirmação. Não marcar como pago manualmente e não usar retorno do navegador como comprovação.
5. Conferir imediatamente: Order oficial processed/accredited; HMAC válido; evento processed; pagamentos_loja paid/provider_payment_id/paid_at; pedidos_loja pago/pago_em; uma vendas_loja por item; pecas.vendido=true; peça ausente do catálogo; painel ERP atualizado.
6. Reentrega idêntica não pode criar segunda venda/baixa. Concorrência deve falhar para segunda compra da mesma peça.
7. Se o dinheiro for aprovado e a confirmação interna falhar, interromper novas vendas e conciliar esse mesmo pedido. Não cobrar novamente. Pagamento tardio exige revisão porque a reserva pode ter terminado.

Referências oficiais consultadas:
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-orders/notifications?scope=prod
- https://supabase.com/docs/guides/functions/secrets
