import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />

      {/* 🔔 NOTIFICAÇÕES DO SISTEMA */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#0f3f8f",
            color: "#fff",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: "600",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          },
        success: {
          style: {
          background: "#16a34a",
        },
        iconTheme: {
          primary: "#fff",
          secondary: "#16a34a",
        },
      },
      error: {
        style: {
          background: "#dc2626",
        },
      },
    }}
  />

    </BrowserRouter>
  </React.StrictMode>
)