import { ShieldCheck } from "lucide-react";

import logoBranco from "../../../assets/logo_branco.png";

import "./LandingFooter.css";

export default function LandingFooter() {
  function rolarPara(id) {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  return (
    <footer className="landing-footer">
      <div className="landing-footer__container">
        <div className="landing-footer__main">
          {/* MARCA */}
          <div className="landing-footer__brand">
            <img
              src={logoBranco}
              alt="Sistema Chegou!"
              className="landing-footer__logo"
            />

            <p>
              A plataforma completa para gestão de condomínio.
              Mais segurança, organização e eficiência para todos.
            </p>

            <div
              className="landing-footer__social"
              aria-label="Redes sociais"
            >
              <a
                href="https://instagram.com/sistemachegou"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram do Sistema Chegou!"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="5"
                    ry="5"
                  />

                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                  />

                  <circle
                    cx="17.5"
                    cy="6.5"
                    r="1"
                    fill="currentColor"
                    stroke="none"
                  />
                </svg>
              </a>
            </div>
          </div>

          {/* NAVEGAÇÃO */}
          <nav
            className="landing-footer__column"
            aria-label="Navegação da Landing Page"
          >
            <h2>Navegação</h2>

            <button
              type="button"
              onClick={() => rolarPara("recursos")}
            >
              Recursos
            </button>

            <button
              type="button"
              onClick={() => rolarPara("recursos")}
            >
              Para Condomínios
            </button>

            <button
              type="button"
              onClick={() => rolarPara("parceiros")}
            >
              Parceiros
            </button>

            <button
              type="button"
              onClick={() => rolarPara("orcamento")}
            >
              Orçamentos
            </button>

            <button
              type="button"
              onClick={() => rolarPara("assinaturas")}
            >
              Assinaturas
            </button>

            <button
              type="button"
              onClick={() => rolarPara("modulos")}
            >
              Módulos
            </button>

            <button
              type="button"
              onClick={() => rolarPara("sobre")}
            >
              Sobre nós
            </button>
          </nav>

          {/* RECURSOS */}
          <div className="landing-footer__column">
            <h2>Recursos</h2>

            <button
              type="button"
              onClick={() => rolarPara("recursos")}
            >
              Central de Encomendas
            </button>

            <button
              type="button"
              onClick={() => rolarPara("recursos")}
            >
              Comunicação
            </button>

            <button
              type="button"
              onClick={() => rolarPara("recursos")}
            >
              Gestão de Moradores
            </button>

            <button
              type="button"
              onClick={() => rolarPara("recursos")}
            >
              Relatórios
            </button>

            <button
              type="button"
              onClick={() => rolarPara("seguranca")}
            >
              Segurança
            </button>
          </div>

          {/* INSTITUCIONAL */}
          <div className="landing-footer__column">
            <h2>Institucional</h2>

            <button
              type="button"
              onClick={() => rolarPara("sobre")}
            >
              Quem somos
            </button>

            <a href="/politica-de-privacidade">
              Política de Privacidade
            </a>

            <a href="/termos-de-uso">
              Termos de Uso
            </a>

            <button
              type="button"
              onClick={() => rolarPara("seguranca")}
            >
              LGPD
            </button>
          </div>

          {/* SEGURANÇA E CONFORMIDADE */}
          <aside className="landing-footer__security">
            <h2>Segurança e Conformidade</h2>

            <div className="landing-footer__security-content">
              <div
                className="landing-footer__security-icon"
                aria-hidden="true"
              >
                <ShieldCheck
                  size={28}
                  strokeWidth={1.7}
                />
              </div>

              <p>
                Seus dados são tratados com mecanismos de proteção,
                controle de acesso e princípios aplicáveis de
                privacidade e LGPD.
              </p>
            </div>

            <div className="landing-footer__lgpd-badge">
              <ShieldCheck
                size={18}
                strokeWidth={1.8}
                aria-hidden="true"
              />

              <div>
                <strong>LGPD</strong>
                <span>PROTEÇÃO DE DADOS</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="landing-footer__bottom">
          © 2026 Sistema Chegou! Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}