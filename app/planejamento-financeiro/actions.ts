"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isValidMonth } from "../lancamentos/month";
import { validDate, validStart } from "./helpers";
import type { ConfigResult, Planejamento, PlanejamentoResponse, ResumoPlanejamento, ResumoResult } from "./types";

async function request(path = "", input?: Planejamento) {
  const token = (await cookies()).get("financeiro_access_token")?.value;
  if (!token) redirect("/");
  if (!process.env.API_URL) return { error: "A API ainda não está configurada." };
  let response: Response;
  try {
    response = await fetch(`${process.env.API_URL.replace(/\/$/, "")}/planejamento-financeiro${path}`, {
      method: input ? "PUT" : "GET",
      headers: { Authorization: `Bearer ${token}`, ...(input ? { "Content-Type": "application/json" } : {}) },
      body: input ? JSON.stringify(input) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch { return { error: "Não foi possível conectar à API. Tente novamente." }; }
  if (response.status === 401) redirect("/");
  if (!response.ok) {
    if (response.status === 404 && !path && !input) return { notConfigured: true };
    let error = response.status === 403 ? "Você não tem permissão para esta operação." : "Não foi possível carregar ou salvar o planejamento. Tente novamente.";
    if (response.status === 400) {
      error = "Confira o dia de fechamento, a data inicial e o saldo informado.";
      try {
        const problem = await response.json();
        if (problem.detail === "Inicio do controle deve ser o dia seguinte a um fechamento") error = "O início do controle deve ser o dia seguinte a um fechamento.";
        if (problem.detail === "Ciclo solicitado e anterior ao inicio do controle") error = "O ciclo solicitado é anterior ao início do controle.";
      } catch { /* Use the public validation message. */ }
    }
    if (response.status === 404) error = "Configure seu planejamento antes de consultar os ciclos.";
    return { error };
  }
  return { response };
}

function validConfig(input: Planejamento) {
  return input && Number.isInteger(input.diaFechamento) && input.diaFechamento >= 1 && input.diaFechamento <= 31 &&
    validDate(input.dataInicioControle) && Number.isFinite(input.saldoInicial) && Math.abs(input.saldoInicial) < 1e17 &&
    Math.abs(input.saldoInicial * 100 - Math.round(input.saldoInicial * 100)) < 0.0001;
}

async function readConfig(response: Response): Promise<ConfigResult> {
  try {
    const data: PlanejamentoResponse = await response.json();
    if (!validConfig(data) || !isValidMonth(data.cicloAtual) || !isValidMonth(data.primeiroCicloDisponivel) || data.cicloAtual < data.primeiroCicloDisponivel) return { error: "A API retornou uma configuração inválida." };
    return { data: { diaFechamento: data.diaFechamento, dataInicioControle: data.dataInicioControle, saldoInicial: data.saldoInicial, cicloAtual: data.cicloAtual, primeiroCicloDisponivel: data.primeiroCicloDisponivel } };
  } catch { return { error: "Não foi possível ler a configuração da API." }; }
}

export async function buscarPlanejamento(): Promise<ConfigResult> {
  const result = await request();
  if (!result.response) return { error: result.error, notConfigured: result.notConfigured };
  return readConfig(result.response);
}

export async function salvarPlanejamento(input: Planejamento): Promise<ConfigResult> {
  if (!validConfig(input)) return { error: "Informe fechamento de 1 a 31, data válida e saldo com até duas casas decimais." };
  if (!validStart(input.dataInicioControle, input.diaFechamento)) return { error: "O início do controle deve ser o dia seguinte a um fechamento." };
  const payload = { diaFechamento: input.diaFechamento, dataInicioControle: input.dataInicioControle, saldoInicial: input.saldoInicial };
  const result = await request("", payload);
  if (!result.response) return { error: result.error };
  revalidatePath("/planejamento-financeiro");
  revalidatePath("/planejamento-financeiro/configuracao");
  return readConfig(result.response);
}

export async function resumirPlanejamento(mes: string): Promise<ResumoResult> {
  if (typeof mes !== "string" || !isValidMonth(mes)) return { error: "Mês de fechamento inválido." };
  const result = await request(`/resumo?mesFechamento=${mes}`);
  if (!result.response) return { error: result.error };
  try {
    const data: ResumoPlanejamento = await result.response.json();
    const fields = ["saldoInicialProjetado", "totalReceitas", "totalDespesas", "receitasRecebidas", "receitasPendentes", "despesasPagas", "despesasPendentes", "resultadoCiclo", "saldoFinalProjetado"] as const;
    if (!data || data.mesFechamento !== mes || !validDate(data.dataInicial) || !validDate(data.dataFinal) || !Array.isArray(data.lancamentos) || fields.some(key => !Number.isFinite(data[key]))) return { error: "A API retornou um resumo de planejamento inválido." };
    if (!Array.isArray(data.totaisPorCategoria) || data.totaisPorCategoria.some(item => !item || (item.categoriaId !== null && (!Number.isSafeInteger(item.categoriaId) || item.categoriaId <= 0)) || typeof item.categoriaNome !== "string" || !item.categoriaNome.trim() || !["RECEITA", "DESPESA"].includes(item.tipoLancamento) || !Number.isFinite(item.total) || item.total < 0)) return { error: "A API retornou totais por categoria inválidos." };
    return { data };
  } catch { return { error: "Não foi possível ler o resumo da API." }; }
}
