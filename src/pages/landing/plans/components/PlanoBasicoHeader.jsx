import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import logoAzulRoyal from "../../../../assets/logo_azulroyal.png";

import "./PlanoBasicoHeader.css";

function obterComportamentoRolagem() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "auto";
  }

  return "smooth";
}

export default function PlanoBasicoHeader() {
  const navigate = useNavigate();

  const [menuAberto, setMenuAberto] = useState(false);

  function fecharMenu() {
    setMenuAberto(false);
  }

  function navegarParaSecao(id) {
    const destino = document.getElementById(id);

    if (!destino) {
      console.warn(
        `[Plano Básico] Destino de navegação não encontrado: #${id}`
      );

      return;
    }

    destino.scrollIntoView({
      behavior: obterComportamentoRolagem(),
      block: "start",
    });

    fecharMenu();
  }

  function voltarParaLanding(event) {
    event.preventDefault();

    fecharMenu();

    navigate("/");
  }

  useEffect(() => {
    function tratarEscape(event) {
      if (event.key === "Escape") {
        fecharMenu();
      }
    }

    window.addEventListener("keydown", tratarEscape);

    return () => {
      window.removeEventListener("keydown", tratarEscape);
    };
  }, []);

  useEffect(() => {
    if (!menuAberto) {
      return undefined;
    }

    const overflowAnterior =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        overflowAnterior;
    };
  }, [menuAberto]);

  return (
    <header className="plano-basico-header">
      <div className="plano-basico-header__inner">
        <a
          href="/"
          className="plano-basico-header__brand"
          aria-label="Sistema Chegou! — voltar para a página principal"
          onClick={voltarParaLanding}
        >
          <img
            src={logoAzulRoyal}
            alt="Sistema Chegou!"
            className="plano-basico-header__logo"
          />
        </a>

        <nav
          className="plano-basico-header__nav"
          aria-label="Navegação do Plano Básico"
        >
          <button
            type="button"
            onClick={() =>
              navegarParaSecao("inicio")
            }
          >
            Visão geral
          </button>

          <button
            type="button"
            onClick={() =>
              navegarParaSecao(
                "plano-basico-recursos"
              )
            }
          >
            Recursos
          </button>

          <button
            type="button"
            onClick={() =>
              navegarParaSecao(
                "plano-basico-precos"
              )
            }
          >
            Faixas e preços
          </button>
        </nav>

        <button
          type="button"
          className="plano-basico-header__mobile-toggle"
          aria-label={
            menuAberto
              ? "Fechar menu"
              : "Abrir menu"
          }
          aria-expanded={menuAberto}
          aria-controls="plano-basico-menu-mobile"
          onClick={() =>
            setMenuAberto(
              (aberto) => !aberto
            )
          }
        >
          {menuAberto ? (
            <X
              size={22}
              aria-hidden="true"
            />
          ) : (
            <Menu
              size={22}
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {menuAberto && (
        <button
          type="button"
          className="plano-basico-header__backdrop"
          aria-label="Fechar menu"
          onClick={fecharMenu}
        />
      )}

      <nav
        id="plano-basico-menu-mobile"
        className={
          menuAberto
            ? "plano-basico-header__mobile-menu plano-basico-header__mobile-menu--open"
            : "plano-basico-header__mobile-menu"
        }
        aria-label="Navegação mobile do Plano Básico"
        aria-hidden={!menuAberto}
      >
        <button
          type="button"
          onClick={() =>
            navegarParaSecao("inicio")
          }
        >
          Visão geral
        </button>

        <button
          type="button"
          onClick={() =>
            navegarParaSecao(
              "plano-basico-recursos"
            )
          }
        >
          Recursos
        </button>

        <button
          type="button"
          onClick={() =>
            navegarParaSecao(
              "plano-basico-precos"
            )
          }
        >
          Faixas e preços
        </button>
      </nav>
    </header>
  );
}