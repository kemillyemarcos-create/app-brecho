import { supabase } from "../lib/supabase";

export async function inserirCliente(payload) {
  const { error } = await supabase.from("clientes").insert(payload);
  if (error) throw new Error(error.message);
}

export async function atualizarCliente(id, payload) {
  const { error } = await supabase
    .from("clientes")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deletarCliente(id) {
  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}