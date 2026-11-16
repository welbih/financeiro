import type { Lancamento } from "../lancamentos/types";

export type Planejamento = { diaFechamento: number; dataInicioControle: string; saldoInicial: number };
export type ConfigResult = { data?: Planejamento; notConfigured?: boolean; error?: string };
export type ResumoPlanejamento = {
  mesFechamento: string;
  dataInicial: string;
  dataFinal: string;
  saldoInicialProjetado: number;
  totalReceitas: number;
  totalDespesas: number;
  receitasRecebidas: number;
  receitasPendentes: number;
  despesasPagas: number;
  despesasPendentes: number;
  resultadoCiclo: number;
  saldoFinalProjetado: number;
  lancamentos: Lancamento[];
};
export type ResumoResult = { data?: ResumoPlanejamento; error?: string };
