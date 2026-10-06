import { ArrowLeft, ArrowUp } from "lucide-react";

import { useLandingNavigation } from "../navigation/LandingNavigationContext";

import "./LandingBackToTop.css";

export default function LandingBackToTop() {
  const {
    executarRetorno,
    possuiPosicaoAnterior,
    mostrarBotao,
  } = useLandingNavigation();

  if (!mostrarBotao) {
    return null;
  }

  const rotulo = possuiPosicaoAnterior
    ? "Voltar à posição anterior"
    : "Voltar ao topo";

  return (
    <button
      type="button"
      className="landing-back-to-top"
      onClick={executarRetorno}
      aria-label={rotulo}
      title={rotulo}
    >
      {possuiPosicaoAnterior ? (
        <ArrowLeft
          size={21}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      ) : (
        <ArrowUp
          size={21}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      )}
    </button>
  );
}