import { Suspense } from "react";
import { listarCategorias } from "./actions";
import CategoriasView from "./view";

export const metadata = { title: "Categorias | Financeiro" };

async function Lista() { return <CategoriasView initial={await listarCategorias()} />; }

export default function Categorias() {
  return <main className="lancamentos-page"><Suspense fallback={<p role="status">Carregando categorias...</p>}><Lista /></Suspense></main>;
}
