import React from "react";
import {
  CircleParking,
  MapPin,
} from "lucide-react";

import "./VagasGaragem.css";


function textoOuPadrao(
  valor,
  padrao = "Não informado"
) {
  if (typeof valor === "string") {
    const texto = valor.trim();

    return texto || padrao;
  }

  return valor ?? padrao;
}


function normalizarQuantidade(valor) {
  if (
    typeof valor !== "number" ||
    !Number.isFinite(valor) ||
    valor < 0
  ) {
    return 0;
  }

  return Math.floor(valor);
}


function obterTitulo(quantidade) {
  return quantidade === 1
    ? "Minha Vaga"
    : "Minhas Vagas";
}


function obterTextoQuantidade(quantidade) {
  if (quantidade === 0) {
    return "Nenhuma vaga vinculada";
  }

  if (quantidade === 1) {
    return "1 vaga vinculada";
  }

  return `${quantidade} vagas vinculadas`;
}


function obterStatus(status) {
  if (!status) {
    return null;
  }

  if (typeof status === "string") {
    const texto = status.trim();

    if (!texto) {
      return null;
    }

    return {
      texto,
      tipo: "neutro",
    };
  }

  if (typeof status !== "object") {
    return null;
  }

  const texto =
    textoOuPadrao(
      status?.texto,
      ""
    );

  if (!texto) {
    return null;
  }

  const tipoRecebido =
    typeof status?.tipo === "string"
      ? status.tipo
          .trim()
          .toLowerCase()
      : "";

  const tiposPermitidos =
    new Set([
      "disponivel",
      "ocupada",
      "atencao",
      "neutro",
    ]);

  return {
    texto,

    tipo:
      tiposPermitidos.has(tipoRecebido)
        ? tipoRecebido
        : "neutro",
  };
}


function VagaItem({
  vaga,
}) {
  const identificador =
    textoOuPadrao(
      vaga?.identificador,
      "Vaga não informada"
    );

  const localizacao =
    textoOuPadrao(
      vaga?.localizacao,
      ""
    );

  const status =
    obterStatus(
      vaga?.status
    );


  return (
    <article className="vagas-garagem__spot">
      <div className="vagas-garagem__spot-top">
        <span className="vagas-garagem__spot-icon">
          <CircleParking
            size={20}
            aria-hidden="true"
          />
        </span>

        <div className="vagas-garagem__spot-heading">
          <strong>
            {identificador}
          </strong>

          {status ? (
            <span
              className={`
                vagas-garagem__status
                vagas-garagem__status--${status.tipo}
              `}
            >
              {status.texto}
            </span>
          ) : null}
        </div>
      </div>


      {localizacao ? (
        <div className="vagas-garagem__spot-details">
          <div className="vagas-garagem__detail">
            <MapPin
              size={14}
              aria-hidden="true"
            />

            <span>
              Localização
            </span>

            <strong>
              {localizacao}
            </strong>
          </div>
        </div>
      ) : null}
    </article>
  );
}


export default function VagasGaragem({
  dados,
  loading = false,
}) {
  if (loading) {
    return (
      <section
        className="
          vagas-garagem
          vagas-garagem--loading
        "
        aria-label="Carregando vagas de garagem"
        aria-busy="true"
      >
        <div
          className="
            vagas-garagem__skeleton
            vagas-garagem__skeleton--title
          "
          aria-hidden="true"
        />

        <div
          className="
            vagas-garagem__skeleton
            vagas-garagem__skeleton--spot
          "
          aria-hidden="true"
        />

        <span className="sr-only">
          Carregando vagas de garagem.
        </span>
      </section>
    );
  }


  /*
   * A lista representa somente o DTO visual
   * autorizado para o Perfil do Morador.
   *
   * A origem oficial das vagas é a unidade
   * residencial resolvida pelo DICR.
   *
   * Propriedade estrutural, associação com veículo,
   * uso, aluguel, empréstimo e demais operações
   * permanecem sob responsabilidade do domínio
   * oficial de Garagem.
   */
  const vagas =
    Array.isArray(dados?.vagas)
      ? dados.vagas
      : [];

  const quantidadeInformada =
    normalizarQuantidade(
      dados?.quantidade
    );

  /*
   * O adapter já exige consistência entre
   * resumo.quantidade e vagas.length.
   *
   * O Math.max permanece apenas como proteção visual
   * defensiva e não cria registros ou vagas.
   */
  const quantidade =
    Math.max(
      quantidadeInformada,
      vagas.length
    );


  return (
    <section
      className="vagas-garagem"
      aria-labelledby="vagas-garagem-titulo"
    >
      <header className="vagas-garagem__header">
        <div className="vagas-garagem__heading">
          <span className="vagas-garagem__heading-icon">
            <CircleParking
              size={19}
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 id="vagas-garagem-titulo">
              {obterTitulo(
                quantidade
              )}
            </h2>

            <p>
              Vagas relacionadas à sua unidade.
            </p>
          </div>
        </div>

        <span className="vagas-garagem__count">
          {obterTextoQuantidade(
            quantidade
          )}
        </span>
      </header>


      <div className="vagas-garagem__body">
        {vagas.length > 0 ? (
          <div className="vagas-garagem__list">
            {vagas.map(
              (vaga, index) => (
                <VagaItem
                  key={
                    vaga?.identificador
                      ? `vaga-${vaga.identificador}`
                      : `vaga-${index}`
                  }
                  vaga={vaga}
                />
              )
            )}
          </div>
        ) : (
          <div className="vagas-garagem__empty">
            <span className="vagas-garagem__empty-icon">
              <CircleParking
                size={21}
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                Nenhuma vaga vinculada
              </strong>

              <p>
                As vagas relacionadas à sua unidade aparecerão
                aqui quando estiverem disponíveis.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}