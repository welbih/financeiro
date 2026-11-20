"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { buscarPlanejamento, resumirPlanejamento } from "./actions";
import { getToday } from "./helpers";
import { isValidMonth, monthLabel, shiftMonth } from "../lancamentos/month";
import type { ConfigResult, ResumoResult } from "./types";
import styles from "./planning.module.css";
import monthly from "../lancamentos/monthly-summary.module.css";
import LancamentoDialog, { type LancamentoDialogHandle } from "../lancamentos/entry-dialog";
import type { CategoriaOptions } from "../categorias/types";
import { excluirLancamento, pagarLancamento } from "../lancamentos/actions";
import type { Lancamento } from "../lancamentos/types";
import { balanceColor } from "../lancamentos/balance-color";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 });
function date(value: string | null) { return value ? value.split("-").reverse().join("/") : "—"; }

export default function PlanejamentoView({ initialConfig, initialResumo, initialMonth, today, categorias }: {
  initialConfig: ConfigResult; initialResumo: ResumoResult; initialMonth: string; today: string; categorias: CategoriaOptions;
}) {
  const [configOverride, setConfigOverride] = useState<{ source: ConfigResult; value: ConfigResult } | null>(null);
  const config = configOverride?.source === initialConfig ? configOverride.value : initialConfig;
  const [result, setResult] = useState(initialResumo);
  const [month, setMonth] = useState(initialMonth);
  const [busy, setBusy] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [retryMonth, setRetryMonth] = useState<string | null>(null);
  const cycleRequest = useRef(0);
  const [notice, setNotice] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentItem, setPaymentItem] = useState<Lancamento | null>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMaxDate, setPaymentMaxDate] = useState(today);
  const paymentDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState<Lancamento | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const entryDialog = useRef<LancamentoDialogHandle>(null);
  const receivedSummary = useRef(initialResumo);
  const summary = result.data;
  const achievement = Boolean(summary && summary.totalReceitas > 0 && summary.saldoFinalProjetado >= summary.totalReceitas);
  const balancePercentage = summary && summary.totalReceitas > 0 ? summary.saldoFinalProjetado / summary.totalReceitas : null;
  const first = config.data?.primeiroCicloDisponivel ?? "";
  const activeCycle = config.data?.cicloAtual ?? initialMonth;
  const cycleBusy = busy || loadingMonth;

  useEffect(() => {
    if (busy || loadingMonth || !config.data || receivedSummary.current === initialResumo) return;
    receivedSummary.current = initialResumo;
    let canceled = false;
    async function synchronize() {
      try {
        const selected = month < config.data!.primeiroCicloDisponivel ? config.data!.cicloAtual : month;
        const next = await resumirPlanejamento(selected);
        if (!canceled) { setMonth(selected); setResult(next); }
      } catch {
        if (!canceled) setResult({ error: "Não foi possível atualizar o planejamento. Tente novamente." });
      }
    }
    void synchronize();
    return () => { canceled = true; };
  }, [initialResumo, month, busy, loadingMonth, config.data, today]);

  async function loadMonth(value: string) {
    if (cycleBusy || !isValidMonth(value)) return;
    if (first && value < first) return;
    const requestId = ++cycleRequest.current;
    setLoadingMonth(true); setRetryMonth(value); setNotice(""); setPaymentError("");
    try {
      const next = await resumirPlanejamento(value);
      if (requestId !== cycleRequest.current) return;
      if (next.data) {
        setMonth(value); setResult(next); setRetryMonth(null);
      } else {
        setResult(previous => ({ ...previous, error: next.error ?? "Não foi possível carregar o ciclo." }));
      }
    }
    catch {
      if (requestId === cycleRequest.current) setResult(previous => ({ ...previous, error: "Não foi possível carregar o ciclo. Tente novamente." }));
    }
    finally { if (requestId === cycleRequest.current) setLoadingMonth(false); }
  }

  async function retryConfig() {
    setBusy(true);
    try {
      const next = await buscarPlanejamento(); setConfigOverride({ source: initialConfig, value: next });
      if (next.data) {
        const selected = next.data.cicloAtual; setMonth(selected);
        setResult(await resumirPlanejamento(selected));
      }
    } catch { setConfigOverride({ source: initialConfig, value: { error: "Não foi possível carregar a configuração." } }); }
    finally { setBusy(false); }
  }

  function openPayment(item: Lancamento) {
    if (cycleBusy || item.pago) return;
    setPaymentMaxDate(getToday());
    setPaymentItem(item); setPaymentDate(""); setPaymentError(""); setNotice("");
    paymentDialog.current?.showModal();
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !paymentItem) return;
    setBusy(true); setPaymentError(""); setNotice("");
    try {
      const response = await pagarLancamento(paymentItem.id, paymentDate || undefined);
      if (response.error) { setPaymentError(response.error); return; }
      paymentDialog.current?.close();
      const operation = paymentItem.tipoLancamento === "RECEITA" ? "Recebimento" : "Pagamento";
      setNotice(`${operation} registrado ${paymentDate ? `em ${date(paymentDate)}` : "com a data de hoje"}.`);
      try { setResult(await resumirPlanejamento(month)); }
      catch { setResult({ error: "Registro salvo, mas não foi possível atualizar o ciclo. Tente novamente." }); }
    } catch { setPaymentError("Não foi possível concluir a atualização. Confira a situação do lançamento antes de tentar novamente."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (cycleBusy || !deleting) return;
    setBusy(true); setDeleteError(""); setNotice("");
    try {
      const response = await excluirLancamento(deleting.id);
      if (response.error) { setDeleteError(response.error); return; }
      deleteDialog.current?.close(); setNotice("Lançamento excluído.");
      try { setResult(await resumirPlanejamento(month)); }
      catch { setResult({ error: "Lançamento excluído, mas não foi possível atualizar o ciclo. Tente novamente." }); }
    } catch { setDeleteError("Não foi possível excluir. Tente novamente."); }
    finally { setBusy(false); }
  }

  return <div className="entries-container">
    <header className="entries-header"><div><h1>Situação financeira</h1><p className="entries-description">Análise sua situação, seus ciclos e acompanhe o saldo projetado ao longo dos meses.</p></div><div className={styles.headerActions}><Link className={`secondary-button ${styles.link}`} href="/lancamentos">Ver lançamentos</Link><button type="button" className="primary-button" disabled={busy} onClick={() => { setNotice(""); entryDialog.current?.open(); }}>+ Adicionar lançamento</button></div></header>
    {config.error && <div className="entries-alert" role="alert">{config.error} <button className="text-button" disabled={busy} onClick={retryConfig}>Tentar novamente</button></div>}
    {!config.error && !config.data && <section className={styles.configuration}><h2>Configure seu planejamento</h2><p>Defina o fechamento, a data inicial e o saldo inicial para consultar seus ciclos.</p><Link className={`primary-button ${styles.link}`} href="/planejamento-financeiro/configuracao">Configurar planejamento</Link></section>}
    {notice && <p className="entries-notice" role="status">{notice}</p>}
    {config.data && <>
      <section className={monthly["month-navigation"]} aria-label="Navegar pelos ciclos de fechamento">
        <div className={monthly["month-switcher"]}><button className={`secondary-button ${monthly["month-arrow"]}`} aria-label="Ciclo anterior" disabled={cycleBusy || month <= first} onClick={() => loadMonth(shiftMonth(month, -1))}>‹</button><h2 aria-live="polite">{monthLabel(month)}</h2><button className={`secondary-button ${monthly["month-arrow"]}`} aria-label="Próximo ciclo" disabled={cycleBusy || month === "9999-12"} onClick={() => loadMonth(shiftMonth(month, 1))}>›</button></div>
        <div className={monthly["month-picker"]}><input type="month" aria-label="Mês do fechamento" min={first} max="9999-12" value={month} disabled={cycleBusy} onChange={event => loadMonth(event.target.value)} /><button className="text-button" disabled={cycleBusy || month === activeCycle} onClick={() => loadMonth(activeCycle)}>Ciclo atual</button></div>
      </section>
      <p className={monthly["month-explanation"]}>Mês do fechamento{summary ? ` · Período: ${date(summary.dataInicial)} a ${date(summary.dataFinal)}` : ""}. A previsão de pagamento define o ciclo; quando ausente, vale o vencimento.{loadingMonth && <span role="status"> Atualizando ciclo...</span>}</p>
      {busy && !loadingMonth && <p className={monthly["month-loading"]} role="status">Atualizando planejamento...</p>}
      {result.error && <div className="entries-alert" role="alert">{result.error} <button className="text-button" disabled={cycleBusy} onClick={() => loadMonth(retryMonth ?? month)}>Tentar novamente</button></div>}
      {summary && <>
        <section className={styles.cards} aria-label="Resumo do ciclo" aria-busy={cycleBusy}>
          <article className={monthly["summary-card"]}><p>Saldo inicial projetado</p><strong>{money.format(summary.saldoInicialProjetado)}</strong><span>Saldo acumulado antes deste ciclo</span></article>
          <article className={`${monthly["summary-card"]} ${monthly["summary-income"]}`}><p>Receitas do ciclo</p><strong>{money.format(summary.totalReceitas)}</strong><span>Recebidas: {money.format(summary.receitasRecebidas)}<br />Pendentes: {money.format(summary.receitasPendentes)}</span></article>
          <article className={`${monthly["summary-card"]} ${monthly["summary-expenses"]}`}><p>Despesas do ciclo</p><strong>{money.format(summary.totalDespesas)}</strong><span>Pagas: {money.format(summary.despesasPagas)}<br />Pendentes: {money.format(summary.despesasPendentes)}</span></article>
          <article className={`${monthly["summary-card"]} ${monthly["summary-balance"]} ${monthly[balanceColor(summary.saldoFinalProjetado, summary.totalReceitas)]} ${achievement ? styles.achievement : ""}`}>
            {achievement && <div className={styles.sparkles} aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>}
            <p>Saldo final projetado {achievement && <span aria-hidden="true">🏆</span>}</p><strong>{money.format(summary.saldoFinalProjetado)}</strong><span>Saldo inicial + resultado do ciclo</span>
            <span className={styles.balancePercentage}>{balancePercentage !== null ? `Saldo: ${percent.format(balancePercentage)} das receitas do ciclo` : "Sem receitas no ciclo para calcular o percentual"}</span>
          </article>
        </section>
        <div className={styles.cycleResult}><strong>Resultado do ciclo: {money.format(summary.resultadoCiclo)}</strong><p>Receitas menos despesas. As projeções incluem lançamentos pagos e pendentes e não representam saldo bancário confirmado.</p></div>
        <section className={`entries-table-card ${styles.categoryTotals}`} aria-labelledby="category-totals-title" aria-busy={cycleBusy}>
          <div className={styles.categoryHeading}><h2 id="category-totals-title">Totais por categoria</h2><p>Receitas e despesas dos lançamentos deste ciclo, pagos e pendentes.</p></div>
          <div className="entries-table-scroll"><table><thead><tr><th scope="col">Categoria</th><th scope="col">Tipo</th><th scope="col">Total</th></tr></thead><tbody>
            {summary.totaisPorCategoria.length === 0 ? <tr><td className="empty-entries" colSpan={3}>Nenhum lançamento por categoria neste ciclo.</td></tr> : summary.totaisPorCategoria.map(item => <tr key={`${item.categoriaId ?? "sem-categoria"}-${item.tipoLancamento}`}><td className="entry-description">{item.categoriaNome}</td><td><span className={`entry-type ${item.tipoLancamento.toLowerCase()}`}>{item.tipoLancamento === "RECEITA" ? "Receita" : "Despesa"}</span></td><td className="entry-money">{money.format(item.total)}</td></tr>)}
          </tbody></table></div>
        </section>
        <section className="entries-table-card" aria-label="Lançamentos do ciclo" aria-busy={cycleBusy}>
          <div className="entries-table-scroll"><table><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Previsão de pagamento</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
            {summary.lancamentos.length === 0 ? <tr><td className="empty-entries" colSpan={7}>Nenhum lançamento neste ciclo.</td></tr> : summary.lancamentos.map(item => <tr key={item.id}><td className="entry-description">{item.descricao}</td><td><span className={`entry-type ${item.tipoLancamento.toLowerCase()}`}>{item.tipoLancamento === "RECEITA" ? "Receita" : "Despesa"}</span></td><td className="entry-money">{money.format(item.valor)}</td><td>{date(item.dataVencimento)}</td><td>{date(item.dataPrevisaoPagamento)}</td><td><span className={item.pago ? "status-paid" : "status-pending"}>{item.pago ? item.tipoLancamento === "RECEITA" ? "Recebida" : "Paga" : "Pendente"}</span></td><td><div className={styles.rowActions}>{!item.pago && <button type="button" className={styles.payButton} disabled={cycleBusy} aria-label={`${item.tipoLancamento === "RECEITA" ? "Receber" : "Pagar"} ${item.descricao}`} onClick={() => openPayment(item)}>{item.tipoLancamento === "RECEITA" ? "Receber" : "Pagar"}</button>}<button type="button" className={styles.payButton} disabled={cycleBusy} aria-label={`Editar ${item.descricao}`} onClick={() => { setNotice(""); entryDialog.current?.open(item); }}>Editar</button><button type="button" className={`${styles.payButton} ${styles.removeButton}`} disabled={cycleBusy} aria-label={`Excluir ${item.descricao}`} onClick={() => { setDeleting(item); setDeleteError(""); setNotice(""); deleteDialog.current?.showModal(); }}>Excluir</button></div></td></tr>)}
          </tbody></table></div><footer className="entries-pagination">{summary.lancamentos.length} lançamento(s) · {date(summary.dataInicial)} a {date(summary.dataFinal)}</footer>
        </section>
      </>}
    </>}
    <LancamentoDialog ref={entryDialog} categorias={categorias} onBusyChange={value => {
      if (value) { cycleRequest.current += 1; setLoadingMonth(false); setRetryMonth(null); }
      setBusy(value);
    }} onSaved={async (input, wasEditing) => {
      const effectiveDate = input.dataPrevisaoPagamento || input.dataVencimento;
      const outsideCycle = summary && (effectiveDate < summary.dataInicial || effectiveDate > summary.dataFinal);
      const addedMessage = wasEditing ? "Lançamento atualizado." : input.quantidadeRecorrencias ? `${input.quantidadeRecorrencias + 1} lançamentos adicionados, incluindo as recorrências mensais.` : "Lançamento adicionado.";
      setNotice(`${addedMessage}${outsideCycle ? " O lançamento está fora do ciclo selecionado." : ""} Os saldos projetados foram atualizados.`);
      if (config.data) {
        try { setResult(await resumirPlanejamento(month)); }
        catch { setResult({ error: "Lançamento salvo, mas não foi possível atualizar o ciclo. Tente novamente." }); }
      }
    }} />
    <dialog ref={deleteDialog} className="entry-dialog" aria-labelledby="delete-entry-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <h2 id="delete-entry-title">Excluir lançamento?</h2><p className="delete-description">O lançamento “{deleting?.descricao}” será excluído. Essa ação não pode ser desfeita.</p>
      {deleteError && <p className="login-error" role="alert">{deleteError}</p>}
      <div className="dialog-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => deleteDialog.current?.close()}>Cancelar</button><button type="button" className="primary-button delete-button" disabled={busy} onClick={remove}>{busy ? "Excluindo..." : "Excluir lançamento"}</button></div>
    </dialog>
    <dialog ref={paymentDialog} className="entry-dialog" aria-labelledby="payment-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <form onSubmit={pay}>
        <h2 id="payment-title">{paymentItem?.tipoLancamento === "RECEITA" ? "Registrar recebimento" : "Registrar pagamento"}</h2>
        <p className={styles.paymentDescription}>{paymentItem?.descricao} · {money.format(paymentItem?.valor ?? 0)}</p>
        <fieldset className="entry-form-fields" disabled={busy}>
          <div className="field"><label htmlFor="payment-date">Data de pagamento <span className="field-optional">(opcional)</span></label><input id="payment-date" name="data" type="date" min="0001-01-01" max={paymentMaxDate} value={paymentDate} onChange={event => setPaymentDate(event.target.value)} aria-describedby="payment-date-help" /><p id="payment-date-help" className="field-hint">Informe hoje ou uma data passada. Se não informar a data, será utilizada a data de hoje.</p></div>
        </fieldset>
        {paymentError && <p className="login-error" role="alert">{paymentError}</p>}
        <div className="dialog-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => paymentDialog.current?.close()}>Cancelar</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Registrando..." : "Confirmar"}</button></div>
      </form>
    </dialog>
  </div>;
}
