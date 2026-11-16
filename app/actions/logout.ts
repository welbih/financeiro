"use server";

import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get("financeiro_access_token")?.value;
  if (token) {
    if (!process.env.API_URL) return { error: "O serviço de autenticação ainda não está configurado." };
    let response: Response;
    try {
      response = await fetch(`${process.env.API_URL.replace(/\/$/, "")}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      return { error: "Não foi possível conectar à API para sair. Tente novamente." };
    }
    // An expired or already revoked token can also end the local session.
    if (!response.ok && response.status !== 401) {
      return { error: "Não foi possível sair. Tente novamente." };
    }
  }
  cookieStore.delete("financeiro_access_token");
  redirect("/", RedirectType.replace);
}
