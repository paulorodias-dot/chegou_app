import { supabase } from "../../../services/supabase";


/**
 * ============================================================
 * SISTEMA CHEGOU!
 * DICR — Domínio de Identidade e Contexto Residencial
 * ============================================================
 *
 * Este service é compartilhado entre módulos.
 *
 * NÃO pertence ao Perfil, Dashboard, Portaria, Administrativo,
 * Encomendas, Garagem ou qualquer consumidor específico.
 *
 * Responsabilidade:
 * - acessar contratos públicos do DICR;
 * - acessar projeções especializadas vinculadas ao contexto
 *   residencial quando o contrato exigir;
 * - validar minimamente os envelopes técnicos;
 * - preservar os contratos recebidos do backend.
 *
 * Não é responsabilidade deste arquivo:
 * - decidir autorização;
 * - selecionar contexto arbitrariamente;
 * - reconstruir dados do Wizard;
 * - consultar tabelas diretamente;
 * - adaptar dados para uma tela específica;
 * - misturar semanticamente domínios especializados.
 * ============================================================
 */

const RPC_DICR_CONTEXTO_ATUAL =
  "fn_dicr_contextos_residenciais_v1";

const RPC_MORADOR_FAMILIA_VINCULOS_RESUMO =
  "rpc_morador_familia_vinculos_resumo_v1";

const RPC_MORADOR_VEICULOS_RESUMO =
  "rpc_morador_veiculos_resumo_v1";

const RPC_MORADOR_VAGAS_RESUMO =
  "rpc_morador_vagas_resumo_v1";


/**
 * Erro de domínio utilizado pela camada frontend do DICR.
 *
 * `codigo` preserva um identificador estável para que cada
 * consumidor possa decidir sua própria experiência de erro.
 */
export class DICRError extends Error {
  constructor(
    codigo,
    mensagem = "Não foi possível carregar o contexto residencial.",
    causa = null
  ) {
    super(mensagem);

    this.name = "DICRError";
    this.codigo =
      codigo || "DICR_ERRO_DESCONHECIDO";
    this.causa = causa || null;
  }
}


function objetoValido(valor) {
  return (
    valor !== null &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  );
}


function textoOuNull(valor) {
  if (typeof valor !== "string") {
    return null;
  }

  const texto = valor.trim();

  return texto || null;
}


function normalizarRespostaRpc(data) {
  /*
   * Os contratos atuais retornam jsonb.
   *
   * Mantemos tolerância defensiva para eventual envelope
   * de um único registro sem transformar isso em regra
   * semântica do DICR.
   */
  if (Array.isArray(data)) {
    return data.length === 1
      ? data[0] || null
      : null;
  }

  return data || null;
}


function validarEnvelopeDicr(resposta) {
  if (!objetoValido(resposta)) {
    throw new DICRError(
      "DICR_RESPOSTA_INVALIDA",
      "O contexto residencial retornou uma resposta inválida."
    );
  }

  if (resposta.success !== true) {
    throw new DICRError(
      resposta.codigo ||
        "DICR_CONTEXTO_INDISPONIVEL",
      "Não foi possível identificar o contexto residencial."
    );
  }

  if (!Array.isArray(resposta.contextos)) {
    throw new DICRError(
      "DICR_CONTEXTOS_INVALIDOS",
      "O contexto residencial retornou dados incompletos."
    );
  }

  return resposta;
}


function validarEnvelopeFamiliaVinculos(
  resposta
) {
  if (!objetoValido(resposta)) {
    throw new DICRError(
      "DICR_FAMILIA_VINCULOS_RESPOSTA_INVALIDA",
      "O resumo de família e vínculos retornou uma resposta inválida."
    );
  }

  if (resposta.success !== true) {
    throw new DICRError(
      resposta.codigo ||
        "DICR_FAMILIA_VINCULOS_INDISPONIVEL",
      "Não foi possível carregar o resumo de família e vínculos."
    );
  }

  if (!objetoValido(resposta.contexto)) {
    throw new DICRError(
      "DICR_FAMILIA_VINCULOS_CONTEXTO_INVALIDO",
      "O resumo de família e vínculos retornou um contexto inválido."
    );
  }

  if (!objetoValido(resposta.resumo)) {
    throw new DICRError(
      "DICR_FAMILIA_VINCULOS_RESUMO_INVALIDO",
      "O resumo de família e vínculos retornou dados incompletos."
    );
  }

  return resposta;
}


function validarEnvelopeVeiculos(resposta) {
  if (!objetoValido(resposta)) {
    throw new DICRError(
      "DICR_VEICULOS_RESPOSTA_INVALIDA",
      "O resumo de veículos retornou uma resposta inválida."
    );
  }

  if (resposta.success !== true) {
    throw new DICRError(
      resposta.codigo ||
        "DICR_VEICULOS_INDISPONIVEL",
      "Não foi possível carregar os veículos."
    );
  }

  if (!objetoValido(resposta.contexto)) {
    throw new DICRError(
      "DICR_VEICULOS_CONTEXTO_INVALIDO",
      "O resumo de veículos retornou um contexto inválido."
    );
  }

  if (!objetoValido(resposta.resumo)) {
    throw new DICRError(
      "DICR_VEICULOS_RESUMO_INVALIDO",
      "O resumo de veículos retornou dados incompletos."
    );
  }

  if (!Array.isArray(resposta.veiculos)) {
    throw new DICRError(
      "DICR_VEICULOS_LISTA_INVALIDA",
      "O resumo de veículos retornou uma lista inválida."
    );
  }

  return resposta;
}


function validarEnvelopeVagas(resposta) {
  if (!objetoValido(resposta)) {
    throw new DICRError(
      "DICR_VAGAS_RESPOSTA_INVALIDA",
      "O resumo de vagas retornou uma resposta inválida."
    );
  }

  if (resposta.success !== true) {
    throw new DICRError(
      resposta.codigo ||
        "DICR_VAGAS_INDISPONIVEL",
      "Não foi possível carregar as vagas."
    );
  }

  if (!objetoValido(resposta.contexto)) {
    throw new DICRError(
      "DICR_VAGAS_CONTEXTO_INVALIDO",
      "O resumo de vagas retornou um contexto inválido."
    );
  }

  if (!objetoValido(resposta.resumo)) {
    throw new DICRError(
      "DICR_VAGAS_RESUMO_INVALIDO",
      "O resumo de vagas retornou dados incompletos."
    );
  }

  if (!Array.isArray(resposta.vagas)) {
    throw new DICRError(
      "DICR_VAGAS_LISTA_INVALIDA",
      "O resumo de vagas retornou uma lista inválida."
    );
  }

  return resposta;
}


/**
 * Carrega o DICR da identidade autenticada.
 *
 * IMPORTANTE:
 * esta função NÃO escolhe automaticamente um contexto quando
 * `selecao_necessaria === true`.
 *
 * Múltiplos vínculos residenciais são informação oficial e
 * devem permanecer preservados.
 */
export async function carregarDICRContextosResidenciais() {
  const { data, error } = await supabase.rpc(
    RPC_DICR_CONTEXTO_ATUAL
  );

  if (error) {
    throw new DICRError(
      error.code || "DICR_RPC_ERRO",
      "Não foi possível carregar o contexto residencial.",
      error
    );
  }

  const resposta =
    normalizarRespostaRpc(data);

  return validarEnvelopeDicr(resposta);
}


/**
 * Carrega a projeção especializada de Família e Vínculos
 * correspondente a um contexto residencial já conhecido.
 *
 * IMPORTANTE:
 *
 * `moradorUnidadeVinculoId` é somente um SELETOR.
 *
 * O frontend não autoriza o acesso por meio desse identificador.
 * A autorização é novamente validada no backend pela RPC,
 * utilizando os contextos canônicos resolvidos pelo DICR.
 *
 * O service:
 * - não consulta dependentes_unidade;
 * - não consulta funcionarios_unidade;
 * - não consulta pets_unidade;
 * - não consulta encomendas_autorizacoes_retirada;
 * - não calcula os totais localmente.
 */
export async function carregarResumoFamiliaVinculos(
  moradorUnidadeVinculoId
) {
  const contextoId =
    textoOuNull(moradorUnidadeVinculoId);

  if (!contextoId) {
    throw new DICRError(
      "DICR_FAMILIA_VINCULOS_CONTEXTO_REQUIRED",
      "O contexto residencial é obrigatório para carregar família e vínculos."
    );
  }

  const { data, error } = await supabase.rpc(
    RPC_MORADOR_FAMILIA_VINCULOS_RESUMO,
    {
      p_morador_unidade_vinculo_id:
        contextoId,
    }
  );

  if (error) {
    throw new DICRError(
      error.code ||
        "DICR_FAMILIA_VINCULOS_RPC_ERRO",
      "Não foi possível carregar o resumo de família e vínculos.",
      error
    );
  }

  const resposta =
    normalizarRespostaRpc(data);

  const respostaValidada =
    validarEnvelopeFamiliaVinculos(
      resposta
    );

  const contextoRetornado =
    textoOuNull(
      respostaValidada.contexto
        ?.morador_unidade_vinculo_id
    );

  /*
   * Defesa adicional de integridade do contrato.
   *
   * A autorização continua sendo responsabilidade do backend.
   * Esta comparação apenas impede que o consumidor aceite
   * silenciosamente uma resposta referente a outro contexto.
   */
  if (contextoRetornado !== contextoId) {
    throw new DICRError(
      "DICR_FAMILIA_VINCULOS_CONTEXTO_DIVERGENTE",
      "O resumo de família e vínculos retornou um contexto diferente do solicitado."
    );
  }

  return respostaValidada;
}


/**
 * ============================================================
 * VEÍCULOS — PROJEÇÃO READ-ONLY
 * ============================================================
 *
 * Carrega os veículos oficiais pertencentes ao contexto
 * residencial solicitado.
 *
 * `moradorUnidadeVinculoId` continua sendo somente um SELETOR.
 *
 * A autorização é realizada novamente no backend pela RPC
 * utilizando os contextos residenciais canônicos do DICR.
 *
 * Este service:
 * - não consulta veiculos_unidade diretamente;
 * - não consulta vagas_unidade diretamente;
 * - não cria associação veículo/vaga;
 * - não altera veículos;
 * - não altera vagas;
 * - não escolhe contexto residencial;
 * - não define veículo principal.
 * ============================================================
 */
export async function carregarResumoVeiculos(
  moradorUnidadeVinculoId
) {
  const contextoId =
    textoOuNull(moradorUnidadeVinculoId);

  if (!contextoId) {
    throw new DICRError(
      "DICR_VEICULOS_CONTEXTO_REQUIRED",
      "O contexto residencial é obrigatório para carregar os veículos."
    );
  }

  const { data, error } = await supabase.rpc(
    RPC_MORADOR_VEICULOS_RESUMO,
    {
      p_morador_unidade_vinculo_id:
        contextoId,
    }
  );

  if (error) {
    throw new DICRError(
      error.code ||
        "DICR_VEICULOS_RPC_ERRO",
      "Não foi possível carregar os veículos.",
      error
    );
  }

  const resposta =
    normalizarRespostaRpc(data);

  const respostaValidada =
    validarEnvelopeVeiculos(resposta);

  const contextoRetornado =
    textoOuNull(
      respostaValidada.contexto
        ?.morador_unidade_vinculo_id
    );

  /*
   * Defesa adicional de integridade.
   *
   * Não substitui a autorização do backend.
   * Apenas impede que o consumidor aceite silenciosamente
   * uma projeção pertencente a outro contexto.
   */
  if (contextoRetornado !== contextoId) {
    throw new DICRError(
      "DICR_VEICULOS_CONTEXTO_DIVERGENTE",
      "O resumo de veículos retornou um contexto diferente do solicitado."
    );
  }

  return respostaValidada;
}


/**
 * ============================================================
 * VAGAS — PROJEÇÃO READ-ONLY
 * ============================================================
 *
 * Carrega as vagas oficiais pertencentes à unidade do contexto
 * residencial solicitado.
 *
 * REGRA DE DOMÍNIO V1:
 *
 * - a vaga parte da unidade, não do veículo;
 * - moradorUnidadeVinculoId é somente um SELETOR;
 * - a autorização é revalidada no backend pelo DICR;
 * - o service não consulta vagas_unidade diretamente;
 * - o service não usa morador_responsavel_id para autorizar;
 * - o service não exige veículo vinculado;
 * - o service não altera vagas;
 * - o service não altera associações;
 * - o service não implementa aluguel/cessão;
 * - o service não escolhe contexto residencial.
 *
 * A projeção atual é deliberadamente mínima:
 * identificação + status.
 * ============================================================
 */
export async function carregarResumoVagas(
  moradorUnidadeVinculoId
) {
  const contextoId =
    textoOuNull(moradorUnidadeVinculoId);

  if (!contextoId) {
    throw new DICRError(
      "DICR_VAGAS_CONTEXTO_REQUIRED",
      "O contexto residencial é obrigatório para carregar as vagas."
    );
  }

  const { data, error } = await supabase.rpc(
    RPC_MORADOR_VAGAS_RESUMO,
    {
      p_morador_unidade_vinculo_id:
        contextoId,
    }
  );

  if (error) {
    throw new DICRError(
      error.code ||
        "DICR_VAGAS_RPC_ERRO",
      "Não foi possível carregar as vagas.",
      error
    );
  }

  const resposta =
    normalizarRespostaRpc(data);

  const respostaValidada =
    validarEnvelopeVagas(resposta);

  const contextoRetornado =
    textoOuNull(
      respostaValidada.contexto
        ?.morador_unidade_vinculo_id
    );

  /*
   * Defesa adicional de integridade.
   *
   * A autorização permanece no backend.
   * Aqui apenas recusamos silenciosamente aceitar uma
   * projeção referente a contexto diferente do solicitado.
   */
  if (contextoRetornado !== contextoId) {
    throw new DICRError(
      "DICR_VAGAS_CONTEXTO_DIVERGENTE",
      "O resumo de vagas retornou um contexto diferente do solicitado."
    );
  }

  return respostaValidada;
}