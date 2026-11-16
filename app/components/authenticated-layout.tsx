import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppHeader from "./app-header";

async function AuthenticatedShell({ children }: { children: ReactNode }) {
  const token = (await cookies()).get("financeiro_access_token")?.value;
  if (!token) redirect("/");
  let email: string | undefined;
  let fullName = "Usuário";
  try {
    // Identity is read only for display. API endpoints validate the JWT.
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    if (typeof claims.sub === "string" && claims.sub.trim()) {
      email = claims.sub;
      const nome = typeof claims.nome === "string" ? claims.nome.trim() : "";
      const sobrenome = typeof claims.sobrenome === "string" ? claims.sobrenome.trim() : "";
      fullName = [nome, sobrenome].filter(Boolean).join(" ") || "Usuário";
    }
  } catch { /* An invalid session returns to the login screen. */ }
  if (!email) redirect("/");
  return <><AppHeader fullName={fullName} />{children}</>;
}

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<p className="app-loading" role="status">Carregando...</p>}><AuthenticatedShell>{children}</AuthenticatedShell></Suspense>;
}
