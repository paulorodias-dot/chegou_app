/**
 * Sistema Chegou! — Version Manager Service
 *
 * Responsabilidades:
 * - consultar o manifesto público /version.json;
 * - validar e normalizar os dados da release;
 * - comparar a release publicada com a release reconhecida;
 * - verificar se a atualização se aplica ao módulo atual;
 * - controlar o adiamento apenas durante a sessão;
 * - localizar um Service Worker aguardando ativação;
 * - autorizar a ativação controlada do Service Worker;
 * - proteger a aplicação contra recarregamentos duplicados;
 * - registrar a confirmação "Sistema atualizado" após o reload.
 *
 * Este serviço não possui dependência do React.
 */

const VERSION_MANIFEST_URL = "/version.json";

const STORAGE_PREFIX = "chegou:version-manager";

const STORAGE_RELEASE_GLOBAL =
  `${STORAGE_PREFIX}:release:global`;

const STORAGE_RELEASE_MODULO_PREFIX =
  `${STORAGE_PREFIX}:release:module:`;

const SESSION_ADIAMENTO_PREFIX =
  `${STORAGE_PREFIX}:deferred:`;

const SESSION_ATUALIZACAO_EM_ANDAMENTO =
  `${STORAGE_PREFIX}:updating`;

const SESSION_ATUALIZACAO_CONCLUIDA =
  `${STORAGE_PREFIX}:updated`;

const EVENTO_SW_REGISTRADO =
  "chegou:service-worker-registered";

const EVENTO_SW_ATUALIZACAO =
  "chegou:service-worker-update";

const EVENTO_SW_CONTROLADOR_ALTERADO =
  "chegou:service-worker-controller-changed";

const ESCOPO_GLOBAL = "GLOBAL";
const ESCOPO_MODULO = "MODULE";

const STATUS_AVALIACAO = Object.freeze({
  INDISPONIVEL: "INDISPONIVEL",
  REFERENCIA_INICIAL_REGISTRADA:
    "REFERENCIA_INICIAL_REGISTRADA",
  SEM_ATUALIZACAO: "SEM_ATUALIZACAO",
  NAO_APLICAVEL: "NAO_APLICAVEL",
  ADIADA_NA_SESSAO: "ADIADA_NA_SESSAO",
  ATUALIZACAO_DISPONIVEL:
    "ATUALIZACAO_DISPONIVEL",
});

/**
 * Retorna true quando o código está sendo executado no navegador.
 */
function estaNoNavegador() {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined"
  );
}

/**
 * Normaliza textos recebidos do version.json.
 */
function normalizarTexto(valor, fallback = "") {
  if (typeof valor !== "string") {
    return fallback;
  }

  const texto = valor.trim();

  return texto || fallback;
}

/**
 * Normaliza o identificador do módulo.
 *
 * Exemplos:
 * - master
 * - admin_logistica
 * - funcionario
 * - morador
 * - parceiro
 * - fornecedor
 *
 * A função é genérica e aceita futuros módulos.
 */
export function normalizarModulo(modulo) {
  return normalizarTexto(modulo)
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Normaliza a lista de módulos do manifesto.
 */
function normalizarModulos(modulos) {
  if (!Array.isArray(modulos)) {
    return [];
  }

  return [
    ...new Set(
      modulos
        .map(normalizarModulo)
        .filter(Boolean)
    ),
  ];
}

/**
 * Normaliza a lista pública de novidades da versão.
 *
 * Regras:
 * - aceita somente array;
 * - mantém somente textos válidos;
 * - remove espaços excedentes;
 * - remove itens duplicados;
 * - limita a quantidade para evitar conteúdo excessivo na interface;
 * - nunca aceita objetos ou conteúdo técnico arbitrário.
 */
function normalizarHighlights(highlights) {
  if (!Array.isArray(highlights)) {
    return [];
  }

  return [
    ...new Set(
      highlights
        .filter((item) => typeof item === "string")
        .map((item) => item.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .slice(0, 10)
    ),
  ];
}

/**
 * Normaliza o escopo informado pelo manifesto.
 */
function normalizarEscopo(scope) {
  const escopo = normalizarTexto(
    scope,
    ESCOPO_GLOBAL
  ).toUpperCase();

  if (escopo === ESCOPO_MODULO) {
    return ESCOPO_MODULO;
  }

  return ESCOPO_GLOBAL;
}

/**
 * Converte o valor mandatory para boolean.
 */
function normalizarObrigatoriedade(valor) {
  return valor === true;
}

/**
 * Normaliza o manifesto recebido de /version.json.
 */
export function normalizarManifestoVersao(dados) {
  if (!dados || typeof dados !== "object") {
    throw new Error(
      "O manifesto de versão possui formato inválido."
    );
  }

  const manifesto = {
    schemaVersion: Number(dados.schemaVersion),

    releaseId: normalizarTexto(
      dados.releaseId
    ),

    appVersion: normalizarTexto(
      dados.appVersion
    ),

    scope: normalizarEscopo(
      dados.scope
    ),

    modules: normalizarModulos(
      dados.modules
    ),

    mandatory: normalizarObrigatoriedade(
      dados.mandatory
    ),

    publishedAt: normalizarTexto(
      dados.publishedAt
    ),

    title: normalizarTexto(
      dados.title,
      "Nova versão disponível"
    ),

    message: normalizarTexto(
      dados.message,
      "Uma nova versão do Sistema Chegou! está disponível."
    ),

    highlights: normalizarHighlights(
      dados.highlights
    ),
  };

  validarManifestoVersao(manifesto);

  return manifesto;
}

/**
 * Valida os campos mínimos necessários.
 */
export function validarManifestoVersao(
  manifesto
) {
  if (
    !Number.isInteger(
      manifesto.schemaVersion
    ) ||
    manifesto.schemaVersion < 1
  ) {
    throw new Error(
      "schemaVersion inválido no version.json."
    );
  }

  if (!manifesto.releaseId) {
    throw new Error(
      "releaseId não informado no version.json."
    );
  }

  if (!manifesto.appVersion) {
    throw new Error(
      "appVersion não informado no version.json."
    );
  }

  if (
    manifesto.scope === ESCOPO_MODULO &&
    manifesto.modules.length === 0
  ) {
    throw new Error(
      "Uma atualização com escopo MODULE deve informar ao menos um módulo."
    );
  }

  return true;
}

/**
 * Consulta o manifesto público de versão.
 *
 * O parâmetro de tempo e o cache: "no-store" impedem que
 * o navegador reutilize uma cópia antiga do version.json.
 */
export async function obterVersaoPublicada() {
  const separador =
    VERSION_MANIFEST_URL.includes("?")
      ? "&"
      : "?";

  const url =
    `${VERSION_MANIFEST_URL}` +
    `${separador}t=${Date.now()}`;

  const resposta = await fetch(url, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Cache-Control":
        "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  });

  if (!resposta.ok) {
    throw new Error(
      `Não foi possível consultar o version.json. HTTP ${resposta.status}.`
    );
  }

  const dados = await resposta.json();

  return normalizarManifestoVersao(dados);
}

/**
 * Converte um releaseId no padrão AAAA.MM.DD.NNN
 * para uma sequência numérica comparável.
 */
function converterReleaseIdPadrao(
  releaseId
) {
  const valor = normalizarTexto(releaseId);

  const correspondencia = valor.match(
    /^(\d{4})\.(\d{2})\.(\d{2})\.(\d{3,})$/
  );

  if (!correspondencia) {
    return null;
  }

  const [, ano, mes, dia, sequencia] =
    correspondencia;

  return [
    Number(ano),
    Number(mes),
    Number(dia),
    Number(sequencia),
  ];
}

/**
 * Compara dois releaseIds.
 *
 * Retorno:
 * - 1: releaseA é mais recente;
 * - 0: são iguais;
 * - -1: releaseB é mais recente.
 */
export function compararReleaseIds(
  releaseA,
  releaseB
) {
  const valorA = normalizarTexto(releaseA);
  const valorB = normalizarTexto(releaseB);

  if (valorA === valorB) {
    return 0;
  }

  if (!valorA && valorB) {
    return -1;
  }

  if (valorA && !valorB) {
    return 1;
  }

  const partesA =
    converterReleaseIdPadrao(valorA);

  const partesB =
    converterReleaseIdPadrao(valorB);

  if (partesA && partesB) {
    for (
      let indice = 0;
      indice < partesA.length;
      indice += 1
    ) {
      if (partesA[indice] > partesB[indice]) {
        return 1;
      }

      if (partesA[indice] < partesB[indice]) {
        return -1;
      }
    }

    return 0;
  }

  return valorA.localeCompare(valorB);
}

/**
 * Retorna true quando a release publicada é diferente
 * e mais recente que a release reconhecida.
 */
export function existeNovaRelease(
  releasePublicada,
  releaseReconhecida
) {
  if (!releaseReconhecida) {
    return false;
  }

  return (
    compararReleaseIds(
      releasePublicada,
      releaseReconhecida
    ) > 0
  );
}

/**
 * Verifica se a atualização se aplica ao módulo atual.
 */
export function atualizacaoAplicaAoModulo(
  manifesto,
  moduloAtual
) {
  if (!manifesto) {
    return false;
  }

  if (manifesto.scope === ESCOPO_GLOBAL) {
    return true;
  }

  const moduloNormalizado =
    normalizarModulo(moduloAtual);

  if (!moduloNormalizado) {
    return false;
  }

  return manifesto.modules.includes(
    moduloNormalizado
  );
}

/**
 * Cria a chave local da versão reconhecida
 * para um módulo específico.
 */
function obterChaveReleaseModulo(
  moduloAtual
) {
  const modulo =
    normalizarModulo(moduloAtual);

  if (!modulo) {
    return null;
  }

  return (
    STORAGE_RELEASE_MODULO_PREFIX +
    modulo
  );
}

/**
 * Lê uma release salva no localStorage.
 */
function lerReleaseLocal(chave) {
  if (!estaNoNavegador() || !chave) {
    return null;
  }

  try {
    return normalizarTexto(
      window.localStorage.getItem(chave)
    ) || null;
  } catch (error) {
    console.warn(
      "[Sistema Chegou!] Não foi possível ler a versão local:",
      error
    );

    return null;
  }
}

/**
 * Salva uma release no localStorage.
 */
function salvarReleaseLocal(
  chave,
  releaseId
) {
  if (
    !estaNoNavegador() ||
    !chave ||
    !releaseId
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      chave,
      releaseId
    );
  } catch (error) {
    console.warn(
      "[Sistema Chegou!] Não foi possível salvar a versão local:",
      error
    );
  }
}

/**
 * Retorna a release mais recente já reconhecida
 * para o contexto atual.
 *
 * Uma release GLOBAL reconhecida vale para todos
 * os módulos.
 *
 * Uma release MODULE reconhecida vale apenas para
 * o módulo correspondente.
 */
export function obterReleaseReconhecida(
  moduloAtual
) {
  const releaseGlobal = lerReleaseLocal(
    STORAGE_RELEASE_GLOBAL
  );

  const chaveModulo =
    obterChaveReleaseModulo(moduloAtual);

  const releaseModulo =
    lerReleaseLocal(chaveModulo);

  if (!releaseGlobal) {
    return releaseModulo;
  }

  if (!releaseModulo) {
    return releaseGlobal;
  }

  return compararReleaseIds(
    releaseGlobal,
    releaseModulo
  ) >= 0
    ? releaseGlobal
    : releaseModulo;
}

/**
 * Registra uma release como reconhecida.
 *
 * GLOBAL:
 * fica válida para toda a aplicação.
 *
 * MODULE:
 * fica válida somente para o módulo atual.
 */
export function registrarReleaseReconhecida({
  releaseId,
  scope = ESCOPO_GLOBAL,
  moduloAtual,
}) {
  const release =
    normalizarTexto(releaseId);

  if (!release) {
    return;
  }

  const escopo =
    normalizarEscopo(scope);

  if (escopo === ESCOPO_GLOBAL) {
    salvarReleaseLocal(
      STORAGE_RELEASE_GLOBAL,
      release
    );

    return;
  }

  const chaveModulo =
    obterChaveReleaseModulo(moduloAtual);

  salvarReleaseLocal(
    chaveModulo,
    release
  );
}

/**
 * Cria uma chave de adiamento específica para:
 * - release;
 * - módulo atual.
 */
function obterChaveAdiamento(
  releaseId,
  moduloAtual
) {
  const release =
    normalizarTexto(releaseId);

  const modulo =
    normalizarModulo(moduloAtual) ||
    "global";

  return (
    `${SESSION_ADIAMENTO_PREFIX}` +
    `${release}:${modulo}`
  );
}

/**
 * Adia o aviso apenas durante a sessão atual.
 */
export function adiarAtualizacaoNaSessao({
  releaseId,
  moduloAtual,
}) {
  if (!estaNoNavegador()) {
    return;
  }

  const chave = obterChaveAdiamento(
    releaseId,
    moduloAtual
  );

  try {
    window.sessionStorage.setItem(
      chave,
      new Date().toISOString()
    );
  } catch (error) {
    console.warn(
      "[Sistema Chegou!] Não foi possível adiar a atualização:",
      error
    );
  }
}

/**
 * Verifica se a release foi adiada nesta sessão.
 */
export function atualizacaoFoiAdiadaNaSessao({
  releaseId,
  moduloAtual,
}) {
  if (!estaNoNavegador()) {
    return false;
  }

  const chave = obterChaveAdiamento(
    releaseId,
    moduloAtual
  );

  try {
    return Boolean(
      window.sessionStorage.getItem(chave)
    );
  } catch {
    return false;
  }
}

/**
 * Remove o adiamento da release atual.
 */
export function limparAdiamentoAtualizacao({
  releaseId,
  moduloAtual,
}) {
  if (!estaNoNavegador()) {
    return;
  }

  const chave = obterChaveAdiamento(
    releaseId,
    moduloAtual
  );

  try {
    window.sessionStorage.removeItem(chave);
  } catch (error) {
    console.warn(
      "[Sistema Chegou!] Não foi possível remover o adiamento:",
      error
    );
  }
}

/**
 * Avalia o estado atual da atualização.
 *
 * Primeira execução:
 * - registra a release publicada como referência;
 * - não apresenta aviso.
 *
 * Execuções posteriores:
 * - compara releaseId;
 * - valida o escopo;
 * - respeita o adiamento da sessão;
 * - retorna a atualização aplicável.
 */
export async function avaliarAtualizacao({
  moduloAtual,
} = {}) {
  try {
    const manifesto =
      await obterVersaoPublicada();

    const aplicavel =
      atualizacaoAplicaAoModulo(
        manifesto,
        moduloAtual
      );

    if (!aplicavel) {
      return {
        status:
          STATUS_AVALIACAO.NAO_APLICAVEL,
        manifesto,
        moduloAtual:
          normalizarModulo(moduloAtual),
        releaseReconhecida:
          obterReleaseReconhecida(
            moduloAtual
          ),
      };
    }

    const releaseReconhecida =
      obterReleaseReconhecida(moduloAtual);

    /**
     * Primeira execução do Version Manager.
     *
     * A versão publicada torna-se a referência inicial,
     * sem mostrar um aviso indevido ao usuário.
     */
    if (!releaseReconhecida) {
      registrarReleaseReconhecida({
        releaseId: manifesto.releaseId,
        scope: manifesto.scope,
        moduloAtual,
      });

      return {
        status:
          STATUS_AVALIACAO
            .REFERENCIA_INICIAL_REGISTRADA,
        manifesto,
        moduloAtual:
          normalizarModulo(moduloAtual),
        releaseReconhecida:
          manifesto.releaseId,
      };
    }

    const novaRelease =
      existeNovaRelease(
        manifesto.releaseId,
        releaseReconhecida
      );

    if (!novaRelease) {
      return {
        status:
          STATUS_AVALIACAO.SEM_ATUALIZACAO,
        manifesto,
        moduloAtual:
          normalizarModulo(moduloAtual),
        releaseReconhecida,
      };
    }

    const foiAdiada =
      atualizacaoFoiAdiadaNaSessao({
        releaseId: manifesto.releaseId,
        moduloAtual,
      });

    if (
      foiAdiada &&
      !manifesto.mandatory
    ) {
      return {
        status:
          STATUS_AVALIACAO
            .ADIADA_NA_SESSAO,
        manifesto,
        moduloAtual:
          normalizarModulo(moduloAtual),
        releaseReconhecida,
      };
    }

    return {
      status:
        STATUS_AVALIACAO
          .ATUALIZACAO_DISPONIVEL,
      manifesto,
      moduloAtual:
        normalizarModulo(moduloAtual),
      releaseReconhecida,
    };
  } catch (error) {
    console.warn(
      "[Sistema Chegou!] Não foi possível avaliar atualizações:",
      error
    );

    return {
      status:
        STATUS_AVALIACAO.INDISPONIVEL,
      manifesto: null,
      moduloAtual:
        normalizarModulo(moduloAtual),
      releaseReconhecida:
        obterReleaseReconhecida(
          moduloAtual
        ),
      error,
    };
  }
}

/**
 * Retorna o registro atual do Service Worker.
 */
export async function obterRegistroServiceWorker() {
  if (
    !estaNoNavegador() ||
    !("serviceWorker" in navigator)
  ) {
    return null;
  }

  try {
    const registro =
      await navigator.serviceWorker.getRegistration(
        "/"
      );

    if (registro) {
      return registro;
    }

    return navigator.serviceWorker.ready;
  } catch (error) {
    console.warn(
      "[Sistema Chegou!] Não foi possível obter o registro do Service Worker:",
      error
    );

    return null;
  }
}

/**
 * Retorna o Service Worker que está aguardando ativação.
 */
export async function obterServiceWorkerAguardando() {
  const registro =
    await obterRegistroServiceWorker();

  return registro?.waiting || null;
}

/**
 * Envia uma mensagem ao Service Worker utilizando
 * MessageChannel e aguarda a resposta.
 */
export function enviarMensagemServiceWorker(
  worker,
  mensagem,
  timeoutMs = 4000
) {
  return new Promise(
    (resolve, reject) => {
      if (!worker) {
        reject(
          new Error(
            "Service Worker não informado."
          )
        );

        return;
      }

      const canal = new MessageChannel();

      const timeout = window.setTimeout(
        () => {
          canal.port1.close();

          reject(
            new Error(
              "O Service Worker não respondeu dentro do prazo esperado."
            )
          );
        },
        timeoutMs
      );

      canal.port1.onmessage = (event) => {
        window.clearTimeout(timeout);
        canal.port1.close();

        resolve(event.data);
      };

      try {
        worker.postMessage(
          mensagem,
          [canal.port2]
        );
      } catch (error) {
        window.clearTimeout(timeout);
        canal.port1.close();

        reject(error);
      }
    }
  );
}

/**
 * Consulta as informações do Service Worker ativo.
 */
export async function obterInformacoesServiceWorkerAtivo() {
  if (
    !estaNoNavegador() ||
    !("serviceWorker" in navigator)
  ) {
    return null;
  }

  const worker =
    navigator.serviceWorker.controller;

  if (!worker) {
    return null;
  }

  try {
    return await enviarMensagemServiceWorker(
      worker,
      {
        type: "GET_SW_VERSION",
      }
    );
  } catch (error) {
    console.warn(
      "[Sistema Chegou!] Não foi possível consultar a versão do Service Worker:",
      error
    );

    return null;
  }
}

/**
 * Marca que o usuário autorizou a atualização.
 *
 * A informação fica no sessionStorage porque deve
 * sobreviver apenas ao reload desta sessão.
 */
export function marcarAtualizacaoEmAndamento({
  manifesto,
  moduloAtual,
}) {
  if (
    !estaNoNavegador() ||
    !manifesto
  ) {
    return;
  }

  const dados = {
    releaseId: manifesto.releaseId,
    appVersion: manifesto.appVersion,
    scope: manifesto.scope,
    moduloAtual:
      normalizarModulo(moduloAtual),
    startedAt:
      new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(
      SESSION_ATUALIZACAO_EM_ANDAMENTO,
      JSON.stringify(dados)
    );
  } catch (error) {
    console.warn(
      "[Sistema Chegou!] Não foi possível registrar a atualização em andamento:",
      error
    );
  }
}

/**
 * Move a atualização em andamento para o estado concluído.
 *
 * Deve ser executada antes do reload.
 */
export function marcarAtualizacaoParaConfirmacao({
  manifesto,
  moduloAtual,
}) {
  if (
    !estaNoNavegador() ||
    !manifesto
  ) {
    return;
  }

  const dados = {
    releaseId: manifesto.releaseId,
    appVersion: manifesto.appVersion,
    scope: manifesto.scope,
    moduloAtual:
      normalizarModulo(moduloAtual),
    completedAt:
      new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(
      SESSION_ATUALIZACAO_CONCLUIDA,
      JSON.stringify(dados)
    );

    window.sessionStorage.removeItem(
      SESSION_ATUALIZACAO_EM_ANDAMENTO
    );
  } catch (error) {
    console.warn(
      "[Sistema Chegou!] Não foi possível preparar a confirmação da atualização:",
      error
    );
  }
}

/**
 * Consome a confirmação após o reload.
 *
 * O retorno poderá ser usado para mostrar:
 * "Sistema atualizado".
 */
export function consumirConfirmacaoAtualizacao() {
  if (!estaNoNavegador()) {
    return null;
  }

  try {
    const salvo =
      window.sessionStorage.getItem(
        SESSION_ATUALIZACAO_CONCLUIDA
      );

    if (!salvo) {
      return null;
    }

    window.sessionStorage.removeItem(
      SESSION_ATUALIZACAO_CONCLUIDA
    );

    return JSON.parse(salvo);
  } catch (error) {
    console.warn(
      "[Sistema Chegou!] Não foi possível recuperar a confirmação da atualização:",
      error
    );

    return null;
  }
}

/**
 * Autoriza o Service Worker em espera a assumir o controle.
 *
 * Retorna false quando não existe worker aguardando.
 *
 * Isso é esperado em releases que alteraram somente
 * arquivos React, CSS, imagens ou textos, sem alterar o sw.js.
 */
export async function autorizarAtivacaoServiceWorker({
  releaseId,
} = {}) {
  const worker =
    await obterServiceWorkerAguardando();

  if (!worker) {
    return false;
  }

  worker.postMessage({
    type: "SKIP_WAITING",
    releaseId:
      normalizarTexto(releaseId) ||
      null,
  });

  return true;
}

/**
 * Aguarda a troca do controlador do Service Worker.
 *
 * Se não houver troca dentro do prazo, a Promise é
 * resolvida para não bloquear indefinidamente o reload.
 */
export function aguardarTrocaControlador({
  timeoutMs = 8000,
} = {}) {
  return new Promise((resolve) => {
    if (
      !estaNoNavegador() ||
      !("serviceWorker" in navigator)
    ) {
      resolve(false);
      return;
    }

    let finalizado = false;

    function concluir(valor) {
      if (finalizado) {
        return;
      }

      finalizado = true;

      window.clearTimeout(timeout);

      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        aoAlterarControlador
      );

      resolve(valor);
    }

    function aoAlterarControlador() {
      concluir(true);
    }

    const timeout = window.setTimeout(
      () => concluir(false),
      timeoutMs
    );

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      aoAlterarControlador
    );
  });
}

/**
 * Evita múltiplos reloads provocados por eventos concorrentes.
 */
let reloadSolicitado = false;

/**
 * Recarrega a aplicação uma única vez.
 */
export function recarregarAplicacaoUmaVez() {
  if (
    !estaNoNavegador() ||
    reloadSolicitado
  ) {
    return false;
  }

  reloadSolicitado = true;

  window.location.reload();

  return true;
}

/**
 * Finaliza o fluxo de atualização.
 *
 * O comportamento é:
 * 1. registra a atualização em andamento;
 * 2. remove eventual adiamento;
 * 3. tenta ativar um Service Worker em espera;
 * 4. aguarda controllerchange quando necessário;
 * 5. registra a release como reconhecida;
 * 6. prepara a confirmação após o reload;
 * 7. recarrega a aplicação uma única vez.
 */
export async function aplicarAtualizacao({
  manifesto,
  moduloAtual,
}) {
  if (!manifesto) {
    throw new Error(
      "Manifesto da atualização não informado."
    );
  }

  marcarAtualizacaoEmAndamento({
    manifesto,
    moduloAtual,
  });

  limparAdiamentoAtualizacao({
    releaseId: manifesto.releaseId,
    moduloAtual,
  });

  const possuiWorkerAguardando =
    await autorizarAtivacaoServiceWorker({
      releaseId: manifesto.releaseId,
    });

  if (possuiWorkerAguardando) {
    await aguardarTrocaControlador();
  }

  registrarReleaseReconhecida({
    releaseId: manifesto.releaseId,
    scope: manifesto.scope,
    moduloAtual,
  });

  marcarAtualizacaoParaConfirmacao({
    manifesto,
    moduloAtual,
  });

  recarregarAplicacaoUmaVez();

  return {
    releaseId: manifesto.releaseId,
    appVersion: manifesto.appVersion,
    serviceWorkerActivated:
      possuiWorkerAguardando,
  };
}

/**
 * Nomes dos eventos emitidos pelo main.jsx.
 *
 * O componente VersionManager poderá importar este objeto
 * para escutar os eventos sem duplicar textos.
 */
export const VERSION_MANAGER_EVENTS =
  Object.freeze({
    SERVICE_WORKER_REGISTERED:
      EVENTO_SW_REGISTRADO,

    SERVICE_WORKER_UPDATE:
      EVENTO_SW_ATUALIZACAO,

    SERVICE_WORKER_CONTROLLER_CHANGED:
      EVENTO_SW_CONTROLADOR_ALTERADO,
  });

/**
 * Status públicos retornados por avaliarAtualizacao().
 */
export const VERSION_MANAGER_STATUS =
  STATUS_AVALIACAO;

/**
 * Escopos públicos aceitos pelo version.json.
 */
export const VERSION_MANAGER_SCOPES =
  Object.freeze({
    GLOBAL: ESCOPO_GLOBAL,
    MODULE: ESCOPO_MODULO,
  });