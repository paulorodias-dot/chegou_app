/**
 * Sistema Chegou! — Service Worker Oficial
 *
 * Responsabilidades:
 * - participar do controle oficial de versões do PWA;
 * - detectar e comunicar instalação e ativação;
 * - permanecer aguardando autorização antes de assumir o controle;
 * - aceitar ativação controlada pelo Version Manager;
 * - remover somente caches pertencentes ao Sistema Chegou!;
 * - não interceptar chamadas de rede;
 * - não armazenar sessões, tokens ou dados operacionais;
 * - não oferecer modo offline nesta etapa.
 */

/**
 * IMPORTANTE
 *
 * Estes valores devem acompanhar a release publicada no version.json.
 *
 * Enquanto a geração automática não estiver homologada, será necessário
 * revisar estes identificadores antes de cada publicação que alterar o
 * Service Worker.
 */
const SERVICE_WORKER_VERSION = "chegou-sw-2026.08.20.001";
const RELEASE_ID = "2026.08.20.001";
const APP_VERSION = "1.2.2";
const SERVICE_WORKER_SCHEMA_VERSION = 1;
const CACHE_PREFIX = "chegou-";

/**
 * Retorna informações públicas e não sensíveis sobre o Service Worker.
 */
function obterInformacoesServiceWorker() {
  return {
    type: "SW_VERSION",
    serviceWorkerVersion: SERVICE_WORKER_VERSION,
    releaseId: RELEASE_ID,
    appVersion: APP_VERSION,
    schemaVersion: SERVICE_WORKER_SCHEMA_VERSION,
  };
}

/**
 * Envia uma mensagem para todas as páginas abertas e controladas
 * pelo Service Worker.
 */
async function comunicarClientes(mensagem) {
  const clientes = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  clientes.forEach((cliente) => {
    cliente.postMessage(mensagem);
  });
}

/**
 * Instalação
 *
 * Não utilizamos self.skipWaiting() automaticamente.
 *
 * Quando uma nova versão for encontrada, ela permanecerá em waiting até:
 * - o usuário clicar em "Atualizar agora"; ou
 * - o Version Manager determinar sua aplicação em um novo acesso.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      console.info(
        "[Sistema Chegou!] Service Worker instalado.",
        {
          serviceWorkerVersion: SERVICE_WORKER_VERSION,
          releaseId: RELEASE_ID,
          appVersion: APP_VERSION,
        }
      );

      await comunicarClientes({
        type: "SW_INSTALLED",
        serviceWorkerVersion: SERVICE_WORKER_VERSION,
        releaseId: RELEASE_ID,
        appVersion: APP_VERSION,
        schemaVersion: SERVICE_WORKER_SCHEMA_VERSION,
        installedAt: new Date().toISOString(),
      });
    })()
  );
});

/**
 * Ativação
 *
 * Remove somente caches cujo nome comece com "chegou-".
 *
 * Nenhum cache de outro site, sistema ou extensão será removido.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const nomesDosCaches = await caches.keys();

        const cachesAntigos = nomesDosCaches.filter(
          (nomeDoCache) =>
            nomeDoCache.startsWith(CACHE_PREFIX) &&
            nomeDoCache !== SERVICE_WORKER_VERSION
        );

        await Promise.all(
          cachesAntigos.map((nomeDoCache) =>
            caches.delete(nomeDoCache)
          )
        );

        await self.clients.claim();

        await comunicarClientes({
          type: "SW_ACTIVATED",
          serviceWorkerVersion: SERVICE_WORKER_VERSION,
          releaseId: RELEASE_ID,
          appVersion: APP_VERSION,
          schemaVersion: SERVICE_WORKER_SCHEMA_VERSION,
          activatedAt: new Date().toISOString(),
        });

        console.info(
          "[Sistema Chegou!] Service Worker ativado.",
          {
            serviceWorkerVersion: SERVICE_WORKER_VERSION,
            releaseId: RELEASE_ID,
            appVersion: APP_VERSION,
          }
        );
      } catch (error) {
        console.error(
          "[Sistema Chegou!] Erro durante a ativação do Service Worker:",
          error
        );

        throw error;
      }
    })()
  );
});

/**
 * Comunicação entre a aplicação e o Service Worker.
 *
 * Mensagens aceitas:
 *
 * SKIP_WAITING
 * Autoriza o Service Worker em espera a assumir o controle.
 *
 * GET_SW_VERSION
 * Retorna a identificação da versão atual do Service Worker.
 *
 * PING
 * Confirma que o Service Worker está respondendo.
 */
self.addEventListener("message", (event) => {
  const mensagem = event.data;

  if (!mensagem || typeof mensagem !== "object") {
    return;
  }

  switch (mensagem.type) {
    case "SKIP_WAITING": {
      console.info(
        "[Sistema Chegou!] Ativação da nova versão autorizada.",
        {
          releaseId: RELEASE_ID,
          requestedReleaseId:
            mensagem.releaseId || null,
        }
      );

      event.waitUntil(
        (async () => {
          await comunicarClientes({
            type: "SW_ACTIVATION_AUTHORIZED",
            serviceWorkerVersion: SERVICE_WORKER_VERSION,
            releaseId: RELEASE_ID,
            appVersion: APP_VERSION,
            authorizedAt: new Date().toISOString(),
          });

          await self.skipWaiting();
        })()
      );

      break;
    }

    case "GET_SW_VERSION": {
      const resposta = obterInformacoesServiceWorker();

      if (event.ports?.[0]) {
        event.ports[0].postMessage(resposta);
        return;
      }

      event.source?.postMessage?.(resposta);

      break;
    }

    case "PING": {
      const resposta = {
        type: "PONG",
        serviceWorkerVersion: SERVICE_WORKER_VERSION,
        releaseId: RELEASE_ID,
        appVersion: APP_VERSION,
        schemaVersion: SERVICE_WORKER_SCHEMA_VERSION,
        respondedAt: new Date().toISOString(),
      };

      if (event.ports?.[0]) {
        event.ports[0].postMessage(resposta);
        return;
      }

      event.source?.postMessage?.(resposta);

      break;
    }

    default:
      break;
  }
});

/**
 * Erros internos do Service Worker.
 */
self.addEventListener("error", (event) => {
  console.error(
    "[Sistema Chegou!] Erro interno no Service Worker:",
    event.error || event.message
  );
});

/**
 * Rejeições de Promise não tratadas.
 */
self.addEventListener("unhandledrejection", (event) => {
  console.error(
    "[Sistema Chegou!] Promise rejeitada no Service Worker:",
    event.reason
  );
});

/**
 * IMPORTANTE
 *
 * Não existe listener de "fetch" nesta versão.
 *
 * Portanto:
 * - nenhuma resposta da aplicação é armazenada;
 * - chamadas ao Supabase não são interceptadas;
 * - sessões e tokens não são armazenados;
 * - RPCs não são armazenadas;
 * - imagens de encomendas não são armazenadas;
 * - anexos não são armazenados;
 * - APIs externas não são armazenadas;
 * - não existe funcionamento offline;
 * - o comportamento das requisições atuais não é alterado.
 */