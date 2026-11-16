"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { logout } from "../actions/logout";
import ChangePasswordDialog, { type ChangePasswordHandle } from "./change-password-dialog";
import styles from "./app-header.module.css";

export default function AppHeader({ fullName }: { fullName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(logout, { error: "" });
  const userMenu = useRef<HTMLDivElement>(null);
  const userButton = useRef<HTMLButtonElement>(null);
  const passwordDialog = useRef<ChangePasswordHandle>(null);

  useEffect(() => {
    if (!open) return;
    function outsideClick(event: PointerEvent) {
      if (!userMenu.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); userButton.current?.focus(); }
    }
    document.addEventListener("pointerdown", outsideClick);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outsideClick);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <header className="app-header"><div className="app-header-inner">
    <Link href="/lancamentos" className="app-logo">Financeiro</Link>
    <nav className="app-menu" aria-label="Menu principal">
      {[{ href: "/planejamento-financeiro", label: "Situação financeira" }, { href: "/lancamentos", label: "Lançamentos" }, { href: "/categorias", label: "Categorias" }, { href: "/planejamento-financeiro/configuracao", label: "Configuração do planejamento" }].map(item =>
        <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}
    </nav>
    <div className="app-user" ref={userMenu} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <button type="button" className="app-user-trigger" ref={userButton} aria-expanded={open} aria-controls="user-menu" onClick={() => setOpen(value => !value)}>
        <span className="app-avatar" aria-hidden="true">{fullName.charAt(0).toUpperCase()}</span><span className="app-user-info"><span className="app-user-label">Usuário autenticado</span><span className="app-user-name">{fullName}</span></span><span className="app-user-chevron" aria-hidden="true">⌄</span>
      </button>
      {open && <div id="user-menu" className="app-user-dropdown"><button type="button" className={styles.userAction} disabled={pending} onClick={() => { setOpen(false); passwordDialog.current?.open(); }}>Alterar senha</button><form action={formAction} aria-busy={pending}><button type="submit" className="app-logout-button" disabled={pending}>{pending ? "Saindo..." : "Sair"}</button>{state.error && <p className="login-error" role="alert">{state.error}</p>}</form></div>}
    </div>
    <ChangePasswordDialog ref={passwordDialog} />
  </div></header>;
}
