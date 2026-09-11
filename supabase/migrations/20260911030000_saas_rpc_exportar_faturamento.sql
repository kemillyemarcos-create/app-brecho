create or replace function public.exportar_dados_faturamento(
    p_empresa_id uuid,
    p_data_inicial date default null,
    p_data_final date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    v_tipo_recurso text;
    v_historico_dias bigint;

    v_data_minima_permitida timestamptz;

    v_inicio_solicitado timestamptz;
    v_fim_exclusivo_solicitado timestamptz;

    v_inicio_aplicado timestamptz;
    v_fim_exclusivo_aplicado timestamptz;

    v_itens jsonb;
begin
    if auth.uid() is null then
        raise exception
            using
                errcode = '42501',
                message = 'Autenticação obrigatória.';
    end if;

    if p_empresa_id is null then
        raise exception
            using
                errcode = '22004',
                message = 'empresa_id é obrigatório.';
    end if;

    if not public.usuario_admin_empresa_membership(p_empresa_id) then
        raise exception
            using
                errcode = '42501',
                message = 'Usuário sem permissão administrativa para esta empresa.';
    end if;

    if p_data_inicial is not null
       and p_data_final is not null
       and p_data_inicial > p_data_final then
        raise exception
            using
                errcode = '22007',
                message = 'A data inicial não pode ser posterior à data final.';
    end if;

    select
        pr.tipo,
        pr.valor_inteiro
    into
        v_tipo_recurso,
        v_historico_dias
    from public.assinaturas a
    join public.plano_recursos pr
      on pr.plano_id = a.plano_id
    where a.empresa_id = p_empresa_id
      and a.status in (
          'trialing',
          'active',
          'past_due',
          'grace_period',
          'suspended'
      )
      and pr.recurso = 'faturamento_historico_dias'
    limit 1;

    if v_tipo_recurso is null then
        raise exception
            using
                errcode = 'P0001',
                message = 'Recurso faturamento_historico_dias não configurado para a assinatura atual.';
    end if;

    if v_tipo_recurso = 'unlimited' then
        v_data_minima_permitida := null;

    elsif v_tipo_recurso = 'integer' then
        if v_historico_dias is null
           or v_historico_dias < 1 then
            raise exception
                using
                    errcode = 'P0001',
                    message = 'Limite de histórico de faturamento inválido.';
        end if;

        v_data_minima_permitida :=
            now()
            - make_interval(days => v_historico_dias::integer);

    else
        raise exception
            using
                errcode = 'P0001',
                message = 'Tipo de limite de histórico inválido.';
    end if;

    if p_data_inicial is not null then
        v_inicio_solicitado :=
            p_data_inicial::timestamp
            at time zone 'America/Sao_Paulo';
    end if;

    if p_data_final is not null then
        v_fim_exclusivo_solicitado :=
            (p_data_final + 1)::timestamp
            at time zone 'America/Sao_Paulo';
    end if;

    if v_data_minima_permitida is null then
        v_inicio_aplicado := v_inicio_solicitado;

    elsif v_inicio_solicitado is null then
        v_inicio_aplicado := v_data_minima_permitida;

    else
        v_inicio_aplicado :=
            greatest(
                v_inicio_solicitado,
                v_data_minima_permitida
            );
    end if;

    v_fim_exclusivo_aplicado :=
        v_fim_exclusivo_solicitado;

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'nome', p.nome,
                    'custo', p.custo,
                    'venda', p.venda,
                    'valor_venda_final', p.valor_venda_final,
                    'obs', p.obs,
                    'cliente', p.cliente,
                    'data_cadastro', p.data_cadastro,
                    'data_venda', p.data_venda,
                    'data_venda_ts', p.data_venda_ts
                )
                order by p.data_venda_ts desc
            ),
            '[]'::jsonb
        )
    into v_itens
    from public.pecas p
    where p.empresa_id = p_empresa_id
      and p.vendido is true
      and p.data_venda_ts is not null
      and (
          v_inicio_aplicado is null
          or p.data_venda_ts >= v_inicio_aplicado
      )
      and (
          v_fim_exclusivo_aplicado is null
          or p.data_venda_ts < v_fim_exclusivo_aplicado
      );

    return jsonb_build_object(
        'limite_historico',
        jsonb_build_object(
            'tipo', v_tipo_recurso,
            'dias',
                case
                    when v_tipo_recurso = 'integer'
                        then v_historico_dias
                    else null
                end,
            'ilimitado', v_tipo_recurso = 'unlimited',
            'data_minima_permitida', v_data_minima_permitida
        ),

        'periodo_aplicado',
        jsonb_build_object(
            'data_inicial', v_inicio_aplicado,
            'data_final_exclusiva', v_fim_exclusivo_aplicado
        ),

        'itens', v_itens
    );
end;
$$;

revoke all
on function public.exportar_dados_faturamento(
    uuid,
    date,
    date
)
from public;

revoke all
on function public.exportar_dados_faturamento(
    uuid,
    date,
    date
)
from anon;

grant execute
on function public.exportar_dados_faturamento(
    uuid,
    date,
    date
)
to authenticated;

grant execute
on function public.exportar_dados_faturamento(
    uuid,
    date,
    date
)
to service_role;
