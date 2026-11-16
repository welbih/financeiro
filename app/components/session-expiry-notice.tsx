"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./session-expiry-notice.module.css";

export default function SessionExpiryNotice({ expiresAt }: { expiresAt: number | null }) {
  const [status, setStatus] = useState<{ expiresAt: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    let timer: ReturnType<typeof setTimeout>;
    function check() {
      clearTimeout(timer);
      const milliseconds = expiresAt! - Date.now();
      const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
      setStatus({ expiresAt: expiresAt!, seconds });
      if (milliseconds > 60_000) timer = setTimeout(check, Math.min(milliseconds - 60_000, 2_147_483_647));
      else if (milliseconds > 0) timer = setTimeout(check, Math.min(milliseconds, 1000));
    }
    function onVisible() { if (document.visibilityState === "visible") check(); }
    timer = setTimeout(check, 0);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [expiresAt]);

  if (!status || status.expiresAt !== expiresAt || status.seconds > 60) return null;
  const expired = status.seconds === 0;
  return <aside className={`${styles.notice} ${expired ? styles.expired : ""}`} aria-label="Validade da sessão">
    <div className={styles.content}>
      <div><p role="status">{expired ? "Sua sessão expirou. Entre novamente para continuar." : "Sua sessão expira em menos de 1 minuto. Salve suas alterações."}</p>{!expired && <span className={styles.countdown} aria-hidden="true">Tempo restante: {status.seconds}s</span>}</div>
      <Link href="/">{expired ? "Entrar novamente" : "Ir para o login"}</Link>
    </div>
  </aside>;
}
