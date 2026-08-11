import { useState } from "react";

import {
  Menu,
  X,
  LogIn,
  ArrowRight,
} from "lucide-react";

import logoParceiros from "../assets/logo/logo-parceiros.png";

import "./ParceirosHeader.css";

const NAV_ITEMS = [
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
];

export default function ParceirosHeader() {
  const [menuAberto, setMenuAberto] = useState(false);

  function fecharMenu() {
    setMenuAberto(false);
  }

  return (
    <header className="parceiros-header">
      <div className="parceiros-header__inner">
        <a
          className="parceiros-header__brand"
          href="#inicio"
          aria-label="Sistema Chegou! Parceiros"
          onClick={fecharMenu}
        >
          <img
            className="parceiros-header__logo"
            src={logoParceiros}
            alt="Sistema Chegou! Parceiros"
          />
        </a>

        <nav
          id="parceiros-menu"
          className={`parceiros-header__nav ${
            menuAberto ? "is-open" : ""
          }`}
          aria-label="Navegação da página Parceiros"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              className="parceiros-header__nav-link"
              href={item.href}
              onClick={fecharMenu}
            >
              {item.label}
            </a>
          ))}

          <div className="parceiros-header__mobile-actions">
            <a
              className="parceiros-header__button parceiros-header__button--login"
              href="/login"
              onClick={fecharMenu}
            >
              <LogIn
                size={16}
                strokeWidth={1.9}
              />

              Entrar
            </a>

            <a
              className="parceiros-header__button parceiros-header__button--primary"
              href="#quero-ser-parceiro"
              onClick={fecharMenu}
            >
              Quero ser Parceiro

              <ArrowRight
                size={16}
                strokeWidth={1.9}
              />
            </a>
          </div>
        </nav>

        <div className="parceiros-header__desktop-actions">
          <a
            className="parceiros-header__button parceiros-header__button--login"
            href="/login"
          >
            <LogIn
              size={16}
              strokeWidth={1.9}
            />

            Entrar
          </a>

          <a
            className="parceiros-header__button parceiros-header__button--primary"
            href="#quero-ser-parceiro"
          >
            Quero ser Parceiro

            <ArrowRight
              size={16}
              strokeWidth={1.9}
            />
          </a>
        </div>

        <button
          type="button"
          className="parceiros-header__menu-button"
          aria-label={
            menuAberto
              ? "Fechar menu"
              : "Abrir menu"
          }
          aria-expanded={menuAberto}
          aria-controls="parceiros-menu"
          onClick={() =>
            setMenuAberto(
              (valorAtual) => !valorAtual,
            )
          }
        >
          {menuAberto ? (
            <X
              size={22}
              strokeWidth={1.8}
            />
          ) : (
            <Menu
              size={22}
              strokeWidth={1.8}
            />
          )}
        </button>
      </div>
    </header>
  );
}