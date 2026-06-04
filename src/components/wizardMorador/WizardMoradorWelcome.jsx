import { ShieldCheck, Bell, UserCheck, ArrowRight } from "lucide-react";
import "../../styles/wizardMorador/WizardMoradorWelcome.css";

import welcomeDesktopLeft from "../../assets/welcome-desktop-left-panel.png";
import welcomeMobileBg from "../../assets/welcome-mobile-bg.png";

function marcaChegou() {
  return (
    <span className="wm-brand-inline">
      Chegou<span>!</span>
    </span>
  );
}

export default function WizardMoradorWelcome({ onStart }) {
  return (
    <>
      {/* DESKTOP */}
      <div className="wm-welcome-overlay desktop">
        <div className="wm-welcome-modal">
          <button
            type="button"
            className="wm-welcome-close"
            onClick={onStart}
            aria-label="Fechar"
          >
            ×
          </button>

          <div className="wm-welcome-left">
            <img
              src={welcomeDesktopLeft}
              alt="Segurança Chegou!"
              className="wm-welcome-left-image"
            />
          </div>

          <div className="wm-welcome-right">
            <span className="wm-welcome-badge">
              👋 Bem-vindo(a)!
            </span>

            <h1>
              Novo Cadastro do Morador
            </h1>

            <p className="wm-welcome-subtitle">
              Vamos ativar o seu acesso ao Sistema {marcaChegou()} de forma
              <strong> simples, segura e em poucos passos.</strong>
            </p>

            <div className="wm-welcome-benefits">
              <div className="wm-benefit-card">
                <ShieldCheck size={28} />
                <div>
                  <strong>Cadastro seguro</strong>
                  <span>Ambiente protegido e criptografado</span>
                </div>
              </div>

              <div className="wm-benefit-card">
                <Bell size={28} />
                <div>
                  <strong>Comunicação direta</strong>
                  <span>Avisos, notificações e tokens no app</span>
                </div>
              </div>

              <div className="wm-benefit-card">
                <UserCheck size={28} />
                <div>
                  <strong>Perfil correto</strong>
                  <span>Selecione o perfil adequado para você</span>
                </div>
              </div>
            </div>

            <div className="wm-welcome-info">
              Este cadastro é importante para garantir que suas encomendas
              sejam entregues com <strong>segurança</strong> e que você receba
              as informações corretas.
            </div>

            <button
              type="button"
              className="wm-welcome-start"
              onClick={onStart}
            >
              <span>🚀 Iniciar Cadastro</span>
              <ArrowRight size={24} />
            </button>

            <div className="wm-welcome-footer-note">
              Você poderá revisar e alterar seus dados sempre que precisar.
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="wm-welcome-mobile">
        <div className="wm-welcome-mobile-bg">
          <img src={welcomeMobileBg} alt="Boas-vindas" />
        </div>

        <div className="wm-welcome-mobile-content">
          <span className="wm-mobile-badge">
            👋 Bem-vindo(a)!
          </span>

          <h1>
            Vamos ativar o seu acesso ao Sistema {marcaChegou()}
          </h1>

          <p>
            Este cadastro é rápido, seguro e vai garantir que suas encomendas
            cheguem até você com mais agilidade e segurança.
          </p>

          <button
            type="button"
            className="wm-mobile-start"
            onClick={onStart}
          >
            Iniciar Cadastro
            <ArrowRight size={22} />
          </button>

          <div className="wm-mobile-security">
            🔒 Seus dados estão protegidos
          </div>
        </div>
      </div>
    </>
  );
}