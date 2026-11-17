export type Usuario = { id: number; nome: string; sobrenome: string; email: string; roles: string[]; ativo: boolean; isCurrentUser?: boolean };
export type UsuarioPage = { content: Usuario[]; page: number; size: number; totalElements: number; totalPages: number };
export type UsuariosResult = { data?: UsuarioPage; error?: string };
