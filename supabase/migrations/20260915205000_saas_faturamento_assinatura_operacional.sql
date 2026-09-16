create or replace function public.obter_dados_faturamento(
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

    v_agora timestamptz := now();
    v_data_minima_permitida timestamptz;

    v_inicio_solicitado timestamptz;
    v_fim_exclusivo_solicitado timestamptz;

    v_inicio_aplicado timestamptz;
    v_fim_exclusivo_aplicado timestamptz;

    v_pecas jsonb;
    v_vendas_live jsonb;
    v_lives jsonb;
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

    -- Faturamento é uma área administrativa.
    if not public.usuario_admin_empresa_membership(p_empresa_id) then
        raise exception
            using
                errcode = '42501',
                message = 'Usuário sem permissão administrativa para esta empresa.';
    end if;

    if not public.assinatura_empresa_operacional_ativa(p_empresa_id) then
        raise exception
            using
                errcode = '42501',
                message = 'Assinatura sem acesso operacional vigente.';
    end if;

    if p_data_inicial is not null
       and p_data_final is not null
       and p_data_inicial > p_data_final then
        raise exception
            using
                errcode = '22007',
                message = 'A data inicial não pode ser posterior à data final.';
    end if;

    /*
     * Resolve o limite comercial da assinatura atual.
     * Fail closed: se não houver assinatura/recurso válido,
     * o Faturamento não é liberado.
     */
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
        if v_historico_dias is null or v_historico_dias < 1 then
            raise exception
                using
                    errcode = 'P0001',
                    message = 'Limite de histórico de faturamento inválido.';
        end if;

        v_data_minima_permitida :=
            v_agora - make_interval(days => v_historico_dias::integer);

    else
        raise exception
            using
                errcode = 'P0001',
                message = format(
                    'Tipo de recurso faturamento_historico_dias não suportado: %s',
                    v_tipo_recurso
                );
    end if;

    /*
     * Datas escolhidas no input type="date" representam dias civis
     * da empresa. Os dados históricos brasileiros foram normalizados
     * considerando America/Sao_Paulo.
     *
     * Intervalo utilizado:
     *   >= início
     *   <  início do dia posterior à data final
     */
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

    v_fim_exclusivo_aplicado := v_fim_exclusivo_solicitado;

    /*
     * Fonte dos cards financeiros.
     * Retornamos contrato explícito, sem expor a linha inteira.
     */
    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'nome', p.nome,
                    'custo', p.custo,
                    'venda', p.venda,
                    'valor_venda_final', p.valor_venda_final,
                    'cliente', p.cliente,
                    'cliente_id', p.cliente_id,
                    'data_cadastro', p.data_cadastro,
                    'data_venda', p.data_venda,
                    'data_venda_ts', p.data_venda_ts,
                    'vendido', p.vendido,
                    'obs', p.obs
                )
                order by p.data_venda_ts desc
            ),
            '[]'::jsonb
        )
    into v_pecas
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

    /*
     * Fonte do resumo financeiro por live.
     */
    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', v.id,
                    'live_id', v.live_id,
                    'peca_id', v.peca_id,
                    'valor_venda', v.valor_venda,
                    'data_hora', v.data_hora,
                    'data_hora_ts', v.data_hora_ts
                )
                order by v.data_hora_ts desc
            ),
            '[]'::jsonb
        )
    into v_vendas_live
    from public.vendas_live v
    where v.empresa_id = p_empresa_id
      and v.data_hora_ts is not null
      and (
          v_inicio_aplicado is null
          or v.data_hora_ts >= v_inicio_aplicado
      )
      and (
          v_fim_exclusivo_aplicado is null
          or v.data_hora_ts < v_fim_exclusivo_aplicado
      );

    /*
     * Somente lives que possuem ao menos uma venda dentro
     * do período autorizado.
     */
    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', l.id,
                    'nome', l.nome,
                    'data_live', l.data_live,
                    'status', l.status
                )
                order by l.id
            ),
            '[]'::jsonb
        )
    into v_lives
    from public.lives l
    where l.empresa_id = p_empresa_id
      and exists (
          select 1
          from public.vendas_live v
          where v.empresa_id = p_empresa_id
            and v.live_id = l.id
            and v.data_hora_ts is not null
            and (
                v_inicio_aplicado is null
                or v.data_hora_ts >= v_inicio_aplicado
            )
            and (
                v_fim_exclusivo_aplicado is null
                or v.data_hora_ts < v_fim_exclusivo_aplicado
            )
      );

    return jsonb_build_object(
        'empresa_id', p_empresa_id,

        'limite_historico', jsonb_build_object(
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

        'periodo_aplicado', jsonb_build_object(
            'data_inicial', v_inicio_aplicado,
            'data_final_exclusiva', v_fim_exclusivo_aplicado
        ),

        'pecas_vendidas', v_pecas,
        'vendas_live', v_vendas_live,
        'lives', v_lives
    );
end;
$$;

revoke all
on function public.obter_dados_faturamento(
    uuid,
    date,
    date
)
from public;

revoke all
on function public.obter_dados_faturamento(
    uuid,
    date,
    date
)
from anon;

grant execute
on function public.obter_dados_faturamento(
    uuid,
    date,
    date
)
to authenticated;

grant execute
on function public.obter_dados_faturamento(
    uuid,
    date,
    date
)
to service_role;

create or replace function public.obter_resumo_faturamento(
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

    v_agora timestamptz := now();
    v_data_minima_permitida timestamptz;

    v_inicio_solicitado timestamptz;
    v_fim_exclusivo_solicitado timestamptz;

    v_inicio_aplicado timestamptz;
    v_fim_exclusivo_aplicado timestamptz;

    v_quantidade bigint := 0;
    v_faturamento numeric := 0;
    v_lucro numeric := 0;
    v_ticket_medio numeric := 0;

    v_resumo_por_live jsonb := '[]'::jsonb;
begin
    /*
     * ---------------------------------------------------------
     * AUTENTICAÇÃO / TENANT
     * ---------------------------------------------------------
     */

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

    if not public.assinatura_empresa_operacional_ativa(p_empresa_id) then
        raise exception
            using
                errcode = '42501',
                message = 'Assinatura sem acesso operacional vigente.';
    end if;

    if p_data_inicial is not null
       and p_data_final is not null
       and p_data_inicial > p_data_final then
        raise exception
            using
                errcode = '22007',
                message = 'A data inicial não pode ser posterior à data final.';
    end if;

    /*
     * ---------------------------------------------------------
     * LIMITE DE HISTÓRICO DO PLANO
     * ---------------------------------------------------------
     */

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
            v_agora
            - make_interval(days => v_historico_dias::integer);

    else
        raise exception
            using
                errcode = 'P0001',
                message = format(
                    'Tipo de recurso faturamento_historico_dias não suportado: %s',
                    v_tipo_recurso
                );
    end if;

    /*
     * ---------------------------------------------------------
     * PERÍODO SOLICITADO
     *
     * input type=date representa o dia civil da empresa.
     *
     * intervalo:
     *   >= início
     *   < início do dia seguinte à data final
     * ---------------------------------------------------------
     */

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
        v_inicio_aplicado :=
            v_inicio_solicitado;

    elsif v_inicio_solicitado is null then
        v_inicio_aplicado :=
            v_data_minima_permitida;

    else
        v_inicio_aplicado :=
            greatest(
                v_inicio_solicitado,
                v_data_minima_permitida
            );
    end if;

    v_fim_exclusivo_aplicado :=
        v_fim_exclusivo_solicitado;

    /*
     * ---------------------------------------------------------
     * CARDS DO FATURAMENTO
     *
     * Replica exatamente a regra atual do React:
     *
     * valor venda:
     *   valor_venda_final
     *   ou fallback para venda
     *
     * custo:
     *   campo custo
     *   ou zero
     *
     * custo/venda legados:
     *   "R$ 1.234,56"
     * ---------------------------------------------------------
     */

    select
        count(*),

        coalesce(
            sum(
                coalesce(
                    p.valor_venda_final,

                    nullif(
                        replace(
                            regexp_replace(
                                coalesce(p.venda, ''),
                                '[^0-9,]',
                                '',
                                'g'
                            ),
                            ',',
                            '.'
                        ),
                        ''
                    )::numeric,

                    0
                )
            ),
            0
        ),

        coalesce(
            sum(
                coalesce(
                    p.valor_venda_final,

                    nullif(
                        replace(
                            regexp_replace(
                                coalesce(p.venda, ''),
                                '[^0-9,]',
                                '',
                                'g'
                            ),
                            ',',
                            '.'
                        ),
                        ''
                    )::numeric,

                    0
                )
                -
                coalesce(
                    nullif(
                        replace(
                            regexp_replace(
                                coalesce(p.custo, ''),
                                '[^0-9,]',
                                '',
                                'g'
                            ),
                            ',',
                            '.'
                        ),
                        ''
                    )::numeric,

                    0
                )
            ),
            0
        )

    into
        v_quantidade,
        v_faturamento,
        v_lucro

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

    if v_quantidade > 0 then
        v_ticket_medio :=
            v_faturamento / v_quantidade;
    else
        v_ticket_medio := 0;
    end if;

    /*
     * ---------------------------------------------------------
     * RESUMO POR LIVE
     *
     * Mantém a lógica atual:
     *
     * - filtra a própria live por data_live
     * - filtra vendas por data_hora_ts
     * - faturamento usa vendas_live.valor_venda
     * - lucro desconta custo da peça para cada venda
     * - sem filtro manual, lives sem venda continuam aparecendo
     *
     * Em planos limitados, o próprio período do plano restringe
     * quais lives podem aparecer.
     * ---------------------------------------------------------
     */

    with lives_normalizadas as (
        select
            l.id,
            l.nome,
            l.data_live,
            l.status,

            case
                when nullif(btrim(l.data_live), '') is null
                    then null

                when l.data_live ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                    then substring(l.data_live from 1 for 10)::date

                when l.data_live ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}'
                    then to_date(
                        substring(l.data_live from 1 for 10),
                        'DD/MM/YYYY'
                    )

                else null
            end as data_live_normalizada

        from public.lives l

        where l.empresa_id = p_empresa_id
    ),

    lives_periodo as (
        select *
        from lives_normalizadas l

        where l.data_live_normalizada is not null

          and (
              v_inicio_aplicado is null
              or l.data_live_normalizada >=
                  (
                      v_inicio_aplicado
                      at time zone 'America/Sao_Paulo'
                  )::date
          )

          and (
              v_fim_exclusivo_aplicado is null
              or l.data_live_normalizada <
                  (
                      v_fim_exclusivo_aplicado
                      at time zone 'America/Sao_Paulo'
                  )::date
          )
    ),

    vendas_periodo as (
        select
            v.id,
            v.live_id,
            v.peca_id,
            coalesce(v.valor_venda, 0) as valor_venda

        from public.vendas_live v

        where v.empresa_id = p_empresa_id
          and v.data_hora_ts is not null

          and (
              v_inicio_aplicado is null
              or v.data_hora_ts >= v_inicio_aplicado
          )

          and (
              v_fim_exclusivo_aplicado is null
              or v.data_hora_ts < v_fim_exclusivo_aplicado
          )
    ),

    resumo as (
        select
            l.id,
            l.nome,
            l.data_live,
            l.data_live_normalizada,
            l.status,

            count(v.id) as quantidade,

            coalesce(
                sum(v.valor_venda),
                0
            ) as faturamento,

            coalesce(
                sum(
                    v.valor_venda
                    -
                    coalesce(
                        nullif(
                            replace(
                                regexp_replace(
                                    coalesce(p.custo, ''),
                                    '[^0-9,]',
                                    '',
                                    'g'
                                ),
                                ',',
                                '.'
                            ),
                            ''
                        )::numeric,

                        0
                    )
                ),
                0
            ) as lucro

        from lives_periodo l

        left join vendas_periodo v
          on v.live_id = l.id

        left join public.pecas p
          on p.empresa_id = p_empresa_id
         and p.id = v.peca_id

        group by
            l.id,
            l.nome,
            l.data_live,
            l.data_live_normalizada,
            l.status
    )

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'nome', r.nome,
                    'data_live', r.data_live,
                    'status', coalesce(r.status, '-'),
                    'quantidade', r.quantidade,
                    'faturamento', r.faturamento,
                    'lucro', r.lucro,
                    'ticket_medio',
                        case
                            when r.quantidade > 0
                                then r.faturamento / r.quantidade
                            else 0
                        end
                )

                order by
                    r.data_live_normalizada desc,
                    r.id desc
            ),

            '[]'::jsonb
        )

    into v_resumo_por_live

    from resumo r

    where
        r.quantidade > 0

        or (
            p_data_inicial is null
            and p_data_final is null
        );

    /*
     * ---------------------------------------------------------
     * RESPOSTA COMPACTA
     * ---------------------------------------------------------
     */

    return jsonb_build_object(
        'empresa_id',
        p_empresa_id,

        'limite_historico',
        jsonb_build_object(
            'tipo',
            v_tipo_recurso,

            'dias',
            case
                when v_tipo_recurso = 'integer'
                    then v_historico_dias
                else null
            end,

            'ilimitado',
            v_tipo_recurso = 'unlimited',

            'data_minima_permitida',
            v_data_minima_permitida
        ),

        'periodo_aplicado',
        jsonb_build_object(
            'data_inicial',
            v_inicio_aplicado,

            'data_final_exclusiva',
            v_fim_exclusivo_aplicado
        ),

        'indicadores',
        jsonb_build_object(
            'faturamento',
            v_faturamento,

            'lucro',
            v_lucro,

            'quantidade_vendida',
            v_quantidade,

            'ticket_medio',
            v_ticket_medio
        ),

        'resumo_por_live',
        v_resumo_por_live
    );
end;
$$;

revoke all
on function public.obter_resumo_faturamento(
    uuid,
    date,
    date
)
from public;

revoke all
on function public.obter_resumo_faturamento(
    uuid,
    date,
    date
)
from anon;

grant execute
on function public.obter_resumo_faturamento(
    uuid,
    date,
    date
)
to authenticated;

grant execute
on function public.obter_resumo_faturamento(
    uuid,
    date,
    date
)
to service_role;

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

    if not public.assinatura_empresa_operacional_ativa(p_empresa_id) then
        raise exception
            using
                errcode = '42501',
                message = 'Assinatura sem acesso operacional vigente.';
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
