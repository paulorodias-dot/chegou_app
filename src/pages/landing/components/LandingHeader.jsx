import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

import logoAzulRoyal from "../../../assets/logo_azulroyal.png";

import "./LandingHeader.css";

export default function LandingHeader() {
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [submenuAssinaturasAberto, setSubmenuAssinaturasAberto] =
    useState(false);

  const menuMobileId = useId();
  const submenuId = useId();

  const headerRef = useRef(null);

  function irParaLogin() {
    window.location.href = "/login";
  }

  function fecharMenus() {
    setMenuMobileAberto(false);
    setSubmenuAssinaturasAberto(false);
  }

  function navegarParaSecao(id) {
    const elemento = document.getElementById(id);

    if (!elemento) {
      return;
    }

    elemento.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    fecharMenus();
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        fecharMenus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!menuMobileAberto) {
      return undefined;
    }

    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflowOriginal;
    };
  }, [menuMobileAberto]);

  useEffect(() => {
    function handleClickFora(event) {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target)
      ) {
        setSubmenuAssinaturasAberto(false);
      }
    }

    document.addEventListener("pointerdown", handleClickFora);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleClickFora
      );
    };
  }, []);

  return (
    <header
      className="landing-header"
      ref={headerRef}
    >
      <div className="landing-header__inner">
        <a
          href="/"
          className="landing-header__brand"
          aria-label="Sistema Chegou! - Página inicial"
        >
          <img
            src={logoAzulRoyal}
            alt="Sistema Chegou!"
            className="landing-header__logo"
          />
        </a>

        <nav
          className="landing-header__nav landing-header__nav--desktop"
          aria-label="Navegação principal"
        >
          <button
            type="button"
            className="landing-header__link"
            onClick={() => navegarParaSecao("recursos")}
          >
            Recursos
          </button>

          <button
            type="button"
            className="landing-header__link"
            onClick={() => navegarParaSecao("condominios")}
          >
            Para Condomínios
          </button>

          <button
            type="button"
            className="landing-header__link"
            onClick={() => navegarParaSecao("parceiros")}
          >
            Parceiros
          </button>

          <div className="landing-header__submenu">
            <button
              type="button"
              className="landing-header__link landing-header__link--submenu"
              aria-expanded={submenuAssinaturasAberto}
              aria-controls={submenuId}
              onClick={() =>
                setSubmenuAssinaturasAberto(
                  (aberto) => !aberto
                )
              }
            >
              Assinaturas
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={
                  submenuAssinaturasAberto
                    ? "landing-header__chevron landing-header__chevron--open"
                    : "landing-header__chevron"
                }
              />
            </button>

            {submenuAssinaturasAberto && (
              <div
                id={submenuId}
                className="landing-header__submenu-panel"
              >
                <button
                  type="button"
                  onClick={() =>
                    navegarParaSecao("assinaturas")
                  }
                >
                  Planos
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navegarParaSecao("orcamento")
                  }
                >
                  Orçamento
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navegarParaSecao("modulos")
                  }
                >
                  Módulos
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="landing-header__link"
            onClick={() => navegarParaSecao("sobre")}
          >
            Sobre nós
          </button>

          <button
            type="button"
            className="landing-header__link"
            onClick={() => navegarParaSecao("duvidas")}
          >
            Dúvidas
          </button>
        </nav>

        <div className="landing-header__actions">
          <button
            type="button"
            className="landing-header__restricted"
            onClick={irParaLogin}
          >
            Acesso Restrito
          </button>

          <button
            type="button"
            className="landing-header__mobile-toggle"
            aria-label={
              menuMobileAberto
                ? "Fechar menu"
                : "Abrir menu"
            }
            aria-expanded={menuMobileAberto}
            aria-controls={menuMobileId}
            onClick={() =>
              setMenuMobileAberto(
                (aberto) => !aberto
              )
            }
          >
            {menuMobileAberto ? (
              <X size={22} aria-hidden="true" />
            ) : (
              <Menu size={22} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {menuMobileAberto && (
        <div
          className="landing-header__mobile-backdrop"
          aria-hidden="true"
          onClick={fecharMenus}
        />
      )}

      <div
        id={menuMobileId}
        className={
          menuMobileAberto
            ? "landing-header__mobile-menu landing-header__mobile-menu--open"
            : "landing-header__mobile-menu"
        }
        aria-hidden={!menuMobileAberto}
      >
        <nav
          className="landing-header__mobile-nav"
          aria-label="Navegação mobile"
        >
          <button
            type="button"
            onClick={() => navegarParaSecao("recursos")}
          >
            Recursos
          </button>

          <button
            type="button"
            onClick={() =>
              navegarParaSecao("condominios")
            }
          >
            Para Condomínios
          </button>

          <button
            type="button"
            onClick={() =>
              navegarParaSecao("parceiros")
            }
          >
            Parceiros
          </button>

          <div className="landing-header__mobile-submenu">
            <button
              type="button"
              className="landing-header__mobile-submenu-trigger"
              aria-expanded={submenuAssinaturasAberto}
              onClick={() =>
                setSubmenuAssinaturasAberto(
                  (aberto) => !aberto
                )
              }
            >
              Assinaturas

              <ChevronDown
                size={18}
                aria-hidden="true"
                className={
                  submenuAssinaturasAberto
                    ? "landing-header__chevron landing-header__chevron--open"
                    : "landing-header__chevron"
                }
              />
            </button>

            {submenuAssinaturasAberto && (
              <div className="landing-header__mobile-submenu-panel">
                <button
                  type="button"
                  onClick={() =>
                    navegarParaSecao("assinaturas")
                  }
                >
                  Planos
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navegarParaSecao("orcamento")
                  }
                >
                  Orçamento
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navegarParaSecao("modulos")
                  }
                >
                  Módulos
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => navegarParaSecao("sobre")}
          >
            Sobre nós
          </button>

          <button
            type="button"
            onClick={() => navegarParaSecao("duvidas")}
          >
            Dúvidas
          </button>

          <button
            type="button"
            className="landing-header__mobile-restricted"
            onClick={irParaLogin}
          >
            Acesso Restrito
          </button>
        </nav>
      </div>
    </header>
  );
}