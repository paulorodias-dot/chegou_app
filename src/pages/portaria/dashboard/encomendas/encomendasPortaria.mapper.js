export function normalizarValorOperacional(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return numero;
}

export function formatarValorOperacional(valor) {
  const numero = normalizarValorOperacional(valor);

  if (numero === null) {
    return "—";
  }

  return numero.toLocaleString("pt-BR");
}

export function mapearResumoPortaria(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return {
    recebidasHoje: normalizarValorOperacional(
      payload.recebidasHoje
    ),
    retiradasHoje: normalizarValorOperacional(
      payload.retiradasHoje
    ),
    aguardandoRetirada: normalizarValorOperacional(
      payload.aguardandoRetirada
    ),
    pendentesIdentificacao: normalizarValorOperacional(
      payload.pendentesIdentificacao
    ),
  };
}