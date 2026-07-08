import {
  Home,
  Package,
  ShieldCheck,
  Construction,
} from "lucide-react";

import "./PortariaInicio.css";

export default function PortariaInicio({ perfil }) {
  const nome = perfil?.nome?.split(" ")?.[0] || "Operador";

  return (
    <section className="portaria-inicio-page">
      <div className="portaria-hero">
        <div>
          <span className="portaria-kicker">Módulo Portaria</span>
          <h1>Olá, {nome}! 👋</h1>
          <p>
            Esta será a tela inicial operacional da Portaria do Sistema Chegou!.
          </p>
        </div>

        <div className="portaria-hero-icon">
          <Home size={34} />
        </div>
      </div>

      <div className="portaria-construcao-card">
        <Construction size={42} />
        <h2>Tela em construção</h2>
        <p>
          O menu Início da Portaria já foi criado. Os próximos fluxos serão
          Recebimento, Entrega ao Morador, Notificações e Configurações.
        </p>
      </div>

      <div className="portaria-preview-grid">
        <div>
          <Package size={24} />
          <strong>Receber Encomendas</strong>
          <span>Em breve</span>
        </div>

        <div>
          <ShieldCheck size={24} />
          <strong>Liberar Retirada</strong>
          <span>Em breve</span>
        </div>

        <div>
          <Package size={24} />
          <strong>Painel de Encomendas</strong>
          <span>Em breve</span>
        </div>
      </div>
    </section>
  );
}