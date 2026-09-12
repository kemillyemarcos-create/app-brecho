-- ============================================================
-- SaaS - Fase 5
-- Provisionamento atomico do primeiro tenant + trial
-- ============================================================

create or replace function public.provisionar_empresa_trial(
    p_nome_usuario text,
    p_nome_empresa text,
    p_nome_fantasia text,
    p_plano_codigo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_auth_user_id uuid;
    v_auth_email text;
    v_email_confirmed_at timestamptz;

    v_usuario_id uuid;
    v_usuario_nome text;
    v_usuario_ativo boolean;

    v_empresa_id uuid;
    v_configuracao_id uuid;
    v_membership_id uuid;

    v_plano_id uuid;
    v_plano_codigo text;
    v_plano_nome text;
    v_trial_dias integer;

    v_assinatura_id uuid;
    v_trial_started_at timestamptz;
    v_trial_ends_at timestamptz;

    v_nome_usuario text;
    v_nome_empresa text;
    v_nome_fantasia text;
    v_codigo_plano text;
begin
    -- --------------------------------------------------------
    -- 1. Identidade autenticada
    -- --------------------------------------------------------

    v_auth_user_id := auth.uid();

    if v_auth_user_id is null then
        raise exception 'Usuário não autenticado.'
            using errcode = '42501';
    end if;

    -- Serializa tentativas simultâneas de onboarding
    -- para o mesmo usuário Auth.
    perform pg_advisory_xact_lock(
        hashtextextended(v_auth_user_id::text, 0)
    );

    select
        au.email,
        au.email_confirmed_at
    into
        v_auth_email,
        v_email_confirmed_at
    from auth.users au
    where au.id = v_auth_user_id;

    if v_auth_email is null or btrim(v_auth_email) = '' then
        raise exception 'Usuário autenticado sem e-mail válido.'
            using errcode = '22023';
    end if;

    if v_email_confirmed_at is null then
        raise exception 'O e-mail precisa estar confirmado antes de criar uma empresa.'
            using errcode = '42501';
    end if;

    -- --------------------------------------------------------
    -- 2. Validação dos parâmetros comerciais
    -- --------------------------------------------------------

    v_nome_usuario := nullif(btrim(p_nome_usuario), '');
    v_nome_empresa := nullif(btrim(p_nome_empresa), '');
    v_nome_fantasia := nullif(btrim(p_nome_fantasia), '');
    v_codigo_plano := lower(nullif(btrim(p_plano_codigo), ''));

    if v_nome_usuario is null or char_length(v_nome_usuario) < 2 then
        raise exception 'Nome do usuário inválido.'
            using errcode = '22023';
    end if;

    if v_nome_empresa is null or char_length(v_nome_empresa) < 2 then
        raise exception 'Nome da empresa inválido.'
            using errcode = '22023';
    end if;

    if v_codigo_plano is null then
        raise exception 'Plano não informado.'
            using errcode = '22023';
    end if;

    -- --------------------------------------------------------
    -- 3. Resolve plano comercial
    -- Somente planos públicos e ativos podem entrar pelo
    -- onboarding self-service.
    -- --------------------------------------------------------

    select
        p.id,
        p.codigo,
        p.nome,
        p.trial_dias_padrao
    into
        v_plano_id,
        v_plano_codigo,
        v_plano_nome,
        v_trial_dias
    from public.planos p
    where lower(p.codigo) = v_codigo_plano
      and p.ativo = true
      and p.publico = true
    limit 1;

    if v_plano_id is null then
        raise exception 'Plano informado não está disponível para contratação.'
            using errcode = '22023';
    end if;

    if v_trial_dias is null or v_trial_dias <= 0 then
        raise exception 'Plano sem período de trial válido.'
            using errcode = '22023';
    end if;

    -- --------------------------------------------------------
    -- 4. Resolve usuário interno
    --
    -- Prioridade:
    --   A) auth_user_id já vinculado
    --   B) registro legado com mesmo e-mail ainda sem vínculo
    --   C) cria novo usuário interno
    -- --------------------------------------------------------

    select
        u.id,
        u.nome,
        u.ativo
    into
        v_usuario_id,
        v_usuario_nome,
        v_usuario_ativo
    from public.usuarios u
    where u.auth_user_id = v_auth_user_id
    limit 1;

    if v_usuario_id is null then

        select
            u.id,
            u.nome,
            u.ativo
        into
            v_usuario_id,
            v_usuario_nome,
            v_usuario_ativo
        from public.usuarios u
        where lower(u.email) = lower(v_auth_email)
        order by u.created_at
        limit 1
        for update;

        if v_usuario_id is not null then

            if exists (
                select 1
                from public.usuarios u
                where u.id = v_usuario_id
                  and u.auth_user_id is not null
                  and u.auth_user_id <> v_auth_user_id
            ) then
                raise exception 'Este e-mail já está vinculado a outra identidade.'
                    using errcode = '42501';
            end if;

            if v_usuario_ativo is not true then
                raise exception 'Usuário interno inativo. Entre em contato com o suporte.'
                    using errcode = '42501';
            end if;

            update public.usuarios
            set
                auth_user_id = v_auth_user_id,
                email = v_auth_email
            where id = v_usuario_id;

        else

            insert into public.usuarios (
                nome,
                email,
                ativo,
                auth_user_id
            )
            values (
                v_nome_usuario,
                v_auth_email,
                true,
                v_auth_user_id
            )
            returning id, nome, ativo
            into v_usuario_id, v_usuario_nome, v_usuario_ativo;

        end if;

    elsif v_usuario_ativo is not true then

        raise exception 'Usuário interno inativo. Entre em contato com o suporte.'
            using errcode = '42501';

    end if;

    -- --------------------------------------------------------
    -- 5. Regra anti-abuso do primeiro trial
    --
    -- O usuário pode participar de várias empresas na
    -- arquitetura SaaS, porém o onboarding público não cria
    -- um segundo tenant gratuito para quem já teve membership.
    -- --------------------------------------------------------

    if exists (
        select 1
        from public.empresa_usuarios eu
        where eu.usuario_id = v_usuario_id
    ) then
        raise exception
            'Este usuário já possui vínculo com uma empresa. A criação de outra empresa requer um fluxo adicional.'
            using errcode = '42501';
    end if;

    -- --------------------------------------------------------
    -- 6. Cria tenant
    -- --------------------------------------------------------

    insert into public.empresas (
        nome,
        nome_fantasia,
        email,
        ativo
    )
    values (
        v_nome_empresa,
        v_nome_fantasia,
        v_auth_email,
        true
    )
    returning id
    into v_empresa_id;

    -- --------------------------------------------------------
    -- 7. Configuração inicial
    --
    -- Os demais campos utilizam os defaults oficiais de
    -- configuracoes_empresa.
    -- --------------------------------------------------------

    insert into public.configuracoes_empresa (
        empresa_id
    )
    values (
        v_empresa_id
    )
    returning id
    into v_configuracao_id;

    -- --------------------------------------------------------
    -- 8. Cria assinatura trial ANTES da membership.
    --
    -- Isso é necessário porque o trigger
    -- trg_empresa_usuarios_maximos consulta o limite do plano.
    -- --------------------------------------------------------

    v_trial_started_at := now();
    v_trial_ends_at :=
        v_trial_started_at
        + (v_trial_dias * interval '1 day');

    insert into public.assinaturas (
        empresa_id,
        plano_id,
        status,
        trial_started_at,
        trial_ends_at,
        current_period_started_at,
        current_period_ends_at,
        cancel_at_period_end
    )
    values (
        v_empresa_id,
        v_plano_id,
        'trialing',
        v_trial_started_at,
        v_trial_ends_at,
        v_trial_started_at,
        v_trial_ends_at,
        false
    )
    returning id
    into v_assinatura_id;

    -- --------------------------------------------------------
    -- 9. Proprietário inicial
    --
    -- Neste ponto a assinatura já existe, portanto o trigger
    -- de usuarios_maximos consegue resolver o limite.
    -- --------------------------------------------------------

    insert into public.empresa_usuarios (
        empresa_id,
        usuario_id,
        perfil,
        ativo
    )
    values (
        v_empresa_id,
        v_usuario_id,
        'PROPRIETARIO',
        true
    )
    returning id
    into v_membership_id;

    -- --------------------------------------------------------
    -- 10. Evento de auditoria da assinatura
    -- --------------------------------------------------------

    insert into public.assinatura_eventos (
        empresa_id,
        assinatura_id,
        tipo,
        origem,
        dados
    )
    values (
        v_empresa_id,
        v_assinatura_id,
        'trial_iniciado',
        'onboarding',
        jsonb_build_object(
            'plano_codigo', v_plano_codigo,
            'trial_dias', v_trial_dias
        )
    );

    -- --------------------------------------------------------
    -- 11. Retorno seguro para o frontend
    -- --------------------------------------------------------

    return jsonb_build_object(
        'onboarding_concluido', true,

        'usuario', jsonb_build_object(
            'id', v_usuario_id,
            'nome', coalesce(v_usuario_nome, v_nome_usuario),
            'email', v_auth_email
        ),

        'empresa', jsonb_build_object(
            'id', v_empresa_id,
            'nome', v_nome_empresa,
            'nome_fantasia', v_nome_fantasia
        ),

        'membership', jsonb_build_object(
            'id', v_membership_id,
            'perfil', 'PROPRIETARIO',
            'ativo', true
        ),

        'plano', jsonb_build_object(
            'id', v_plano_id,
            'codigo', v_plano_codigo,
            'nome', v_plano_nome,
            'trial_dias', v_trial_dias
        ),

        'assinatura', jsonb_build_object(
            'id', v_assinatura_id,
            'status', 'trialing',
            'trial_started_at', v_trial_started_at,
            'trial_ends_at', v_trial_ends_at,
            'current_period_started_at', v_trial_started_at,
            'current_period_ends_at', v_trial_ends_at
        ),

        'configuracao', jsonb_build_object(
            'id', v_configuracao_id
        )
    );
end;
$function$;

alter function public.provisionar_empresa_trial(
    text,
    text,
    text,
    text
)
owner to postgres;

revoke all
on function public.provisionar_empresa_trial(
    text,
    text,
    text,
    text
)
from public, anon;

grant execute
on function public.provisionar_empresa_trial(
    text,
    text,
    text,
    text
)
to authenticated, service_role;
