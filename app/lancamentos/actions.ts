"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { LancamentoInput, ResumoMensal, ResumoResult } from "./types";
import { isValidMonth } from "./month";
import { getToday, validDate } from "../lib/dates";

async function request(path: string, method = "GET", body?: LancamentoInput | { data: string }) {
  const token = (await cookies()).get("financeiro_access_token")?.value;
  if (!token) redirect("/");
  const baseUrl = process.env.API_URL;
  if (!baseUrl) return { error: "A API ainda não está configurada." };

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/lancamentos${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { error: "Não foi possível conectar à API. Tente novamente." };
  }
  if (response.status === 401) {
    redirect("/");
  }
  if (!response.ok) {
    if (response.status === 400) {
      try {
        const problem = await response.json();
        if (problem.detail === "Data de pagamento nao pode ser futura") return { error: "A data de pagamento não pode ser futura." };
      } catch { /* Use the public fallback below. */ }
    }
    const errors: Record<number, string> = {
      400: method === "PATCH" ? "O lançamento já está pago ou não pode ser marcado como pago. Atualize a listagem." : "Dados inválidos. Confira os campos e a data de pagamento.",
      403: "Você não tem permissão para esta operação.",
      404: "Lançamento não encontrado. Atualize a listagem.",
      409: "Não foi possível salvar devido a um conflito de dados.",
    };
    return { error: errors[response.status] ?? "Não foi possível concluir a operação. Tente novamente." };
  }
  return { response };
}

export async function resumirLancamentos(mes: string): Promise<ResumoResult> {
  if (typeof mes !== "string" || !isValidMonth(mes)) return { error: "Mês inválido." };
  const result = await request(`/resumo-mensal?mes=${mes}`);
  if (!result.response) return { error: result.error };
  try {
    const data: ResumoMensal = await result.response.json();
    if (!data || data.mes !== mes || !Array.isArray(data.lancamentos) ||
        !Number.isFinite(data.totalDespesas) || !Number.isFinite(data.totalReceitas) || !Number.isFinite(data.diferenca)) {
      return { error: "A API retornou um resumo mensal inválido." };
    }
    return { data };
  } catch {
    return { error: "Não foi possível ler o resumo mensal da API." };
  }
}

export async function salvarLancamento(input: LancamentoInput, id?: number) {
  if (id !== undefined && (!Number.isSafeInteger(id) || id <= 0)) return { error: "Lançamento inválido." };
  if (!input || !["DESPESA", "RECEITA"].includes(input.tipoLancamento) ||
      typeof input.descricao !== "string" || !input.descricao.trim() || input.descricao.trim().length > 500 ||
      !Number.isFinite(input.valor) || input.valor <= 0 || input.valor >= 1e17 ||
      Math.abs(input.valor * 100 - Math.round(input.valor * 100)) > 0.0001 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.dataVencimento) ||
      (input.categoriaId != null && (!Number.isSafeInteger(input.categoriaId) || input.categoriaId <= 0)) ||
      typeof input.pago !== "boolean" || input.pago !== Boolean(input.dataPagamento)) {
    return { error: "Confira os campos obrigatórios, a categoria, o valor e a data de pagamento." };
  }
  const quantidadeRecorrencias = input.quantidadeRecorrencias ?? 0;
  if (input.pago && !validDate(input.dataPagamento)) return { error: "Informe uma data de pagamento válida." };
  if (input.pago && input.dataPagamento! > getToday()) return { error: "A data de pagamento não pode ser futura." };
  if (!Number.isInteger(quantidadeRecorrencias) || quantidadeRecorrencias < 0 || quantidadeRecorrencias > 12) {
    return { error: "Informe de 0 a 12 meses adicionais de recorrência." };
  }
  if (id !== undefined && quantidadeRecorrencias > 0) {
    return { error: "A recorrência pode ser definida somente ao adicionar um lançamento." };
  }
  const payload: LancamentoInput = {
    tipoLancamento: input.tipoLancamento,
    categoriaId: input.categoriaId ?? null,
    descricao: input.descricao.trim(),
    valor: input.valor,
    pago: input.pago,
    dataVencimento: input.dataVencimento,
    dataPrevisaoPagamento: input.dataPrevisaoPagamento || null,
    dataPagamento: input.pago ? input.dataPagamento : null,
    ...(id === undefined ? { quantidadeRecorrencias } : {}),
  };
  const result = await request(id === undefined ? "" : `/${id}`, id === undefined ? "POST" : "PUT", payload);
  if (result.response) {
    revalidatePath("/lancamentos");
    revalidatePath("/planejamento-financeiro");
  }
  return { error: result.error };
}

export async function excluirLancamento(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Lançamento inválido." };
  const result = await request(`/${id}`, "DELETE");
  if (result.response) {
    revalidatePath("/lancamentos");
    revalidatePath("/planejamento-financeiro");
  }
  return { error: result.error };
}

export async function pagarLancamento(id: number, data?: string | null) {
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Lançamento inválido." };
  if (data != null && typeof data !== "string") return { error: "Informe uma data de pagamento válida." };
  const paymentDate = data?.trim() || undefined;
  if (paymentDate) {
    if (!validDate(paymentDate)) {
      return { error: "Informe uma data de pagamento válida." };
    }
    if (paymentDate > getToday()) return { error: "A data de pagamento não pode ser futura." };
  }
  const result = await request(`/${id}/pagar`, "PATCH", paymentDate ? { data: paymentDate } : undefined);
  if (result.response) {
    revalidatePath("/lancamentos");
    revalidatePath("/planejamento-financeiro");
  }
  return { error: result.error };
}
