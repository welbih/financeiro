"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Categoria, CategoriaInput, CategoriaPage, CategoriaResult, CategoriaOptions } from "./types";

async function request(path: string, method = "GET", body?: CategoriaInput) {
  const token = (await cookies()).get("financeiro_access_token")?.value;
  if (!token) redirect("/");
  if (!process.env.API_URL) return { error: "A API ainda não está configurada." };
  let response: Response;
  try {
    response = await fetch(`${process.env.API_URL.replace(/\/$/, "")}/categorias${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch { return { error: "Não foi possível conectar à API. Tente novamente." }; }
  if (response.status === 401) redirect("/");
  if (!response.ok) {
    const errors: Record<number, string> = {
      400: "Dados inválidos. Confira o nome e o tipo da categoria.",
      403: "Você não tem permissão para esta operação.",
      404: "Categoria não encontrada. Atualize a listagem.",
      409: "Já existe uma categoria com esse nome ou a categoria está em uso por lançamentos.",
    };
    if (response.status === 409) {
      const details: Record<string, string> = {
        "Ja existe uma categoria com esse nome para o usuario": "Já existe uma categoria com esse nome.",
        "Nao e possivel alterar o tipo de uma categoria em uso": "Não é possível alterar o tipo de uma categoria em uso.",
        "Categoria em uso por lancamentos nao pode ser removida": "Esta categoria está em uso por lançamentos e não pode ser excluída.",
      };
      try {
        const problem = await response.json();
        if (Object.hasOwn(details, problem.detail)) return { error: details[problem.detail] };
      } catch { /* Use the public fallback below. */ }
    }
    return { error: errors[response.status] ?? "Não foi possível concluir a operação. Tente novamente." };
  }
  return { response };
}

export async function listarCategorias(page = 0, size = 20): Promise<CategoriaResult> {
  if (!Number.isSafeInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) return { error: "Paginação inválida." };
  const result = await request(`?page=${page}&size=${size}`);
  if (!result.response) return { error: result.error };
  try {
    const data: CategoriaPage = await result.response.json();
    if (!Array.isArray(data.content) || !Number.isInteger(data.page) || !Number.isInteger(data.totalPages)) return { error: "A API retornou uma listagem inválida." };
    return { data };
  } catch { return { error: "Não foi possível ler as categorias da API." }; }
}

export async function carregarOpcoesCategorias(): Promise<CategoriaOptions> {
  const first = await listarCategorias(0, 100);
  if (!first.data) return { error: first.error };
  const data = [...first.data.content];
  for (let page = 1; page < first.data.totalPages; page++) {
    const next = await listarCategorias(page, 100);
    if (!next.data) return { error: next.error };
    data.push(...next.data.content);
  }
  return { data };
}

export async function salvarCategoria(input: CategoriaInput, id?: number): Promise<{ data?: Categoria; error?: string }> {
  if (id !== undefined && (!Number.isSafeInteger(id) || id <= 0)) return { error: "Categoria inválida." };
  if (!input || typeof input.nome !== "string" || !input.nome.trim() || input.nome.trim().length > 100 || !["RECEITA", "DESPESA"].includes(input.tipoLancamento)) {
    return { error: "Informe um nome de até 100 caracteres e um tipo válido." };
  }
  const result = await request(id === undefined ? "" : `/${id}`, id === undefined ? "POST" : "PUT", { nome: input.nome.trim(), tipoLancamento: input.tipoLancamento });
  if (!result.response) return { error: result.error };
  revalidatePath("/categorias"); revalidatePath("/lancamentos"); revalidatePath("/planejamento-financeiro");
  try {
    const data: Categoria = await result.response.json();
    if (!data || !Number.isSafeInteger(data.id) || data.id <= 0 || typeof data.nome !== "string" || !["DESPESA", "RECEITA"].includes(data.tipoLancamento)) throw new Error("Invalid category response");
    return { data: { id: data.id, nome: data.nome, tipoLancamento: data.tipoLancamento } };
  } catch { return { error: "A categoria foi salva, mas não foi possível ler seus dados. Atualize a página antes de tentar novamente." }; }
}

export async function excluirCategoria(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Categoria inválida." };
  const result = await request(`/${id}`, "DELETE");
  if (result.response) { revalidatePath("/categorias"); revalidatePath("/lancamentos"); }
  return { error: result.error };
}
