import {
  LockKeyhole,
} from "lucide-react";

import logoParceiros from "../assets/logo/logo-parceiros.png";

import "./ParceirosFooter.css";

const FOOTER_LINKS = [
  {
    label: "Como funciona",
    href: "#como-funciona",
  },
  {
    label: "Vantagens",
    href: "#vantagens",
  },
  {
    label: "Programa Parceiros",
    href: "#programa-parceiros",
  },
  {
    label: "Dúvidas",
    href: "#duvidas",
  },
  {
    label: "Contato",
    href: "#contato",
  },
];

export default function ParceirosFooter() {
  const currentYear =
    new Date().getFullYear();

  return (
    <footer className="parceiros-footer">
      <div className="parceiros-footer__main">
        <div className="parceiros-footer__inner">
          <div className="parceiros-footer__brand">
            <img
              src={logoParceiros}
              alt="Sistema Chegou! Parceiros"
              className="parceiros-footer__logo"
            />

            <p>
              Conectando empresas, condomínios e pessoas
              dentro de um ecossistema de oportunidades.
            </p>
          </div>

          <nav
            className="parceiros-footer__nav"
            aria-label="Navegação do rodapé"
          >
            <strong>
              Parceiros
            </strong>

            {FOOTER_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="parceiros-footer__access">
            <strong>
              Já é parceiro?
            </strong>

            <p>
              Acesse sua conta para gerenciar campanhas,
              acompanhar resultados e sua evolução.
            </p>

            <a
              href="/login"
              className="parceiros-footer__login"
            >
              <LockKeyhole
                size={15}
                strokeWidth={1.8}
                aria-hidden="true"
              />

              Entrar
            </a>
          </div>

          <div className="parceiros-footer__legal">
            <strong>
              Segurança e transparência
            </strong>

            <p>
              Consulte as condições aplicáveis ao uso da
              plataforma e ao tratamento de informações.
            </p>

            <div className="parceiros-footer__legal-links">
              {/*
                Manter estes destinos somente quando
                as respectivas páginas/rotas existirem.
              */}

              <span>
                Termos de uso
              </span>

              <span>
                Política de privacidade
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="parceiros-footer__bottom">
        <div className="parceiros-footer__bottom-inner">
          <span>
            © {currentYear} Sistema Chegou! Parceiros.
            Todos os direitos reservados.
          </span>

          <span className="parceiros-footer__powered">
            Sistema Chegou!
          </span>
        </div>
      </div>
    </footer>
  );
}