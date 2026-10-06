import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const LandingNavigationContext = createContext(null);

function obterComportamentoRolagem() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "auto";
  }

  return "smooth";
}

export function LandingNavigationProvider({ children }) {
  const [posicaoAnterior, setPosicaoAnterior] = useState(null);
  const [posicaoAtual, setPosicaoAtual] = useState(0);

  const posicaoAnteriorRef = useRef(null);

  useEffect(() => {
    function atualizarPosicao() {
      setPosicaoAtual(window.scrollY);
    }

    atualizarPosicao();

    window.addEventListener("scroll", atualizarPosicao, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", atualizarPosicao);
    };
  }, []);

  const navegarParaSecao = useCallback((id) => {
    if (typeof id !== "string" || !id.trim()) {
      return false;
    }

    const idNormalizado = id.trim().replace(/^#/, "");
    const destino = document.getElementById(idNormalizado);

    if (!destino) {
      console.warn(
        `[Landing] Destino de navegação não encontrado: #${idNormalizado}`
      );
      return false;
    }

    const origem = window.scrollY;
    const destinoY =
      destino.getBoundingClientRect().top + window.scrollY;

    if (Math.abs(destinoY - origem) > 10) {
      posicaoAnteriorRef.current = origem;
      setPosicaoAnterior(origem);
    }

    destino.scrollIntoView({
      behavior: obterComportamentoRolagem(),
      block: "start",
    });

    return true;
  }, []);

  const voltarAoTopo = useCallback(() => {
    posicaoAnteriorRef.current = null;
    setPosicaoAnterior(null);

    window.scrollTo({
      top: 0,
      behavior: obterComportamentoRolagem(),
    });
  }, []);

  const voltarPosicaoAnterior = useCallback(() => {
    const origem = posicaoAnteriorRef.current;

    if (origem === null) {
      voltarAoTopo();
      return;
    }

    posicaoAnteriorRef.current = null;
    setPosicaoAnterior(null);

    window.scrollTo({
      top: Math.max(0, origem),
      behavior: obterComportamentoRolagem(),
    });
  }, [voltarAoTopo]);

  const executarRetorno = useCallback(() => {
    if (posicaoAnteriorRef.current !== null) {
      voltarPosicaoAnterior();
      return;
    }

    voltarAoTopo();
  }, [voltarAoTopo, voltarPosicaoAnterior]);

  const possuiPosicaoAnterior = posicaoAnterior !== null;
  const mostrarBotao = possuiPosicaoAnterior || posicaoAtual > 280;

  return (
    <LandingNavigationContext.Provider
      value={{
        navegarParaSecao,
        voltarAoTopo,
        voltarPosicaoAnterior,
        executarRetorno,
        possuiPosicaoAnterior,
        mostrarBotao,
      }}
    >
      {children}
    </LandingNavigationContext.Provider>
  );
}

export function useLandingNavigation() {
  const contexto = useContext(LandingNavigationContext);

  if (!contexto) {
    throw new Error(
      "useLandingNavigation deve ser utilizado dentro de LandingNavigationProvider."
    );
  }

  return contexto;
}
