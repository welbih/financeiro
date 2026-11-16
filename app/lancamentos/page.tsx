import { Suspense } from "react";
import { resumirLancamentos } from "./actions";
import { connection } from "next/server";
import { getCurrentMonth } from "./month";
import LancamentosView from "./view";
import { carregarOpcoesCategorias } from "../categorias/actions";

export const metadata = { title: "Lançamentos | Financeiro" };

async function Lista() {
  await connection();
  const currentMonth = getCurrentMonth();
  const [initial, categorias] = await Promise.all([resumirLancamentos(currentMonth), carregarOpcoesCategorias()]);
  return <LancamentosView initial={initial} categorias={categorias} currentMonth={currentMonth} />;
}

export default function Lancamentos() {
  return <main className="lancamentos-page"><Suspense fallback={<p role="status">Carregando lançamentos...</p>}><Lista /></Suspense></main>;
}
