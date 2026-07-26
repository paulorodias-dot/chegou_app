/**
 * Sistema Chegou! — Service Worker V1
 *
 * Objetivos desta primeira versão:
 * - preparar a infraestrutura de atualização do PWA;
 * - não armazenar dados operacionais em cache;
 * - não interceptar chamadas do Supabase ou de integrações externas;
 * - permitir ativação controlada de uma nova versão;
 * - remover somente caches antigos pertencentes ao Sistema Chegou!.
 *
 * Nesta etapa, o Service Worker não implementa modo offline.
 */

const SERVICE_WORKER_VERSION = "chegou-sw-v1";
const CACHE_PREFIX = "chegou-";

/**
 * Instalação
 *
 * Não utilizamos self.skipWaiting() automaticamente.
 * A nova versão aguardará autorização da aplicação para ser ativada.
 */
self.addEventListener("install", () => {
  console.info(
    `[Sistema Chegou!] Service Worker instalado: ${SERVICE_WORKER_VERSION}`
  );
});

/**
 * Ativação
 *
 * Remove apenas caches antigos criados pelo próprio Sistema Chegou!.
 * Caches de outros sistemas ou extensões não são afetados.
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();

        const cachesAntigos = cacheNames.filter(
          (cacheName) =>
            cacheName.startsWith(CACHE_PREFIX) &&
            cacheName !== SERVICE_WORKER_VERSION
        );

        await Promise.all(
          cachesAntigos.map((cacheName) => caches.delete(cacheName))
        );

        await self.clients.claim();

        console.info(
          `[Sistema Chegou!] Service Worker ativado: ${SERVICE_WORKER_VERSION}`
        );
      } catch (error) {
        console.error(
          "[Sistema Chegou!] Erro ao ativar o Service Worker:",
          error
        );
      }
    })()
  );
});

/**
 * Comunicação entre a aplicação e o Service Worker.
 *
 * Mensagens suportadas:
 *
 * SKIP_WAITING
 * Autoriza uma nova versão em espera a assumir o controle.
 *
 * GET_SW_VERSION
 * Retorna para a aplicação a versão atual do Service Worker.
 */
self.addEventListener("message", (event) => {
  const mensagem = event.data;

  if (!mensagem || typeof mensagem !== "object") {
    return;
  }

  switch (mensagem.type) {
    case "SKIP_WAITING": {
      console.info(
        "[Sistema Chegou!] Ativação da nova versão autorizada."
      );

      self.skipWaiting();
      break;
    }

    case "GET_SW_VERSION": {
      const resposta = {
        type: "SW_VERSION",
        version: SERVICE_WORKER_VERSION,
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
 * - nenhuma resposta da aplicação será armazenada;
 * - chamadas ao Supabase não serão interceptadas;
 * - tokens e sessões não serão armazenados;
 * - RPCs não serão armazenadas;
 * - imagens de encomendas não serão armazenadas;
 * - APIs externas não serão armazenadas;
 * - o comportamento atual da aplicação não será alterado.
 */