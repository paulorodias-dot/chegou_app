import {
  Bell,
  CircleHelp,
  Package,
  PackageCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import "./MoradorDashboard.css";

const KPIS_INICIAIS = [
  {
    id: "encomendas",
    titulo: "Encomendas",
    descricao: "Aguardando retirada",
    valor: 0,
    icone: Package,
    variante: "orange",
  },
  {
    id: "entregas",
    titulo: "Últimas entregas",
    descricao: "Recebidas recentemente",
    valor: 0,
    icone: PackageCheck,
    variante: "blue",
  },
  {
    id: "notificacoes",
    titulo: "Notificações",
    descricao: "Novas mensagens",
    valor: 0,
    icone: Bell,
    variante: "purple",
  },
];

export default function MoradorDashboard({ usuario }) {
  const nomeCompleto =
    usuario?.nome ||
    usuario?.nome_completo ||
    "";

  const primeiroNome =
    nomeCompleto.trim().split(/\s+/)[0] ||
    "Morador";

  return (
    <main className="mda-page">
      <section className="mda-main">
        <header className="mda-header">
          <span>Portal do Morador</span>

          <h1>Olá, {primeiroNome}!</h1>

          <p>
            Bem-vindo ao Sistema Chegou! Os principais serviços da
            sua unidade estarão disponíveis nesta área.
          </p>
        </header>

        <section
          className="mda-cards"
          aria-label="Resumo do Morador"
        >
          {KPIS_INICIAIS.map((item) => {
            const Icone = item.icone;

            return (
              <article
                className="mda-kpi-card"
                key={item.id}
              >
                <div className="mda-kpi-head">
                  <div
                    className={[
                      "mda-kpi-icon",
                      `mda-kpi-icon-${item.variante}`,
                    ].join(" ")}
                  >
                    <Icone
                      size={20}
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <strong>{item.titulo}</strong>
                    <span>{item.descricao}</span>
                  </div>
                </div>

                <div className="mda-kpi-value">
                  {item.valor}
                </div>
              </article>
            );
          })}
        </section>

        <section className="mda-content-grid">
          <article className="mda-content-card">
            <div className="mda-content-title">
              <Package
                size={17}
                aria-hidden="true"
              />

              <strong>Minhas encomendas</strong>
            </div>

            <div className="mda-empty-state">
              <Package
                size={28}
                aria-hidden="true"
              />

              <strong>
                Nenhuma encomenda disponível
              </strong>

              <p>
                Suas encomendas aparecerão aqui quando os recursos
                do Módulo Morador forem disponibilizados.
              </p>
            </div>
          </article>

          <article className="mda-content-card">
            <div className="mda-content-title">
              <Bell
                size={17}
                aria-hidden="true"
              />

              <strong>Notificações recentes</strong>
            </div>

            <div className="mda-mini-list">
              <div>
                <span>Novas mensagens</span>
                <strong>0</strong>
              </div>

              <div>
                <span>Comunicados pendentes</span>
                <strong>0</strong>
              </div>

              <div>
                <span>Alertas da unidade</span>
                <strong>0</strong>
              </div>
            </div>
          </article>
        </section>
      </section>

      <aside className="mda-rightbar">
        <article className="mda-side-card">
          <div className="mda-side-title">
            <UserRound
              size={17}
              aria-hidden="true"
            />

            <strong>Resumo do Morador</strong>
          </div>

          <div className="mda-side-metrics">
            <div>
              <span>Perfil</span>
              <strong>Morador</strong>
            </div>

            <div>
              <span>Torre</span>
              <strong>Não disponível</strong>
            </div>

            <div>
              <span>Unidade</span>
              <strong>Não disponível</strong>
            </div>

            <div>
              <span>Garagem</span>
              <strong>Não disponível</strong>
            </div>

            <div>
              <span>Local</span>
              <strong>Não disponível</strong>
            </div>

            <div>
              <span>Dependentes</span>
              <strong>0</strong>
            </div>
          </div>
        </article>

        <article className="mda-side-card mda-side-card-blue">
          <div className="mda-side-title">
            <ShieldCheck
              size={17}
              aria-hidden="true"
            />

            <strong>
              Parceiros Chegou<span>!</span>
            </strong>
          </div>

          <div className="mda-side-banner">
            <div>
              <strong>Espaço para parceiros</strong>

              <span>
                Conteúdo institucional ou publicidade compatível
                com o plano será exibido neste espaço.
              </span>
            </div>
          </div>
        </article>

        <article className="mda-side-card">
          <div className="mda-side-title">
            <CircleHelp
              size={17}
              aria-hidden="true"
            />

            <strong>Orientações do Módulo</strong>
          </div>

          <ul className="mda-best-list">
            <li>
              Acompanhe suas encomendas pelo painel inicial.
            </li>

            <li>
              Consulte notificações e comunicados importantes.
            </li>

            <li>
              Mantenha os dados da sua unidade atualizados.
            </li>
          </ul>
        </article>
      </aside>
    </main>
  );
}