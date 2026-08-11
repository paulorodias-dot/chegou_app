import {
  ArrowRight,
  Star,
  User,
} from "lucide-react";

import "./LandingReviews.css";

const reviewsPreview = [
  {
    id: "review-1",
    quote:
      "O Chegou! mudou completamente a forma como gerenciamos as encomendas e nos comunicamos com os moradores.",
    name: "Carlos A.",
    role: "Síndico Profissional",
  },
  {
    id: "review-2",
    quote:
      "Muito mais organização, segurança e praticidade no dia a dia. Nossa portaria e os moradores ganharam tempo e tranquilidade.",
    name: "Mariana L.",
    role: "Administradora",
  },
  {
    id: "review-3",
    quote:
      "Os relatórios e indicadores nos ajudam a tomar decisões muito melhores para o condomínio.",
    name: "Fernando S.",
    role: "Conselheiro",
  },
];

export default function LandingReviews() {
  return (
    <section
      id="avaliacoes"
      className="landing-reviews"
      aria-labelledby="landing-reviews-title"
    >
      <div className="landing-reviews__container">
        <header className="landing-reviews__heading">
          <h2 id="landing-reviews-title">
            A opinião de quem já usa e aprova
          </h2>
        </header>

        <div className="landing-reviews__grid">
          {/* ==================================================
              NOTA GERAL — PREVIEW
          ================================================== */}

          <article className="landing-reviews__rating-card">
            <strong className="landing-reviews__rating-value">
              4,8
            </strong>

            <div
              className="landing-reviews__stars landing-reviews__stars--large"
              aria-label="Avaliação de preview: 4,8 de 5"
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  size={18}
                  strokeWidth={1.7}
                  fill="currentColor"
                  aria-hidden="true"
                />
              ))}
            </div>

            <span className="landing-reviews__rating-label">
              de 5 estrelas
            </span>

            <p>
              Baseado em 126 avaliações de moradores e administradores
            </p>

            <button
              type="button"
              className="landing-reviews__all"
            >
              Ver todas as avaliações

              <ArrowRight
                size={15}
                aria-hidden="true"
              />
            </button>
          </article>

          {/* ==================================================
              DEPOIMENTOS
          ================================================== */}

          {reviewsPreview.map((review) => (
            <article
              key={review.id}
              className="landing-reviews__testimonial"
            >
              <span
                className="landing-reviews__quote"
                aria-hidden="true"
              >
                “
              </span>

              <p className="landing-reviews__testimonial-text">
                {review.quote}
              </p>

              <div className="landing-reviews__author">
                <div
                  className="landing-reviews__avatar"
                  aria-hidden="true"
                >
                  <User
                    size={17}
                    strokeWidth={1.9}
                  />
                </div>

                <div>
                  <strong>{review.name}</strong>
                  <span>{review.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}