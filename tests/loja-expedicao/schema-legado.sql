-- Fixture mínima e descartável das tabelas legadas não criadas nas migrations.
-- Nunca apontar estes testes a um banco remoto.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE TABLE public.empresas(id uuid PRIMARY KEY);
CREATE TABLE public.clientes(id text PRIMARY KEY,empresa_id uuid NOT NULL,nome text,UNIQUE(empresa_id,id));
CREATE TABLE public.pecas(id text PRIMARY KEY,empresa_id uuid NOT NULL,vendido boolean DEFAULT false,UNIQUE(empresa_id,id));
CREATE TABLE public.loja_carrinhos(id uuid PRIMARY KEY,empresa_id uuid NOT NULL,UNIQUE(empresa_id,id));
CREATE TABLE public.loja_publicacoes(id uuid PRIMARY KEY,empresa_id uuid NOT NULL,UNIQUE(empresa_id,id));
CREATE TABLE public.pedidos_envio(
 id text PRIMARY KEY,empresa_id uuid NOT NULL REFERENCES public.empresas(id),cliente_id text,cliente_nome text,
 status text NOT NULL DEFAULT 'montagem',quantidade_esperada integer NOT NULL,
 criado_em text,atualizado_em text,conferido boolean DEFAULT false,quantidade_conferida integer DEFAULT 0,
 enviado_em timestamptz,codigo_rastreio text,transportadora text,link_rastreio text,
 UNIQUE(empresa_id,id),FOREIGN KEY(empresa_id,cliente_id) REFERENCES public.clientes(empresa_id,id));
CREATE TABLE public.sacolinhas_live(id text PRIMARY KEY,empresa_id uuid NOT NULL,status text,UNIQUE(empresa_id,id));
CREATE TABLE public.pedido_envio_sacolinhas(id text PRIMARY KEY,empresa_id uuid NOT NULL,pedido_envio_id text NOT NULL,sacolinha_id text,
 FOREIGN KEY(empresa_id,pedido_envio_id) REFERENCES public.pedidos_envio(empresa_id,id));
CREATE FUNCTION public.usuario_empresa_operacional_ativo(uuid) RETURNS boolean LANGUAGE sql STABLE AS
 'SELECT $1::text = current_setting(''test.empresa'', true)';
ALTER TABLE public.pedidos_envio ENABLE ROW LEVEL SECURITY;
CREATE POLICY pedidos_envio_tenant_all ON public.pedidos_envio FOR ALL TO authenticated
 USING(public.usuario_empresa_operacional_ativo(empresa_id)) WITH CHECK(public.usuario_empresa_operacional_ativo(empresa_id));
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pedidos_envio,public.pedido_envio_sacolinhas TO authenticated;
