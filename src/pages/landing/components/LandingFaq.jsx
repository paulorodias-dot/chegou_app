import { useState } from "react";
import {
  BellRing,
  ChevronDown,
  CircleHelp,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  UsersRound,
  WalletCards,
} from "lucide-react";

import "./LandingFaq.css";

const perguntas = [
  {
    id: "quem-pode-usar",
    icon: UsersRound,
    question: "Quem pode utilizar o Sistema Chegou!?",
    answer:
      "A plataforma foi pensada para conectar diferentes públicos do condomínio, como administração, portaria, funcionários, moradores e dependentes autorizados, respeitando o acesso adequado a cada perfil.",
  },
  {
    id: "encomendas",
    icon: PackageCheck,
    question: "O Chegou! serve apenas para controlar encomendas?",
    answer:
      "Não. A Central de Encomendas é uma parte importante da plataforma, mas o Sistema Chegou! está sendo desenvolvido como um ecossistema para apoiar diferentes rotinas, serviços e experiências do condomínio.",
  },
  {
    id: "notificacoes",
    icon: BellRing,
    question: "Os moradores recebem avisos pelo sistema?",
    answer:
      "Sim. A plataforma possui uma experiência de notificações para manter as pessoas informadas sobre acontecimentos e processos relevantes, de acordo com cada funcionalidade e regra aplicável.",
  },
  {
    id: "seguranca",
    icon: ShieldCheck,
    question: "Como o Sistema Chegou! trata segurança e privacidade?",
    answer:
      "A plataforma utiliza controle por perfil e contexto, separação das informações de cada condomínio e registros de ações importantes. Privacidade, rastreabilidade e proteção de dados fazem parte das diretrizes de evolução do sistema.",
  },
  {
    id: "celular",
    icon: Smartphone,
    question: "Posso utilizar o Sistema Chegou! pelo celular?",
    answer:
      "Sim. A experiência é desenvolvida para funcionar em computadores, tablets e celulares. A plataforma também está preparada para oferecer uma experiência semelhante à de um aplicativo quando instalada como PWA em dispositivos compatíveis.",
  },
  {
    id: "assinaturas",
    icon: WalletCards,
    question: "Como funcionam as assinaturas?",
    answer:
      "As assinaturas serão mensais. As opções poderão variar conforme os recursos e módulos necessários para cada condomínio, com as condições apresentadas de forma clara antes da contratação.",
  },
];

export default function LandingFaq() {
  const [perguntaAberta, setPerguntaAberta] = useState(null);

  function alternarPergunta(id) {
    setPerguntaAberta((atual) =>
      atual === id ? null : id
    );
  }

  return (
    <section
      id="duvidas"
      className="landing-faq"
      aria-labelledby="landing-faq-title"
    >
      <div className="landing-faq__container">
        <header className="landing-faq__heading">
          <span className="landing-faq__eyebrow">
            DÚVIDAS FREQUENTES
          </span>

          <h2 id="landing-faq-title">
            Algumas respostas para você conhecer melhor o{" "}
            <span>Sistema Chegou!</span>
          </h2>

          <p>
            Informações simples e diretas sobre a plataforma,
            seus recursos e a experiência dentro do condomínio.
          </p>
        </header>

        <div className="landing-faq__layout">
          <aside className="landing-faq__intro-card">
            <div
              className="landing-faq__intro-icon"
              aria-hidden="true"
            >
              <CircleHelp
                size={32}
                strokeWidth={1.8}
              />
            </div>

            <h3>Ainda ficou com alguma dúvida?</h3>

            <p>
              No final da página você encontrará os canais para
              falar com a Equipe Chegou!.
            </p>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("contato")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              }
            >
              Ver canais de atendimento
            </button>
          </aside>

          <div className="landing-faq__questions">
            {perguntas.map((item) => {
              const Icon = item.icon;
              const aberta =
                perguntaAberta === item.id;

              const answerId = `faq-answer-${item.id}`;
              const buttonId = `faq-button-${item.id}`;

              return (
                <article
                  key={item.id}
                  className={
                    aberta
                      ? "landing-faq__item landing-faq__item--open"
                      : "landing-faq__item"
                  }
                >
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={aberta}
                      aria-controls={answerId}
                      onClick={() =>
                        alternarPergunta(item.id)
                      }
                    >
                      <span className="landing-faq__question-content">
                        <span
                          className="landing-faq__question-icon"
                          aria-hidden="true"
                        >
                          <Icon
                            size={20}
                            strokeWidth={1.9}
                          />
                        </span>

                        <span>{item.question}</span>
                      </span>

                      <ChevronDown
                        size={20}
                        strokeWidth={2}
                        aria-hidden="true"
                        className={
                          aberta
                            ? "landing-faq__chevron landing-faq__chevron--open"
                            : "landing-faq__chevron"
                        }
                      />
                    </button>
                  </h3>

                  <div
                    id={answerId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={
                      aberta
                        ? "landing-faq__answer landing-faq__answer--open"
                        : "landing-faq__answer"
                    }
                  >
                    <div>
                      <p>{item.answer}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}