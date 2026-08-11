import {
  Quote,
  Star,
} from "lucide-react";

import "./ParceirosTestimonials.css";

const PREVIEW_TESTIMONIALS = [
  {
    name: "Mariana Costa",
    company: "Ateliê Casa & Estilo",
    rating: 5,
    text:
      "A proposta do Programa Parceiros facilitou nossa presença junto ao público dos condomínios e trouxe uma experiência muito organizada.",
  },
  {
    name: "Ricardo Menezes",
    company: "RM Serviços Residenciais",
    rating: 5,
    text:
      "A possibilidade de acompanhar campanhas e entender melhor o alcance ajuda muito na tomada de decisão comercial.",
  },
  {
    name: "Fernanda Lima",
    company: "Essenza Bem-Estar",
    rating: 5,
    text:
      "Gostei principalmente da transparência do modelo e da possibilidade de construir reputação dentro do ecossistema.",
  },
];

function Rating({ value }) {
  return (
    <div
      className="parceiros-testimonials__rating"
      aria-label={`${value} de 5 estrelas`}
    >
      {Array.from({ length: 5 }).map(
        (_, index) => (
          <Star
            key={index}
            size={13}
            strokeWidth={1.8}
            aria-hidden="true"
            className={
              index < value
                ? "is-active"
                : ""
            }
          />
        ),
      )}
    </div>
  );
}

export default function ParceirosTestimonials() {
  return (
    <section
      className="parceiros-testimonials"
      aria-labelledby="parceiros-testimonials-title"
    >
      <div className="parceiros-testimonials__inner">
        <header className="parceiros-testimonials__header">
          <span className="parceiros-testimonials__eyebrow">
            Experiência dos Parceiros
          </span>

          <h2
            id="parceiros-testimonials-title"
            className="parceiros-testimonials__title"
          >
            Quem cresce com o ecossistema,
            compartilha a experiência.
          </h2>

          <p className="parceiros-testimonials__subtitle">
            Conheça relatos de empresas que fazem
            parte do Programa Parceiros.
          </p>

          <span className="parceiros-testimonials__preview">
            Dados de Preview
          </span>
        </header>

        <div className="parceiros-testimonials__grid">
          {PREVIEW_TESTIMONIALS.map(
            ({
              name,
              company,
              rating,
              text,
            }) => (
              <article
                key={`${name}-${company}`}
                className="parceiros-testimonials__card"
              >
                <div className="parceiros-testimonials__quote">
                  <Quote
                    size={20}
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                </div>

                <Rating value={rating} />

                <blockquote>
                  {text}
                </blockquote>

                <footer className="parceiros-testimonials__person">
                  <div className="parceiros-testimonials__avatar">
                    {name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </div>

                  <div>
                    <strong>
                      {name}
                    </strong>

                    <span>
                      {company}
                    </span>
                  </div>
                </footer>
              </article>
            ),
          )}
        </div>

        <p className="parceiros-testimonials__footnote">
          Os depoimentos apresentados nesta etapa são
          exclusivamente demonstrativos. Na versão pública,
          somente avaliações e recomendações reais e autorizadas
          serão exibidas.
        </p>
      </div>
    </section>
  );
}