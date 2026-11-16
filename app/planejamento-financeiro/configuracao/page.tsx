import { Suspense } from "react";
import { buscarPlanejamento } from "../actions";
import ConfiguracaoView from "./view";

export const metadata = { title: "Configuração do planejamento | Financeiro" };

async function Conteudo() {
  const initial = await buscarPlanejamento();
  return <ConfiguracaoView initial={initial} />;
}

export default function ConfiguracaoPage() {
  return <main className="lancamentos-page"><Suspense fallback={<p role="status">Carregando configuração...</p>}><Conteudo /></Suspense></main>;
}
