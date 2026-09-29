import React from "react";
import {
  ChevronRight,
  HeartHandshake,
  PawPrint,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import "./FamiliaVinculos.css";


function normalizarQuantidade(valor) {
  const numero = Number(valor);

  if (
    !Number.isFinite(numero) ||
    numero < 0
  ) {
    return 0;
  }

  return Math.floor(numero);
}


function textoQuantidade(
  quantidade,
  singular,
  plural
) {
  return `${quantidade} ${
    quantidade === 1
      ? singular
      : plural
  }`;
}


function AcaoVisual({
  label = "Ver detalhes",
}) {
  return (
    <button
      type="button"
      className="familia-vinculos__action"
      disabled
      aria-label={`${label} — indisponível nesta etapa`}
      title="Esta opção será integrada posteriormente"
    >
      <span>
        {label}
      </span>

      <ChevronRight
        size={14}
        aria-hidden="true"
      />
    </button>
  );
}


function ResumoVinculo({
  icon: Icon,
  titulo,
  quantidade,
  singular,
  plural,
  descricao,
  destaque = false,
}) {
  return (
    <article
      className={`
        familia-vinculos__summary
        ${
          destaque
            ? "familia-vinculos__summary--featured"
            : ""
        }
      `}
    >
      <div className="familia-vinculos__summary-top">
        <span className="familia-vinculos__summary-icon">
          <Icon
            size={18}
            aria-hidden="true"
          />
        </span>

        <span className="familia-vinculos__summary-title">
          {titulo}
        </span>
      </div>

      <div className="familia-vinculos__summary-content">
        <strong className="familia-vinculos__summary-count">
          {textoQuantidade(
            quantidade,
            singular,
            plural
          )}
        </strong>

        {descricao ? (
          <p>
            {descricao}
          </p>
        ) : null}
      </div>

      <AcaoVisual />
    </article>
  );
}


export default function FamiliaVinculos({
  dados,
  loading = false,
}) {
  if (loading) {
    return (
      <section
        className="
          familia-vinculos
          familia-vinculos--loading
        "
        aria-label="Carregando família e vínculos"
        aria-busy="true"
      >
        <div className="familia-vinculos__header">
          <div
            className="
              familia-vinculos__skeleton
              familia-vinculos__skeleton--title
            "
            aria-hidden="true"
          />

          <div
            className="
              familia-vinculos__skeleton
              familia-vinculos__skeleton--subtitle
            "
            aria-hidden="true"
          />
        </div>

        <div className="familia-vinculos__summary-grid">
          {Array.from({
            length: 3,
          }).map((_, index) => (
            <div
              className="
                familia-vinculos__skeleton
                familia-vinculos__skeleton--card
              "
              key={index}
              aria-hidden="true"
            />
          ))}
        </div>

        <div
          className="
            familia-vinculos__skeleton
            familia-vinculos__skeleton--authorization
          "
          aria-hidden="true"
        />

        <span className="sr-only">
          Carregando família e vínculos.
        </span>
      </section>
    );
  }


  const dependentes =
    normalizarQuantidade(
      dados?.dependentes
    );

  const funcionarios =
    normalizarQuantidade(
      dados?.funcionarios
    );

  const pets =
    normalizarQuantidade(
      dados?.pets
    );

  const autorizacoes =
    normalizarQuantidade(
      dados?.autorizacoesAtivas
    );


  return (
    <section
      className="familia-vinculos"
      aria-labelledby="familia-vinculos-titulo"
    >
      <header className="familia-vinculos__header">
        <div className="familia-vinculos__heading">
          <span className="familia-vinculos__heading-icon">
            <UsersRound
              size={19}
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 id="familia-vinculos-titulo">
              Minha Família e Vínculos
            </h2>

            <p>
              Pessoas, vínculos e autorizações relacionadas à sua
              unidade.
            </p>
          </div>
        </div>
      </header>


      <div className="familia-vinculos__summary-grid">
        <ResumoVinculo
          icon={UsersRound}
          titulo="Dependentes"
          quantidade={dependentes}
          singular="cadastrado"
          plural="cadastrados"
          descricao="Acesso e permissões vinculadas ao Morador Responsável."
          destaque
        />

        <ResumoVinculo
          icon={UserRound}
          titulo="Funcionários do lar"
          quantidade={funcionarios}
          singular="cadastrado"
          plural="cadastrados"
          descricao="Pessoas vinculadas à rotina da sua unidade."
        />

        <ResumoVinculo
          icon={PawPrint}
          titulo="Pets"
          quantidade={pets}
          singular="cadastrado"
          plural="cadastrados"
          descricao="Animais cadastrados para sua unidade."
        />
      </div>


      <article className="familia-vinculos__authorization">
        <div className="familia-vinculos__authorization-main">
          <span className="familia-vinculos__authorization-icon">
            <HeartHandshake
              size={18}
              aria-hidden="true"
            />
          </span>

          <div>
            <div className="familia-vinculos__authorization-title">
              <strong>
                Autorizações
              </strong>

              <span>
                <ShieldCheck
                  size={13}
                  aria-hidden="true"
                />

                {textoQuantidade(
                  autorizacoes,
                  "autorização ativa",
                  "autorizações ativas"
                )}
              </span>
            </div>

            <p>
              Pessoas autorizadas e permissões vinculadas à sua unidade.
            </p>
          </div>
        </div>

        <AcaoVisual />
      </article>
    </section>
  );
}