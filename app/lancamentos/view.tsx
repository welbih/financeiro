"use client";

import { useEffect, useRef, useState } from "react";
import { excluirLancamento, resumirLancamentos } from "./actions";
import type { Lancamento, ResumoResult } from "./types";
import { isValidMonth, monthLabel, shiftMonth } from "./month";
import styles from "./monthly-summary.module.css";
import { balanceColor } from "./balance-color";
import type { CategoriaOptions } from "../categorias/types";
import LancamentoDialog, { type LancamentoDialogHandle } from "./entry-dialog";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function date(value: string | null) { return value ? value.split("-").reverse().join("/") : "—"; }

export default function LancamentosView({ initial, categorias, currentMonth }: { initial: ResumoResult; categorias: CategoriaOptions; currentMonth: string }) {
  const [result, setResult] = useState(initial);
  const [month, setMonth] = useState(currentMonth);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef<LancamentoDialogHandle>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState<Lancamento | null>(null);
  const receivedSummary = useRef(initial);
  const data = result.data;

  useEffect(() => {
    if (busy || receivedSummary.current === initial) return;
    receivedSummary.current = initial;
    let canceled = false;
    async function synchronize() {
      try {
        const next = await resumirLancamentos(month);
        if (!canceled) { setResult(next); setError(""); }
      } catch {
        if (!canceled) setError("Não foi possível atualizar os lançamentos. Tente novamente.");
      }
    }
    void synchronize();
    return () => { canceled = true; };
  }, [initial, month, busy]);

  async function refresh(selectedMonth = month) {
    const next = await resumirLancamentos(selectedMonth);
    setResult(next);
    setError("");
  }

  function openForm(item: Lancamento | null) {
    setNotice(""); dialog.current?.open(item);
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await excluirLancamento(deleting.id);
      deleteDialog.current?.close();
      if (response.error) { setError(response.error); return; }
      setNotice("Lançamento excluído."); await refresh();
    } catch { deleteDialog.current?.close(); setError("Não foi possível excluir. Tente novamente."); }
    finally { setBusy(false); }
  }

  async function changeMonth(selectedMonth: string) {
    if (busy || !isValidMonth(selectedMonth)) return;
    setMonth(selectedMonth); setResult({}); setBusy(true); setNotice(""); setError("");
    try { await refresh(selectedMonth); }
    catch { setError("Não foi possível carregar o resumo mensal."); }
    finally { setBusy(false); }
  }

  return <div className="entries-container">
    <header className="entries-header"><div><h1>Lançamentos</h1><p className="entries-description">Acompanhe suas receitas e despesas.</p></div>
      <button className="primary-button" onClick={() => openForm(null)} disabled={busy}>+ Adicionar lançamento</button>
    </header>
    <section className={styles["month-navigation"]} aria-label="Selecionar mês dos lançamentos">
      <div className={styles["month-switcher"]}><button className={`secondary-button ${styles["month-arrow"]}`} aria-label="Mês anterior" disabled={busy || month === "0001-01"} onClick={() => changeMonth(shiftMonth(month, -1))}>‹</button><h2 aria-live="polite">{monthLabel(month)}</h2><button className={`secondary-button ${styles["month-arrow"]}`} aria-label="Próximo mês" disabled={busy || month === "9999-12"} onClick={() => changeMonth(shiftMonth(month, 1))}>›</button></div>
      <div className={styles["month-picker"]}><input type="month" aria-label="Escolher mês e ano" min="0001-01" max="9999-12" value={month} disabled={busy} onChange={event => changeMonth(event.target.value)} /><button className="text-button" disabled={busy || month === currentMonth} onClick={() => changeMonth(currentMonth)}>Mês atual</button></div>
    </section>
    <p className={styles["month-explanation"]}>Lançamentos por previsão de pagamento ou, quando não informada, pelo vencimento.</p>
    {(error || result.error) && <div className="entries-alert" role="alert">{error || result.error} <button className="text-button" disabled={busy} onClick={() => changeMonth(month)}>Tentar novamente</button></div>}
    {notice && <p className="entries-notice" role="status">{notice}</p>}
    {busy && <p className={styles["month-loading"]} role="status">Atualizando lançamentos e totais...</p>}
    {data && <section className={styles["monthly-summary"]} aria-label={`Resumo de ${monthLabel(month)}`} aria-busy={busy}>
      <article className={`${styles["summary-card"]} ${styles["summary-expenses"]}`}><p>Total de despesas</p><strong>{money.format(data.totalDespesas)}</strong><span>Despesas do mês</span></article>
      <article className={`${styles["summary-card"]} ${styles["summary-income"]}`}><p>Total de receitas</p><strong>{money.format(data.totalReceitas)}</strong><span>Receitas do mês</span></article>
      <article className={`${styles["summary-card"]} ${styles["summary-balance"]} ${styles[balanceColor(data.diferenca, data.totalReceitas)]}`}><p>Total</p><strong>{money.format(data.diferenca)}</strong><span>Receitas − despesas</span></article>
    </section>}
    {data && <aside className={styles["total-legend"]} aria-label="Legenda das cores do total">
      <p>Cor do Total: porcentagem da receita que sobra após as despesas.</p>
      <ul>
        <li><span className={`${styles["legend-swatch"]} ${styles["negative-balance"]}`} aria-hidden="true" />Vermelho: total negativo</li>
        <li><span className={`${styles["legend-swatch"]} ${styles["low-balance"]}`} aria-hidden="true" />Amarelo claro: de 0% a 10%</li>
        <li><span className={`${styles["legend-swatch"]} ${styles["summary-balance"]}`} aria-hidden="true" />Verde suave: acima de 10% até 30%</li>
        <li><span className={`${styles["legend-swatch"]} ${styles["high-balance"]}`} aria-hidden="true" />Verde claro: acima de 30% até 50%</li>
        <li><span className={`${styles["legend-swatch"]} ${styles["very-high-balance"]}`} aria-hidden="true" />Verde escuro: acima de 50%</li>
      </ul>
    </aside>}
    {data && <section className="entries-table-card" aria-label="Lista de lançamentos" aria-busy={busy}>
      <div className="entries-table-scroll"><table><thead><tr><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Previsão de pagamento</th><th>Pagamento</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>{data.lancamentos.length === 0 ? <tr><td colSpan={9} className="empty-entries">Nenhum lançamento para {monthLabel(month)}.</td></tr> : data.lancamentos.map(item => <tr key={item.id}>
          <td className="entry-description">{item.descricao}</td><td className="entry-description">{categorias.data?.find(category => category.id === item.categoriaId)?.nome ?? (item.categoriaId ? `Categoria #${item.categoriaId}` : "—")}</td><td><span className={`entry-type ${item.tipoLancamento.toLowerCase()}`}>{item.tipoLancamento === "RECEITA" ? "Receita" : "Despesa"}</span></td>
          <td className="entry-money">{money.format(item.valor)}</td><td>{date(item.dataVencimento)}</td><td>{date(item.dataPrevisaoPagamento)}</td><td>{date(item.dataPagamento)}</td><td><span className={item.pago ? "status-paid" : "status-pending"}>{item.pago ? "Pago" : "Pendente"}</span></td>
          <td><div className="entry-actions"><button className="text-button" disabled={busy} onClick={() => openForm(item)} aria-label={`Editar ${item.descricao}`}>Editar</button><button className="text-button danger" disabled={busy} onClick={() => { setDeleting(item); deleteDialog.current?.showModal(); }} aria-label={`Excluir ${item.descricao}`}>Excluir</button></div></td>
        </tr>)}</tbody></table></div>
      <footer className="entries-pagination"><span>{data.lancamentos.length} lançamento(s) em {monthLabel(month)}</span></footer>
    </section>}

    <LancamentoDialog ref={dialog} categorias={categorias} onBusyChange={setBusy} onSaved={async (input, wasEditing) => {
      setNotice(wasEditing ? "Lançamento atualizado." : input.quantidadeRecorrencias ? `${input.quantidadeRecorrencias + 1} lançamentos adicionados, incluindo as recorrências mensais.` : "Lançamento adicionado.");
      try { await refresh(); } catch { setError("Lançamento salvo, mas não foi possível atualizar o resumo. Tente novamente."); }
    }} />
    <dialog ref={deleteDialog} className="entry-dialog" aria-labelledby="delete-title" onCancel={event => { if (busy) event.preventDefault(); }}><h2 id="delete-title">Excluir lançamento?</h2><p className="delete-description">O lançamento “{deleting?.descricao}” será excluído. Essa ação não pode ser desfeita.</p><div className="dialog-actions"><button className="secondary-button" disabled={busy} onClick={() => deleteDialog.current?.close()}>Cancelar</button><button className="primary-button delete-button" disabled={busy} onClick={remove}>{busy ? "Excluindo..." : "Excluir lançamento"}</button></div></dialog>
  </div>;
}
