import React from "react";
import {
  Building2,
  ChevronRight,
  ConciergeBell,
  Headphones,
  Home,
  Sparkles,
  Store,
  Wrench,
} from "lucide-react";

import "./ContatosServicos.css";


function ItemResumo({
  icon: Icon,
  titulo,
  descricao,
}) {
  return (
    <div className="contatos-servicos__item">
      <span className="contatos-servicos__item-icon">
        <Icon
          size={16}
          aria-hidden="true"
        />
      </span>

      <div className="contatos-servicos__item-content">
        <strong>
          {titulo}
        </strong>

        {descricao ? (
          <span>
            {descricao}
          </span>
        ) : null}
      </div>

      <ChevronRight
        className="contatos-servicos__item-chevron"
        size={15}
        aria-hidden="true"
      />
    </div>
  );
}


function AcaoVisual({
  children,
  ariaLabel,
}) {
  return (
    <button
      type="button"
      className="contatos-servicos__action"
      disabled
      aria-label={ariaLabel}
      title="Esta opção será integrada posteriormente"
    >
      <span>
        {children}
      </span>

      <ChevronRight
        size={14}
        aria-hidden="true"
      />
    </button>
  );
}


function CardContatosCondominio() {
  return (
    <article
      className="
        contatos-servicos__card
        contatos-servicos__card--condominio
      "
      aria-labelledby="contatos-condominio-titulo"
    >
      <header className="contatos-servicos__header">
        <span className="contatos-servicos__heading-icon">
          <Building2
            size={19}
            aria-hidden="true"
          />
        </span>

        <div>
          <h2 id="contatos-condominio-titulo">
            Contatos do Condomínio
          </h2>

          <p>
            Informações úteis disponibilizadas pelo seu condomínio.
          </p>
        </div>
      </header>


      <div className="contatos-servicos__items">
        <ItemResumo
          icon={Building2}
          titulo="Administração"
          descricao="Contato administrativo"
        />

        <ItemResumo
          icon={ConciergeBell}
          titulo="Portaria"
          descricao="Contato da portaria"
        />

        <ItemResumo
          icon={Headphones}
          titulo="Outros contatos"
          descricao="Informações adicionais"
        />
      </div>


      <footer className="contatos-servicos__footer">
        <span className="contatos-servicos__helper">
          Consulte os canais oficiais do condomínio.
        </span>

        <AcaoVisual
          ariaLabel="Ver contatos — indisponível nesta etapa"
        >
          Ver contatos
        </AcaoVisual>
      </footer>
    </article>
  );
}


function CardChegouConecta() {
  return (
    <article
      className="
        contatos-servicos__card
        contatos-servicos__card--conecta
      "
      aria-labelledby="chegou-conecta-titulo"
    >
      <header className="contatos-servicos__header">
        <span
          className="
            contatos-servicos__heading-icon
            contatos-servicos__heading-icon--conecta
          "
        >
          <Sparkles
            size={19}
            aria-hidden="true"
          />
        </span>

        <div>
          <div className="contatos-servicos__conecta-title">
            <h2 id="chegou-conecta-titulo">
              Chegou! Conecta
            </h2>

            <span>
              Serviços
            </span>
          </div>

          <p>
            Serviços úteis para o seu dia a dia.
          </p>
        </div>
      </header>


      <div className="contatos-servicos__items">
        <ItemResumo
          icon={Home}
          titulo="Serviços para o lar"
          descricao="Soluções para sua residência"
        />

        <ItemResumo
          icon={Wrench}
          titulo="Manutenção"
          descricao="Serviços especializados"
        />

        <ItemResumo
          icon={Store}
          titulo="Outros serviços"
          descricao="Mais opções para você"
        />
      </div>


      <footer className="contatos-servicos__footer">
        <span className="contatos-servicos__helper">
          Opções disponíveis pelo Sistema Chegou!.
        </span>

        <AcaoVisual
          ariaLabel="Explorar serviços — indisponível nesta etapa"
        >
          Explorar serviços
        </AcaoVisual>
      </footer>
    </article>
  );
}


export default function ContatosServicos({
  loading = false,
}) {
  if (loading) {
    return (
      <section
        className="
          contatos-servicos
          contatos-servicos--loading
        "
        aria-label="Carregando contatos e serviços"
        aria-busy="true"
      >
        {[0, 1].map((item) => (
          <div
            className="contatos-servicos__skeleton-card"
            key={item}
            aria-hidden="true"
          >
            <div
              className="
                contatos-servicos__skeleton
                contatos-servicos__skeleton--title
              "
            />

            <div
              className="
                contatos-servicos__skeleton
                contatos-servicos__skeleton--line
              "
            />

            <div
              className="
                contatos-servicos__skeleton
                contatos-servicos__skeleton--item
              "
            />

            <div
              className="
                contatos-servicos__skeleton
                contatos-servicos__skeleton--item
              "
            />

            <div
              className="
                contatos-servicos__skeleton
                contatos-servicos__skeleton--item
              "
            />
          </div>
        ))}

        <span className="sr-only">
          Carregando contatos e serviços.
        </span>
      </section>
    );
  }


  return (
    <section
      className="contatos-servicos"
      aria-label="Contatos e serviços"
    >
      <CardContatosCondominio />

      <CardChegouConecta />
    </section>
  );
}