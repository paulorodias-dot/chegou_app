import { useState } from "react";

import {
  ChevronDown,
  CircleHelp,
} from "lucide-react";

import "./ParceirosFaq.css";

const FAQ_ITEMS = [
  {
    id: "quem-pode-participar",
    question:
      "Quem pode participar do Programa Parceiros?",
    answer:
      "Empresas, profissionais, prestadores e anunciantes compatíveis com as regras do Programa Parceiros podem solicitar participação. O cadastro passa por análise antes da ativação.",
  },
  {
    id: "cadastro-automatico",
    question:
      "O cadastro é aprovado automaticamente?",
    answer:
      "Não. A solicitação passa por análise conforme as regras e critérios vigentes do Programa Parceiros. Quando necessário, poderão ser solicitadas informações ou correções antes da aprovação.",
  },
  {
    id: "quanto-custa",
    question:
      "Quanto custa anunciar no Sistema Chegou!?",
    answer:
      "O valor depende das características da campanha, como período, abrangência, posicionamento e demais condições comerciais aplicáveis. O valor é apresentado antes da confirmação da contratação.",
  },
  {
    id: "comissao-vendas",
    question:
      "O Sistema Chegou! cobra comissão sobre as vendas?",
    answer:
      "Não. O Sistema Chegou! não participa da negociação comercial entre o Parceiro e o cliente e não cobra comissão sobre as vendas realizadas. A contratação ou compra ocorre diretamente entre as partes.",
  },
  {
    id: "chg",
    question:
      "O que são os Créditos Chegou! — CHG?",
    answer:
      "CHG é o crédito interno do Programa Parceiros. Quando houver saldo disponível e a regra vigente permitir sua utilização, o Parceiro poderá optar pelo uso. Nenhum crédito CHG é debitado automaticamente sem autorização.",
  },
  {
    id: "campanha-publicada",
    question:
      "Minha campanha é publicada imediatamente?",
    answer:
      "Não necessariamente. A campanha precisa respeitar as regras de conteúdo, elegibilidade, período e análise aplicáveis. A publicação ocorre somente quando a campanha estiver autorizada e dentro da vigência contratada.",
  },
  {
    id: "onde-aparece",
    question:
      "Onde minha publicidade poderá aparecer?",
    answer:
      "A distribuição depende da campanha contratada, da segmentação e dos placements autorizados. A publicidade pode ser exibida em áreas do Sistema Chegou! destinadas a campanhas, sempre conforme o contrato e a elegibilidade definida pelo domínio Parceiros/Publicidade.",
  },
  {
    id: "resultado-garantido",
    question:
      "O Sistema Chegou! garante vendas ou resultados?",
    answer:
      "Não. Alcance, interações e demais indicadores podem ser acompanhados e estimados conforme os dados disponíveis, mas nenhuma estimativa representa garantia de venda, contratação ou faturamento.",
  },
  {
    id: "avaliacoes",
    question:
      "As avaliações influenciam minha participação no programa?",
    answer:
      "Avaliações podem compor futuramente critérios de reputação, Score e evolução, conforme as regras vigentes. Elas não geram automaticamente Créditos CHG nem representam, isoladamente, mudança de nível.",
  },
];

export default function ParceirosFaq() {
  const [openId, setOpenId] =
    useState(FAQ_ITEMS[0].id);

  function toggleItem(id) {
    setOpenId((current) =>
      current === id ? null : id,
    );
  }

  return (
    <section
      id="duvidas"
      className="parceiros-faq"
      aria-labelledby="parceiros-faq-title"
    >
      <div className="parceiros-faq__inner">
        <header className="parceiros-faq__header">
          <span className="parceiros-faq__eyebrow">
            Dúvidas frequentes
          </span>

          <h2
            id="parceiros-faq-title"
            className="parceiros-faq__title"
          >
            Informações claras antes de você começar.
          </h2>

          <p className="parceiros-faq__subtitle">
            Entenda os principais pontos sobre participação,
            publicidade, cobranças e funcionamento do Programa
            Parceiros.
          </p>
        </header>

        <div className="parceiros-faq__layout">
          <aside className="parceiros-faq__intro">
            <div className="parceiros-faq__intro-icon">
              <CircleHelp
                size={26}
                strokeWidth={1.7}
                aria-hidden="true"
              />
            </div>

            <h3>
              Ainda ficou alguma dúvida?
            </h3>

            <p>
              Reunimos aqui as perguntas mais importantes
              para você conhecer o programa antes de
              solicitar sua participação.
            </p>

            <a
              href="#contato"
              className="parceiros-faq__contact-link"
            >
              Falar com a equipe
            </a>
          </aside>

          <div className="parceiros-faq__list">
            {FAQ_ITEMS.map(
              ({
                id,
                question,
                answer,
              }) => {
                const isOpen =
                  openId === id;

                return (
                  <article
                    key={id}
                    className={`parceiros-faq__item ${
                      isOpen
                        ? "is-open"
                        : ""
                    }`}
                  >
                    <h3 className="parceiros-faq__question">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`faq-content-${id}`}
                        onClick={() =>
                          toggleItem(id)
                        }
                      >
                        <span>
                          {question}
                        </span>

                        <ChevronDown
                          size={18}
                          strokeWidth={1.8}
                          aria-hidden="true"
                        />
                      </button>
                    </h3>

                    <div
                      id={`faq-content-${id}`}
                      className="parceiros-faq__answer"
                      hidden={!isOpen}
                    >
                      <p>
                        {answer}
                      </p>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        </div>
      </div>
    </section>
  );
}