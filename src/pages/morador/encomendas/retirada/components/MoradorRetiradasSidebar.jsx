import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Package,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import "./MoradorRetiradasSidebar.css";

function Metrica({ icon: Icon, label, value, tone = "default" }) {
  return (
    <div className={`morador-retiradas-sidebar__metric is-${tone}`}>
      <span>
        <Icon size={16} />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

export default function MoradorRetiradasSidebar({
  resumo,
  contexto,
}) {
  return (
    <div className="morador-retiradas-sidebar-content">
      <section className="morador-retiradas-sidebar-card">
        <header>
          <span className="morador-retiradas-sidebar-card__icon">
            <Package size={19} />
          </span>
          <div>
            <span>Encomendas</span>
            <h2>Resumo da unidade</h2>
          </div>
        </header>

        {contexto?.unidade ? (
          <p className="morador-retiradas-sidebar-card__context">
            <span>Torre </span>{contexto.torre ? `${contexto.torre} · ` : ""}
            Unidade {contexto.unidade}
          </p>
        ) : null}

        <div className="morador-retiradas-sidebar__metrics">
          <Metrica
            icon={Package}
            label="Ativas"
            value={resumo.totalAtivas}
            tone="primary"
          />
          <Metrica
            icon={UserRound}
            label="Para você"
            value={resumo.totalMorador}
          />
          <Metrica
            icon={UsersRound}
            label="Dependentes"
            value={resumo.totalDependentes}
          />
          <Metrica
            icon={CheckCircle2}
            label="Disponíveis"
            value={resumo.totalDisponiveis}
            tone="success"
          />
          <Metrica
            icon={CalendarDays}
            label="Agendadas"
            value={resumo.totalAgendadas}
          />
          <Metrica
            icon={Clock3}
            label="Em retirada"
            value={resumo.totalEmRetirada}
          />
          <Metrica
            icon={AlertTriangle}
            label="Aguardando há mais tempo"
            value={resumo.totalAtrasadas}
            tone="warning"
          />
        </div>
      </section>

      <section className="morador-retiradas-sidebar-card is-guidance">
        <header>
          <span className="morador-retiradas-sidebar-card__icon is-blue">
            <ShieldCheck size={19} />
          </span>
          <div>
            <span>Retirada segura</span>
            <h2>Antes de ir à Portaria</h2>
          </div>
        </header>

        <ol>
          <li>Confirme a encomenda e o destinatário.</li>
          <li>Use somente a credencial exibida no fluxo oficial.</li>
          <li>Nunca envie token ou QR em mensagens não solicitadas.</li>
        </ol>
      </section>
    </div>
  );
}