import { supabase } from "../lib/supabase";

export function formatarCPF(valor) {
    const numeros = String(valor || "")
        .replace(/\D/g, "")
        .slice(0, 11);

    return numeros
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatarTelefone(valor) {
    const numeros = String(valor || "")
        .replace(/\D/g, "")
        .slice(0, 11);

    if (numeros.length <= 10) {
        return numeros
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return numeros
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatarCEP(valor) {
    const numeros = String(valor || "")
        .replace(/\D/g, "")
        .slice(0, 8);

    return numeros.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function normalizarCPF(valor) {
    return String(valor || "").replace(/\D/g, "").slice(0, 11);
}

export function normalizarTelefone(valor) {
    return String(valor || "").replace(/\D/g, "").slice(0, 11);
}

export function montarPayloadCliente(formCliente, { exigirCpf = false } = {}) {
    const nome = String(formCliente.nome || "").trim();
    const cpf = normalizarCPF(formCliente.cpf);
    const telefone = normalizarTelefone(formCliente.telefone);
    const cep = String(formCliente.cep || "").replace(/\D/g, "").slice(0, 8);

    if (!nome) {
        throw new Error(exigirCpf ? "Preencha seu nome." : "Preencha pelo menos o nome.");
    }

    if (exigirCpf && cpf.length !== 11) {
        throw new Error("Informe um CPF válido com 11 dígitos.");
    }

    if (cpf && !exigirCpf && cpf.length !== 11) {
        throw new Error("CPF inválido. Preencha os 11 dígitos.");
    }

    return {
        nome,
        cpf,
        telefone,
        cep,
        endereco: String(formCliente.endereco || "").trim(),
        numero: String(formCliente.numero || "").trim(),
        complemento: String(formCliente.complemento || "").trim(),
    };
}

export async function buscarClientePorCpf(cpf, idIgnorar = null) {
    const cpfLimpo = normalizarCPF(cpf);

    if (!cpfLimpo || cpfLimpo.length !== 11) return null;

    let query = supabase
        .from("clientes")
        .select("id, nome, cpf")
        .eq("cpf", cpfLimpo)
        .limit(1);

    if (idIgnorar) {
        query = query.neq("id", idIgnorar);
    }

    const { data, error } = await query;

    if (error) {
        console.error("ERRO AO BUSCAR CPF:", error);
        throw error;
    }

    return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function buscarEnderecoPorCep(cep) {
    const cepLimpo = String(cep || "").replace(/\D/g, "");

    if (cepLimpo.length !== 8) return null;

    const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await res.json();

    if (data.erro) return null;

    const enderecoMontado = `${data.logradouro || ""}${data.bairro ? " - " + data.bairro : ""
        }${data.localidade ? " - " + data.localidade : ""}${data.uf ? "/" + data.uf : ""
        }`;

    return {
        cep: cepLimpo,
        endereco: enderecoMontado,
        raw: data,
    };
}