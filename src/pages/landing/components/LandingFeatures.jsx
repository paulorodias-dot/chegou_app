import {
  BellRing,
  Boxes,
  History,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import "./LandingFeatures.css";

const recursos = [
  {
    id: "encomendas",
    icon: Boxes,
    title: "Encomendas organizadas do recebimento à retirada",
    description:
      "Mais controle para receber, identificar, armazenar, acompanhar e concluir cada processo com segurança e rastreabilidade.",
  },
  {
    id: "comunicacao",
    icon: BellRing,
    title: "Comunicação que mantém todos informados",
    description:
      "Avisos e notificações ajudam moradores e equipes a acompanhar o que importa sem depender de ligações e controles paralelos.",
  },
  {
    id: "acessos",
    icon: UsersRound,
    title: "Cada pessoa acessa apenas o que precisa",
    description:
      "Administração, portaria, funcionários, moradores e dependentes utilizam experiências adequadas às suas responsabilidades.",
  },
  {
    id: "controle",
    icon: ShieldCheck,
    title: "Mais segurança, histórico e controle da operação",
    description:
      "Ações importantes ficam organizadas para oferecer mais transparência, rastreabilidade e confiança ao condomínio.",
  },
];

export default function LandingFeatures() {
  return (
    <section
      id="recursos"
      className="landing-features"
      aria-labelledby="landing-features-title"
    >
      <div className="landing-features__container">
        <div className="landing-features__heading">
          <div>
            <span className="landing-features__eyebrow">
              TUDO QUE SEU CONDOMÍNIO PRECISA
            </span>

            <h2 id="landing-features-title">
              Uma plataforma completa para facilitar{" "}
              <span>cada detalhe da gestão</span>
            </h2>
          </div>

          <p>
            Recursos pensados para conectar a administração,
            organizar a operação e melhorar a experiência das
            pessoas que fazem parte do condomínio.
          </p>
        </div>

        <div className="landing-features__grid">
          {recursos.map((recurso) => {
            const Icon = recurso.icon;

            return (
              <article
                key={recurso.id}
                className="landing-features__card"
              >
                <div
                  className="landing-features__icon"
                  aria-hidden="true"
                >
                  <Icon size={25} strokeWidth={1.9} />
                </div>

                <h3>{recurso.title}</h3>

                <p>{recurso.description}</p>
              </article>
            );
          })}
        </div>

        <div className="landing-features__trust">
          <History size={20} aria-hidden="true" />

          <p>
            Uma experiência conectada entre gestão, operação e
            moradores, com evolução contínua da plataforma.
          </p>
        </div>
      </div>
    </section>
  );
}