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

  let apiBase: string;
  try {
    const url = new URL(API_URL.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("Invalid API URL");
    apiBase = url.toString().replace(/\/+$/, "");
  } catch {
    console.error("[auth] configuration_error: invalid_api_url");
    return { error: "O endereço do serviço de autenticação está configurado incorretamente." };
  }

  let response: Response;
  try {
    // OAuth2 Basic Auth requires form-encoding each credential before Base64.
    const encode = (value: string) => new URLSearchParams({ v: value }).toString().slice(2);
    const authorization = Buffer.from(`${encode(CLIENT_ID)}:${encode(CLIENT_SECRET)}`).toString("base64");
    response = await fetch(`${apiBase}/oauth2/token`, {
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
  } catch (error) {
    const cause = error as { name?: string; cause?: { code?: string } };
    const knownCodes = ["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"];
    const code = knownCodes.includes(cause?.cause?.code ?? "") ? cause.cause!.code : "CONNECTION_FAILED";
    console.error("[auth] connection_error", { code: cause?.name === "TimeoutError" ? "REQUEST_TIMEOUT" : code });
    return { error: cause?.name === "TimeoutError" ? "O serviço de autenticação demorou para responder. Tente novamente." : "Não foi possível conectar ao serviço de autenticação. Tente novamente." };
  }

  let data;
  try { data = await response.json(); }
  catch {
    console.error("[auth] invalid_response", { status: response.status });
    return { error: "O serviço de autenticação retornou uma resposta inválida. Confira o endereço da API." };
  }
  if (!response.ok) {
    const oauthError = ["invalid_grant", "invalid_client", "invalid_request", "server_error"].includes(data?.error) ? data.error : "unknown_error";
    const reference = response.headers.get("X-Auth-Error-Id");
    console.error("[auth] authentication_rejected", {
      status: response.status,
      code: oauthError,
      ...(reference && /^[0-9a-f-]{36}$/i.test(reference) ? { reference } : {}),
    });
    return { error: oauthError === "invalid_grant" ? "Usuário ou senha incorretos." : oauthError === "invalid_client" ? "A integração de autenticação está configurada incorretamente. Confira as credenciais do cliente na Vercel." : "Não foi possível entrar. Tente novamente mais tarde." };
  }
  if (!data || typeof data.access_token !== "string" || !data.access_token ||
      typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in) || data.expires_in <= 0 ||
      typeof data.token_type !== "string" || data.token_type.toLowerCase() !== "bearer") {
    console.error("[auth] invalid_token_response", { status: response.status });
    return { error: "O serviço de autenticação retornou uma resposta inválida." };
  }
  const token = data.access_token;
  const expiresIn = Math.floor(data.expires_in);

  (await cookies()).set("financeiro_access_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn,
  });
  redirect("/planejamento-financeiro");
}
