import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import ToastProvider from "./components/toast/ToastProvider";

/**
 * Sistema Chegou! — Registro seguro do Service Worker
 *
 * Regras desta etapa:
 * - registra o /sw.js somente em produção;
 * - nunca registra no localhost;
 * - remove registros antigos durante o desenvolvimento local;
 * - não força atualização automática;
 * - deixa a ativação da nova versão preparada para o Version Manager.
 */

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
        cachesDoChegou.map((nome) => caches.delete(nome))
      );
    }
  } catch (error) {
    console.error(
      "[Sistema Chegou!] Erro ao remover Service Worker local:",
      error
    );
  }
}

async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.info(
      "[Sistema Chegou!] Este navegador não oferece suporte a Service Worker."
    );

    return;
  }

  if (ambienteLocalOuDesenvolvimento()) {
    await removerServiceWorkersLocais();
    return;
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

    /**
     * Verifica no servidor se existe uma versão mais recente do sw.js.
     * Nesta etapa, isso não força a atualização nem recarrega a página.
     */
    await registro.update();

    registro.addEventListener("updatefound", () => {
      const novoServiceWorker = registro.installing;

      if (!novoServiceWorker) {
        return;
      }

      novoServiceWorker.addEventListener("statechange", () => {
        if (
          novoServiceWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          console.info(
            "[Sistema Chegou!] Nova versão do Service Worker disponível."
          );

          /**
           * O futuro Version Manager poderá observar este evento
           * para exibir o aviso "Atualizar agora" ou "Depois".
           */
          window.dispatchEvent(
            new CustomEvent("chegou:service-worker-update", {
              detail: {
                registration: registro,
              },
            })
          );
        }
      });
    });
  } catch (error) {
    console.error(
      "[Sistema Chegou!] Falha ao registrar o Service Worker:",
      error
    );
  }
}

/**
 * Aguarda o carregamento completo da página para não competir
 * com a renderização inicial, autenticação e carregamento da aplicação.
 */
window.addEventListener(
  "load",
  () => {
    registrarServiceWorker();
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