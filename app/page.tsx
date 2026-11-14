export default function Home() {
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 17V12M12 17V7M19 17V4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <p className="brand-name">Financeiro</p>
        <h1 id="login-title">Bem-vindo de volta</h1>
        <p className="login-description">Acesse sua conta para continuar.</p>

        <div className="login-fields">
          <div className="field">
            <label htmlFor="username">Usuário</label>
            <input id="username" name="username" type="text" autoComplete="username" placeholder="Digite seu usuário" />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" />
          </div>
          <button className="login-button" type="button">Entrar <span aria-hidden="true">→</span></button>
        </div>
      </section>
      <p className="login-footer">Seu financeiro, em um só lugar.</p>
    </main>
  );
}
