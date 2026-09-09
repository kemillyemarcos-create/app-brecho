create table public.empresa_usuarios (
  id uuid primary key default gen_random_uuid(),

  empresa_id uuid not null,
  usuario_id uuid not null,

  perfil text not null,
  ativo boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint empresa_usuarios_empresa_usuario_unique
    unique (empresa_id, usuario_id),

  constraint empresa_usuarios_empresa_id_fkey
    foreign key (empresa_id)
    references public.empresas(id)
    on delete cascade,

  constraint empresa_usuarios_usuario_id_fkey
    foreign key (usuario_id)
    references public.usuarios(id)
    on delete cascade,

  constraint empresa_usuarios_perfil_check
    check (perfil in ('PROPRIETARIO', 'ADMIN', 'OPERADOR'))
);

create index idx_empresa_usuarios_empresa_id
  on public.empresa_usuarios (empresa_id);

create index idx_empresa_usuarios_usuario_id
  on public.empresa_usuarios (usuario_id);

comment on table public.empresa_usuarios is
  'Vinculos entre usuarios internos e empresas do SaaS. Permite evoluir de um usuario preso a uma unica empresa para memberships multiempresa.';

comment on column public.empresa_usuarios.perfil is
  'Perfil do usuario dentro da empresa: PROPRIETARIO, ADMIN ou OPERADOR.';
