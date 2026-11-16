"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(_state: { error: string }, formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Informe seu usuário e sua senha." };
  }

  const { API_URL, CLIENT_ID, CLIENT_SECRET } = process.env;
  if (!API_URL || !CLIENT_ID || !CLIENT_SECRET) {
    return { error: "O serviço de autenticação ainda não está configurado." };
  }

  let token: string;
  let expiresIn: number;
  try {
    // OAuth2 Basic Auth requires form-encoding each credential before Base64.
    const encode = (value: string) => new URLSearchParams({ v: value }).toString().slice(2);
    const authorization = Buffer.from(`${encode(CLIENT_ID)}:${encode(CLIENT_SECRET)}`).toString("base64");
    const response = await fetch(`${API_URL.replace(/\/$/, "")}/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:financeiro:params:oauth:grant-type:password",
        username,
        password,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        error: data.error === "invalid_grant"
          ? "Usuário ou senha incorretos."
          : "Não foi possível entrar. Tente novamente mais tarde.",
      };
    }
    if (typeof data.access_token !== "string" || !data.access_token ||
        typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in) || data.expires_in <= 0 ||
        typeof data.token_type !== "string" || data.token_type.toLowerCase() !== "bearer") {
      return { error: "O serviço de autenticação retornou uma resposta inválida." };
    }
    token = data.access_token;
    expiresIn = Math.floor(data.expires_in);
  } catch {
    return { error: "Não foi possível conectar ao serviço de autenticação. Tente novamente." };
  }

  (await cookies()).set("financeiro_access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn,
  });
  redirect("/planejamento-financeiro");
}
