import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Edit3,
  Eye,
  History,
  Tags,
  X,
} from "lucide-react";

import "./TransportadoraAcoesMenu.css";

const MENU_WIDTH = 290;
const MENU_GAP = 8;
const VIEWPORT_MARGIN = 12;

function TransportadoraAcoesMenu({
  aberto,
  transportadora,
  anchorRef,
  onClose,
  onVisualizar,
  onEditar,
  onAliases,
  onAlterarStatus,
  onAuditoria,
}) {
  const menuRef = useRef(null);

  const [posicao, setPosicao] = useState({
    top: 0,
    left: 0,
    pronto: false,
    abrirParaCima: false,
  });

  useLayoutEffect(() => {
    if (!aberto || !anchorRef?.current) return;

    function calcularPosicao() {
      const ancora = anchorRef.current;
      const menu = menuRef.current;

      if (!ancora) return;

      const ancoraRect = ancora.getBoundingClientRect();
      const larguraMenu = menu?.offsetWidth || MENU_WIDTH;
      const alturaMenu = menu?.offsetHeight || 360;

      let left = ancoraRect.right - larguraMenu;

      if (left < VIEWPORT_MARGIN) {
        left = VIEWPORT_MARGIN;
      }

      if (left + larguraMenu > window.innerWidth - VIEWPORT_MARGIN) {
        left =
          window.innerWidth -
          larguraMenu -
          VIEWPORT_MARGIN;
      }

      const espacoAbaixo =
        window.innerHeight -
        ancoraRect.bottom -
        VIEWPORT_MARGIN;

      const espacoAcima =
        ancoraRect.top - VIEWPORT_MARGIN;

      const abrirParaCima =
        espacoAbaixo < alturaMenu &&
        espacoAcima > espacoAbaixo;

      let top = abrirParaCima
        ? ancoraRect.top - alturaMenu - MENU_GAP
        : ancoraRect.bottom + MENU_GAP;

      if (top < VIEWPORT_MARGIN) {
        top = VIEWPORT_MARGIN;
      }

      if (
        top + alturaMenu >
        window.innerHeight - VIEWPORT_MARGIN
      ) {
        top = Math.max(
          VIEWPORT_MARGIN,
          window.innerHeight -
            alturaMenu -
            VIEWPORT_MARGIN
        );
      }

      setPosicao({
        top,
        left,
        pronto: true,
        abrirParaCima,
      });
    }

    calcularPosicao();

    const animationFrame =
      window.requestAnimationFrame(calcularPosicao);

    window.addEventListener("resize", calcularPosicao);
    window.addEventListener("scroll", calcularPosicao, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", calcularPosicao);
      window.removeEventListener(
        "scroll",
        calcularPosicao,
        true
      );
    };
  }, [aberto, anchorRef, transportadora?.id]);

  useEffect(() => {
    if (!aberto) return;

    function fecharAoClicarFora(event) {
      const clicouNoMenu =
        menuRef.current?.contains(event.target);

      const clicouNaAncora =
        anchorRef?.current?.contains(event.target);

      if (!clicouNoMenu && !clicouNaAncora) {
        onClose();
      }
    }

    function fecharComEsc(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "pointerdown",
      fecharAoClicarFora
    );

    window.addEventListener("keydown", fecharComEsc);

    return () => {
      document.removeEventListener(
        "pointerdown",
        fecharAoClicarFora
      );

      window.removeEventListener(
        "keydown",
        fecharComEsc
      );
    };
  }, [aberto, anchorRef, onClose]);

  if (
    !aberto ||
    !transportadora ||
    typeof document === "undefined"
  ) {
    return null;
  }

  function executar(acao) {
    acao?.(transportadora);
    onClose();
  }

  return createPortal(
    <div
      ref={menuRef}
      className={[
        "tr-actions-menu",
        posicao.pronto ? "is-ready" : "",
        posicao.abrirParaCima ? "open-up" : "open-down",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        top: `${posicao.top}px`,
        left: `${posicao.left}px`,
      }}
      role="menu"
      aria-label={`Ações de ${transportadora.nome_fantasia}`}
    >
      <div className="tr-actions-menu-header">
        <div>
          <strong>{transportadora.nome_fantasia}</strong>
          <small>{transportadora.business_id}</small>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar menu de ações"
        >
          <X size={16} />
        </button>
      </div>

      <div className="tr-actions-menu-list">
        <button
          type="button"
          role="menuitem"
          onClick={() => executar(onVisualizar)}
        >
          <Eye size={17} />

          <span>
            <strong>Visualizar detalhes</strong>
            <small>Abrir informações completas</small>
          </span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => executar(onEditar)}
        >
          <Edit3 size={17} />

          <span>
            <strong>Editar cadastro</strong>
            <small>Dados oficiais e logotipo</small>
          </span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => executar(onAliases)}
        >
          <Tags size={17} />

          <span>
            <strong>Gerenciar aliases</strong>
            <small>Nomes alternativos</small>
          </span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => executar(onAlterarStatus)}
        >
          <Activity size={17} />

          <span>
            <strong>Alterar status</strong>
            <small>Situação operacional</small>
          </span>
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => executar(onAuditoria)}
        >
          <History size={17} />

          <span>
            <strong>Ver auditoria</strong>
            <small>Histórico e eventos CSIC</small>
          </span>
        </button>
      </div>
    </div>,
    document.body
  );
}

export default TransportadoraAcoesMenu;