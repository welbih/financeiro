import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppHeader from "./app-header";
import SessionExpiryNotice from "./session-expiry-notice";

async function AuthenticatedShell({ children }: { children: ReactNode }) {
  const token = (await cookies()).get("financeiro_access_token")?.value;
  if (!token) redirect("/");
  let email: string | undefined;
  let fullName = "Usuário";
  let expiresAt: number | null = null;
  let isAdmin = false;
  try {
    // Identity is read only for display. API endpoints validate the JWT.
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    isAdmin = Array.isArray(claims.authorities) && claims.authorities.includes("ROLE_ADMIN");
    if (typeof claims.exp === "number" && Number.isFinite(claims.exp) && claims.exp > 0 && claims.exp <= 8_640_000_000_000) expiresAt = claims.exp * 1000;
    if (typeof claims.sub === "string" && claims.sub.trim()) {
      email = claims.sub;
      const nome = typeof claims.nome === "string" ? claims.nome.trim() : "";
      const sobrenome = typeof claims.sobrenome === "string" ? claims.sobrenome.trim() : "";
      fullName = [nome, sobrenome].filter(Boolean).join(" ") || "Usuário";
    }
  } catch { /* An invalid session returns to the login screen. */ }
  if (!email) redirect("/");
  return <><AppHeader fullName={fullName} isAdmin={isAdmin} /><SessionExpiryNotice expiresAt={expiresAt} />{children}</>;
}

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p className="app-loading" role="status">Carregando...</p>}><AuthenticatedShell>{children}</AuthenticatedShell></Suspense>;
}
