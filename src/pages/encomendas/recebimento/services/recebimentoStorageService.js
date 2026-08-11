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
// - controle do recebimento ativo no dispositivo.
//
// NÃO:
// - acessa Supabase;
// - chama RPC;
// - define regra de negócio;
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
// SUPORTE
// ============================================================

function possuiIndexedDB() {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined"
  );
}


function criarErroStorage(message, cause = null) {
  const error = new Error(message);

  if (cause) {
    error.cause = cause;
  }

  return error;
}


// ============================================================
// ABERTURA DO BANCO
// ============================================================

function abrirBanco() {
  return new Promise((resolve, reject) => {
    if (!possuiIndexedDB()) {
      reject(
        criarErroStorage(
          "IndexedDB não está disponível neste dispositivo."
        )
      );

      return;
    }

    const request = window.indexedDB.open(
      DB_NAME,
      DB_VERSION
    );


    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (
        !db.objectStoreNames.contains(
          STORE_RECEBIMENTOS
        )
      ) {
        const store = db.createObjectStore(
          STORE_RECEBIMENTOS,
          {
            keyPath: "clientReceiptId",
          }
        );

        store.createIndex(
          "statusLocal",
          "statusLocal",
          {
            unique: false,
          }
        );

        store.createIndex(
          "atualizadoEm",
          "atualizadoEm",
          {
            unique: false,
          }
        );
      }
    };


    request.onsuccess = () => {
      resolve(request.result);
    };


    request.onerror = () => {
      reject(
        criarErroStorage(
          "Não foi possível abrir o armazenamento local do recebimento.",
          request.error
        )
      );
    };


    request.onblocked = () => {
      reject(
        criarErroStorage(
          "O armazenamento local está temporariamente bloqueado por outra aba do sistema."
        )
      );
    };
  });
}


// ============================================================
// TRANSAÇÃO GENÉRICA
// ============================================================

async function executarTransacao(
  mode,
  executor
) {
  const db = await abrirBanco();

  try {
    return await new Promise(
      (resolve, reject) => {
        const transaction = db.transaction(
          STORE_RECEBIMENTOS,
          mode
        );

        const store =
          transaction.objectStore(
            STORE_RECEBIMENTOS
          );

        let resultado;


        transaction.oncomplete = () => {
          resolve(resultado);
        };


        transaction.onerror = () => {
          reject(
            criarErroStorage(
              "Falha ao acessar o armazenamento local do recebimento.",
              transaction.error
            )
          );
        };


        transaction.onabort = () => {
          reject(
            criarErroStorage(
              "A operação no armazenamento local foi interrompida.",
              transaction.error
            )
          );
        };


        try {
          resultado = executor(
            store,
            transaction
          );
        } catch (error) {
          transaction.abort();

          reject(error);
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
// localStorage guarda APENAS o ID do recebimento ativo.
//
// Isso permite descobrir rapidamente qual rascunho deve
// ser recuperado sem duplicar o conteúdo do recebimento.
// ============================================================

function podeUsarLocalStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}


function definirRecebimentoAtivoLocal(
  clientReceiptId
) {
  if (!podeUsarLocalStorage()) {
    return;
  }

  if (!clientReceiptId) {
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
  if (!podeUsarLocalStorage()) {
    return null;
  }

  return window.localStorage.getItem(
    ACTIVE_RECEIPT_KEY
  );
}


export function limparRecebimentoAtivoId() {
  definirRecebimentoAtivoLocal(null);
}


// ============================================================
// SALVAR RECEBIMENTO
// ============================================================

export async function salvarRecebimentoLocal(
  recebimento
) {
  if (!recebimento?.clientReceiptId) {
    throw criarErroStorage(
      "O recebimento local não possui identificador."
    );
  }

  const agora = new Date().toISOString();

  const registro = {
    ...recebimento,

    atualizadoEm:
      recebimento.atualizadoEm || agora,

    persistidoLocalmenteEm: agora,
  };


  await executarTransacao(
    "readwrite",
    (store) => {
      store.put(registro);
    }
  );


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
  if (!clientReceiptId) {
    return null;
  }

  const db = await abrirBanco();

  try {
    return await new Promise(
      (resolve, reject) => {
        const transaction = db.transaction(
          STORE_RECEBIMENTOS,
          "readonly"
        );

        const store =
          transaction.objectStore(
            STORE_RECEBIMENTOS
          );

        const request = store.get(
          clientReceiptId
        );


        request.onsuccess = () => {
          resolve(request.result || null);
        };


        request.onerror = () => {
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
// RECUPERAR RECEBIMENTO ATIVO
// ============================================================

export async function obterRecebimentoAtivoLocal() {
  const clientReceiptId =
    obterRecebimentoAtivoId();

  if (!clientReceiptId) {
    return null;
  }

  const recebimento =
    await obterRecebimentoLocal(
      clientReceiptId
    );


  if (!recebimento) {
    limparRecebimentoAtivoId();

    return null;
  }


  return recebimento;
}


// ============================================================
// EXISTE RECEBIMENTO ATIVO?
// ============================================================

export async function possuiRecebimentoAtivoLocal() {
  const recebimento =
    await obterRecebimentoAtivoLocal();

  return Boolean(recebimento);
}


// ============================================================
// REMOVER UM RECEBIMENTO
// ============================================================

export async function removerRecebimentoLocal(
  clientReceiptId
) {
  if (!clientReceiptId) {
    return;
  }


  await executarTransacao(
    "readwrite",
    (store) => {
      store.delete(clientReceiptId);
    }
  );


  const ativoAtual =
    obterRecebimentoAtivoId();


  if (ativoAtual === clientReceiptId) {
    limparRecebimentoAtivoId();
  }
}


// ============================================================
// LIMPAR RECEBIMENTO APÓS SUCESSO OFICIAL
//
// Só deverá ser utilizado depois que o backend confirmar
// que o processamento foi concluído com sucesso.
//
// Nunca apagar o rascunho antes da confirmação da RPC.
// ============================================================

export async function concluirPersistenciaLocal(
  clientReceiptId
) {
  await removerRecebimentoLocal(
    clientReceiptId
  );
}


// ============================================================
// LISTAR TODOS OS RECEBIMENTOS LOCAIS
//
// Útil futuramente para:
// - recuperação;
// - diagnóstico;
// - sincronização pendente;
// - múltiplos recebimentos interrompidos.
//
// A UI atual poderá trabalhar somente com um ativo.
// ============================================================

export async function listarRecebimentosLocais() {
  const db = await abrirBanco();

  try {
    return await new Promise(
      (resolve, reject) => {
        const transaction = db.transaction(
          STORE_RECEBIMENTOS,
          "readonly"
        );

        const store =
          transaction.objectStore(
            STORE_RECEBIMENTOS
          );

        const request = store.getAll();


        request.onsuccess = () => {
          const registros =
            Array.isArray(request.result)
              ? request.result
              : [];

          registros.sort((a, b) => {
            const dataA =
              new Date(
                a?.atualizadoEm || 0
              ).getTime();

            const dataB =
              new Date(
                b?.atualizadoEm || 0
              ).getTime();

            return dataB - dataA;
          });


          resolve(registros);
        };


        request.onerror = () => {
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
// RECEBIMENTOS PENDENTES DE SINCRONIZAÇÃO
// ============================================================

export async function listarRecebimentosPendentesLocal() {
  const recebimentos =
    await listarRecebimentosLocais();

  return recebimentos.filter(
    (recebimento) =>
      recebimento?.syncStatus ===
        "PENDENTE" ||
      recebimento?.statusLocal ===
        "AGUARDANDO_SINCRONIZACAO"
  );
}


// ============================================================
// SUBSTITUIÇÃO ATÔMICA DO ESTADO LOCAL
//
// Atualmente usa put(), que substitui integralmente o objeto
// daquele clientReceiptId.
//
// Isso evita merge parcial de versões diferentes do Wizard.
// ============================================================

export async function substituirRecebimentoLocal(
  recebimento
) {
  return salvarRecebimentoLocal(
    recebimento
  );
}


// ============================================================
// HEALTH CHECK
// ============================================================

export async function verificarStorageRecebimento() {
  try {
    const db = await abrirBanco();

    db.close();

    return {
      ok: true,
      indexedDB: true,
    };
  } catch (error) {
    return {
      ok: false,
      indexedDB: false,
      error,
    };
  }
}