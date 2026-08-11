import {
  Eye,
  FileClock,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import "./LandingSecurity.css";

const pilaresSeguranca = [
  {
    id: "acesso",
    icon: UserRoundCheck,
    title: "Acesso de acordo com cada perfil",
    description:
      "Administração, portaria, funcionários, moradores e dependentes utilizam somente as áreas e informações permitidas para sua atuação.",
  },
  {
    id: "isolamento",
    icon: LockKeyhole,
    title: "Informações separadas por condomínio",
    description:
      "Cada condomínio opera dentro do seu próprio contexto, ajudando a preservar a separação e a confidencialidade das informações.",
  },
  {
    id: "historico",
    icon: FileClock,
    title: "Histórico e rastreabilidade",
    description:
      "Ações relevantes podem ser registradas para oferecer acompanhamento, transparência e suporte à auditoria da operação.",
  },
  {
    id: "privacidade",
    icon: Eye,
    title: "Privacidade desde a experiência",
    description:
      "A plataforma é estruturada para exibir apenas as informações necessárias a cada pessoa e contexto autorizado.",
  },
];

export default function LandingSecurity() {
  return (
    <section
      id="seguranca"
      className="landing-security"
      aria-labelledby="landing-security-title"
    >
      <div className="landing-security__container">
        <div className="landing-security__intro">
          <span className="landing-security__eyebrow">
            SEGURANÇA E CONFIABILIDADE
          </span>

          <h2 id="landing-security-title">
            Tecnologia para organizar.{" "}
            <span>Segurança para confiar.</span>
          </h2>

          <p>
            O Sistema Chegou! combina organização da operação,
            controle de acesso, rastreabilidade e proteção das
            informações para apoiar uma experiência mais segura
            no condomínio.
          </p>

          <div className="landing-security__commitment">
            <ShieldCheck
              size={24}
              strokeWidth={1.9}
              aria-hidden="true"
            />

            <div>
              <strong>
                Segurança faz parte da arquitetura da plataforma
              </strong>

              <span>
                Permissões, registros e separação de contextos são
                considerados desde a construção de cada experiência.
              </span>
            </div>
          </div>
        </div>

        <div className="landing-security__panel">
          <div
            className="landing-security__panel-decoration"
            aria-hidden="true"
          />

          <div className="landing-security__panel-header">
            <div className="landing-security__shield">
              <ShieldCheck
                size={34}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>

            <div>
              <span>PROTEÇÃO EM CADA CONTEXTO</span>

              <strong>
                A informação certa para a pessoa certa.
              </strong>
            </div>
          </div>

          <div className="landing-security__panel-points">
            <div>
              <KeyRound
                size={19}
                strokeWidth={1.9}
                aria-hidden="true"
              />

              <span>Controle de acesso</span>
            </div>

            <div>
              <FileClock
                size={19}
                strokeWidth={1.9}
                aria-hidden="true"
              />

              <span>Registros da operação</span>
            </div>

            <div>
              <LockKeyhole
                size={19}
                strokeWidth={1.9}
                aria-hidden="true"
              />

              <span>Proteção de informações</span>
            </div>
          </div>

          <p className="landing-security__panel-note">
            O Sistema Chegou! adota princípios de privacidade,
            rastreabilidade e controle de acesso compatíveis com
            uma plataforma condominial profissional.
          </p>
        </div>

        <div className="landing-security__grid">
          {pilaresSeguranca.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.id}
                className="landing-security__card"
              >
                <div
                  className="landing-security__card-icon"
                  aria-hidden="true"
                >
                  <Icon
                    size={22}
                    strokeWidth={1.9}
                  />
                </div>

                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="landing-security__lgpd">
          <ShieldCheck
            size={20}
            strokeWidth={1.9}
            aria-hidden="true"
          />

          <p>
            Privacidade e proteção de dados são consideradas na
            evolução do Sistema Chegou!, observando os princípios
            aplicáveis da LGPD.
          </p>
        </div>
      </div>
    </section>
  );
}