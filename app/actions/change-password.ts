"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function alterarSenha(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const token = (await cookies()).get("financeiro_access_token")?.value;
  if (!token) redirect("/");
  const senhaAtual = String(formData.get("senhaAtual") ?? "");
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmacao = String(formData.get("confirmacaoSenha") ?? "");
  if (!senhaAtual.trim() || !novaSenha.trim()) return { error: "Informe a senha atual e a nova senha." };
  if (novaSenha.length < 12) return { error: "A nova senha deve ter pelo menos 12 caracteres." };
  if (Buffer.byteLength(senhaAtual, "utf8") > 72 || Buffer.byteLength(novaSenha, "utf8") > 72) return { error: "A senha excede o limite permitido. Use uma senha mais curta." };
  if (novaSenha !== confirmacao) return { error: "A confirmação não corresponde à nova senha." };
  if (!process.env.API_URL) return { error: "O serviço ainda não está configurado." };

  let response: Response;
  try {
    response = await fetch(`${process.env.API_URL.trim().replace(/\/+$/, "")}/usuarios/senha`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ senhaAtual, novaSenha }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch { return { error: "Não foi possível conectar à API. Tente novamente." }; }
  if (response.status === 401) redirect("/");
  if (response.status === 400) {
    try {
      const problem = await response.json();
      if (problem.detail === "Senha atual incorreta") return { error: "A senha atual está incorreta." };
    } catch { /* Use the public validation message. */ }
    return { error: "Não foi possível alterar a senha. Confira os campos informados." };
  }
  if (!response.ok) return { error: "Não foi possível alterar a senha. Tente novamente mais tarde." };
  return { success: true };
}
