"use client";

import { forwardRef, useImperativeHandle, useRef, useState, type FormEvent } from "react";
import { alterarSenha } from "../actions/change-password";

export type ChangePasswordHandle = { open: () => void };

const ChangePasswordDialog = forwardRef<ChangePasswordHandle>(function ChangePasswordDialog(_props, ref) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useImperativeHandle(ref, () => ({ open() {
    form.current?.reset(); setError(""); setSuccess(false); dialog.current?.showModal();
  } }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true); setError(""); setSuccess(false);
    try {
      const result = await alterarSenha(data);
      if (result.error) { setError(result.error); return; }
      form.current?.reset(); setSuccess(true);
    } catch { setError("Não foi possível concluir a alteração. Tente novamente."); }
    finally { setPending(false); }
  }

  return <dialog ref={dialog} className="entry-dialog" aria-labelledby="change-password-title" onCancel={event => { if (pending) event.preventDefault(); }} onClose={() => form.current?.reset()}>
    <form ref={form} onSubmit={submit} aria-busy={pending}>
      <h2 id="change-password-title">Alterar senha</h2>
      {success ? <p className="entries-notice" role="status">Senha alterada com sucesso.</p> : <>
        <fieldset className="entry-form-fields" disabled={pending}>
          <div className="field"><label htmlFor="current-password">Senha atual <span className="field-required" aria-hidden="true">*</span></label><input id="current-password" name="senhaAtual" type="password" autoComplete="current-password" maxLength={72} required /></div>
          <div className="field"><label htmlFor="new-password">Nova senha <span className="field-required" aria-hidden="true">*</span></label><input id="new-password" name="novaSenha" type="password" autoComplete="new-password" minLength={12} maxLength={72} aria-describedby="new-password-help" required /><p id="new-password-help" className="field-hint">Use pelo menos 12 caracteres.</p></div>
          <div className="field"><label htmlFor="confirm-password">Confirmar nova senha <span className="field-required" aria-hidden="true">*</span></label><input id="confirm-password" name="confirmacaoSenha" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></div>
        </fieldset>
        {error && <p className="login-error" role="alert">{error}</p>}
      </>}
      <div className="dialog-actions"><button type="button" className="secondary-button" disabled={pending} onClick={() => dialog.current?.close()}>{success ? "Fechar" : "Cancelar"}</button>{!success && <button type="submit" className="primary-button" disabled={pending}>{pending ? "Alterando..." : "Alterar senha"}</button>}</div>
    </form>
  </dialog>;
});

export default ChangePasswordDialog;
