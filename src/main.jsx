import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import ToastProvider from "./components/toast/ToastProvider";

/**
 * Sistema Chegou! — Registro oficial do Service Worker
 *
 * Responsabilidades:
 * - registrar /sw.js somente em produção;
 * - nunca registrar no localhost ou em desenvolvimento;
 * - remover registros e caches antigos durante o desenvolvimento local;
 * - detectar novas versões sem ativá-las automaticamente;
 * - não recarregar a aplicação;
 * - disponibilizar eventos para o Version Manager oficial.
 */

const EVENTO_SW_REGISTRADO = "chegou:service-worker-registered";
const EVENTO_SW_ATUALIZACAO = "chegou:service-worker-update";
const EVENTO_SW_CONTROLADOR_ALTERADO =
  "chegou:service-worker-controller-changed";

function ambienteLocalOuDesenvolvimento() {
  const hostname = window.location.hostname;

  const ambienteLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1";

  return ambienteLocal || !import.meta.env.PROD;
}

async function removerServiceWorkersLocais() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registros = await navigator.serviceWorker.getRegistrations();

    await Promise.all(
      registros.map(async (registro) => {
        const removido = await registro.unregister();

        if (removido) {
          console.info(
            "[Sistema Chegou!] Service Worker local removido:",
            registro.scope
          );
        }
      })
    );

    if ("caches" in window) {
      const nomesDosCaches = await caches.keys();

      const cachesDoChegou = nomesDosCaches.filter((nome) =>
        nome.startsWith("chegou-")
      );

      await Promise.all(
        cachesDoChegou.map(async (nome) => {
          const removido = await caches.delete(nome);

          if (removido) {
            console.info(
              "[Sistema Chegou!] Cache local removido:",
              nome
            );
          }
        })
      );
    }
  } catch (error) {
    console.error(
      "[Sistema Chegou!] Erro ao remover Service Worker local:",
      error
    );
  }
}

function emitirEventoServiceWorker(nome, detalhe = {}) {
  window.dispatchEvent(
    new CustomEvent(nome, {
      detail: {
        ...detalhe,
        emittedAt: new Date().toISOString(),
      },
    })
  );
}

async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.info(
      "[Sistema Chegou!] Este navegador não oferece suporte a Service Worker."
    );

    return null;
  }

  if (ambienteLocalOuDesenvolvimento()) {
    await removerServiceWorkersLocais();
    return null;
  }

  try {
    const registro = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });

    console.info(
      "[Sistema Chegou!] Service Worker registrado:",
      registro.scope
    );

    emitirEventoServiceWorker(EVENTO_SW_REGISTRADO, {
      registration: registro,
      scope: registro.scope,
    });

    let workerAtualizacaoInformado = null;

    function informarAtualizacaoDisponivel(worker, origem) {
      if (!worker) {
        return;
      }

      /**
       * Evita emitir duas vezes o mesmo aviso quando o navegador
       * disponibiliza o worker por updatefound e registration.waiting.
       */
      if (workerAtualizacaoInformado === worker) {
        return;
      }

      workerAtualizacaoInformado = worker;

      console.info(
        "[Sistema Chegou!] Nova versão do Service Worker disponível.",
        {
          origem,
          estado: worker.state,
          scriptURL: worker.scriptURL,
        }
      );

      emitirEventoServiceWorker(EVENTO_SW_ATUALIZACAO, {
        registration: registro,
        worker,
        origin: origem,
        state: worker.state,
        scriptURL: worker.scriptURL,
      });
    }

    /**
     * Pode existir uma atualização já instalada e aguardando ativação
     * antes mesmo do carregamento atual da aplicação.
     */
    if (registro.waiting && navigator.serviceWorker.controller) {
      informarAtualizacaoDisponivel(
        registro.waiting,
        "registration_waiting"
      );
    }

    /**
     * O listener deve existir antes de registration.update().
     */
    registro.addEventListener("updatefound", () => {
      const novoServiceWorker = registro.installing;

      if (!novoServiceWorker) {
        return;
      }

      console.info(
        "[Sistema Chegou!] Instalação de novo Service Worker iniciada."
      );

      novoServiceWorker.addEventListener("statechange", () => {
        console.info(
          "[Sistema Chegou!] Estado do novo Service Worker:",
          novoServiceWorker.state
        );

        if (
          novoServiceWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          informarAtualizacaoDisponivel(
            registro.waiting || novoServiceWorker,
            "updatefound"
          );
        }
      });
    });

    /**
     * Detecta quando outro Service Worker assume o controle.
     *
     * IMPORTANTE:
     * este listener não executa window.location.reload().
     * A decisão de recarregar será exclusiva do Version Manager.
     */
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        console.info(
          "[Sistema Chegou!] Controlador do Service Worker alterado."
        );

        emitirEventoServiceWorker(
          EVENTO_SW_CONTROLADOR_ALTERADO,
          {
            controller: navigator.serviceWorker.controller,
            registration: registro,
          }
        );
      },
      { once: true }
    );

    /**
     * Solicita ao navegador uma verificação direta do sw.js.
     *
     * Isso não executa:
     * - skipWaiting;
     * - recarregamento;
     * - atualização automática da interface.
     */
    try {
      await registro.update();
    } catch (updateError) {
      /**
       * Uma falha na verificação não invalida o registro já existente.
       * O navegador poderá tentar novamente em outro momento.
       */
      console.warn(
        "[Sistema Chegou!] Não foi possível verificar uma nova versão do Service Worker:",
        updateError
      );
    }

    return registro;
  } catch (error) {
    console.error(
      "[Sistema Chegou!] Falha ao registrar o Service Worker:",
      error
    );

    return null;
  }
}

/**
 * Aguarda o carregamento completo da página para não competir com:
 * - renderização inicial;
 * - autenticação;
 * - restauração da sessão;
 * - carregamento dos módulos.
 */
window.addEventListener(
  "load",
  () => {
    void registrarServiceWorker();
  },
  { once: true }
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />

        {/*
          Toast legado — react-hot-toast

          Manter temporariamente para as telas existentes.

          Novas telas devem utilizar o Toast Premium Centralizado
          por meio do hook useToast().
        */}
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={10}
          containerStyle={{
            top: 84,
            right: 18,
          }}
          toastOptions={{
            duration: 3500,

            style: {
              maxWidth: "390px",
              padding: "13px 15px",
              borderRadius: "12px",
              color: "#ffffff",
              background: "#0f3f8f",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
              fontFamily:
                "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontSize: "13px",
              fontWeight: "600",
              lineHeight: "1.45",
            },

            success: {
              duration: 3500,

              style: {
                color: "#ffffff",
                background: "#16a34a",
              },

              iconTheme: {
                primary: "#ffffff",
                secondary: "#16a34a",
              },
            },

            error: {
              duration: 5500,

              style: {
                color: "#ffffff",
                background: "#dc2626",
              },

              iconTheme: {
                primary: "#ffffff",
                secondary: "#dc2626",
              },
            },

            loading: {
              duration: Infinity,

              style: {
                color: "#ffffff",
                background: "#2563eb",
              },

              iconTheme: {
                primary: "#ffffff",
                secondary: "#2563eb",
              },
            },
          }}
        />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);