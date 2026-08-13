import {
  NOVO_RECEBIMENTO_STORAGE,
} from "../wizard/constants";


// ============================================================
// SISTEMA CHEGOU!
// RECEBIMENTO STORAGE SERVICE
//
// Responsabilidade:
// - persistência local do Wizard de Recebimento;
// - recuperação após fechamento/reload/falta de energia;
// - controle do recebimento ativo no dispositivo;
// - recuperação resiliente quando o ponteiro do localStorage
//   estiver ausente, antigo ou incoerente.
//
// NÃO:
// - acessa Supabase;
// - chama RPC;
// - define regra de negócio autoritativa;
// - decide autorização;
// - substitui auditoria oficial do backend.
// ============================================================


const {
  DB_NAME,
  DB_VERSION,
  STORE_RECEBIMENTOS,
  ACTIVE_RECEIPT_KEY,
} = NOVO_RECEBIMENTO_STORAGE;


// ============================================================
// STATUS CONHECIDOS LOCALMENTE
// ============================================================

const STATUS_LOCAL = Object.freeze({
  EM_ANDAMENTO:
    "EM_ANDAMENTO",

  CONCLUINDO:
    "CONCLUINDO",

  AGUARDANDO_SINCRONIZACAO:
    "AGUARDANDO_SINCRONIZACAO",

  ERRO:
    "ERRO",

  CONCLUIDO:
    "CONCLUIDO",
});


const SYNC_STATUS = Object.freeze({
  LOCAL:
    "LOCAL",

  SINCRONIZANDO:
    "SINCRONIZANDO",

  PENDENTE:
    "PENDENTE",

  ERRO:
    "ERRO",

  SINCRONIZADO:
    "SINCRONIZADO",
});


// ============================================================
// SUPORTE
// ============================================================

function possuiIndexedDB() {
  return (
    typeof window !==
      "undefined" &&
    typeof window.indexedDB !==
      "undefined"
  );
}


function criarErroStorage(
  message,
  cause = null
) {
  const error =
    new Error(
      message
    );


  if (cause) {
    error.cause =
      cause;
  }


  return error;
}


function obterTimestamp(
  valor
) {
  if (!valor) {
    return 0;
  }


  const timestamp =
    new Date(
      valor
    ).getTime();


  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;
}


// ============================================================
// PRIORIDADE DE RECUPERAÇÃO
//
// Quanto maior, mais importante recuperar.
//
// A ordem é intencional:
//
// 1. conclusão pendente com Pré já criado;
// 2. conclusão pendente ainda na Fase 1;
// 3. aguardando sincronização;
// 4. concluindo;
// 5. erro recuperável;
// 6. rascunho em andamento.
//
// Um recebimento CONCLUÍDO não deve ser reaberto.
// ============================================================

function obterPrioridadeRecuperacao(
  recebimento
) {
  if (!recebimento) {
    return -1;
  }


  if (
    recebimento.statusLocal ===
    STATUS_LOCAL.CONCLUIDO
  ) {
    return -1;
  }


  if (
    recebimento
      .conclusaoPendente &&
    recebimento
      .preRecebimentoId
  ) {
    return 600;
  }


  if (
    recebimento
      .conclusaoPendente &&
    recebimento
      .payloadConclusao &&
    recebimento
      .chaveIdempotencia
  ) {
    return 550;
  }


  if (
    recebimento.statusLocal ===
      STATUS_LOCAL
        .AGUARDANDO_SINCRONIZACAO ||
    recebimento.syncStatus ===
      SYNC_STATUS.PENDENTE
  ) {
    return 500;
  }


  if (
    recebimento.statusLocal ===
      STATUS_LOCAL.CONCLUINDO ||
    recebimento.syncStatus ===
      SYNC_STATUS.SINCRONIZANDO
  ) {
    return 450;
  }


  if (
    recebimento.statusLocal ===
      STATUS_LOCAL.ERRO ||
    recebimento.syncStatus ===
      SYNC_STATUS.ERRO
  ) {
    return 300;
  }


  if (
    recebimento.statusLocal ===
      STATUS_LOCAL.EM_ANDAMENTO
  ) {
    return 200;
  }


  return 100;
}


function compararRecebimentosParaRecuperacao(
  a,
  b
) {
  const prioridadeA =
    obterPrioridadeRecuperacao(
      a
    );

  const prioridadeB =
    obterPrioridadeRecuperacao(
      b
    );


  if (
    prioridadeA !==
    prioridadeB
  ) {
    return (
      prioridadeB -
      prioridadeA
    );
  }


  const atualizadoA =
    obterTimestamp(
      a?.atualizadoEm ||
      a?.persistidoLocalmenteEm ||
      a?.abertoEm
    );


  const atualizadoB =
    obterTimestamp(
      b?.atualizadoEm ||
      b?.persistidoLocalmenteEm ||
      b?.abertoEm
    );


  return (
    atualizadoB -
    atualizadoA
  );
}


// ============================================================
// ABERTURA DO BANCO
// ============================================================

function abrirBanco() {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      if (
        !possuiIndexedDB()
      ) {
        reject(
          criarErroStorage(
            "IndexedDB não está disponível neste dispositivo."
          )
        );

        return;
      }


      const request =
        window.indexedDB.open(
          DB_NAME,
          DB_VERSION
        );


      request.onupgradeneeded =
        (event) => {
          const db =
            event.target.result;


          if (
            !db.objectStoreNames
              .contains(
                STORE_RECEBIMENTOS
              )
          ) {
            const store =
              db.createObjectStore(
                STORE_RECEBIMENTOS,
                {
                  keyPath:
                    "clientReceiptId",
                }
              );


            store.createIndex(
              "statusLocal",
              "statusLocal",
              {
                unique:
                  false,
              }
            );


            store.createIndex(
              "atualizadoEm",
              "atualizadoEm",
              {
                unique:
                  false,
              }
            );
          }
        };


      request.onsuccess =
        () => {
          resolve(
            request.result
          );
        };


      request.onerror =
        () => {
          reject(
            criarErroStorage(
              "Não foi possível abrir o armazenamento local do recebimento.",
              request.error
            )
          );
        };


      request.onblocked =
        () => {
          reject(
            criarErroStorage(
              "O armazenamento local está temporariamente bloqueado por outra aba do sistema."
            )
          );
        };
    }
  );
}


// ============================================================
// TRANSAÇÃO GENÉRICA
// ============================================================

async function executarTransacao(
  mode,
  executor
) {
  const db =
    await abrirBanco();


  try {
    return await new Promise(
      (
        resolve,
        reject
      ) => {
        const transaction =
          db.transaction(
            STORE_RECEBIMENTOS,
            mode
          );


        const store =
          transaction.objectStore(
            STORE_RECEBIMENTOS
          );


        let resultado;


        transaction.oncomplete =
          () => {
            resolve(
              resultado
            );
          };


        transaction.onerror =
          () => {
            reject(
              criarErroStorage(
                "Falha ao acessar o armazenamento local do recebimento.",
                transaction.error
              )
            );
          };


        transaction.onabort =
          () => {
            reject(
              criarErroStorage(
                "A operação no armazenamento local foi interrompida.",
                transaction.error
              )
            );
          };


        try {
          resultado =
            executor(
              store,
              transaction
            );
        } catch (error) {
          transaction.abort();

          reject(
            error
          );
        }
      }
    );
  } finally {
    db.close();
  }
}


// ============================================================
// LOCALSTORAGE
//
// IndexedDB armazena os dados completos.
//
// localStorage guarda apenas um ponteiro de conveniência.
// Ele NÃO é mais a fonte única de verdade para recuperação.
// ============================================================

function podeUsarLocalStorage() {
  return (
    typeof window !==
      "undefined" &&
    typeof window.localStorage !==
      "undefined"
  );
}


function definirRecebimentoAtivoLocal(
  clientReceiptId
) {
  if (
    !podeUsarLocalStorage()
  ) {
    return;
  }


  if (
    !clientReceiptId
  ) {
    window.localStorage.removeItem(
      ACTIVE_RECEIPT_KEY
    );

    return;
  }


  window.localStorage.setItem(
    ACTIVE_RECEIPT_KEY,
    clientReceiptId
  );
}


export function obterRecebimentoAtivoId() {
  if (
    !podeUsarLocalStorage()
  ) {
    return null;
  }


  return (
    window.localStorage.getItem(
      ACTIVE_RECEIPT_KEY
    )
  );
}


export function limparRecebimentoAtivoId() {
  definirRecebimentoAtivoLocal(
    null
  );
}


// ============================================================
// SALVAR RECEBIMENTO
// ============================================================

export async function salvarRecebimentoLocal(
  recebimento
) {
  if (
    !recebimento
      ?.clientReceiptId
  ) {
    throw criarErroStorage(
      "O recebimento local não possui identificador."
    );
  }


  const agora =
    new Date()
      .toISOString();


  const registro = {
    ...recebimento,

    /*
     * atualizadoEm representa alteração funcional
     * do estado.
     *
     * Se não vier preenchido, usamos agora.
     */
    atualizadoEm:
      recebimento.atualizadoEm ||
      agora,

    /*
     * persistidoLocalmenteEm sempre muda.
     *
     * Serve para diagnóstico e fallback de ordenação.
     */
    persistidoLocalmenteEm:
      agora,
  };


  await executarTransacao(
    "readwrite",
    (store) => {
      store.put(
        registro
      );
    }
  );


  /*
   * O ponteiro continua sendo atualizado,
   * mas não é mais fonte exclusiva de recuperação.
   */
  definirRecebimentoAtivoLocal(
    registro.clientReceiptId
  );


  return registro;
}


// ============================================================
// LER RECEBIMENTO POR ID
// ============================================================

export async function obterRecebimentoLocal(
  clientReceiptId
) {
  if (
    !clientReceiptId
  ) {
    return null;
  }


  const db =
    await abrirBanco();


  try {
    return await new Promise(
      (
        resolve,
        reject
      ) => {
        const transaction =
          db.transaction(
            STORE_RECEBIMENTOS,
            "readonly"
          );


        const store =
          transaction.objectStore(
            STORE_RECEBIMENTOS
          );


        const request =
          store.get(
            clientReceiptId
          );


        request.onsuccess =
          () => {
            resolve(
              request.result ||
              null
            );
          };


        request.onerror =
          () => {
            reject(
              criarErroStorage(
                "Não foi possível recuperar o recebimento local.",
                request.error
              )
            );
          };
      }
    );
  } finally {
    db.close();
  }
}


// ============================================================
// LISTAR TODOS OS RECEBIMENTOS LOCAIS
// ============================================================

export async function listarRecebimentosLocais() {
  const db =
    await abrirBanco();


  try {
    return await new Promise(
      (
        resolve,
        reject
      ) => {
        const transaction =
          db.transaction(
            STORE_RECEBIMENTOS,
            "readonly"
          );


        const store =
          transaction.objectStore(
            STORE_RECEBIMENTOS
          );


        const request =
          store.getAll();


        request.onsuccess =
          () => {
            const registros =
              Array.isArray(
                request.result
              )
                ? request.result
                : [];


            registros.sort(
              (
                a,
                b
              ) => {
                const dataA =
                  obterTimestamp(
                    a?.atualizadoEm ||
                    a?.persistidoLocalmenteEm ||
                    a?.abertoEm
                  );


                const dataB =
                  obterTimestamp(
                    b?.atualizadoEm ||
                    b?.persistidoLocalmenteEm ||
                    b?.abertoEm
                  );


                return (
                  dataB -
                  dataA
                );
              }
            );


            resolve(
              registros
            );
          };


        request.onerror =
          () => {
            reject(
              criarErroStorage(
                "Não foi possível listar os recebimentos locais.",
                request.error
              )
            );
          };
      }
    );
  } finally {
    db.close();
  }
}


// ============================================================
// ESCOLHER RECEBIMENTO RECUPERÁVEL
//
// Fonte de verdade:
// IndexedDB.
//
// localStorage:
// somente preferência auxiliar.
//
// Uma conclusão pendente sempre ganha de um simples
// rascunho EM_ANDAMENTO.
// ============================================================

function escolherRecebimentoParaRecuperacao({
  registros,
  clientReceiptIdPreferencial = null,
}) {
  const candidatos =
    (
      registros ||
      []
    )
      .filter(
        (recebimento) =>
          obterPrioridadeRecuperacao(
            recebimento
          ) >= 0
      )
      .sort(
        compararRecebimentosParaRecuperacao
      );


  if (
    candidatos.length ===
    0
  ) {
    return null;
  }


  const principal =
    candidatos[0];


  /*
   * Se existe uma conclusão pendente/concluindo,
   * ela deve prevalecer mesmo que o localStorage
   * esteja apontando para outro rascunho.
   */
  if (
    obterPrioridadeRecuperacao(
      principal
    ) >= 400
  ) {
    return principal;
  }


  /*
   * Sem operação crítica pendente,
   * respeitamos o ponteiro quando ele ainda
   * aponta para um registro recuperável.
   */
  if (
    clientReceiptIdPreferencial
  ) {
    const preferencial =
      candidatos.find(
        (recebimento) =>
          recebimento
            .clientReceiptId ===
          clientReceiptIdPreferencial
      );


    if (
      preferencial
    ) {
      return preferencial;
    }
  }


  /*
   * Ponteiro ausente/inválido:
   * recupera o candidato mais recente.
   */
  return principal;
}


// ============================================================
// RECUPERAR RECEBIMENTO ATIVO
//
// IMPORTANTE:
//
// Antes:
// localStorage → ID → IndexedDB.
//
// Agora:
// IndexedDB → avalia todos → prioriza operação crítica
// → usa localStorage apenas como preferência.
// ============================================================

export async function obterRecebimentoAtivoLocal() {
  const clientReceiptIdPreferencial =
    obterRecebimentoAtivoId();


  const registros =
    await listarRecebimentosLocais();


  if (
    registros.length ===
    0
  ) {
    limparRecebimentoAtivoId();

    return null;
  }


  const recebimento =
    escolherRecebimentoParaRecuperacao({
      registros,
      clientReceiptIdPreferencial,
    });


  if (
    !recebimento
  ) {
    limparRecebimentoAtivoId();

    return null;
  }


  /*
   * Repara automaticamente um ponteiro antigo,
   * ausente ou sobrescrito por outra aba.
   */
  if (
    clientReceiptIdPreferencial !==
    recebimento.clientReceiptId
  ) {
    definirRecebimentoAtivoLocal(
      recebimento.clientReceiptId
    );
  }


  return recebimento;
}


// ============================================================
// EXISTE RECEBIMENTO ATIVO?
// ============================================================

export async function possuiRecebimentoAtivoLocal() {
  const recebimento =
    await obterRecebimentoAtivoLocal();


  return Boolean(
    recebimento
  );
}


// ============================================================
// REMOVER UM RECEBIMENTO
// ============================================================

export async function removerRecebimentoLocal(
  clientReceiptId
) {
  if (
    !clientReceiptId
  ) {
    return;
  }


  await executarTransacao(
    "readwrite",
    (store) => {
      store.delete(
        clientReceiptId
      );
    }
  );


  const ativoAtual =
    obterRecebimentoAtivoId();


  if (
    ativoAtual ===
    clientReceiptId
  ) {
    /*
     * Não apontamos imediatamente para outro
     * registro aqui.
     *
     * Na próxima recuperação,
     * obterRecebimentoAtivoLocal() recalculará
     * o melhor candidato.
     */
    limparRecebimentoAtivoId();
  }
}


// ============================================================
// LIMPAR RECEBIMENTO APÓS SUCESSO OFICIAL
//
// Só utilizar depois que o backend confirmar
// conclusão inequívoca do lote.
//
// Nunca apagar antes da Fase 2 confirmada.
// ============================================================

export async function concluirPersistenciaLocal(
  clientReceiptId
) {
  await removerRecebimentoLocal(
    clientReceiptId
  );
}


// ============================================================
// RECEBIMENTOS PENDENTES DE SINCRONIZAÇÃO
// ============================================================

export async function listarRecebimentosPendentesLocal() {
  const recebimentos =
    await listarRecebimentosLocais();


  return recebimentos.filter(
    (recebimento) =>
      Boolean(
        recebimento
          ?.conclusaoPendente ||

        recebimento
          ?.preRecebimentoId &&

        recebimento
          ?.faseConclusao ===
          "PRE_RECEBIMENTO_PROCESSADO" ||

        recebimento
          ?.syncStatus ===
          SYNC_STATUS.PENDENTE ||

        recebimento
          ?.statusLocal ===
          STATUS_LOCAL
            .AGUARDANDO_SINCRONIZACAO
      )
  );
}


// ============================================================
// SUBSTITUIÇÃO ATÔMICA DO ESTADO LOCAL
//
// put() substitui integralmente o objeto daquele
// clientReceiptId.
//
// Evita merge parcial entre versões diferentes.
// ============================================================

export async function substituirRecebimentoLocal(
  recebimento
) {
  return salvarRecebimentoLocal(
    recebimento
  );
}


// ============================================================
// DIAGNÓSTICO DE RECUPERAÇÃO
//
// Útil para homologação e suporte.
//
// Não altera IndexedDB.
// ============================================================

export async function diagnosticarRecebimentosLocais() {
  const registros =
    await listarRecebimentosLocais();


  const ativoId =
    obterRecebimentoAtivoId();


  return {
    origem:
      typeof window !==
      "undefined"
        ? window.location.origin
        : null,

    activeReceiptId:
      ativoId,

    total:
      registros.length,

    registros:
      registros.map(
        (recebimento) => ({
          clientReceiptId:
            recebimento
              .clientReceiptId,

          statusLocal:
            recebimento
              .statusLocal ||
            null,

          syncStatus:
            recebimento
              .syncStatus ||
            null,

          conclusaoPendente:
            Boolean(
              recebimento
                .conclusaoPendente
            ),

          preRecebimentoId:
            recebimento
              .preRecebimentoId ||
            null,

          faseConclusao:
            recebimento
              .faseConclusao ||
            null,

          chaveIdempotencia:
            recebimento
              .chaveIdempotencia ||
            null,

          possuiPayloadConclusao:
            Boolean(
              recebimento
                .payloadConclusao
            ),

          abertoEm:
            recebimento
              .abertoEm ||
            null,

          atualizadoEm:
            recebimento
              .atualizadoEm ||
            null,

          persistidoLocalmenteEm:
            recebimento
              .persistidoLocalmenteEm ||
            null,

          prioridadeRecuperacao:
            obterPrioridadeRecuperacao(
              recebimento
            ),
        })
      ),
  };
}


// ============================================================
// HEALTH CHECK
// ============================================================

export async function verificarStorageRecebimento() {
  try {
    const db =
      await abrirBanco();


    db.close();


    return {
      ok:
        true,

      indexedDB:
        true,

      origem:
        typeof window !==
        "undefined"
          ? window.location.origin
          : null,

      activeReceiptId:
        obterRecebimentoAtivoId(),
    };
  } catch (error) {
    return {
      ok:
        false,

      indexedDB:
        false,

      error,
    };
  }
}