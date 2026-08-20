import { supabase } from "../../../../services/supabase";

function normalizarValor(valor) {
  if (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === ""
  ) {
    return null;
  }

  return valor;
}

function criarResumoVazio() {
  return {
    pessoaId: null,
    nomeMorador: null,

    usuarioId: null,
    nivelId: null,
    tipoUsuario: null,

    condominioId: null,
    condominioNome: null,

    moradorVinculoId: null,
    tipoMorador: null,
    vinculoPrincipal: null,
    vinculoAtivo: null,

    unidadeOperacionalId: null,
    unidadeOficialId: null,
    unidade: null,

    torreId: null,
    torre: null,
    torreIdentificador: null,

    garagem: null,
    localGaragem: null,

    dependentes: null,
  };
}

/**
 * CONTEXTO OFICIAL DO MORADOR
 *
 * Fonte:
 *
 * auth.uid()
 * ↓
 * rpc_morador_dashboard_contexto_v1()
 * ↓
 * usuários / pessoa / condomínio /
 * vínculo residencial / unidade / torre
 *
 * O frontend NÃO determina a identidade
 * nem a unidade autorizada.
 */
export async function carregarResumoOperacionalMorador() {
  const resumoVazio = criarResumoVazio();

  const {
    data,
    error,
  } = await supabase.rpc(
    "rpc_morador_dashboard_contexto_v1"
  );

  if (error) {
    console.error(
      "[Dashboard Morador] Erro na RPC de contexto:",
      error
    );

    throw error;
  }

  const contexto =
    Array.isArray(data)
      ? data[0] || null
      : data || null;

  if (!contexto) {
    console.warn(
      "[Dashboard Morador] A RPC não retornou contexto para o usuário autenticado."
    );

    return resumoVazio;
  }

  /*
   * IMPORTANTE:
   *
   * A RPC retorna snake_case.
   * Aqui transformamos para o contrato
   * utilizado pelos componentes React.
   */

  return {
    pessoaId:
      contexto.pessoa_id || null,

    nomeMorador:
      normalizarValor(
        contexto.nome_completo
      ),

    usuarioId:
      contexto.usuario_id || null,

    nivelId:
      contexto.nivel_id ?? null,

    tipoUsuario:
      normalizarValor(
        contexto.tipo_usuario
      ),

    condominioId:
      contexto.condominio_id || null,

    condominioNome:
      normalizarValor(
        contexto.condominio_nome
      ),

    moradorVinculoId:
      contexto.morador_unidade_vinculo_id ||
      null,

    tipoMorador:
      normalizarValor(
        contexto.tipo_morador
      ),

    vinculoPrincipal:
      contexto.principal === true,

    /*
     * A RPC já retorna somente vínculo ativo.
     */
    vinculoAtivo: true,

    unidadeOperacionalId:
      contexto.unidade_operacional_id ||
      null,

    unidadeOficialId:
      contexto.unidade_oficial_id ||
      null,

    unidade:
      normalizarValor(
        contexto.unidade
      ),

    torreId:
      contexto.torre_id || null,

    torre:
      normalizarValor(
        contexto.torre
      ),

    torreIdentificador:
      normalizarValor(
        contexto.torre_identificador
      ),

    /*
     * Garagem será ligada ao domínio oficial
     * de vagas separadamente.
     *
     * Não inventamos dado.
     */
    garagem: null,

    localGaragem: null,

    dependentes:
      contexto.dependentes_total ===
        null ||
      contexto.dependentes_total ===
        undefined
        ? null
        : Number(
            contexto.dependentes_total
          ),
  };
}

/**
 * INDICADORES
 *
 * Ainda sem contratos reais homologados.
 */
export async function carregarIndicadoresDashboardMorador() {
  return {
    encomendasAguardando: null,

    emprestimosGaragem: null,

    servicosAgendados: null,
  };
}

/**
 * AGENDA
 *
 * Será alimentada futuramente pelo domínio
 * Serviços/Agenda.
 */
export async function carregarAgendaDashboardMorador() {
  return [];
}