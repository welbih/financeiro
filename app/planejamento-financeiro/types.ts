import type { Lancamento } from "../lancamentos/types";

export type Planejamento = { diaFechamento: number; dataInicioControle: string; saldoInicial: number };
export type PlanejamentoResponse = Planejamento & { cicloAtual: string; primeiroCicloDisponivel: string };
export type ConfigResult = { data?: PlanejamentoResponse; notConfigured?: boolean; error?: string };
export type TotalPorCategoria = { categoriaId: number | null; categoriaNome: string; tipoLancamento: Lancamento["tipoLancamento"]; total: number };
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
  totaisPorCategoria: TotalPorCategoria[];
};
export type ResumoResult = { data?: ResumoPlanejamento; error?: string };
