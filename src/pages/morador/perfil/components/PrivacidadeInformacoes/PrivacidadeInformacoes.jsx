import React from "react";
import {
  BellRing,
  Building2,
  ChevronRight,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import "./PrivacidadeInformacoes.css";


function ItemInformacao({
  icon: Icon,
  titulo,
  descricao,
}) {
  return (
    <article className="privacidade-informacoes__item">
      <span className="privacidade-informacoes__item-icon">
        <Icon
          size={18}
          aria-hidden="true"
        />
      </span>

      <div className="privacidade-informacoes__item-content">
        <strong>
          {titulo}
        </strong>

        <p>
          {descricao}
        </p>
      </div>

      <button
        type="button"
        className="privacidade-informacoes__item-action"
        disabled
        aria-label={`${titulo} — indisponível nesta etapa`}
        title="Esta opção será integrada posteriormente"
      >
        <span>
          Ver detalhes
        </span>

        <ChevronRight
          size={14}
          aria-hidden="true"
        />
      </button>
    </article>
  );
}


export default function PrivacidadeInformacoes({
  loading = false,
}) {
  if (loading) {
    return (
      <section
        className="
          privacidade-informacoes
          privacidade-informacoes--loading
        "
        aria-label="Carregando privacidade e informações"
        aria-busy="true"
      >
        <div className="privacidade-informacoes__header">
          <div
            className="
              privacidade-informacoes__skeleton
              privacidade-informacoes__skeleton--title
            "
            aria-hidden="true"
          />

          <div
            className="
              privacidade-informacoes__skeleton
              privacidade-informacoes__skeleton--subtitle
            "
            aria-hidden="true"
          />
        </div>

        <div className="privacidade-informacoes__grid">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              className="
                privacidade-informacoes__skeleton
                privacidade-informacoes__skeleton--item
              "
              key={index}
              aria-hidden="true"
            />
          ))}
        </div>

        <span className="sr-only">
          Carregando privacidade e informações.
        </span>
      </section>
    );
  }


  return (
    <section
      className="privacidade-informacoes"
      aria-labelledby="privacidade-informacoes-titulo"
    >
      <header className="privacidade-informacoes__header">
        <div className="privacidade-informacoes__heading">
          <span className="privacidade-informacoes__heading-icon">
            <ShieldCheck
              size={19}
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 id="privacidade-informacoes-titulo">
              Privacidade e Informações
            </h2>

            <p>
              Consulte seus registros, documentos e preferências.
            </p>
          </div>
        </div>
      </header>


      <div className="privacidade-informacoes__grid">
        <ItemInformacao
          icon={LockKeyhole}
          titulo="Privacidade e dados"
          descricao="Informações sobre o uso e a proteção dos seus dados."
        />

        <ItemInformacao
          icon={FileCheck2}
          titulo="Termos e aceites"
          descricao="Consulte documentos e registros relacionados aos seus aceites."
        />

        <ItemInformacao
          icon={Building2}
          titulo="Regras do condomínio"
          descricao="Acesse informações disponibilizadas pelo seu condomínio."
        />

        <ItemInformacao
          icon={BellRing}
          titulo="Preferências"
          descricao="Consulte suas preferências disponíveis no Sistema Chegou!."
        />
      </div>


      <footer className="privacidade-informacoes__footer">
        <ShieldCheck
          size={14}
          aria-hidden="true"
        />

        <p>
          Suas informações são apresentadas conforme os registros
          oficiais disponíveis para sua conta.
        </p>
      </footer>
    </section>
  );
}