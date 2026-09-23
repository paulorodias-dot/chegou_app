import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  buscarEncomendasPortaria,
  obterDetalheEncomendaPortaria,
  consultarTokenRetirada,
  prepararRetiradaToken,
  prepararRetiradaQr,
  resolverQrRetirada,
  validarCredencialRetirada,
  iniciarRetiradaAdministrativa,
  concluirRetirada,
  cancelarRetirada,
} from "../services/entregaEncomendasService";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTREGA
// HOOK OPERACIONAL
//
// Responsabilidade:
// - coordenar busca e detalhe;
// - controlar a pessoa selecionada;
// - controlar Código / QR;
// - coordenar início da retirada;
// - coordenar conferência da credencial;
// - recuperar retirada já em andamento;
// - coordenar Autorização da Portaria;
// - coordenar confirmação física da entrega;
// - controlar loading e mensagens da tela.
//
// NÃO:
// - acessa Supabase diretamente;
// - decide autorização;
// - decide elegibilidade;
// - cria regra de retirada;
// - valida credencial por conta própria;
// - altera dados fora dos services oficiais.
// ============================================================


// ============================================================
// ESTADO OPERACIONAL VAZIO
// ============================================================

const ESTADO_OPERACIONAL_INICIAL =
  Object.freeze({
    retiranteSelecionado:
      null,

    metodoCredencial:
      null,

    tokenDigitado:
      "",

    qrPayload:
      null,

    autorizacaoRetiradaId:
      null,

    retiradaId:
      null,

    resultadoRetirada:
      null,

    credencialConfirmada:
      false,

    identidadeConfirmada:
      false,

    documentoValidado:
      false,

    usandoAutorizacaoPortaria:
      false,

    motivoAutorizacaoPortaria:
      "",

    justificativaAutorizacaoPortaria:
      "",

    credencialAdministrativa:
      null,

    carregandoOperacao:
      false,

    erroOperacao:
      null,

    mensagemOperacao:
      null,
  });


// ============================================================
// ESTADO INICIAL
// ============================================================

const ESTADO_INICIAL =
  Object.freeze({
    modoBusca:
      "ID_CHEGOU",

    termoBusca:
      "",

    carregandoBusca:
      false,

    carregandoDetalhe:
      false,

    erro:
      null,

    respostaBusca:
      null,

    resultados:
      [],

    detalhe:
      null,

    encomendaSelecionadaId:
      null,

    ...ESTADO_OPERACIONAL_INICIAL,
  });


// ============================================================
// NORMALIZAR RESULTADOS DA BUSCA
// ============================================================

function extrairResultados(
  resposta
) {
  if (
    !resposta ||
    typeof resposta !== "object"
  ) {
    return [];
  }

  if (
    resposta.tipo_resultado ===
      "ENCOMENDA" &&
    resposta.encomenda &&
    typeof resposta.encomenda ===
      "object"
  ) {
    return [
      resposta.encomenda,
    ];
  }

  if (
    resposta.tipo_resultado ===
      "RESIDENCIA" &&
    resposta.residencia &&
    typeof resposta.residencia ===
      "object"
  ) {
    return [
      resposta.residencia,
    ];
  }

  if (
    Array.isArray(
      resposta.resultados
    )
  ) {
    return resposta.resultados;
  }

  return [];
}


// ============================================================
// ERRO DE INTERFACE
// ============================================================

function criarErroInterface(
  error,
  mensagemPadrao
) {
  return {
    mensagem:
      error?.message ||
      mensagemPadrao,

    codigo:
      error?.code ||
      null,
  };
}


// ============================================================
// MENSAGENS SEGURAS — BUSCA
// ============================================================

function mensagemErroBuscaBackend(
  codigo
) {
  switch (codigo) {
    case "ACESSO_NEGADO":
      return "Você não possui acesso a esta operação.";

    case "BUSCA_OBRIGATORIA":
      return "Informe o que deseja localizar.";

    case "MODO_BUSCA_INVALIDO":
      return "Selecione uma forma válida de pesquisa.";

    case "ID_CHEGOU_INVALIDO":
      return "Informe um ID Chegou! válido.";

    case "RASTREIO_INVALIDO":
      return "Informe um código de rastreio válido.";

    case "FORMATO_UNIDADE_INVALIDO":
      return "Informe a unidade e a torre no formato indicado.";

    case "NOME_INVALIDO":
      return "Informe um nome válido para pesquisa.";

    case "AMBIGUIDADE_ID_CHEGOU":
      return "Não foi possível identificar uma única encomenda.";

    default:
      return "Não foi possível localizar a encomenda.";
  }
}


// ============================================================
// MENSAGENS SEGURAS — DETALHE
// ============================================================

function mensagemErroDetalheBackend(
  codigo
) {
  switch (codigo) {
    case "ACESSO_NEGADO":
      return "Você não possui acesso a esta encomenda.";

    case "ENCOMENDA_NAO_ENCONTRADA":
      return "A encomenda não foi encontrada.";

    case "ENCOMENDA_FORA_DO_ESCOPO_RETIRADA":
      return "Esta encomenda não está disponível nesta operação.";

    case "INCONSISTENCIA_IDENTIDADE_MORADOR":
    case "INCONSISTENCIA_MULTIPLAS_RETIRADAS_ABERTAS":
    case "INCONSISTENCIA_RETIRADA_ATUAL":
      return "Esta encomenda precisa de verificação antes de continuar.";

    default:
      return "Não foi possível abrir esta encomenda.";
  }
}


// ============================================================
// MENSAGENS SEGURAS — OPERAÇÃO
// ============================================================

function mensagemErroOperacaoBackend(
  resposta,
  mensagemPadrao
) {
  const codigo =
    resposta?.codigo ||
    null;

  switch (codigo) {
    case "CREDENCIAL_RETIRADA_INVALIDA":
      return "Não foi possível confirmar este código. Confira a credencial apresentada e tente novamente.";

    case "CREDENCIAL_RETIRADA_BLOQUEADA":
      return "Não é possível continuar com esta credencial. Oriente o morador a verificar a credencial no aplicativo.";

    case "QR_INVALIDO_OU_INDISPONIVEL":
      return "Não foi possível confirmar este QR Code.";

    case "TOKEN_ADMINISTRATIVO_INVALIDO":
      return "Não foi possível confirmar a autorização da Portaria.";

    case "TOKEN_ADMINISTRATIVO_BLOQUEADO":
      return "Esta autorização da Portaria não pode mais ser utilizada.";

    case "TOKEN_ADMINISTRATIVO_DESABILITADO":
      return "A Autorização da Portaria não está disponível neste condomínio.";

    case "ACESSO_NEGADO":
      return "Você não possui acesso a esta operação.";

    default:
      return (
        resposta?.mensagem ||
        mensagemPadrao
      );
  }
}


// ============================================================
// CHAVE VISUAL DO RETIRANTE
// ============================================================

function obterChaveRetirante(
  retirante
) {
  if (!retirante) {
    return null;
  }

  return (
    retirante.dependente_unidade_id ||
    retirante.usuario_id ||
    retirante.pessoa_id ||
    null
  );
}


// ============================================================
// COMPARAR RETIRANTES
//
// A comparação é usada somente para garantir que a pessoa
// escolhida na tela também pertence à credencial apresentada.
// A autorização continua sendo decidida pelo backend.
// ============================================================

function retirantesCorrespondem(
  selecionado,
  autorizado
) {
  if (
    !selecionado ||
    !autorizado
  ) {
    return false;
  }

  if (
    String(
      selecionado.tipo_retirante ||
      ""
    ).toUpperCase() !==
    String(
      autorizado.tipo_retirante ||
      ""
    ).toUpperCase()
  ) {
    return false;
  }

  if (
    selecionado.dependente_unidade_id &&
    autorizado.dependente_unidade_id
  ) {
    return (
      selecionado.dependente_unidade_id ===
      autorizado.dependente_unidade_id
    );
  }

  if (
    selecionado.usuario_id &&
    autorizado.usuario_id
  ) {
    return (
      selecionado.usuario_id ===
      autorizado.usuario_id
    );
  }

  if (
    selecionado.pessoa_id &&
    autorizado.pessoa_id
  ) {
    return (
      selecionado.pessoa_id ===
      autorizado.pessoa_id
    );
  }

  return false;
}


// ============================================================
// LOCALIZAR RETIRANTE DENTRO DA CREDENCIAL
// ============================================================

function localizarRetiranteAutorizado(
  retiranteSelecionado,
  retirantesDisponiveis
) {
  if (
    !retiranteSelecionado ||
    !Array.isArray(
      retirantesDisponiveis
    )
  ) {
    return null;
  }

  return (
    retirantesDisponiveis.find(
      (
        retirante
      ) =>
        retirantesCorrespondem(
          retiranteSelecionado,
          retirante
        )
    ) ||
    null
  );
}


// ============================================================
// RECUPERAR OPERAÇÃO A PARTIR DO DETALHE
//
// Se a encomenda já estiver em retirada, não abrimos outra.
// O detalhe oficial informa a retirada atual.
// ============================================================

function extrairOperacaoDoDetalhe(
  detalhe
) {
  const retiradaAtual =
    detalhe?.retirada_atual;

  if (
    !retiradaAtual ||
    !retiradaAtual.retirada_id
  ) {
    return {
      retiradaId:
        null,

      resultadoRetirada:
        null,

      credencialConfirmada:
        false,
    };
  }

  return {
    retiradaId:
      retiradaAtual.retirada_id,

    resultadoRetirada:
      retiradaAtual.resultado ||
      null,

    credencialConfirmada:
      retiradaAtual.resultado ===
      "VALIDADA",
  };
}


// ============================================================
// HOOK
// ============================================================

export default function useEntregaEncomendas({
  condominioId,
} = {}) {
  const [
    state,
    setState,
  ] =
    useState(
      ESTADO_INICIAL
    );


  // ==========================================================
  // CONTROLE DE CONCORRÊNCIA
  // ==========================================================

  const buscaEmCursoRef =
    useRef(0);

  const detalheEmCursoRef =
    useRef(0);

  const operacaoEmCursoRef =
    useRef(false);


  // ==========================================================
  // ALTERAR MODO
  // ==========================================================

  const setModoBusca =
    useCallback(
      (
        modo
      ) => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            modoBusca:
              modo,

            termoBusca:
              "",

            erro:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // ALTERAR TERMO
  // ==========================================================

  const setTermoBusca =
    useCallback(
      (
        termo
      ) => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            termoBusca:
              termo,

            erro:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // LIMPAR ERRO GERAL
  // ==========================================================

  const limparErro =
    useCallback(
      () => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            erro:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // LIMPAR MENSAGEM DA OPERAÇÃO
  // ==========================================================

  const limparMensagemOperacao =
    useCallback(
      () => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // SELECIONAR RETIRANTE
  // ==========================================================

  const selecionarRetirante =
    useCallback(
      (
        retirante
      ) => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            retiranteSelecionado:
              retirante ||
              null,

            metodoCredencial:
              null,

            tokenDigitado:
              "",

            qrPayload:
              null,

            autorizacaoRetiradaId:
              null,

            identidadeConfirmada:
              false,

            documentoValidado:
              false,

            usandoAutorizacaoPortaria:
              false,

            motivoAutorizacaoPortaria:
              "",

            justificativaAutorizacaoPortaria:
              "",

            credencialAdministrativa:
              null,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // MÉTODO DA CREDENCIAL
  // ==========================================================

  const setMetodoCredencial =
    useCallback(
      (
        metodo
      ) => {
        const valor =
          metodo === "QR"
            ? "QR"
            : metodo === "TOKEN"
              ? "TOKEN"
              : null;

        setState(
          (
            atual
          ) => ({
            ...atual,

            metodoCredencial:
              valor,

            tokenDigitado:
              valor === "TOKEN"
                ? atual.tokenDigitado
                : "",

            qrPayload:
              valor === "QR"
                ? atual.qrPayload
                : null,

            autorizacaoRetiradaId:
              null,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // CÓDIGO DIGITADO
  // ==========================================================

  const setTokenDigitado =
    useCallback(
      (
        token
      ) => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            tokenDigitado:
              token,

            autorizacaoRetiradaId:
              null,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // QR LIDO
  // ==========================================================

  const setQrPayload =
    useCallback(
      (
        payload
      ) => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            qrPayload:
              payload ||
              null,

            autorizacaoRetiradaId:
              null,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // CONFIRMAÇÃO DE IDENTIDADE
  // ==========================================================

  const setIdentidadeConfirmada =
    useCallback(
      (
        confirmado
      ) => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            identidadeConfirmada:
              Boolean(
                confirmado
              ),

            erroOperacao:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // CONFERÊNCIA DE DOCUMENTO
  // ==========================================================

  const setDocumentoValidado =
    useCallback(
      (
        validado
      ) => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            documentoValidado:
              Boolean(
                validado
              ),

            erroOperacao:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // AUTORIZAÇÃO DA PORTARIA
  // ==========================================================

  const setUsandoAutorizacaoPortaria =
    useCallback(
      (
        ativo
      ) => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            usandoAutorizacaoPortaria:
              Boolean(
                ativo
              ),

            metodoCredencial:
              ativo
                ? null
                : atual.metodoCredencial,

            tokenDigitado:
              ativo
                ? ""
                : atual.tokenDigitado,

            qrPayload:
              ativo
                ? null
                : atual.qrPayload,

            autorizacaoRetiradaId:
              ativo
                ? null
                : atual.autorizacaoRetiradaId,

            motivoAutorizacaoPortaria:
              ativo
                ? atual.motivoAutorizacaoPortaria
                : "",

            justificativaAutorizacaoPortaria:
              ativo
                ? atual.justificativaAutorizacaoPortaria
                : "",

            credencialAdministrativa:
              ativo
                ? atual.credencialAdministrativa
                : null,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );
      },
      []
    );


  const setMotivoAutorizacaoPortaria =
    useCallback(
      (
        motivo
      ) => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            motivoAutorizacaoPortaria:
              motivo,

            erroOperacao:
              null,
          })
        );
      },
      []
    );


  const setJustificativaAutorizacaoPortaria =
    useCallback(
      (
        justificativa
      ) => {
        setState(
          (
            atual
          ) => ({
            ...atual,

            justificativaAutorizacaoPortaria:
              justificativa,

            erroOperacao:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // FECHAR DETALHE
  //
  // Não cancela retirada no backend.
  // ==========================================================

  const fecharDetalhe =
    useCallback(
      () => {
        detalheEmCursoRef.current += 1;

        setState(
          (
            atual
          ) => ({
            ...atual,

            detalhe:
              null,

            encomendaSelecionadaId:
              null,

            carregandoDetalhe:
              false,

            erro:
              null,

            ...ESTADO_OPERACIONAL_INICIAL,
          })
        );
      },
      []
    );


  // ==========================================================
  // LIMPAR RESULTADOS
  // ==========================================================

  const limparResultados =
    useCallback(
      () => {
        buscaEmCursoRef.current += 1;
        detalheEmCursoRef.current += 1;

        setState(
          (
            atual
          ) => ({
            ...atual,

            termoBusca:
              "",

            respostaBusca:
              null,

            resultados:
              [],

            detalhe:
              null,

            encomendaSelecionadaId:
              null,

            carregandoBusca:
              false,

            carregandoDetalhe:
              false,

            erro:
              null,

            ...ESTADO_OPERACIONAL_INICIAL,
          })
        );
      },
      []
    );


  // ==========================================================
  // RESETAR FLUXO
  // ==========================================================

  const resetarFluxo =
    useCallback(
      () => {
        buscaEmCursoRef.current += 1;
        detalheEmCursoRef.current += 1;

        setState({
          ...ESTADO_INICIAL,
        });
      },
      []
    );


  // ==========================================================
  // APLICAR DETALHE OFICIAL
  // ==========================================================

  const aplicarDetalhe =
    useCallback(
      (
        resposta
      ) => {
        const operacao =
          extrairOperacaoDoDetalhe(
            resposta
          );

        setState(
          (
            atual
          ) => ({
            ...atual,

            carregandoDetalhe:
              false,

            detalhe:
              resposta,

            retiradaId:
              operacao.retiradaId,

            resultadoRetirada:
              operacao.resultadoRetirada,

            credencialConfirmada:
              operacao.credencialConfirmada,

            erro:
              null,

            erroOperacao:
              null,
          })
        );
      },
      []
    );


  // ==========================================================
  // ABRIR DETALHE
  // ==========================================================

  const abrirDetalhe =
    useCallback(
      async (
        encomendaId
      ) => {
        if (
          !encomendaId
        ) {
          return null;
        }

        const requisicaoId =
          ++detalheEmCursoRef.current;

        setState(
          (
            atual
          ) => ({
            ...atual,

            carregandoDetalhe:
              true,

            erro:
              null,

            encomendaSelecionadaId:
              encomendaId,

            ...ESTADO_OPERACIONAL_INICIAL,
          })
        );

        try {
          const resposta =
            await obterDetalheEncomendaPortaria({
              condominioId,
              encomendaId,
            });

          if (
            requisicaoId !==
            detalheEmCursoRef.current
          ) {
            return null;
          }

          if (
            resposta?.ok ===
            false
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoDetalhe:
                  false,

                detalhe:
                  null,

                erro: {
                  mensagem:
                    mensagemErroDetalheBackend(
                      resposta?.codigo
                    ),

                  codigo:
                    resposta?.codigo ||
                    null,
                },
              })
            );

            return resposta;
          }

          aplicarDetalhe(
            resposta
          );

          return resposta;
        }
        catch (
          error
        ) {
          if (
            requisicaoId !==
            detalheEmCursoRef.current
          ) {
            return null;
          }

          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoDetalhe:
                false,

              detalhe:
                null,

              erro:
                criarErroInterface(
                  error,
                  "Não foi possível abrir esta encomenda."
                ),
            })
          );

          return null;
        }
      },
      [
        aplicarDetalhe,
        condominioId,
      ]
    );


  // ==========================================================
  // ATUALIZAR DETALHE
  //
  // Usado depois de uma operação para reconstruir a tela
  // a partir do estado oficial da encomenda.
  // ==========================================================

  const atualizarDetalhe =
    useCallback(
      async () => {
        const encomendaId =
          state.encomendaSelecionadaId ||
          state.detalhe?.encomenda?.id;

        if (
          !encomendaId
        ) {
          return null;
        }

        const requisicaoId =
          ++detalheEmCursoRef.current;

        setState(
          (
            atual
          ) => ({
            ...atual,

            carregandoDetalhe:
              true,

            erro:
              null,
          })
        );

        try {
          const resposta =
            await obterDetalheEncomendaPortaria({
              condominioId,
              encomendaId,
            });

          if (
            requisicaoId !==
            detalheEmCursoRef.current
          ) {
            return null;
          }

          if (
            resposta?.ok ===
            false
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoDetalhe:
                  false,

                erro: {
                  mensagem:
                    mensagemErroDetalheBackend(
                      resposta?.codigo
                    ),

                  codigo:
                    resposta?.codigo ||
                    null,
                },
              })
            );

            return resposta;
          }

          aplicarDetalhe(
            resposta
          );

          return resposta;
        }
        catch (
          error
        ) {
          if (
            requisicaoId !==
            detalheEmCursoRef.current
          ) {
            return null;
          }

          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoDetalhe:
                false,

              erro:
                criarErroInterface(
                  error,
                  "Não foi possível atualizar esta encomenda."
                ),
            })
          );

          return null;
        }
      },
      [
        aplicarDetalhe,
        condominioId,
        state.detalhe,
        state.encomendaSelecionadaId,
      ]
    );


  // ==========================================================
  // BUSCAR
  // ==========================================================

  const buscar =
    useCallback(
      async ({
        modo,
        termo,
        limite = 20,
      } = {}) => {
        const modoAtual =
          modo ||
          state.modoBusca;

        const termoAtual =
          termo !== undefined
            ? termo
            : state.termoBusca;

        const requisicaoId =
          ++buscaEmCursoRef.current;

        detalheEmCursoRef.current += 1;

        setState(
          (
            atual
          ) => ({
            ...atual,

            carregandoBusca:
              true,

            carregandoDetalhe:
              false,

            erro:
              null,

            respostaBusca:
              null,

            resultados:
              [],

            detalhe:
              null,

            encomendaSelecionadaId:
              null,

            ...ESTADO_OPERACIONAL_INICIAL,
          })
        );

        try {
          const resposta =
            await buscarEncomendasPortaria({
              condominioId,

              modo:
                modoAtual,

              busca:
                termoAtual,

              limite,
            });

          if (
            requisicaoId !==
            buscaEmCursoRef.current
          ) {
            return null;
          }

          if (
            resposta?.ok ===
            false
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoBusca:
                  false,

                respostaBusca:
                  resposta,

                resultados:
                  [],

                erro: {
                  mensagem:
                    mensagemErroBuscaBackend(
                      resposta?.codigo
                    ),

                  codigo:
                    resposta?.codigo ||
                    null,
                },
              })
            );

            return resposta;
          }

          const resultados =
            extrairResultados(
              resposta
            );

          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoBusca:
                false,

              respostaBusca:
                resposta,

              resultados,

              erro:
                null,
            })
          );

          return resposta;
        }
        catch (
          error
        ) {
          if (
            requisicaoId !==
            buscaEmCursoRef.current
          ) {
            return null;
          }

          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoBusca:
                false,

              respostaBusca:
                null,

              resultados:
                [],

              detalhe:
                null,

              encomendaSelecionadaId:
                null,

              erro:
                criarErroInterface(
                  error,
                  "Não foi possível localizar a encomenda."
                ),
            })
          );

          return null;
        }
      },
      [
        condominioId,
        state.modoBusca,
        state.termoBusca,
      ]
    );


  // ==========================================================
  // INICIAR COM CÓDIGO
  //
  // 1. Consulta o Código.
  // 2. Confirma que pertence à encomenda aberta.
  // 3. Confirma que a pessoa selecionada pode usá-lo.
  // 4. Solicita ao backend o início da retirada.
  //
  // NÃO valida a credencial ainda.
  // ==========================================================

  const iniciarComToken =
    useCallback(
      async ({
        contextoDispositivo = null,
      } = {}) => {
        if (
          operacaoEmCursoRef.current
        ) {
          return null;
        }

        const retirante =
          state.retiranteSelecionado;

        const encomendaId =
          state.detalhe?.encomenda?.id ||
          state.encomendaSelecionadaId;

        if (
          !retirante
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              erroOperacao: {
                mensagem:
                  "Selecione quem está retirando a encomenda.",
                codigo:
                  "RETIRANTE_NAO_SELECIONADO",
              },
            })
          );

          return null;
        }

        if (
          !encomendaId
        ) {
          return null;
        }

        operacaoEmCursoRef.current =
          true;

        setState(
          (
            atual
          ) => ({
            ...atual,

            carregandoOperacao:
              true,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );

        try {
          const consulta =
            await consultarTokenRetirada({
              condominioId,

              token:
                state.tokenDigitado,

              contextoDispositivo,
            });

          if (
            consulta?.ok ===
            false
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    mensagemErroOperacaoBackend(
                      consulta,
                      "Não foi possível conferir o código apresentado."
                    ),

                  codigo:
                    consulta?.codigo ||
                    null,
                },
              })
            );

            return consulta;
          }

          if (
            consulta?.encomenda_id !==
            encomendaId
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    "Este código não corresponde à encomenda aberta.",
                  codigo:
                    "CREDENCIAL_OUTRA_ENCOMENDA",
                },
              })
            );

            return null;
          }

          const retiranteAutorizado =
            localizarRetiranteAutorizado(
              retirante,
              consulta
                ?.retirantes_disponiveis
            );

          if (
            !retiranteAutorizado
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    "A pessoa selecionada não corresponde a esta credencial.",
                  codigo:
                    "RETIRANTE_NAO_CORRESPONDE_CREDENCIAL",
                },
              })
            );

            return null;
          }

          const preparacao =
            await prepararRetiradaToken({
              encomendaId,

              autorizacaoRetiradaId:
                consulta.autorizacao_id,

              tipoRetirante:
                retiranteAutorizado.tipo_retirante,

              retiranteNome:
                retiranteAutorizado.nome,

              retiranteUsuarioId:
                retiranteAutorizado.usuario_id,

              retirantePessoaId:
                retiranteAutorizado.pessoa_id,

              dependenteUnidadeId:
                retiranteAutorizado.dependente_unidade_id,

              documentoMascarado:
                retiranteAutorizado.documento_mascarado,

              contextoDispositivo,
            });

          if (
            preparacao?.ok ===
            false
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    mensagemErroOperacaoBackend(
                      preparacao,
                      "Não foi possível iniciar a retirada."
                    ),

                  codigo:
                    preparacao?.codigo ||
                    null,
                },
              })
            );

            return preparacao;
          }

          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoOperacao:
                false,

              metodoCredencial:
                "TOKEN",

              autorizacaoRetiradaId:
                consulta.autorizacao_id,

              retiradaId:
                preparacao?.retirada_id ||
                null,

              resultadoRetirada:
                preparacao?.resultado ||
                "INICIADA",

              credencialConfirmada:
                false,

              retiranteSelecionado:
                retiranteAutorizado,

              erroOperacao:
                null,

              mensagemOperacao:
                "Retirada iniciada. Agora confira o código apresentado.",
            })
          );

          return preparacao;
        }
        catch (
          error
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoOperacao:
                false,

              erroOperacao:
                criarErroInterface(
                  error,
                  "Não foi possível iniciar a retirada."
                ),
            })
          );

          return null;
        }
        finally {
          operacaoEmCursoRef.current =
            false;
        }
      },
      [
        condominioId,
        state.detalhe,
        state.encomendaSelecionadaId,
        state.retiranteSelecionado,
        state.tokenDigitado,
      ]
    );


  // ==========================================================
  // INICIAR COM QR
  // ==========================================================

  const iniciarComQr =
    useCallback(
      async ({
        contextoDispositivo = null,
      } = {}) => {
        if (
          operacaoEmCursoRef.current
        ) {
          return null;
        }

        const retirante =
          state.retiranteSelecionado;

        const encomendaId =
          state.detalhe?.encomenda?.id ||
          state.encomendaSelecionadaId;

        if (
          !retirante
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              erroOperacao: {
                mensagem:
                  "Selecione quem está retirando a encomenda.",
                codigo:
                  "RETIRANTE_NAO_SELECIONADO",
              },
            })
          );

          return null;
        }

        if (
          !encomendaId
        ) {
          return null;
        }

        operacaoEmCursoRef.current =
          true;

        setState(
          (
            atual
          ) => ({
            ...atual,

            carregandoOperacao:
              true,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );

        try {
          const resolucao =
            await resolverQrRetirada({
              qrPayload:
                state.qrPayload,
            });

          if (
            resolucao?.ok ===
            false
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    mensagemErroOperacaoBackend(
                      resolucao,
                      "Não foi possível conferir o QR Code."
                    ),

                  codigo:
                    resolucao?.codigo ||
                    null,
                },
              })
            );

            return resolucao;
          }

          if (
            resolucao?.encomenda_id !==
            encomendaId
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    "Este QR Code não corresponde à encomenda aberta.",
                  codigo:
                    "QR_OUTRA_ENCOMENDA",
                },
              })
            );

            return null;
          }

          if (
            resolucao?.tipo_autoridade ===
            "ADMINISTRATIVA"
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    "Use a área de Autorização da Portaria para esta credencial.",
                  codigo:
                    "QR_ADMINISTRATIVO_FORA_DO_FLUXO",
                },
              })
            );

            return null;
          }

          const autorizacaoId =
            resolucao
              ?.autorizacao_retirada_id;

          if (
            !autorizacaoId
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    "Não foi possível identificar a autorização deste QR Code.",
                  codigo:
                    "AUTORIZACAO_QR_NAO_IDENTIFICADA",
                },
              })
            );

            return null;
          }

          const preparacao =
            await prepararRetiradaQr({
              encomendaId,

              autorizacaoRetiradaId:
                autorizacaoId,

              tipoRetirante:
                retirante.tipo_retirante,

              retiranteNome:
                retirante.nome,

              retiranteUsuarioId:
                retirante.usuario_id,

              retirantePessoaId:
                retirante.pessoa_id,

              dependenteUnidadeId:
                retirante.dependente_unidade_id,

              documentoMascarado:
                retirante.documento_mascarado,

              contextoDispositivo,
            });

          if (
            preparacao?.ok ===
            false
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    mensagemErroOperacaoBackend(
                      preparacao,
                      "Não foi possível iniciar a retirada."
                    ),

                  codigo:
                    preparacao?.codigo ||
                    null,
                },
              })
            );

            return preparacao;
          }

          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoOperacao:
                false,

              metodoCredencial:
                "QR",

              autorizacaoRetiradaId:
                autorizacaoId,

              retiradaId:
                preparacao?.retirada_id ||
                null,

              resultadoRetirada:
                preparacao?.resultado ||
                "INICIADA",

              credencialConfirmada:
                false,

              erroOperacao:
                null,

              mensagemOperacao:
                "Retirada iniciada. Agora confirme o QR Code apresentado.",
            })
          );

          return preparacao;
        }
        catch (
          error
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoOperacao:
                false,

              erroOperacao:
                criarErroInterface(
                  error,
                  "Não foi possível iniciar a retirada."
                ),
            })
          );

          return null;
        }
        finally {
          operacaoEmCursoRef.current =
            false;
        }
      },
      [
        state.detalhe,
        state.encomendaSelecionadaId,
        state.qrPayload,
        state.retiranteSelecionado,
      ]
    );


  // ==========================================================
  // CONFERIR CREDENCIAL
  // ==========================================================

  const conferirCredencial =
    useCallback(
      async ({
        retiradaId:
          retiradaIdInformada = null,
        token = undefined,
        qrPayload = undefined,
        contextoDispositivo = null,
      } = {}) => {
        if (
          operacaoEmCursoRef.current
        ) {
          return null;
        }

        const retiradaId =
          retiradaIdInformada ||
          state.retiradaId ||
          state.detalhe
            ?.retirada_atual
            ?.retirada_id;

        if (
          !retiradaId
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              erroOperacao: {
                mensagem:
                  "Inicie a retirada antes de conferir a credencial.",
                codigo:
                  "RETIRADA_NAO_INICIADA",
              },
            })
          );

          return null;
        }

        const tokenFinal =
          token !== undefined
            ? token
            : state.metodoCredencial ===
                "TOKEN"
              ? state.tokenDigitado
              : null;

        const qrFinal =
          qrPayload !== undefined
            ? qrPayload
            : state.metodoCredencial ===
                "QR"
              ? state.qrPayload
              : null;

        operacaoEmCursoRef.current =
          true;

        setState(
          (
            atual
          ) => ({
            ...atual,

            carregandoOperacao:
              true,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );

        try {
          const resposta =
            await validarCredencialRetirada({
              retiradaId,

              token:
                tokenFinal,

              qrPayload:
                qrFinal,

              documentoValidado:
                state.documentoValidado,

              identidadeConfirmada:
                state.identidadeConfirmada,

              justificativa:
                state.justificativaAutorizacaoPortaria ||
                null,

              contextoDispositivo,
            });

          if (
            resposta?.ok ===
            false
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                credencialConfirmada:
                  false,

                erroOperacao: {
                  mensagem:
                    mensagemErroOperacaoBackend(
                      resposta,
                      "Não foi possível confirmar a credencial."
                    ),

                  codigo:
                    resposta?.codigo ||
                    null,
                },
              })
            );

            return resposta;
          }

          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoOperacao:
                false,

              retiradaId:
                resposta?.retirada_id ||
                retiradaId,

              resultadoRetirada:
                resposta?.resultado ||
                "VALIDADA",

              credencialConfirmada:
                true,

              erroOperacao:
                null,

              mensagemOperacao:
                "Credencial confirmada. A entrega pode ser realizada.",
            })
          );

          return resposta;
        }
        catch (
          error
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoOperacao:
                false,

              credencialConfirmada:
                false,

              erroOperacao:
                criarErroInterface(
                  error,
                  "Não foi possível confirmar a credencial."
                ),
            })
          );

          return null;
        }
        finally {
          operacaoEmCursoRef.current =
            false;
        }
      },
      [
        state.detalhe,
        state.documentoValidado,
        state.identidadeConfirmada,
        state.justificativaAutorizacaoPortaria,
        state.metodoCredencial,
        state.qrPayload,
        state.retiradaId,
        state.tokenDigitado,
      ]
    );


  // ==========================================================
  // GERAR AUTORIZAÇÃO DA PORTARIA
  //
  // Esta chamada já inicia a retirada no backend.
  // ==========================================================

  const gerarAutorizacaoPortaria =
    useCallback(
      async ({
        documentoMascarado = null,
        contextoDispositivo = null,
      } = {}) => {
        if (
          operacaoEmCursoRef.current
        ) {
          return null;
        }

        const retirante =
          state.retiranteSelecionado;

        const encomendaId =
          state.detalhe?.encomenda?.id ||
          state.encomendaSelecionadaId;

        if (
          !retirante
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              erroOperacao: {
                mensagem:
                  "Selecione quem está retirando a encomenda.",
                codigo:
                  "RETIRANTE_NAO_SELECIONADO",
              },
            })
          );

          return null;
        }

        if (
          !encomendaId
        ) {
          return null;
        }

        operacaoEmCursoRef.current =
          true;

        setState(
          (
            atual
          ) => ({
            ...atual,

            carregandoOperacao:
              true,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );

        try {
          const resposta =
            await iniciarRetiradaAdministrativa({
              encomendaId,

              tipoRetirante:
                retirante.tipo_retirante,

              retiranteNome:
                retirante.nome,

              retiranteUsuarioId:
                retirante.usuario_id,

              retirantePessoaId:
                retirante.pessoa_id,

              documentoMascarado,

              motivoCodigo:
                state.motivoAutorizacaoPortaria,

              justificativa:
                state.justificativaAutorizacaoPortaria,

              documentoValidado:
                state.documentoValidado,

              identidadeConfirmada:
                state.identidadeConfirmada,

              contextoDispositivo,
            });

          if (
            resposta?.ok ===
            false
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    mensagemErroOperacaoBackend(
                      resposta,
                      "Não foi possível gerar a autorização da Portaria."
                    ),

                  codigo:
                    resposta?.codigo ||
                    null,
                },
              })
            );

            return resposta;
          }

          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoOperacao:
                false,

              usandoAutorizacaoPortaria:
                true,

              retiradaId:
                resposta?.retirada_id ||
                null,

              resultadoRetirada:
                resposta?.resultado ||
                "INICIADA",

              metodoCredencial:
                resposta?.qr_payload
                  ? "QR"
                  : "TOKEN",

              tokenDigitado:
                resposta?.token ||
                "",

              qrPayload:
                resposta?.qr_payload ||
                null,

              credencialAdministrativa:
                resposta,

              credencialConfirmada:
                false,

              erroOperacao:
                null,

              mensagemOperacao:
                "Autorização da Portaria gerada. Confira a credencial antes da entrega.",
            })
          );

          return resposta;
        }
        catch (
          error
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoOperacao:
                false,

              erroOperacao:
                criarErroInterface(
                  error,
                  "Não foi possível gerar a autorização da Portaria."
                ),
            })
          );

          return null;
        }
        finally {
          operacaoEmCursoRef.current =
            false;
        }
      },
      [
        state.detalhe,
        state.documentoValidado,
        state.encomendaSelecionadaId,
        state.identidadeConfirmada,
        state.justificativaAutorizacaoPortaria,
        state.motivoAutorizacaoPortaria,
        state.retiranteSelecionado,
      ]
    );


  // ==========================================================
  // CONFIRMAR ENTREGA FÍSICA
  // ==========================================================

  const confirmarEntrega =
    useCallback(
      async ({
        totalVolumesEntregues,
        observacoesEntrega = null,
        assinaturaColetada = false,
        contextoDispositivo = null,
      } = {}) => {
        if (
          operacaoEmCursoRef.current
        ) {
          return null;
        }

        const encomendaId =
          state.detalhe?.encomenda?.id ||
          state.encomendaSelecionadaId;

        const retiradaId =
          state.retiradaId ||
          state.detalhe
            ?.retirada_atual
            ?.retirada_id;

        if (
          !retiradaId
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              erroOperacao: {
                mensagem:
                  "Não foi possível identificar a retirada.",
                codigo:
                  "RETIRADA_NAO_IDENTIFICADA",
              },
            })
          );

          return null;
        }

        if (
          !state.credencialConfirmada &&
          state.resultadoRetirada !==
            "VALIDADA" &&
          state.detalhe
            ?.retirada_atual
            ?.resultado !==
            "VALIDADA"
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              erroOperacao: {
                mensagem:
                  "Confirme a credencial antes de registrar a entrega.",
                codigo:
                  "CREDENCIAL_NAO_CONFIRMADA",
              },
            })
          );

          return null;
        }

        operacaoEmCursoRef.current =
          true;

        setState(
          (
            atual
          ) => ({
            ...atual,

            carregandoOperacao:
              true,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );

        try {
          const resposta =
            await concluirRetirada({
              retiradaId,

              totalVolumesEntregues,

              observacoesEntrega,

              assinaturaColetada,

              contextoDispositivo,
            });

          if (
            resposta?.ok ===
            false
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    mensagemErroOperacaoBackend(
                      resposta,
                      "Não foi possível confirmar a entrega."
                    ),

                  codigo:
                    resposta?.codigo ||
                    null,
                },
              })
            );

            return resposta;
          }

          let detalheAtualizado = null;

          if (encomendaId) {
            try {
              const respostaDetalhe =
                await obterDetalheEncomendaPortaria({
                  condominioId,
                  encomendaId,
                });

              if (
                respostaDetalhe &&
                respostaDetalhe.ok !== false
              ) {
                detalheAtualizado =
                  respostaDetalhe;
              }
            } catch {
              /*
              * A entrega já foi concluída no backend.
              * Uma falha ao atualizar a apresentação
              * não pode transformar a conclusão em erro.
              */
            }
          }

          setState(
            (
              atual
            ) => {
              const operacaoAtualizada =
                detalheAtualizado
                  ? extrairOperacaoDoDetalhe(
                      detalheAtualizado
                    )
                  : null;

              return {
                ...atual,

                carregandoOperacao:
                  false,

                detalhe:
                  detalheAtualizado ||
                  atual.detalhe,

                retiradaId:
                  operacaoAtualizada
                    ?.retiradaId ||
                  atual.retiradaId,

                resultadoRetirada:
                  operacaoAtualizada
                    ?.resultadoRetirada ||
                  resposta?.resultado_retirada ||
                  "CONCLUIDA",

                credencialConfirmada:
                  operacaoAtualizada
                    ? operacaoAtualizada
                        .credencialConfirmada
                    : true,

                erroOperacao:
                  null,

                mensagemOperacao:
                  "Entrega confirmada com sucesso.",
              };
            }
          );

          return resposta;
        }
        catch (
          error
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoOperacao:
                false,

              erroOperacao:
                criarErroInterface(
                  error,
                  "Não foi possível confirmar a entrega."
                ),
            })
          );

          return null;
        }
        finally {
          operacaoEmCursoRef.current =
            false;
        }
      },
      [
        condominioId,
        state.credencialConfirmada,
        state.detalhe,
        state.encomendaSelecionadaId,
        state.resultadoRetirada,
        state.retiradaId,
      ]
    );


  // ==========================================================
  // CANCELAR RETIRADA
  // ==========================================================

  const cancelarRetiradaAtual =
    useCallback(
      async ({
        motivo,
        contextoDispositivo = null,
      } = {}) => {
        if (
          operacaoEmCursoRef.current
        ) {
          return null;
        }

        const retiradaId =
          state.retiradaId ||
          state.detalhe
            ?.retirada_atual
            ?.retirada_id;

        if (
          !retiradaId
        ) {
          return null;
        }

        operacaoEmCursoRef.current =
          true;

        setState(
          (
            atual
          ) => ({
            ...atual,

            carregandoOperacao:
              true,

            erroOperacao:
              null,

            mensagemOperacao:
              null,
          })
        );

        try {
          const resposta =
            await cancelarRetirada({
              retiradaId,
              motivo,
              contextoDispositivo,
            });

          if (
            resposta?.ok ===
            false
          ) {
            setState(
              (
                atual
              ) => ({
                ...atual,

                carregandoOperacao:
                  false,

                erroOperacao: {
                  mensagem:
                    mensagemErroOperacaoBackend(
                      resposta,
                      "Não foi possível cancelar esta retirada."
                    ),

                  codigo:
                    resposta?.codigo ||
                    null,
                },
              })
            );

            return resposta;
          }

          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoOperacao:
                false,

              retiradaId:
                null,

              resultadoRetirada:
                resposta?.resultado ||
                "CANCELADA",

              credencialConfirmada:
                false,

              autorizacaoRetiradaId:
                null,

              erroOperacao:
                null,

              mensagemOperacao:
                "Retirada cancelada.",
            })
          );

          return resposta;
        }
        catch (
          error
        ) {
          setState(
            (
              atual
            ) => ({
              ...atual,

              carregandoOperacao:
                false,

              erroOperacao:
                criarErroInterface(
                  error,
                  "Não foi possível cancelar esta retirada."
                ),
            })
          );

          return null;
        }
        finally {
          operacaoEmCursoRef.current =
            false;
        }
      },
      [
        state.detalhe,
        state.retiradaId,
      ]
    );


  // ==========================================================
  // ESTADOS DERIVADOS
  // ==========================================================

  const possuiResultados =
    state.resultados.length >
    0;

  const quantidadeResultados =
    state.resultados.length;

  const possuiDetalhe =
    Boolean(
      state.detalhe
    );

  const carregando =
    state.carregandoBusca ||
    state.carregandoDetalhe ||
    state.carregandoOperacao;

  const podeBuscar =
    Boolean(
      String(
        state.termoBusca ||
        ""
      ).trim()
    ) &&
    !state.carregandoBusca;

  const tipoResultado =
    state.respostaBusca
      ?.tipo_resultado ||
    null;

  const nenhumResultado =
    state.respostaBusca
      ?.ok === true &&
    tipoResultado ===
      "NAO_ENCONTRADO";

  const resultadoEncomendaUnica =
    state.respostaBusca
      ?.ok === true &&
    tipoResultado ===
      "ENCOMENDA" &&
    Boolean(
      state.respostaBusca
        ?.encomenda
    );

  const chaveRetiranteSelecionado =
    obterChaveRetirante(
      state.retiranteSelecionado
    );

  const retiradaEmAndamento =
    Boolean(
      state.retiradaId ||
      state.detalhe
        ?.retirada_atual
        ?.retirada_id
    );

  const podeSelecionarRetirante =
    state.detalhe
      ?.acoes_permitidas
      ?.pode_selecionar_retirante ===
    true;

  const podeIniciarRetirada =
    state.detalhe
      ?.acoes_permitidas
      ?.pode_iniciar_retirada ===
    true;

  const podeContinuarRetirada =
    state.detalhe
      ?.acoes_permitidas
      ?.pode_continuar_retirada ===
    true;

  const podeValidarCredencial =
    state.detalhe
      ?.acoes_permitidas
      ?.pode_validar_credencial ===
      true ||
    state.resultadoRetirada ===
      "INICIADA";

  const podeConfirmarEntrega =
    state.detalhe
      ?.acoes_permitidas
      ?.pode_confirmar_entrega ===
      true ||
    state.resultadoRetirada ===
      "VALIDADA" ||
    state.credencialConfirmada ===
      true;


  // ==========================================================
  // RETORNO
  // ==========================================================

  return useMemo(
    () => ({
      modoBusca:
        state.modoBusca,

      termoBusca:
        state.termoBusca,

      carregandoBusca:
        state.carregandoBusca,

      carregandoDetalhe:
        state.carregandoDetalhe,

      carregandoOperacao:
        state.carregandoOperacao,

      carregando,

      erro:
        state.erro,

      erroOperacao:
        state.erroOperacao,

      mensagemOperacao:
        state.mensagemOperacao,

      respostaBusca:
        state.respostaBusca,

      tipoResultado,

      resultados:
        state.resultados,

      detalhe:
        state.detalhe,

      encomendaSelecionadaId:
        state.encomendaSelecionadaId,

      retiranteSelecionado:
        state.retiranteSelecionado,

      chaveRetiranteSelecionado,

      metodoCredencial:
        state.metodoCredencial,

      tokenDigitado:
        state.tokenDigitado,

      qrPayload:
        state.qrPayload,

      autorizacaoRetiradaId:
        state.autorizacaoRetiradaId,

      retiradaId:
        state.retiradaId,

      resultadoRetirada:
        state.resultadoRetirada,

      credencialConfirmada:
        state.credencialConfirmada,

      identidadeConfirmada:
        state.identidadeConfirmada,

      documentoValidado:
        state.documentoValidado,

      usandoAutorizacaoPortaria:
        state.usandoAutorizacaoPortaria,

      motivoAutorizacaoPortaria:
        state.motivoAutorizacaoPortaria,

      justificativaAutorizacaoPortaria:
        state.justificativaAutorizacaoPortaria,

      credencialAdministrativa:
        state.credencialAdministrativa,

      possuiResultados,
      quantidadeResultados,
      possuiDetalhe,
      podeBuscar,

      nenhumResultado,
      resultadoEncomendaUnica,

      retiradaEmAndamento,
      podeSelecionarRetirante,
      podeIniciarRetirada,
      podeContinuarRetirada,
      podeValidarCredencial,
      podeConfirmarEntrega,

      setModoBusca,
      setTermoBusca,

      selecionarRetirante,
      setMetodoCredencial,
      setTokenDigitado,
      setQrPayload,

      setIdentidadeConfirmada,
      setDocumentoValidado,

      setUsandoAutorizacaoPortaria,
      setMotivoAutorizacaoPortaria,
      setJustificativaAutorizacaoPortaria,

      buscar,
      abrirDetalhe,
      atualizarDetalhe,

      iniciarComToken,
      iniciarComQr,
      conferirCredencial,

      gerarAutorizacaoPortaria,

      confirmarEntrega,
      cancelarRetiradaAtual,

      limparErro,
      limparMensagemOperacao,
      limparResultados,
      fecharDetalhe,
      resetarFluxo,
    }),
    [
      state,

      carregando,
      tipoResultado,

      possuiResultados,
      quantidadeResultados,
      possuiDetalhe,
      podeBuscar,

      nenhumResultado,
      resultadoEncomendaUnica,

      chaveRetiranteSelecionado,

      retiradaEmAndamento,
      podeSelecionarRetirante,
      podeIniciarRetirada,
      podeContinuarRetirada,
      podeValidarCredencial,
      podeConfirmarEntrega,

      setModoBusca,
      setTermoBusca,

      selecionarRetirante,
      setMetodoCredencial,
      setTokenDigitado,
      setQrPayload,

      setIdentidadeConfirmada,
      setDocumentoValidado,

      setUsandoAutorizacaoPortaria,
      setMotivoAutorizacaoPortaria,
      setJustificativaAutorizacaoPortaria,

      buscar,
      abrirDetalhe,
      atualizarDetalhe,

      iniciarComToken,
      iniciarComQr,
      conferirCredencial,

      gerarAutorizacaoPortaria,

      confirmarEntrega,
      cancelarRetiradaAtual,

      limparErro,
      limparMensagemOperacao,
      limparResultados,
      fecharDetalhe,
      resetarFluxo,
    ]
  );
}