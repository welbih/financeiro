"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { logout } from "../actions/logout";
import ChangePasswordDialog, { type ChangePasswordHandle } from "./change-password-dialog";
import styles from "./app-header.module.css";

export default function AppHeader({ fullName, isAdmin = false }: { fullName: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [state, formAction, pending] = useActionState(logout, { error: "" });
  const userMenu = useRef<HTMLDivElement>(null);
  const userButton = useRef<HTMLButtonElement>(null);
  const passwordDialog = useRef<ChangePasswordHandle>(null);

  useEffect(() => {
    if (!open && !mobileOpen) return;
    function outsideClick(event: PointerEvent) {
      if (!userMenu.current?.contains(event.target as Node)) setOpen(false);
      if (!header.current?.contains(event.target as Node)) setMobileOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false); setMobileOpen(false);
        if (mobileOpen) menuButton.current?.focus(); else userButton.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outsideClick);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outsideClick);
      document.removeEventListener("keydown", escape);
    };
  }, [open, mobileOpen]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    function onResize() { if (desktop.matches) setMobileOpen(false); }
    desktop.addEventListener("change", onResize);
    return () => desktop.removeEventListener("change", onResize);
  }, []);
  return <header className={styles.header} ref={header}><div className={styles.inner}>
    <Link href="/planejamento-financeiro" className={styles.logo} onClick={() => { setMobileOpen(false); setOpen(false); }}>Financeiro</Link>
    <button type="button" className={styles.menuToggle} ref={menuButton} aria-label={mobileOpen ? "Fechar menu principal" : "Abrir menu principal"} aria-expanded={mobileOpen} aria-controls="main-navigation" onClick={() => { setMobileOpen(value => !value); setOpen(false); }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={mobileOpen ? "M6 6L18 18M6 18L18 6" : "M4 6H20M4 12H20M4 18H20"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
    <nav id="main-navigation" className={`${styles.navigation} ${mobileOpen ? styles.navigationOpen : ""}`} aria-label="Menu principal">
      {[{ href: "/planejamento-financeiro", label: "Situação financeira" }, { href: "/lancamentos", label: "Lançamentos" }, { href: "/categorias", label: "Categorias" }, { href: "/planejamento-financeiro/configuracao", label: "Configuração do planejamento" }].map(item =>
        <Link key={item.href} href={item.href} onClick={() => { setMobileOpen(false); setOpen(false); }} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}
      {isAdmin && <Link href="/usuarios" onClick={() => { setMobileOpen(false); setOpen(false); }} aria-current={pathname === "/usuarios" ? "page" : undefined}>Usuários</Link>}
    </nav>
    <div className={styles.user} ref={userMenu} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <button type="button" className={styles.userTrigger} ref={userButton} aria-expanded={open} aria-controls="user-menu" aria-label={`Menu do usuário: ${fullName}`} title={fullName} onClick={() => { setOpen(value => !value); setMobileOpen(false); }}>
        <span className={styles.avatar} aria-hidden="true">{fullName.charAt(0).toUpperCase()}</span><span className={styles.userInfo}><span className={styles.userLabel}>Usuário autenticado</span><span className={styles.userName}>{fullName}</span></span><span className={styles.chevron} aria-hidden="true">⌄</span>
      </button>
      {open && <div id="user-menu" className={styles.dropdown}><button type="button" className={styles.userAction} disabled={pending} onClick={() => { setOpen(false); passwordDialog.current?.open(); }}>Alterar senha</button><form action={formAction} aria-busy={pending}><button type="submit" className={styles.logoutButton} disabled={pending}>{pending ? "Saindo..." : "Sair"}</button>{state.error && <p className="login-error" role="alert">{state.error}</p>}</form></div>}
    </div>
    <ChangePasswordDialog ref={passwordDialog} />
  </div></header>;
}
