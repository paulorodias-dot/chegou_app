import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  MORADOR_RETIRADAS_EMPTY_SUMMARY,
  MORADOR_RETIRADAS_ORDER,
  MORADOR_RETIRADAS_PAGE_SIZE,
  MORADOR_RETIRADAS_SCOPE,
} from "../config/moradorRetiradas.constants";

import {
  mapearRespostaMoradorRetiradas,
} from "../mappers/moradorRetiradas.mapper";

import {
  carregarContextoMoradorRetiradas,
  carregarMoradorRetiradas,
} from "../services/moradorRetiradas.service";

function ordemPadrao(escopo) {
  return escopo === MORADOR_RETIRADAS_SCOPE.ACTIVE
    ? MORADOR_RETIRADAS_ORDER.OLDEST
    : MORADOR_RETIRADAS_ORDER.NEWEST;
}

export default function useMoradorRetiradas() {
  const requestIdRef = useRef(0);
  const montadoRef = useRef(true);

  const [contexto, setContexto] = useState(null);
  const [itens, setItens] = useState([]);
  const [resumo, setResumo] = useState(
    MORADOR_RETIRADAS_EMPTY_SUMMARY
  );
  const [escopo, setEscopoState] = useState(
    MORADOR_RETIRADAS_SCOPE.ACTIVE
  );
  const [ordem, setOrdemState] = useState(
    MORADOR_RETIRADAS_ORDER.OLDEST
  );
  const [total, setTotal] = useState(0);
  const [possuiMais, setPossuiMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState(null);

  const executarCarga = useCallback(async ({
    contextoAtual,
    escopoAtual,
    ordemAtual,
    offset = 0,
    anexar = false,
  }) => {
    const requestId = ++requestIdRef.current;

    if (anexar) {
      setCarregandoMais(true);
    } else {
      setCarregando(true);
    }

    setErro(null);

    try {
      const resposta = await carregarMoradorRetiradas({
        condominioId: contextoAtual.condominioId,
        unidadeId: contextoAtual.unidadeId,
        escopo: escopoAtual,
        ordem: ordemAtual,
        limite: MORADOR_RETIRADAS_PAGE_SIZE,
        offset,
      });

      if (!montadoRef.current || requestId !== requestIdRef.current) {
        return;
      }

      const mapeado = mapearRespostaMoradorRetiradas(resposta);

      setItens((atuais) =>
        anexar ? [...atuais, ...mapeado.itens] : mapeado.itens
      );
      setResumo(mapeado.resumo);
      setTotal(mapeado.total);
      setPossuiMais(mapeado.possuiMais);
    } catch (error) {
      if (!montadoRef.current || requestId !== requestIdRef.current) {
        return;
      }

      console.error(
        "[Morador Retiradas] Falha ao carregar listagem:",
        error
      );
      setErro(error);

      if (!anexar) {
        setItens([]);
        setTotal(0);
        setPossuiMais(false);
      }
    } finally {
      if (montadoRef.current && requestId === requestIdRef.current) {
        setCarregando(false);
        setCarregandoMais(false);
      }
    }
  }, []);

  const iniciar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const contextoCarregado = await carregarContextoMoradorRetiradas();

      if (!montadoRef.current) {
        return;
      }

      setContexto(contextoCarregado);

      await executarCarga({
        contextoAtual: contextoCarregado,
        escopoAtual: escopo,
        ordemAtual: ordem,
      });
    } catch (error) {
      if (!montadoRef.current) {
        return;
      }

      console.error(
        "[Morador Retiradas] Falha ao carregar contexto:",
        error
      );
      setErro(error);
      setItens([]);
      setCarregando(false);
    }
  }, [escopo, executarCarga, ordem]);

  useEffect(() => {
    montadoRef.current = true;
    iniciar();

    return () => {
      montadoRef.current = false;
      requestIdRef.current += 1;
    };
  }, [iniciar]);

  const alterarEscopo = useCallback((novoEscopo) => {
    if (!Object.values(MORADOR_RETIRADAS_SCOPE).includes(novoEscopo)) {
      return;
    }

    const novaOrdem = ordemPadrao(novoEscopo);
    setEscopoState(novoEscopo);
    setOrdemState(novaOrdem);
  }, []);

  const alterarOrdem = useCallback((novaOrdem) => {
    if (!Object.values(MORADOR_RETIRADAS_ORDER).includes(novaOrdem)) {
      return;
    }

    setOrdemState(novaOrdem);
  }, []);

  const carregarMais = useCallback(() => {
    if (!contexto || carregando || carregandoMais || !possuiMais) {
      return;
    }

    executarCarga({
      contextoAtual: contexto,
      escopoAtual: escopo,
      ordemAtual: ordem,
      offset: itens.length,
      anexar: true,
    });
  }, [
    carregando,
    carregandoMais,
    contexto,
    escopo,
    executarCarga,
    itens.length,
    ordem,
    possuiMais,
  ]);

  const recarregar = useCallback(() => {
    if (!contexto) {
      iniciar();
      return;
    }

    executarCarga({
      contextoAtual: contexto,
      escopoAtual: escopo,
      ordemAtual: ordem,
    });
  }, [contexto, escopo, executarCarga, iniciar, ordem]);

  return {
    contexto,
    itens,
    resumo,
    escopo,
    ordem,
    total,
    possuiMais,
    carregando,
    carregandoMais,
    erro,
    alterarEscopo,
    alterarOrdem,
    carregarMais,
    recarregar,
  };
}