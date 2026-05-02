import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />

      {/* 🔔 NOTIFICAÇÕES DO SISTEMA */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f3f8f', // azul Chegou!
            color: '#fff',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
          },
          success: {
            style: {
              background: '#16a34a', // verde sucesso
            },
          },
          error: {
            style: {
              background: '#dc2626', // vermelho erro
            },
          },
        }}
      />

    </BrowserRouter>
  </React.StrictMode>
)