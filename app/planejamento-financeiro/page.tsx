import { Suspense } from "react";
import { connection } from "next/server";
import { buscarPlanejamento, resumirPlanejamento } from "./actions";
import { getToday } from "./helpers";
import PlanejamentoView from "./view";
import { carregarOpcoesCategorias } from "../categorias/actions";

export const metadata = { title: "Situação financeira | Financeiro" };

async function Conteudo() {
  await connection();
  const today = getToday();
  const [config, categorias] = await Promise.all([buscarPlanejamento(), carregarOpcoesCategorias()]);
  const month = config.data?.cicloAtual ?? today.slice(0, 7);
  const resumo = config.data ? await resumirPlanejamento(month) : {};
  return <PlanejamentoView initialConfig={config} initialResumo={resumo} initialMonth={month} today={today} categorias={categorias} />;
}

export default function PlanejamentoPage() {
  return <main className="lancamentos-page"><Suspense fallback={<p role="status">Carregando situação financeira...</p>}><Conteudo /></Suspense></main>;
}
