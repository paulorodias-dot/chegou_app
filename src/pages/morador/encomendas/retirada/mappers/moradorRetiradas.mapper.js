import {
  MORADOR_RETIRADAS_EMPTY_SUMMARY,
} from "../config/moradorRetiradas.constants";

function numeroSeguro(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function textoOuNulo(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  const texto = String(valor).trim();
  return texto || null;
}

export function mapearResumoMoradorRetiradas(resumo) {
  if (!resumo || typeof resumo !== "object") {
    return MORADOR_RETIRADAS_EMPTY_SUMMARY;
  }

  return {
    totalAtivas: numeroSeguro(resumo.total_ativas),
    totalMorador: numeroSeguro(resumo.total_morador),
    totalDependentes: numeroSeguro(resumo.total_dependentes),
    totalDisponiveis: numeroSeguro(resumo.total_disponiveis),
    totalAgendadas: numeroSeguro(resumo.total_agendadas),
    totalEmRetirada: numeroSeguro(resumo.total_em_retirada),
    totalAtrasadas: numeroSeguro(resumo.total_atrasadas),
    totalRetiradas: numeroSeguro(resumo.total_retiradas),
  };
}

export function mapearItemMoradorRetirada(item) {
  const retirada =
    item?.retirada && typeof item.retirada === "object"
      ? item.retirada
      : null;

  const agendamento =
    item?.agendamento && typeof item.agendamento === "object"
      ? item.agendamento
      : null;

  return {
    id: item?.id || item?.encomenda_id || null,
    encomendaId: item?.encomenda_id || item?.id || null,
    numero: numeroSeguro(item?.numero_encomenda),
    grupo: textoOuNulo(item?.grupo),
    status: textoOuNulo(item?.status || item?.status_encomenda),
    estadoVisual: textoOuNulo(item?.estado_visual) || "PADRAO",
    atrasada: item?.atrasada === true,
    escopoDestino:
      textoOuNulo(item?.escopo_destino) || "VOCE",
    destinatarioNome:
      textoOuNulo(item?.destinatario_nome) || "Morador",
    destinatarioTipo:
      textoOuNulo(item?.destinatario_tipo) || "MORADOR",
    transportadora:
      textoOuNulo(item?.transportadora_nome) ||
      "Transportadora não informada",
    codigoRastreio: textoOuNulo(item?.codigo_rastreio),
    descricaoCompra: textoOuNulo(item?.descricao_compra),
    totalVolumes: Math.max(0, numeroSeguro(item?.total_volumes)),
    disponibilizadoEm:
      textoOuNulo(item?.disponibilizado_em_local) ||
      textoOuNulo(item?.disponibilizado_em),
    finalizadoEm:
      textoOuNulo(item?.finalizado_em_local) ||
      textoOuNulo(item?.finalizado_em),
    retiradoEm:
      textoOuNulo(item?.retirado_em_local) ||
      textoOuNulo(item?.retirado_em),
    agendamento: agendamento
      ? {
          id: agendamento.id || null,
          data: textoOuNulo(agendamento.data_agendada),
          periodo: textoOuNulo(agendamento.periodo_agendado),
          status: textoOuNulo(agendamento.status),
        }
      : null,
    retirada: retirada
      ? {
          id: retirada.id || null,

          resultado:
            textoOuNulo(retirada.resultado),

          tipoRetirante:
            textoOuNulo(retirada.tipo_retirante),

          retiranteNome:
            textoOuNulo(retirada.retirante_nome),

          metodoValidacao:
            textoOuNulo(retirada.metodo_validacao),

          iniciadaEm:
            textoOuNulo(retirada.iniciada_em_local) ||
            textoOuNulo(retirada.iniciada_em),

          validadaEm:
            textoOuNulo(retirada.validada_em_local) ||
            textoOuNulo(retirada.validada_em),

          validadaPorNome:
            textoOuNulo(retirada.validada_por_nome),

          concluidaEm:
            textoOuNulo(retirada.concluida_em_local) ||
            textoOuNulo(retirada.concluida_em),

          entreguePorNome:
            textoOuNulo(retirada.entregue_por_nome),

          totalVolumesEntregues:
            numeroSeguro(
              retirada.total_volumes_entregues
            ),
        }
      : null,
  };
}

export function mapearRespostaMoradorRetiradas(resposta) {
  const itens = Array.isArray(resposta?.itens)
    ? resposta.itens.map(mapearItemMoradorRetirada)
    : [];

  return {
    itens,
    resumo: mapearResumoMoradorRetiradas(resposta?.resumo),
    total: numeroSeguro(resposta?.total),
    limite: numeroSeguro(resposta?.limite),
    offset: numeroSeguro(resposta?.offset),
    possuiMais: resposta?.possui_mais === true,
    contratoVersao: numeroSeguro(resposta?.contrato_versao),
  };
}