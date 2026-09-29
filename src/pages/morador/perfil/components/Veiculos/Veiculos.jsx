import React from "react";
import {
  CarFront,
  ChevronRight,
  ParkingCircle,
} from "lucide-react";

import "./Veiculos.css";


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


function textoQuantidade(quantidade) {
  return quantidade === 1
    ? "1 veículo cadastrado"
    : `${quantidade} veículos cadastrados`;
}


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


function VeiculoResumo({
  veiculo,
}) {
  const nome =
    textoOuPadrao(
      veiculo?.nome,
      "Veículo"
    );

  const placa =
    textoOuPadrao(
      veiculo?.placa
    );

  const vaga =
    textoOuPadrao(
      veiculo?.vaga,
      "Sem vaga vinculada"
    );

  return (
    <article className="veiculos-perfil__vehicle">
      <span className="veiculos-perfil__vehicle-icon">
        <CarFront
          size={19}
          aria-hidden="true"
        />
      </span>

      <div className="veiculos-perfil__vehicle-content">
        <div className="veiculos-perfil__vehicle-heading">
          <strong>
            {nome}
          </strong>

          {veiculo?.principal ? (
            <span className="veiculos-perfil__badge">
              Principal
            </span>
          ) : null}
        </div>

        <div className="veiculos-perfil__vehicle-details">
          <span>
            {placa}
          </span>

          <span
            className="veiculos-perfil__separator"
            aria-hidden="true"
          >
            •
          </span>

          <span className="veiculos-perfil__parking">
            <ParkingCircle
              size={13}
              aria-hidden="true"
            />

            {vaga}
          </span>
        </div>
      </div>
    </article>
  );
}


export default function Veiculos({
  dados,
  loading = false,
}) {
  if (loading) {
    return (
      <section
        className="
          veiculos-perfil
          veiculos-perfil--loading
        "
        aria-label="Carregando veículos"
        aria-busy="true"
      >
        <div
          className="
            veiculos-perfil__skeleton
            veiculos-perfil__skeleton--title
          "
          aria-hidden="true"
        />

        <div
          className="
            veiculos-perfil__skeleton
            veiculos-perfil__skeleton--vehicle
          "
          aria-hidden="true"
        />

        <span className="sr-only">
          Carregando veículos.
        </span>
      </section>
    );
  }


  const quantidade =
    normalizarQuantidade(
      dados?.quantidade
    );

  /*
   * Nesta fase, nenhum veículo real é
   * presumido ou criado pelo frontend.
   *
   * Quando houver contrato oficial, a lista
   * virá pronta da camada de serviço.
   */
  const veiculos =
    Array.isArray(dados?.veiculos)
      ? dados.veiculos
      : [];

  const veiculoDestaque =
    veiculos.find(
      (veiculo) =>
        veiculo?.principal === true
    ) ??
    veiculos[0] ??
    null;


  return (
    <section
      className="veiculos-perfil"
      aria-labelledby="veiculos-perfil-titulo"
    >
      <header className="veiculos-perfil__header">
        <div className="veiculos-perfil__heading">
          <span className="veiculos-perfil__heading-icon">
            <CarFront
              size={19}
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 id="veiculos-perfil-titulo">
              Meus Veículos
            </h2>

            <p>
              Veículos vinculados à sua unidade.
            </p>
          </div>
        </div>

        <span className="veiculos-perfil__count">
          {textoQuantidade(
            quantidade
          )}
        </span>
      </header>


      <div className="veiculos-perfil__body">
        {veiculoDestaque ? (
          <VeiculoResumo
            veiculo={veiculoDestaque}
          />
        ) : (
          <div className="veiculos-perfil__empty">
            <span className="veiculos-perfil__empty-icon">
              <CarFront
                size={20}
                aria-hidden="true"
              />
            </span>

            <div>
              <strong>
                Nenhum veículo cadastrado
              </strong>

              <p>
                Seus veículos aparecerão aqui quando estiverem
                disponíveis no seu perfil.
              </p>
            </div>
          </div>
        )}
      </div>


      <footer className="veiculos-perfil__footer">
        <span aria-hidden="true" />

        <button
          type="button"
          className="veiculos-perfil__action"
          disabled
          aria-label="Ver veículos — indisponível nesta etapa"
          title="Esta opção será integrada posteriormente"
        >
          <span>
            Ver veículos
          </span>

          <ChevronRight
            size={14}
            aria-hidden="true"
          />
        </button>
      </footer>
    </section>
  );
}