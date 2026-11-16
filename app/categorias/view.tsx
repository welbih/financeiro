"use client";

import { useRef, useState, type FormEvent } from "react";
import { excluirCategoria, listarCategorias, salvarCategoria } from "./actions";
import type { Categoria, CategoriaResult } from "./types";

export default function CategoriasView({ initial }: { initial: CategoriaResult }) {
  const [result, setResult] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [deleting, setDeleting] = useState<Categoria | null>(null);
  const [formError, setFormError] = useState("");
  const [formVersion, setFormVersion] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const data = result.data;

  async function refresh(page = data?.page ?? 0) {
    let next = await listarCategorias(page);
    if (next.data && page > 0 && next.data.content.length === 0) next = await listarCategorias(Math.max(0, next.data.totalPages - 1));
    if (next.error) setError(next.error);
    else { setResult(next); setError(""); }
  }

  function openForm(item: Categoria | null) {
    setEditing(item); setFormVersion(value => value + 1); setFormError(""); setNotice("");
    dialog.current?.showModal();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setFormError(""); setNotice("");
    try {
      const response = await salvarCategoria({ nome: String(form.get("nome") ?? ""), tipoLancamento: form.get("tipoLancamento") as "RECEITA" | "DESPESA" }, editing?.id);
      if (response.error) { setFormError(response.error); return; }
      dialog.current?.close(); setNotice(editing ? "Categoria atualizada." : "Categoria adicionada.");
      await refresh();
    } catch { setFormError("Não foi possível salvar. Tente novamente."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await excluirCategoria(deleting.id);
      deleteDialog.current?.close();
      if (response.error) { setError(response.error); return; }
      setNotice("Categoria excluída."); await refresh();
    } catch { deleteDialog.current?.close(); setError("Não foi possível excluir. Tente novamente."); }
    finally { setBusy(false); }
  }

  async function changePage(page: number) {
    setBusy(true); setNotice("");
    try { await refresh(page); }
    catch { setError("Não foi possível carregar as categorias."); }
    finally { setBusy(false); }
  }

  return <div className="entries-container">
    <header className="entries-header"><div><h1>Categorias</h1><p className="entries-description">Organize suas receitas e despesas por categoria.</p></div><button className="primary-button" disabled={busy} onClick={() => openForm(null)}>+ Adicionar categoria</button></header>
    {(error || result.error) && <div className="entries-alert" role="alert">{error || result.error} <button className="text-button" disabled={busy} onClick={() => changePage(data?.page ?? 0)}>Tentar novamente</button></div>}
    {notice && <p className="entries-notice" role="status">{notice}</p>}
    {data && <section className="entries-table-card" aria-label="Lista de categorias" aria-busy={busy}>
      <div className="entries-table-scroll"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Ações</th></tr></thead><tbody>
        {data.content.length === 0 ? <tr><td colSpan={3} className="empty-entries">Nenhuma categoria cadastrada. Adicione sua primeira categoria.</td></tr> : data.content.map(item => <tr key={item.id}>
          <td className="entry-description">{item.nome}</td><td><span className={`entry-type ${item.tipoLancamento.toLowerCase()}`}>{item.tipoLancamento === "RECEITA" ? "Receita" : "Despesa"}</span></td>
          <td><div className="entry-actions"><button className="text-button" disabled={busy} aria-label={`Editar ${item.nome}`} onClick={() => openForm(item)}>Editar</button><button className="text-button danger" disabled={busy} aria-label={`Excluir ${item.nome}`} onClick={() => { setDeleting(item); deleteDialog.current?.showModal(); }}>Excluir</button></div></td>
        </tr>)}
      </tbody></table></div>
      <footer className="entries-pagination"><span>{data.totalElements} categoria(s) · Página {data.page + 1} de {Math.max(1, data.totalPages)}</span><div className="entry-actions"><button className="secondary-button" disabled={busy || data.page === 0} onClick={() => changePage(data.page - 1)}>Anterior</button><button className="secondary-button" disabled={busy || data.page + 1 >= data.totalPages} onClick={() => changePage(data.page + 1)}>Próxima</button></div></footer>
    </section>}
    <dialog ref={dialog} className="entry-dialog" aria-labelledby="category-form-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <form key={formVersion} onSubmit={save}><h2 id="category-form-title">{editing ? "Editar categoria" : "Adicionar categoria"}</h2><fieldset className="entry-form-fields" disabled={busy}>
        <div className="field"><label htmlFor="category-name">Nome <span className="field-required" aria-hidden="true">*</span></label><input id="category-name" name="nome" maxLength={100} defaultValue={editing?.nome ?? ""} required /></div>
        <div className="field"><label htmlFor="category-type">Tipo <span className="field-required" aria-hidden="true">*</span></label><select id="category-type" name="tipoLancamento" required defaultValue={editing?.tipoLancamento ?? "DESPESA"}><option value="DESPESA">Despesa</option><option value="RECEITA">Receita</option></select></div>
      </fieldset>{formError && <p className="login-error" role="alert">{formError}</p>}<div className="dialog-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => dialog.current?.close()}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? "Salvando..." : "Salvar categoria"}</button></div></form>
    </dialog>
    <dialog ref={deleteDialog} className="entry-dialog" aria-labelledby="delete-category-title" onCancel={event => { if (busy) event.preventDefault(); }}><h2 id="delete-category-title">Excluir categoria?</h2><p className="delete-description">A categoria “{deleting?.nome}” será excluída. Essa ação não pode ser desfeita.</p><div className="dialog-actions"><button className="secondary-button" disabled={busy} onClick={() => deleteDialog.current?.close()}>Cancelar</button><button className="primary-button delete-button" disabled={busy} onClick={remove}>{busy ? "Excluindo..." : "Excluir categoria"}</button></div></dialog>
  </div>;
}
