export type Categoria = { id: number; nome: string; tipoLancamento: "DESPESA" | "RECEITA" };
export type CategoriaInput = Omit<Categoria, "id">;
export type CategoriaPage = { content: Categoria[]; page: number; size: number; totalElements: number; totalPages: number };
export type CategoriaResult = { data?: CategoriaPage; error?: string };
export type CategoriaOptions = { data?: Categoria[]; error?: string };
