export type Lancamento = {
  id: number;
  categoriaId: number | null;
  tipoLancamento: "DESPESA" | "RECEITA";
  descricao: string;
  valor: number;
  pago: boolean;
  dataVencimento: string;
  dataPrevisaoPagamento: string | null;
  dataPagamento: string | null;
};

export type LancamentoInput = Omit<Lancamento, "id" | "categoriaId"> & {
  categoriaId?: number | null;
  quantidadeRecorrencias?: number | null;
};
export type ResumoMensal = {
  mes: string;
  totalDespesas: number;
  totalReceitas: number;
  diferenca: number;
  lancamentos: Lancamento[];
};
export type ResumoResult = { data?: ResumoMensal; error?: string };
