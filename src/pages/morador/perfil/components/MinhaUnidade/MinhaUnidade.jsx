import React from "react";
import {
  Building2,
  CircleAlert,
  Home,
  MapPin,
  Wrench,
} from "lucide-react";

import "./MinhaUnidade.css";


function textoOuPadrao(
  valor,
  padrao = "Não informado"
) {
  if (typeof valor === "string") {
    const texto = valor.trim();

    return texto || padrao;
  }

  if (
    valor === null ||
    valor === undefined
  ) {
    return padrao;
  }

  return valor;
}


function CampoUnidade({
  label,
  valor,
  icon: Icon,
}) {
  return (
    <div className="minha-unidade__field">
      <div className="minha-unidade__field-label">
        <Icon
          size={14}
          aria-hidden="true"
        />

        <span>
          {label}
        </span>
      </div>

      <strong>
        {valor}
      </strong>
    </div>
  );
}


export default function MinhaUnidade({
  dados,
  loading = false,
  erro = false,
  onSolicitarCorrecao,
}) {
  if (loading) {
    return (
      <section
        className="
          minha-unidade
          minha-unidade--loading
        "
        aria-label="Carregando informações da unidade"
        aria-busy="true"
      >
        <div className="minha-unidade__header">
          <div
            className="
              minha-unidade__skeleton
              minha-unidade__skeleton--title
            "
            aria-hidden="true"
          />

          <div
            className="
              minha-unidade__skeleton
              minha-unidade__skeleton--button
            "
            aria-hidden="true"
          />
        </div>

        <div className="minha-unidade__fields">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <div
              className="minha-unidade__skeleton-field"
              key={index}
              aria-hidden="true"
            >
              <div
                className="
                  minha-unidade__skeleton
                  minha-unidade__skeleton--label
                "
              />

              <div
                className="
                  minha-unidade__skeleton
                  minha-unidade__skeleton--value
                "
              />
            </div>
          ))}
        </div>

        <span className="sr-only">
          Carregando informações da unidade.
        </span>
      </section>
    );
  }


  /*
   * "erro" representa futuramente uma falha real
   * na leitura do domínio.
   *
   * Não confundir:
   * - dado ausente;
   * - vínculo não encontrado;
   * - erro de carregamento.
   */
  if (erro) {
    return (
      <section
        className="
          minha-unidade
          minha-unidade--erro
        "
        aria-labelledby="minha-unidade-titulo"
      >
        <header className="minha-unidade__header">
          <div className="minha-unidade__title">
            <span className="minha-unidade__title-icon">
              <Home
                size={18}
                aria-hidden="true"
              />
            </span>

            <div>
              <h2 id="minha-unidade-titulo">
                Minha Unidade
              </h2>

              <p>
                Seu vínculo residencial
              </p>
            </div>
          </div>
        </header>

        <div
          className="minha-unidade__error-state"
          role="status"
        >
          <span className="minha-unidade__error-icon">
            <CircleAlert
              size={18}
              aria-hidden="true"
            />
          </span>

          <div>
            <strong>
              Não foi possível carregar sua unidade
            </strong>

            <p>
              Tente novamente mais tarde.
            </p>
          </div>
        </div>
      </section>
    );
  }


  const condominio =
    textoOuPadrao(
      dados?.condominio
    );

  const torreBloco =
    textoOuPadrao(
      dados?.torreBloco
    );

  const unidade =
    textoOuPadrao(
      dados?.unidade,
      "Não informada"
    );

  const tipoVinculo =
    textoOuPadrao(
      dados?.tipoVinculo
    );


  return (
    <section
      className="minha-unidade"
      aria-labelledby="minha-unidade-titulo"
    >
      <header className="minha-unidade__header">
        <div className="minha-unidade__title">
          <span className="minha-unidade__title-icon">
            <Home
              size={18}
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 id="minha-unidade-titulo">
              Minha Unidade
            </h2>

            <p>
              Seu vínculo residencial
            </p>
          </div>
        </div>

        <button
          type="button"
          className="minha-unidade__correction"
          onClick={onSolicitarCorrecao}
          disabled={!onSolicitarCorrecao}
          aria-label="Solicitar correção dos dados da unidade"
          title={
            onSolicitarCorrecao
              ? "Solicitar correção"
              : "Solicitação de correção será disponibilizada após integração"
          }
        >
          <Wrench
            size={14}
            aria-hidden="true"
          />

          <span>
            Corrigir
          </span>
        </button>
      </header>


      <div className="minha-unidade__fields">
        <CampoUnidade
          label="Condomínio"
          valor={condominio}
          icon={Building2}
        />

        <CampoUnidade
          label="Torre / Bloco"
          valor={torreBloco}
          icon={MapPin}
        />

        <CampoUnidade
          label="Unidade"
          valor={unidade}
          icon={Home}
        />

        <CampoUnidade
          label="Vínculo"
          valor={tipoVinculo}
          icon={Building2}
        />
      </div>
    </section>
  );
}