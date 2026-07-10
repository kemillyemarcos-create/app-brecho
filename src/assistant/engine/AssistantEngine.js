    import { supabase } from "../../lib/supabase";
    import skills from "../skills";
    import intentEngine from "../intents/IntentEngine";
    import skillExecutor from "./SkillExecutor";

    import {
    BusinessKnowledge,
    BusinessModules,
    BusinessRules,
    BusinessVocabulary,
    } from "../knowledge";

    import {
    formatarErro,
    formatarLista,
    formatarNaoAprendido,
    formatarResultado,
    } from "./ResponseFormatter";

    function normalizarTexto(valor = "") {
    return String(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    }

    function perguntaEhConceitual(texto = "") {
    return (
        texto.startsWith("o que e ") ||
        texto === "o que e" ||
        texto.startsWith("o que significa") ||
        texto.includes("qual o significado") ||
        texto.includes("significa o que") ||
        texto.startsWith("explique ")
    );
    }

    function perguntaEhSobreRegra(texto = "") {
    return (
        texto.startsWith("como funciona") ||
        texto.startsWith("o que acontece") ||
        texto.includes("qual a regra") ||
        texto.includes("quais as regras")
    );
    }

    function respostaModulos() {
    const modulos = Object.values(BusinessModules).map(
        (modulo) => `${modulo.nome} — ${modulo.descricao}`
    );

    return {
        ok: true,
        tipo: "knowledge",
        resposta: formatarLista("Módulos disponíveis no sistema", modulos),
    };
    }

    function respostaConhecimentoGeral() {
    return {
        ok: true,
        tipo: "knowledge",
        resposta: formatarResultado({
        titulo: "✨ Sobre o sistema",
        descricao: BusinessKnowledge.objetivo,
        detalhes: [
            `Segmento: ${BusinessKnowledge.segmento}`,
            `País: ${BusinessKnowledge.pais}`,
            `Moeda: ${BusinessKnowledge.moeda}`,
            `Versão: ${BusinessKnowledge.versao}`,
        ],
        }),
    };
    }

    function respostaVocabulario(perguntaNormalizada) {
    for (const [termo, sinonimos] of Object.entries(BusinessVocabulary)) {
        const termosRelacionados = [termo, ...(sinonimos || [])];

        const encontrou = termosRelacionados.some((item) =>
        perguntaNormalizada.includes(normalizarTexto(item))
        );

        if (!encontrou) continue;

        return {
        ok: true,
        tipo: "knowledge",
        resposta: formatarResultado({
            titulo: `✨ ${termo}`,
            descricao: `No sistema, "${termo}" está relacionado a:`,
            detalhes: termosRelacionados,
        }),
        };
    }

    return null;
    }

    function respostaRegra(perguntaNormalizada) {
    const regra = BusinessRules.find((item) => {
        const titulo = normalizarTexto(item.titulo);
        const id = normalizarTexto(item.id);

        if (perguntaNormalizada.includes(titulo)) return true;
        if (perguntaNormalizada.includes(id)) return true;

        const palavrasImportantes = normalizarTexto(
        `${item.titulo} ${item.descricao}`
        )
        .split(" ")
        .filter((palavra) => palavra.length > 4);

        return palavrasImportantes.some((palavra) =>
        perguntaNormalizada.includes(palavra)
        );
    });

    if (!regra) return null;

    return {
        ok: true,
        tipo: "knowledge",
        resposta: formatarResultado({
        titulo: `✨ ${regra.titulo}`,
        descricao: regra.descricao,
        }),
    };
    }

    function responderConhecimento(pergunta, intent) {
    const texto = normalizarTexto(pergunta);

    if (intent?.target === "modules") {
        return respostaModulos();
    }

    if (intent?.target === "system") {
        return respostaConhecimentoGeral();
    }

    /*
    * Evita o erro:
    * "Vendas da última live?"
    * ser respondido como definição da palavra "live".
    *
    * Vocabulário só responde quando a pergunta for conceitual.
    */
    if (intent?.target === "vocabulary" && perguntaEhConceitual(texto)) {
        return respostaVocabulario(texto);
    }

    /*
    * Regras só respondem quando o usuário realmente pergunta
    * como algo funciona ou o que acontece.
    */
    if (intent?.target === "rules" && perguntaEhSobreRegra(texto)) {
        return respostaRegra(texto);
    }

    return null;
    }

    class AssistantEngine {
    constructor() {
        this.skills = skills;
    }

    buscarSkill(id) {
        if (!id) return null;

        return this.skills.find(
        (skill) => normalizarTexto(skill.id) === normalizarTexto(id)
        ) || null;
    }

    encontrarSkillPorAlias(pergunta) {
        const texto = normalizarTexto(pergunta);

        let melhorSkill = null;
        let maiorPontuacao = 0;

        for (const skill of this.skills) {
        const termos = [
            ...(skill.aliases || []),
            ...(skill.patterns || []),
        ];

        let pontuacao = 0;

        for (const termoOriginal of termos) {
            const termo = normalizarTexto(termoOriginal);

            if (!termo) continue;

            if (texto === termo) {
            pontuacao += 100;
            } else if (texto.includes(termo)) {
            pontuacao += termo.split(" ").length;
            }
        }

        if (pontuacao > maiorPontuacao) {
            maiorPontuacao = pontuacao;
            melhorSkill = skill;
        }
        }

        return melhorSkill;
    }

    async executar(pergunta) {
        const textoOriginal = String(pergunta || "").trim();

        if (!textoOriginal) {
        return {
            ok: false,
            resposta: formatarErro(
            "Digite uma solicitação para o Assistente Virtual."
            ),
        };
        }

        const intent = intentEngine.detectar(textoOriginal);

        /*
        * 1. Prioridade máxima:
        * intenção explicitamente registrada como Skill.
        */
        if (intentEngine.isSkill(intent)) {
        const skill = this.buscarSkill(intent.target);

        if (skill) {
            return skillExecutor.executar({
            skill,
            pergunta: textoOriginal,
            contexto: {
                supabase,
                intent,
            },
            });
        }
        }

        /*
        * 2. Segunda tentativa:
        * procura uma Skill por aliases/padrões.
        *
        * Isso também acontece antes do Knowledge.
        */
        const skillPorAlias = this.encontrarSkillPorAlias(textoOriginal);

        if (skillPorAlias) {
        return skillExecutor.executar({
            skill: skillPorAlias,
            pergunta: textoOriginal,
            contexto: {
            supabase,
            intent,
            },
        });
        }

        /*
        * 3. Knowledge somente como fallback
        * e apenas para perguntas conceituais.
        */
        if (intentEngine.isKnowledge(intent)) {
        const conhecimento = responderConhecimento(textoOriginal, intent);

        if (conhecimento) {
            return {
            intent: intent.intent?.id || null,
            ...conhecimento,
            };
        }
        }

        return {
        ok: false,
        intent: intent.intent?.id || null,
        resposta: formatarNaoAprendido(),
        };
    }

    listarSkills() {
        return this.skills.map((skill) => ({
        id: skill.id,
        nome: skill.nome,
        categoria: skill.categoria,
        tipo: skill.tipo,
        aliases: skill.aliases || [],
        }));
    }

    listarIntencoes() {
        return intentEngine.listarIntencoes();
    }
    }

    const assistantEngine = new AssistantEngine();

    export default assistantEngine; 