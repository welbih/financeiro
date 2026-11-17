"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { UsuarioPage, UsuariosResult } from "./types";

async function adminToken() {
  const token = (await cookies()).get("financeiro_access_token")?.value;
  if (!token) redirect("/");
  let isAdmin = false;
  let subject: string | undefined;
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    isAdmin = Array.isArray(claims.authorities) && claims.authorities.includes("ROLE_ADMIN");
    if (typeof claims.sub === "string" && claims.sub.trim()) subject = claims.sub;
  } catch { redirect("/"); }
  if (!isAdmin) redirect("/planejamento-financeiro");
  if (!subject) redirect("/");
  return { token, subject };
}

export async function listarUsuarios(page = 0): Promise<UsuariosResult> {
  const { token, subject } = await adminToken();
  if (!Number.isSafeInteger(page) || page < 0) return { error: "Página inválida." };
  if (!process.env.API_URL) return { error: "A API ainda não está configurada." };
  let response: Response;
  try {
    // The API verifies the signature and enforces ROLE_ADMIN for every request.
    response = await fetch(`${process.env.API_URL.trim().replace(/\/+$/, "")}/usuarios?page=${page}&size=20`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch { return { error: "Não foi possível conectar à API. Tente novamente." }; }
  if (response.status === 401) redirect("/");
  if (response.status === 403) redirect("/planejamento-financeiro");
  if (!response.ok) return { error: "Não foi possível carregar os usuários. Tente novamente." };
  try {
    const data: UsuarioPage = await response.json();
    if (!data || !Array.isArray(data.content) || !Number.isInteger(data.page) || !Number.isInteger(data.totalPages) || !Number.isSafeInteger(data.totalElements) || data.content.some(item => !item || !Number.isSafeInteger(item.id) || typeof item.nome !== "string" || typeof item.sobrenome !== "string" || typeof item.email !== "string" || typeof item.ativo !== "boolean" || !Array.isArray(item.roles) || item.roles.some(role => typeof role !== "string"))) return { error: "A API retornou uma listagem inválida." };
    return { data: { ...data, content: data.content.map(({ id, nome, sobrenome, email, roles, ativo }) => ({ id, nome, sobrenome, email, roles, ativo, isCurrentUser: email.toLowerCase() === subject.toLowerCase() })) } };
  } catch { return { error: "Não foi possível ler os usuários da API." }; }
}

async function alterarSituacao(id: number, ativo: boolean): Promise<{ error?: string }> {
  const { token } = await adminToken();
  if (!Number.isSafeInteger(id) || id <= 0) return { error: "Usuário inválido." };
  if (!process.env.API_URL) return { error: "A API ainda não está configurada." };
  if (!ativo) {
    // Resolve the target on the server; never trust identity flags from the browser.
    let page = 0;
    while (true) {
      const listed = await listarUsuarios(page);
      if (!listed.data) return { error: "Não foi possível validar o usuário. Atualize a listagem e tente novamente." };
      const target = listed.data.content.find(user => user.id === id);
      if (target) {
        if (target.isCurrentUser) return { error: "Você não pode desativar sua própria conta." };
        break;
      }
      if (++page >= listed.data.totalPages) return { error: "Usuário não encontrado. Atualize a listagem." };
    }
  }
  let response: Response;
  try {
    response = await fetch(`${process.env.API_URL.trim().replace(/\/+$/, "")}/usuarios/${id}/${ativo ? "ativar" : "inativar"}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch { return { error: "Não foi possível conectar à API. Tente novamente." }; }
  if (response.status === 401) redirect("/");
  if (response.status === 403) redirect("/planejamento-financeiro");
  if (response.status === 404) return { error: "Usuário não encontrado. Atualize a listagem." };
  if (!response.ok) return { error: `Não foi possível ${ativo ? "ativar" : "desativar"} o usuário. Tente novamente.` };
  revalidatePath("/usuarios");
  return {};
}

export async function inativarUsuario(id: number) { return alterarSituacao(id, false); }
export async function ativarUsuario(id: number) { return alterarSituacao(id, true); }
