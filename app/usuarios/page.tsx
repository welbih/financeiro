import { Suspense } from "react";
import { listarUsuarios } from "./actions";
import UsuariosView from "./view";

export const metadata = { title: "Usuários | Financeiro" };

async function Lista() { return <UsuariosView initial={await listarUsuarios()} />; }

export default function UsuariosPage() {
  return <main className="lancamentos-page"><Suspense fallback={<p role="status">Carregando usuários...</p>}><Lista /></Suspense></main>;
}
