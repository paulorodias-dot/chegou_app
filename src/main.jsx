import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import ToastProvider from "./components/toast/ToastProvider";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
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
              boxShadow:
                "0 10px 25px rgba(0, 0, 0, 0.15)",
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