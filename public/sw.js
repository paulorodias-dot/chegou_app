/**
 * Sistema Chegou! — Service Worker V1
 *
 * Responsabilidades desta versão:
 * - preparar a infraestrutura oficial de atualização do PWA;
 * - permitir ativação controlada de uma nova versão;
 * - comunicar instalação e ativação para a aplicação;
 * - remover somente caches pertencentes ao Sistema Chegou!;
 * - não interceptar chamadas de rede;
 * - não armazenar dados operacionais, sessões ou integrações em cache.
 *
 * Nesta etapa não existe modo offline.
 */

/**
 * Esta identificação deverá mudar a cada release que alterar o Service Worker.
 *
 * Posteriormente, sua geração será automatizada durante o build/deploy.
 */
const SERVICE_WORKER_VERSION = "chegou-sw-v1.0.0";
const SERVICE_WORKER_SCHEMA_VERSION = 1;

const CACHE_PREFIX = "chegou-";

/**
 * Retorna informações públicas sobre o Service Worker.
 */
function obterInformacoesServiceWorker() {
  return {
    type: "SW_VERSION",
    version: SERVICE_WORKER_VERSION,
    schemaVersion: SERVICE_WORKER_SCHEMA_VERSION,
  };
}

/**
 * Envia uma mensagem para todas as páginas controladas pelo Service Worker.
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
 * Não executamos self.skipWaiting() automaticamente.
 *
 * Quando existir uma nova versão, ela permanecerá em waiting até que:
 * - o usuário clique em "Atualizar agora"; ou
 * - o Version Manager aplique a atualização no próximo acesso.
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.resolve().then(() => {
      console.info(
        `[Sistema Chegou!] Service Worker instalado: ${SERVICE_WORKER_VERSION}`
      );
    })
  );
});

/**
 * Ativação
 *
 * Remove somente caches antigos cujo nome comece com "chegou-".
 * Não interfere em caches de outros sistemas, sites ou extensões.
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

        await comunicarClientes({
          type: "SW_ACTIVATED",
          version: SERVICE_WORKER_VERSION,
          schemaVersion: SERVICE_WORKER_SCHEMA_VERSION,
          activatedAt: new Date().toISOString(),
        });

        console.info(
          `[Sistema Chegou!] Service Worker ativado: ${SERVICE_WORKER_VERSION}`
        );
      } catch (error) {
        console.error(
          "[Sistema Chegou!] Erro ao ativar o Service Worker:",
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
 * Retorna a identificação da versão atual.
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

      event.waitUntil(self.skipWaiting());
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
 * - tokens e sessões não são armazenados;
 * - RPCs não são armazenadas;
 * - imagens de encomendas não são armazenadas;
 * - APIs externas não são armazenadas;
 * - não existe funcionamento offline;
 * - o comportamento atual da aplicação não é alterado.
 */