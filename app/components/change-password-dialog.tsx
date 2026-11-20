"use client";

import { forwardRef, useImperativeHandle, useRef, useState, type FormEvent } from "react";
import { alterarSenha } from "../actions/change-password";
import { passwordRequirements } from "../lib/password-rules";
import styles from "./change-password-dialog.module.css";

export type ChangePasswordHandle = { open: () => void };

const ChangePasswordDialog = forwardRef<ChangePasswordHandle>(function ChangePasswordDialog(_props, ref) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const requirements = passwordRequirements(newPassword);
  const validPassword = requirements.every(requirement => requirement.valid);
  const passwordsMatch = confirmation.length > 0 && confirmation === newPassword;

  function clearPasswords() {
    form.current?.reset(); setNewPassword(""); setConfirmation("");
  }

  useImperativeHandle(ref, () => ({ open() {
    clearPasswords(); setError(""); setSuccess(false); dialog.current?.showModal();
  } }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!validPassword || !passwordsMatch) { setError("Confira os requisitos da nova senha e sua confirmação."); return; }
    const data = new FormData(event.currentTarget);
    setPending(true); setError(""); setSuccess(false);
    try {
      const result = await alterarSenha(data);
      if (result.error) { setError(result.error); return; }
      clearPasswords(); setSuccess(true);
    } catch { setError("Não foi possível concluir a alteração. Tente novamente."); }
    finally { setPending(false); }
  }

  return <dialog ref={dialog} className="entry-dialog" aria-labelledby="change-password-title" onCancel={event => { if (pending) event.preventDefault(); }} onClose={clearPasswords}>
    <form ref={form} onSubmit={submit} aria-busy={pending}>
      <h2 id="change-password-title">Alterar senha</h2>
      {success ? <p className="entries-notice" role="status">Senha alterada com sucesso.</p> : <>
        <fieldset className="entry-form-fields" disabled={pending}>
          <div className="field"><label htmlFor="current-password">Senha atual <span className="field-required" aria-hidden="true">*</span></label><input id="current-password" name="senhaAtual" type="password" autoComplete="current-password" maxLength={72} required /></div>
          <div className="field"><label htmlFor="new-password">Nova senha <span className="field-required" aria-hidden="true">*</span></label><input id="new-password" name="novaSenha" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={event => { setNewPassword(event.target.value); setError(""); }} aria-describedby="new-password-help" required />
            <div id="new-password-help" className={styles.requirements}><p>A nova senha deve atender aos requisitos:</p><ul>{requirements.map(requirement => <li key={requirement.id} className={newPassword && requirement.valid ? styles.valid : ""}><span aria-hidden="true">{newPassword && requirement.valid ? "✓" : "○"}</span><span>{requirement.label}<span className={styles.srOnly}>{newPassword && requirement.valid ? " — atendido" : " — pendente"}</span></span></li>)}</ul><p className={styles.status} role="status">{newPassword ? validPassword ? "Todos os requisitos foram atendidos." : `${requirements.filter(requirement => !requirement.valid).length} requisito(s) pendente(s).` : "Os requisitos serão verificados enquanto você digita."}</p></div>
          </div>
          <div className="field"><label htmlFor="confirm-password">Confirmar nova senha <span className="field-required" aria-hidden="true">*</span></label><input id="confirm-password" name="confirmacaoSenha" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmation} onChange={event => { setConfirmation(event.target.value); setError(""); }} aria-invalid={confirmation.length > 0 && !passwordsMatch} aria-describedby="confirm-password-help" required /><p id="confirm-password-help" className={passwordsMatch ? styles.valid : confirmation ? styles.invalid : "field-hint"} role="status">{confirmation ? passwordsMatch ? "As senhas coincidem." : "As senhas ainda não coincidem." : "Repita a nova senha."}</p></div>
        </fieldset>
        {error && <p className="login-error" role="alert">{error}</p>}
      </>}
      <div className="dialog-actions"><button type="button" className="secondary-button" disabled={pending} onClick={() => dialog.current?.close()}>{success ? "Fechar" : "Cancelar"}</button>{!success && <button type="submit" className="primary-button" disabled={pending || !validPassword || !passwordsMatch}>{pending ? "Alterando..." : "Alterar senha"}</button>}</div>
    </form>
  </dialog>;
});

export default ChangePasswordDialog;
