"use client";

import { useRef, useState } from "react";
import { ativarUsuario, inativarUsuario, listarUsuarios } from "./actions";
import type { Usuario, UsuariosResult } from "./types";

export default function UsuariosView({ initial }: { initial: UsuariosResult }) {
  const [result, setResult] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const data = result.data;

  async function load(page: number) {
    if (busy) return;
    setBusy(true);
    try {
      const next = await listarUsuarios(page);
      if (next.error) setResult(previous => ({ ...previous, error: next.error }));
      else setResult(next);
    } catch { setResult(previous => ({ ...previous, error: "Não foi possível carregar os usuários. Tente novamente." })); }
    finally { setBusy(false); }
  }

  async function changeStatus() {
    if (busy || !selected) return;
    if (selected.ativo && selected.isCurrentUser) { setActionError("Você não pode desativar sua própria conta."); return; }
    const activate = !selected.ativo;
    setBusy(true); setActionError(""); setNotice("");
    try {
      const response = await (activate ? ativarUsuario(selected.id) : inativarUsuario(selected.id));
      if (response.error) { setActionError(response.error); return; }
      dialog.current?.close();
      setNotice(activate ? "Usuário ativado." : "Usuário desativado.");
      setResult(previous => previous.data ? { data: { ...previous.data, content: previous.data.content.map(item => item.id === selected.id ? { ...item, ativo: activate } : item) } } : previous);
      try {
        const next = await listarUsuarios(data?.page ?? 0);
        if (next.error) setResult(previous => ({ ...previous, error: next.error }));
        else setResult(next);
      } catch { setResult(previous => ({ ...previous, error: "Situação atualizada, mas não foi possível atualizar a listagem." })); }
    } catch { setActionError("Não foi possível concluir a operação. Confira a situação do usuário antes de tentar novamente."); }
    finally { setBusy(false); }
  }

  return <div className="entries-container">
    <header className="entries-header"><div><h1>Usuários</h1><p className="entries-description">Consulte os usuários, seus perfis e a situação de acesso.</p></div></header>
    {result.error && <div className="entries-alert" role="alert">{result.error} <button className="text-button" disabled={busy} onClick={() => load(data?.page ?? 0)}>Tentar novamente</button></div>}
    {notice && <p className="entries-notice" role="status">{notice}</p>}
    {data && <section className="entries-table-card" aria-label="Lista de usuários" aria-busy={busy}>
      <div className="entries-table-scroll"><table><thead><tr><th>Nome</th><th>Sobrenome</th><th>E-mail</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
        {data.content.length === 0 ? <tr><td className="empty-entries" colSpan={6}>Nenhum usuário encontrado.</td></tr> : data.content.map(item => <tr key={item.id}><td className="entry-description">{item.nome}</td><td>{item.sobrenome}</td><td>{item.email}</td><td>{item.roles.map(role => role === "ROLE_ADMIN" ? "Administrador" : role === "ROLE_USER" ? "Usuário" : role).join(", ") || "—"}</td><td><span className={item.ativo ? "status-paid" : "status-pending"}>{item.ativo ? "Ativo" : "Inativo"}</span></td><td><button type="button" className={`secondary-button ${item.ativo ? "danger" : ""}`} disabled={busy || (item.ativo && item.isCurrentUser)} title={item.isCurrentUser ? "Você não pode desativar sua própria conta." : undefined} onClick={() => { setSelected(item); setActionError(""); setNotice(""); dialog.current?.showModal(); }} aria-label={`${item.ativo ? "Desativar" : "Ativar"} ${item.nome} ${item.sobrenome}`}>{item.ativo ? "Desativar" : "Ativar"}</button></td></tr>)}
      </tbody></table></div>
      <footer className="entries-pagination"><span>{data.totalElements} usuário(s) · Página {data.page + 1} de {Math.max(1, data.totalPages)}</span><div className="entry-actions"><button className="secondary-button" disabled={busy || data.page === 0} onClick={() => load(data.page - 1)}>Anterior</button><button className="secondary-button" disabled={busy || data.page + 1 >= data.totalPages} onClick={() => load(data.page + 1)}>Próxima</button></div></footer>
    </section>}
    <dialog ref={dialog} className="entry-dialog" aria-labelledby="deactivate-user-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <h2 id="deactivate-user-title">{selected?.ativo ? "Desativar usuário?" : "Ativar usuário?"}</h2><p className="delete-description">{selected?.nome} {selected?.sobrenome}{selected?.ativo ? " não poderá entrar no sistema e suas sessões serão invalidadas." : " poderá entrar novamente no sistema com suas credenciais."}</p>
      {actionError && <p className="login-error" role="alert">{actionError}</p>}
      <div className="dialog-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => dialog.current?.close()}>Cancelar</button><button type="button" className={`primary-button ${selected?.ativo ? "delete-button" : ""}`} disabled={busy} onClick={changeStatus}>{busy ? "Atualizando..." : selected?.ativo ? "Desativar usuário" : "Ativar usuário"}</button></div>
    </dialog>
  </div>;
}
