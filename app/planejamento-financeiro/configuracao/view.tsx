"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { buscarPlanejamento, salvarPlanejamento } from "../actions";
import { maskBalance } from "../helpers";
import type { ConfigResult } from "../types";
import styles from "../planning.module.css";

export default function ConfiguracaoView({ initial }: { initial: ConfigResult }) {
  const [config, setConfig] = useState(initial);
  const [balance, setBalance] = useState(initial.data ? maskBalance(initial.data.saldoInicial.toFixed(2)) : "0,00");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [formVersion, setFormVersion] = useState(0);

  async function retryConfig() {
    setBusy(true);
    try {
      const next = await buscarPlanejamento(); setConfig(next);
      if (next.data) { setBalance(maskBalance(next.data.saldoInicial.toFixed(2))); setFormVersion(value => value + 1); }
    } catch { setConfig({ error: "Não foi possível carregar a configuração." }); }
    finally { setBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!balance || balance === "-") { setFormError("Informe o saldo inicial, que pode ser zero ou negativo."); return; }
    setBusy(true); setFormError(""); setNotice("");
    try {
      const response = await salvarPlanejamento({ diaFechamento: Number(form.get("diaFechamento")), dataInicioControle: String(form.get("dataInicioControle") ?? ""), saldoInicial: Number(balance.replace(/\./g, "").replace(",", ".")) });
      if (!response.data) { setFormError(response.error ?? "Não foi possível salvar."); return; }
      setConfig(response); setNotice("Configuração salva. Os saldos projetados serão recalculados no situação financeira.");
    } catch { setFormError("Não foi possível salvar a configuração. Tente novamente."); }
    finally { setBusy(false); }
  }

  return <div className="entries-container">
    <header className="entries-header"><div><h1>Configuração do planejamento</h1><p className="entries-description">Defina os parâmetros dos seus ciclos financeiros.</p></div><Link className={`secondary-button ${styles.link}`} href="/planejamento-financeiro">Voltar ao planejamento</Link></header>
    {config.error && <div className="entries-alert" role="alert">{config.error} <button className="text-button" disabled={busy} onClick={retryConfig}>Tentar novamente</button></div>}
    {notice && <p className="entries-notice" role="status">{notice}</p>}
    {!config.error && <section className={styles.configuration} aria-labelledby="planning-config-title">
      <h2 id="planning-config-title">{config.data ? "Configuração do planejamento" : "Configure seu planejamento"}</h2>
      <p>Defina o fechamento do ciclo e o saldo disponível antes dos primeiros lançamentos.</p>
      <form onSubmit={save} key={formVersion}>
        <fieldset disabled={busy} className={styles.fields}>
          <div className="field"><label htmlFor="closing-day">Dia de fechamento <span className="field-required" aria-hidden="true">*</span></label><input id="closing-day" name="diaFechamento" type="number" min="1" max="31" step="1" defaultValue={config.data?.diaFechamento ?? ""} aria-describedby="closing-help" required /><p id="closing-help" className="field-hint">De 1 a 31. Em meses menores, considera o último dia.</p></div>
          <div className="field"><label htmlFor="control-start">Início do controle <span className="field-required" aria-hidden="true">*</span></label><input id="control-start" name="dataInicioControle" type="date" min="0001-01-01" max="9999-12-31" defaultValue={config.data?.dataInicioControle ?? ""} aria-describedby="start-help" required /><p id="start-help" className="field-hint">Deve ser o dia seguinte a um fechamento. Ex.: fechamento 9, início dia 10.</p></div>
          <div className="field"><label htmlFor="initial-balance">Saldo inicial (R$) <span className="field-required" aria-hidden="true">*</span></label><input id="initial-balance" name="saldoInicial" type="text" inputMode="decimal" value={balance} onChange={event => setBalance(maskBalance(event.target.value))} aria-describedby="balance-help" required /><p id="balance-help" className="field-hint">Pode ser zero ou negativo. Use “−” antes do valor para um saldo negativo.</p></div>
        </fieldset>
        {formError && <p className="login-error" role="alert">{formError}</p>}
        <div className={styles.saveRow}><p>Alterações na configuração ou em lançamentos passados recalculam as projeções futuras.</p><button className="primary-button" disabled={busy}>{busy ? "Aguarde..." : "Salvar planejamento"}</button></div>
      </form>
    </section>}
  </div>;
}
