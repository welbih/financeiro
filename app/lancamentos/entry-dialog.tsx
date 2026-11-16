"use client";

import { forwardRef, useImperativeHandle, useRef, useState, type FormEvent } from "react";
import { salvarLancamento } from "./actions";
import type { Lancamento, LancamentoInput } from "./types";
import type { Categoria, CategoriaOptions } from "../categorias/types";
import { getToday } from "../lib/dates";
import { salvarCategoria } from "../categorias/actions";
import styles from "./entry-dialog.module.css";

export type LancamentoDialogHandle = { open: (item?: Lancamento | null) => void };
type Props = {
  categorias: CategoriaOptions;
  onSaved: (input: LancamentoInput, editing: boolean) => Promise<void>;
  onBusyChange: (busy: boolean) => void;
};

function maskAmount(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const cents = digits.replace(/^0+/, "").padStart(3, "0");
  return `${cents.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${cents.slice(-2)}`;
}
const LancamentoDialog = forwardRef<LancamentoDialogHandle, Props>(function LancamentoDialog({ categorias, onSaved, onBusyChange }, ref) {
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [paid, setPaid] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"DESPESA" | "RECEITA">("DESPESA");
  const [categoryId, setCategoryId] = useState("");
  const [recurrences, setRecurrences] = useState(0);
  const [formError, setFormError] = useState("");
  const [formVersion, setFormVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [paymentMaxDate, setPaymentMaxDate] = useState("");
  const [createdCategories, setCreatedCategories] = useState<Categoria[]>([]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const categoryOptions = [...new Map([...createdCategories, ...(categorias.data ?? [])].map(item => [item.id, item])).values()].filter(item => item.tipoLancamento === type);

  useImperativeHandle(ref, () => ({ open(item = null) {
    setPaymentMaxDate(getToday());
    setType(item?.tipoLancamento ?? "DESPESA");
    setCategoryId(item?.categoriaId ? String(item.categoriaId) : "");
    setAmount(item ? maskAmount(item.valor.toFixed(2)) : "");
    setEditing(item); setPaid(item?.pago ?? false); setFormError("");
    setRecurrences(0);
    setAddingCategory(false); setCategoryName(""); setCategoryError("");
    setFormVersion(value => value + 1); dialog.current?.showModal();
  } }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || categoryBusy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); onBusyChange(true); setFormError("");
    const input: LancamentoInput = {
      tipoLancamento: type,
      categoriaId: categoryId ? Number(categoryId) : null,
      descricao: String(form.get("descricao") ?? ""),
      valor: Number(amount.replace(/\./g, "").replace(",", ".")),
      pago: paid,
      dataVencimento: String(form.get("dataVencimento") ?? ""),
      dataPrevisaoPagamento: String(form.get("dataPrevisaoPagamento") ?? "") || null,
      dataPagamento: paid ? String(form.get("dataPagamento") ?? "") : null,
      ...(!editing ? { quantidadeRecorrencias: recurrences } : {}),
    };
    try {
      const response = await salvarLancamento(input, editing?.id);
      if (response.error) { setFormError(response.error); onBusyChange(false); return; }
    } catch { setFormError("Não foi possível salvar. Tente novamente."); onBusyChange(false); return; }
    finally { setBusy(false); }
    dialog.current?.close();
    try { await onSaved(input, Boolean(editing)); }
    finally { onBusyChange(false); }
  }

  async function createCategory() {
    if (busy || categoryBusy) return;
    if (!categoryName.trim()) { setCategoryError("Informe o nome da categoria."); return; }
    setCategoryBusy(true); onBusyChange(true); setCategoryError("");
    try {
      const response = await salvarCategoria({ nome: categoryName.trim(), tipoLancamento: type });
      if (!response.data) { setCategoryError(response.error ?? "Não foi possível adicionar a categoria."); return; }
      const category = response.data;
      setCreatedCategories(previous => [...previous.filter(item => item.id !== category.id), category]);
      setCategoryId(String(category.id)); setAddingCategory(false); setCategoryName("");
    } catch { setCategoryError("Não foi possível adicionar a categoria. Tente novamente."); }
    finally { setCategoryBusy(false); onBusyChange(false); }
  }

  return (
<dialog ref={dialog} className="entry-dialog" aria-labelledby="entry-form-title" onCancel={event => { if (busy || categoryBusy) event.preventDefault(); }}>
      <form key={formVersion} onSubmit={save}>
        <h2 id="entry-form-title">{editing ? "Editar lançamento" : "Adicionar lançamento"}</h2>
        <fieldset disabled={busy || categoryBusy} className="entry-form-fields">
          <div className="field"><label htmlFor="description">Descrição <span className="field-required" aria-hidden="true">*</span></label><input id="description" name="descricao" maxLength={500} defaultValue={editing?.descricao ?? ""} required /></div>
          <div className="entry-form-row"><div className="field"><label htmlFor="type">Tipo <span className="field-required" aria-hidden="true">*</span></label><select id="type" name="tipoLancamento" required value={type} onChange={event => { setType(event.target.value as "DESPESA" | "RECEITA"); setCategoryId(""); setAddingCategory(false); setCategoryError(""); setCategoryName(""); }}><option value="DESPESA">Despesa</option><option value="RECEITA">Receita</option></select></div><div className="field"><label htmlFor="amount">Valor (R$) <span className="field-required" aria-hidden="true">*</span></label><input id="amount" name="valor" type="text" inputMode="numeric" placeholder="0,00" value={amount} onChange={event => setAmount(maskAmount(event.target.value))} required /></div></div>
          <div className="field"><div className={styles.categoryHeading}><label htmlFor="entry-category">Categoria <span className="field-optional">(opcional)</span></label><button type="button" className="text-button" onClick={() => { setAddingCategory(value => !value); setCategoryError(""); }} aria-expanded={addingCategory} aria-controls="new-entry-category">+ Nova categoria</button></div><select id="entry-category" name="categoriaId" value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">Sem categoria</option>{categoryId && !categoryOptions.some(item => String(item.id) === categoryId) && <option value={categoryId}>Categoria #{categoryId} (atual)</option>}{categoryOptions.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>
            {categorias.error ? <p className="field-hint" role="status">{categorias.error} Você pode criar uma nova categoria aqui, salvar sem categoria ou manter a categoria atual.</p> : categoryOptions.length === 0 && <p className="field-hint">Nenhuma categoria de {type === "DESPESA" ? "despesa" : "receita"} cadastrada. Use “Nova categoria” para cadastrar aqui ou salve sem categoria.</p>}
          </div>
          {addingCategory && <div id="new-entry-category" className={styles.categoryEditor} role="group" aria-labelledby="new-category-label">
            <div className="field"><label id="new-category-label" htmlFor="new-category-name">Nome da categoria <span className="field-required" aria-hidden="true">*</span></label><input id="new-category-name" type="text" maxLength={100} value={categoryName} onChange={event => setCategoryName(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void createCategory(); } }} aria-describedby="new-category-type" /></div>
            <p id="new-category-type" className="field-hint">Tipo: {type === "DESPESA" ? "Despesa" : "Receita"}, igual ao lançamento. A nova categoria será selecionada automaticamente.</p>
            {categoryError && <p className="login-error" role="alert">{categoryError}</p>}
            <div className={styles.categoryActions}><button type="button" className="secondary-button" onClick={() => { setAddingCategory(false); setCategoryError(""); }}>Cancelar</button><button type="button" className="primary-button" onClick={createCategory}>{categoryBusy ? "Adicionando..." : "Adicionar categoria"}</button></div>
          </div>}
          <div className="entry-form-row"><div className="field"><label htmlFor="due">Vencimento <span className="field-required" aria-hidden="true">*</span></label><input id="due" name="dataVencimento" type="date" defaultValue={editing?.dataVencimento ?? ""} required /></div><div className="field"><label htmlFor="expected">Previsão de pagamento <span className="field-optional">(opcional)</span></label><input id="expected" name="dataPrevisaoPagamento" type="date" defaultValue={editing?.dataPrevisaoPagamento ?? ""} /></div></div>
          <label className="entry-checkbox"><input type="checkbox" checked={paid} onChange={event => setPaid(event.target.checked)} /> Lançamento pago</label>
          {paid && <div className="field"><label htmlFor="payment">Data de pagamento <span className="field-required" aria-hidden="true">*</span></label><input id="payment" name="dataPagamento" type="date" min="0001-01-01" max={paymentMaxDate} defaultValue={editing?.dataPagamento ?? ""} aria-describedby="entry-payment-help" required /><p id="entry-payment-help" className="field-hint">Informe hoje ou uma data passada.</p></div>}
          {!editing && <div className="field">
            <label htmlFor="entry-recurrences">Recorrência <span className="field-optional">(opcional)</span></label>
            <select id="entry-recurrences" name="quantidadeRecorrencias" value={recurrences} onChange={event => setRecurrences(Number(event.target.value))} aria-describedby="recurrence-help">
              <option value={0}>Não repetir</option>
              {Array.from({ length: 12 }, (_, index) => index + 1).map(count => <option key={count} value={count}>Repetir por mais {count} {count === 1 ? "mês" : "meses"}</option>)}
            </select>
            <p id="recurrence-help" className="field-hint">{recurrences > 0 ? `Serão criados ${recurrences + 1} lançamentos: este e mais ${recurrences}, um por mês. O valor informado será usado em cada lançamento. Datas que não existirem no mês serão ajustadas para o último dia.` : "Será criado apenas este lançamento."}</p>
            {recurrences > 0 && paid && <p className="field-hint" role="status">Os próximos lançamentos também serão marcados como pagos, com a mesma data de pagamento.</p>}
          </div>}
          {editing && <p className="field-hint">A edição altera apenas este lançamento. Recorrências são definidas no cadastro.</p>}
        </fieldset>
        {formError && <p className="login-error" role="alert">{formError}</p>}
        <div className="dialog-actions"><button type="button" className="secondary-button" disabled={busy || categoryBusy} onClick={() => dialog.current?.close()}>Cancelar</button><button className="primary-button" disabled={busy || categoryBusy}>{busy ? "Salvando..." : "Salvar lançamento"}</button></div>
      </form>
    </dialog>
  );
});

export default LancamentoDialog;
