import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import seloNivel1 from "../../assets/selos/parceiro-nivel-1.png";
import seloNivel2 from "../../assets/selos/parceiro-nivel-2.png";
import seloNivel3 from "../../assets/selos/parceiro-nivel-3.png";
import seloNivel4 from "../../assets/selos/parceiro-nivel-4.png";
import seloNivel5 from "../../assets/selos/parceiro-nivel-5.png";
import seloNivel6 from "../../assets/selos/parceiro-nivel-6.png";

import "./ParceirosProgram.css";

const LEVELS = [
  {
    level: 1,
    seal: seloNivel1,
    title: "Nível 1",
    description: "Início da sua jornada no Programa Parceiros.",
  },
  {
    level: 2,
    seal: seloNivel2,
    title: "Nível 2",
    description: "Evolução com participação e relacionamento.",
  },
  {
    level: 3,
    seal: seloNivel3,
    title: "Nível 3",
    description: "Mais consistência e presença no ecossistema.",
  },
  {
    level: 4,
    seal: seloNivel4,
    title: "Nível 4",
    description: "Reconhecimento crescente dentro do programa.",
  },
  {
    level: 5,
    seal: seloNivel5,
    title: "Nível 5",
    description: "Estágio avançado de relacionamento e desempenho.",
  },
  {
    level: 6,
    seal: seloNivel6,
    title: "Nível 6",
    description: "O nível mais avançado da jornada de evolução.",
  },
];

const PROGRAM_BENEFITS = [
  {
    icon: TrendingUp,
    title: "Evolução contínua",
    description:
      "Sua trajetória considera critérios do programa, atividade e consistência ao longo do tempo.",
  },
  {
    icon: Sparkles,
    title: "Benefícios por evolução",
    description:
      "Novos níveis podem ampliar benefícios, reconhecimento e oportunidades dentro do ecossistema.",
  },
  {
    icon: ShieldCheck,
    title: "Critérios transparentes",
    description:
      "Score, níveis e benefícios seguem regras próprias, auditáveis e independentes dos Créditos CHG.",
  },
];

export default function ParceirosProgram() {
  return (
    <section
      id="programa-parceiros"
      className="parceiros-program"
      aria-labelledby="parceiros-program-title"
    >
      <div className="parceiros-program__inner">
        <header className="parceiros-program__header">
          <span className="parceiros-program__eyebrow">
            Programa Parceiros
          </span>

          <h2
            id="parceiros-program-title"
            className="parceiros-program__title"
          >
            Evolua, conquiste reconhecimento e amplie seus benefícios.
          </h2>

          <p className="parceiros-program__subtitle">
            Sua participação pode evoluir ao longo do relacionamento com o
            Sistema Chegou!, seguindo critérios transparentes do programa.
          </p>
        </header>

        <div className="parceiros-program__levels">
          {LEVELS.map((item, index) => (
            <div
              className="parceiros-program__level-wrapper"
              key={item.level}
            >
              <article className="parceiros-program__level">
                <div className="parceiros-program__seal-area">
                  <img
                    className="parceiros-program__seal"
                    src={item.seal}
                    alt={`Selo oficial ${item.title} do Programa Parceiros`}
                  />
                </div>

                <strong className="parceiros-program__level-title">
                  {item.title}
                </strong>

                <p className="parceiros-program__level-description">
                  {item.description}
                </p>
              </article>

              {index < LEVELS.length - 1 && (
                <div
                  className="parceiros-program__level-arrow"
                  aria-hidden="true"
                >
                  <ArrowRight
                    size={16}
                    strokeWidth={1.7}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="parceiros-program__benefits">
          {PROGRAM_BENEFITS.map(
            ({
              icon: Icon,
              title,
              description,
            }) => (
              <article
                className="parceiros-program__benefit"
                key={title}
              >
                <span className="parceiros-program__benefit-icon">
                  <Icon
                    size={20}
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ),
          )}
        </div>

        <div className="parceiros-program__note">
          <CheckCircle2
            size={17}
            strokeWidth={1.9}
            aria-hidden="true"
          />

          <p>
            Score, nível e Créditos CHG são conceitos diferentes. A evolução
            no Programa Parceiros considera as regras vigentes e não representa
            saldo financeiro ou garantia de benefício automático.
          </p>
        </div>
      </div>
    </section>
  );
}