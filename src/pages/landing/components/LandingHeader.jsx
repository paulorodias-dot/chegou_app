import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

import logoAzulRoyal from "../../../assets/logo_azulroyal.png";

import {
  useLandingNavigation,
} from "../navigation/LandingNavigationContext";

import "./LandingHeader.css";

export default function LandingHeader() {
  const [
    menuMobileAberto,
    setMenuMobileAberto,
  ] = useState(false);

  const [
    submenuAssinaturasAberto,
    setSubmenuAssinaturasAberto,
  ] = useState(false);

  const menuMobileId = useId();
  const submenuId = useId();

  const headerRef = useRef(null);

  const {
    navegarParaSecao,
    navegarParaLanding,
  } = useLandingNavigation();

  function fecharMenus() {
    setMenuMobileAberto(false);
    setSubmenuAssinaturasAberto(false);
  }

  function navegar(id) {
    const destinoEncontrado =
      navegarParaSecao(id);

    if (destinoEncontrado) {
      fecharMenus();
    }
  }

  function navegarParaInicio() {
    const destinoEncontrado =
      navegarParaLanding("inicio");

    if (destinoEncontrado) {
      fecharMenus();
    }
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        fecharMenus();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  useEffect(() => {
    if (!menuMobileAberto) {
      return undefined;
    }

    const overflowOriginal =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        overflowOriginal;
    };
  }, [menuMobileAberto]);

  useEffect(() => {
    function handleClickFora(event) {
      if (
        headerRef.current &&
        !headerRef.current.contains(
          event.target
        )
      ) {
        setSubmenuAssinaturasAberto(
          false
        );
      }
    }

    document.addEventListener(
      "pointerdown",
      handleClickFora
    );

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
        {/* MARCA */}

        <a
          href="/"
          className="landing-header__brand"
          aria-label="Sistema Chegou! - Página inicial"
          onClick={(event) => {
            event.preventDefault();
            navegarParaInicio();
          }}
        >
          <img
            src={logoAzulRoyal}
            alt="Sistema Chegou!"
            className="landing-header__logo"
          />
        </a>

        {/* NAVEGAÇÃO DESKTOP */}

        <nav
          className="landing-header__nav landing-header__nav--desktop"
          aria-label="Navegação principal"
        >
          <button
            type="button"
            className="landing-header__link"
            onClick={() =>
              navegar("recursos")
            }
          >
            Recursos
          </button>

          <button
            type="button"
            className="landing-header__link"
            onClick={() =>
              navegar("recursos")
            }
          >
            Para Condomínios
          </button>

          {/*
            PARCEIROS

            Temporariamente oculto.

            Reativar quando o Programa de Parceiros
            estiver operacional e publicado.
          */}

          <div className="landing-header__submenu">
            <button
              type="button"
              className="landing-header__link landing-header__link--submenu"
              aria-expanded={
                submenuAssinaturasAberto
              }
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
                    navegar("assinaturas")
                  }
                >
                  Planos
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navegar("orcamento")
                  }
                >
                  Orçamento
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navegar("modulos")
                  }
                >
                  Módulos
                </button>
              </div>
            )}
          </div>

          {/*
            SOBRE NÓS / DÚVIDAS

            Temporariamente ocultos porque as
            seções #sobre e #duvidas não estão
            disponíveis na composição atual.

            Preservar os nomes para futura
            publicação dos respectivos destinos.
          */}
        </nav>

        {/* AÇÕES */}

        <div className="landing-header__actions">
          <button
            type="button"
            className="landing-header__restricted"
            disabled
            title="Acesso Restrito disponível após a conclusão da Landing"
            aria-label="Acesso Restrito — em preparação"
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
      </div>

      {/* BACKDROP MOBILE */}

      {menuMobileAberto && (
        <div
          className="landing-header__mobile-backdrop"
          aria-hidden="true"
          onClick={fecharMenus}
        />
      )}

      {/* MENU MOBILE */}

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
            onClick={() =>
              navegar("recursos")
            }
          >
            Recursos
          </button>

          <button
            type="button"
            onClick={() =>
              navegar("recursos")
            }
          >
            Para Condomínios
          </button>

          {/*
            PARCEIROS MOBILE

            Temporariamente oculto.
          */}

          <div className="landing-header__mobile-submenu">
            <button
              type="button"
              className="landing-header__mobile-submenu-trigger"
              aria-expanded={
                submenuAssinaturasAberto
              }
              aria-controls={`${submenuId}-mobile`}
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
              <div
                id={`${submenuId}-mobile`}
                className="landing-header__mobile-submenu-panel"
              >
                <button
                  type="button"
                  onClick={() =>
                    navegar("assinaturas")
                  }
                >
                  Planos
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navegar("orcamento")
                  }
                >
                  Orçamento
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navegar("modulos")
                  }
                >
                  Módulos
                </button>
              </div>
            )}
          </div>

          {/*
            SOBRE NÓS / DÚVIDAS MOBILE

            Temporariamente ocultos até
            existirem destinos publicados.
          */}

          <button
            type="button"
            className="landing-header__mobile-restricted"
            disabled
            title="Acesso Restrito disponível após a conclusão da Landing"
            aria-label="Acesso Restrito — em preparação"
          >
            Acesso Restrito
          </button>
        </nav>
      </div>
    </header>
  );
}