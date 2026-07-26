import {
  BellRing,
  Boxes,
  Clock3,
  Home,
  Package,
  PackageCheck,
  PackagePlus,
  ScanLine,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import "./PortariaInicio.css";

const ACOES_RAPIDAS = [
  {
    id: "receber",
    titulo: "Receber",
    descricao: "Registrar nova encomenda",
    icone: PackagePlus,
  },
  {
    id: "rapida",
    titulo: "Encomenda rápida",
    descricao: "Entrada simplificada",
    icone: ScanLine,
  },
  {
    id: "retirada",
    titulo: "Liberar retirada",
    descricao: "Validar e entregar",
    icone: UserRoundCheck,
  },
  {
    id: "painel",
    titulo: "Encomendas",
    descricao: "Acompanhar a operação",
    icone: Boxes,
  },
];

const KPIS_INICIAIS = [
  {
    id: "recebidas",
    titulo: "Recebidas hoje",
    valor: 0,
    detalhe: "Nenhuma entrada registrada",
    icone: Package,
  },
  {
    id: "aguardando",
    titulo: "Aguardando retirada",
    valor: 0,
    detalhe: "Nenhuma encomenda pendente",
    icone: Clock3,
  },
  {
    id: "retiradas",
    titulo: "Retiradas hoje",
    valor: 0,
    detalhe: "Nenhuma retirada registrada",
    icone: PackageCheck,
  },
  {
    id: "pendencias",
    titulo: "Pendências",
    valor: 0,
    detalhe: "Operação sem pendências",
    icone: BellRing,
  },
];

export default function PortariaInicio({ perfil }) {
  const nome =
    perfil?.nome?.trim()?.split(/\s+/)?.[0] ||
    "Operador";

  return (
    <section className="portaria-inicio-page">
      <header className="portaria-inicio-header">
        <div className="portaria-inicio-header__content">
          <span className="portaria-inicio-kicker">
            <Home size={14} aria-hidden="true" />
            Módulo Portaria
          </span>

          <h1>Olá, {nome}!</h1>

          <p>
            Acompanhe a operação do dia e acesse os principais
            processos da Portaria.
          </p>
        </div>

        <div
          className="portaria-inicio-header__status"
          aria-label="Situação da operação"
        >
          <span
            className="portaria-status-indicator"
            aria-hidden="true"
          />

          <div>
            <strong>Operação disponível</strong>
            <span>Central de Encomendas</span>
          </div>

          <ShieldCheck size={22} aria-hidden="true" />
        </div>
      </header>

      <section
        className="portaria-section"
        aria-labelledby="portaria-acoes-titulo"
      >
        <div className="portaria-section-heading">
          <div>
            <span className="portaria-section-eyebrow">
              Operação
            </span>

            <h2 id="portaria-acoes-titulo">
              Ações rápidas
            </h2>
          </div>

          <span className="portaria-section-helper">
            As funcionalidades serão liberadas gradualmente
          </span>
        </div>

        <div className="portaria-acoes-grid">
          {ACOES_RAPIDAS.map((acao) => {
            const Icone = acao.icone;

            return (
              <article
                key={acao.id}
                className="portaria-acao-card portaria-acao-card--indisponivel"
                aria-label={`${acao.titulo} — em breve`}
              >
                <span className="portaria-acao-card__icone">
                  <Icone size={25} aria-hidden="true" />
                </span>

                <span className="portaria-acao-card__conteudo">
                  <strong>{acao.titulo}</strong>

                  <span className="portaria-acao-card__descricao">
                    {acao.descricao}
                  </span>
                </span>

                <span className="portaria-acao-card__em-breve">
                  Em breve
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="portaria-section"
        aria-labelledby="portaria-resumo-titulo"
      >
        <div className="portaria-section-heading portaria-section-heading--resumo">
          <div>
            <span className="portaria-section-eyebrow">
              Hoje
            </span>

            <h2 id="portaria-resumo-titulo">
              Resumo operacional
            </h2>
          </div>

          <div className="portaria-meus-processos">
            <span>Dados operacionais em preparação</span>
          </div>
        </div>

        <div className="portaria-kpis-grid">
          {KPIS_INICIAIS.map((kpi) => {
            const Icone = kpi.icone;

            return (
              <article
                key={kpi.id}
                className="portaria-kpi-card"
              >
                <div className="portaria-kpi-card__topo">
                  <span className="portaria-kpi-card__icone">
                    <Icone size={20} aria-hidden="true" />
                  </span>

                  <span className="portaria-kpi-card__titulo">
                    {kpi.titulo}
                  </span>
                </div>

                <strong className="portaria-kpi-card__valor">
                  {kpi.valor}
                </strong>

                <span className="portaria-kpi-card__detalhe">
                  {kpi.detalhe}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      <div className="portaria-conteudo-grid">
        <section
          className="portaria-operacao-card"
          aria-labelledby="portaria-operacao-titulo"
        >
          <div className="portaria-operacao-card__icone">
            <PackageCheck size={26} aria-hidden="true" />
          </div>

          <div className="portaria-operacao-card__conteudo">
            <span className="portaria-section-eyebrow">
              Central de Encomendas
            </span>

            <h2 id="portaria-operacao-titulo">
              Módulo Portaria
            </h2>

            <p>
              Os processos de recebimento, armazenamento,
              acompanhamento e retirada serão disponibilizados
              nesta área.
            </p>
          </div>
        </section>

        <aside
          className="portaria-publicidade-card"
          aria-label="Publicidade de parceiros"
        >
          <div className="portaria-publicidade-card__marca">
            Sistema Chegou!
          </div>

          <strong>Espaço para parceiros</strong>

          <p>
            Conteúdo institucional ou publicidade compatível com o
            plano do condomínio será exibido neste espaço.
          </p>
        </aside>
      </div>
    </section>
  );
}