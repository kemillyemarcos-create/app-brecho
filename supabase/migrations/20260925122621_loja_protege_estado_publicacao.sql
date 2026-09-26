-- =========================================================
-- LOJA — MUTAÇÕES SOMENTE POR OPERAÇÕES SERVER-SIDE
-- =========================================================

-- O frontend autenticado pode consultar os dados administrativos
-- permitidos pelo RLS, mas não pode alterar diretamente as tabelas.

revoke insert, update, delete
on table public.loja_publicacoes
from authenticated;

revoke insert, update, delete
on table public.loja_publicacao_fotos
from authenticated;

grant select
on table public.loja_publicacoes
to authenticated;

grant select
on table public.loja_publicacao_fotos
to authenticated;

comment on table public.loja_publicacoes
is 'Publicações da Loja. authenticated possui leitura administrativa limitada pelo RLS. Criação de rascunho, edição, publicação, despublicação e exclusões lógicas são feitas somente por operações server-side controladas.';

comment on table public.loja_publicacao_fotos
is 'Galeria das publicações da Loja. authenticated possui leitura administrativa limitada pelo RLS. Inclusão, remoção, ordenação e definição de capa são feitas somente por operações server-side controladas.';
