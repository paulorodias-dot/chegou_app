import "./Landing.css";
import mascote from "../assets/mascote_chegou.png";

export default function Landing() {
  function abrirLogin() {
    window.location.href = "/login";
  }

  return (
    <div className="landing-page">
      <header className="landing-navbar">
        <div className="landing-logo">
          Chegou<span>!</span>
        </div>

        <button className="btn-restrito" onClick={abrirLogin}>
          Acesso Restrito
        </button>
      </header>

      <main className="hero">
        <div className="container">
          <div className="hero-content">
            <span className="tag">
              EM BREVE DISPONÍVEL PARA O SEU CONDOMÍNIO
            </span>

            <h1>
              A inteligência que <span>registra</span>, <span>avisa</span> e{" "}
              <span>protege</span> cada entrega.
            </h1>

            <p>
              Transforme o recebimento de encomendas em um processo ágil,
              seguro e rastreável. Notificações automáticas para os moradores e
              controle total das entregas no seu condomínio.
            </p>

            <div className="cta-group">
              <a
                href="https://wa.me/SEUNUMERO"
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                Quero o Chegou! no meu condomínio
              </a>

              <a href="#funcionalidades" className="btn-secondary">
                Conhecer a solução
              </a>
            </div>
          </div>

          <div className="hero-image">
            <img src={mascote} alt="Mascote Chegou!" className="floating" />
          </div>
        </div>
      </main>

      <section id="funcionalidades" className="features">
        <div className="feature-card">
          <div className="icon">📦</div>
          <h3>Organização Total</h3>
          <p>
            Controle digital para registrar, localizar e acompanhar cada
            encomenda recebida na portaria.
          </p>
        </div>

        <div className="feature-card">
          <div className="icon">🔔</div>
          <h3>Aviso Instantâneo</h3>
          <p>
            O morador é notificado assim que a encomenda chega, reduzindo
            ligações, esquecimentos e retrabalho.
          </p>
        </div>

        <div className="feature-card">
          <div className="icon">🛡️</div>
          <h3>Segurança e Rastreio</h3>
          <p>
            Histórico completo da entrega, com protocolo digital e mais
            transparência para condomínio, portaria e moradores.
          </p>
        </div>
      </section>

      <footer className="footer">
        <p>🚧 Sistema em fase de pré-lançamento. © 2026 Chegou! Tecnologia.</p>
      </footer>
    </div>
  );
}