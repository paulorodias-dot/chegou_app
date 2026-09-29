import React from "react";
import {
  CalendarDays,
  CreditCard,
  Pencil,
  UserRound,
} from "lucide-react";

import "./DadosPessoais.css";


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


function somenteNumeros(valor) {
  return String(valor ?? "")
    .replace(/\D/g, "");
}


function formatarCpf(cpf) {
  const numeros =
    somenteNumeros(cpf);

  if (numeros.length !== 11) {
    return textoOuPadrao(cpf);
  }

  return numeros.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}


function converterData(data) {
  if (!data) {
    return null;
  }

  /*
   * Evita alteração de dia por timezone quando
   * o backend fornecer YYYY-MM-DD.
   */
  if (
    typeof data === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(data)
  ) {
    const [
      ano,
      mes,
      dia,
    ] = data
      .split("-")
      .map(Number);

    const valor =
      new Date(
        ano,
        mes - 1,
        dia
      );

    return Number.isNaN(
      valor.getTime()
    )
      ? null
      : valor;
  }

  const valor =
    new Date(data);

  return Number.isNaN(
    valor.getTime()
  )
    ? null
    : valor;
}


function formatarDataNascimento(data) {
  const nascimento =
    converterData(data);

  if (!nascimento) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(nascimento);
}


function calcularIdade(data) {
  const nascimento =
    converterData(data);

  if (!nascimento) {
    return null;
  }

  const hoje =
    new Date();

  let idade =
    hoje.getFullYear() -
    nascimento.getFullYear();

  const aniversarioAindaNaoOcorreu =
    hoje.getMonth() <
      nascimento.getMonth() ||
    (
      hoje.getMonth() ===
        nascimento.getMonth() &&
      hoje.getDate() <
        nascimento.getDate()
    );

  if (aniversarioAindaNaoOcorreu) {
    idade -= 1;
  }

  if (
    idade < 0 ||
    idade > 130
  ) {
    return null;
  }

  return idade;
}


function CampoDados({
  label,
  valor,
  icon: Icon,
}) {
  return (
    <div className="dados-pessoais__field">
      <div className="dados-pessoais__field-label">
        {Icon ? (
          <Icon
            size={14}
            aria-hidden="true"
          />
        ) : null}

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


export default function DadosPessoais({
  dados,
  loading = false,
  onEditar,
}) {
  if (loading) {
    return (
      <section
        className="
          dados-pessoais
          dados-pessoais--loading
        "
        aria-label="Carregando dados pessoais"
        aria-busy="true"
      >
        <div className="dados-pessoais__header">
          <div
            className="
              dados-pessoais__skeleton
              dados-pessoais__skeleton--title
            "
            aria-hidden="true"
          />

          <div
            className="
              dados-pessoais__skeleton
              dados-pessoais__skeleton--button
            "
            aria-hidden="true"
          />
        </div>

        <div className="dados-pessoais__fields">
          {Array.from({
            length: 5,
          }).map((_, index) => (
            <div
              className="dados-pessoais__skeleton-field"
              key={index}
              aria-hidden="true"
            >
              <div
                className="
                  dados-pessoais__skeleton
                  dados-pessoais__skeleton--label
                "
              />

              <div
                className="
                  dados-pessoais__skeleton
                  dados-pessoais__skeleton--value
                "
              />
            </div>
          ))}
        </div>

        <span className="sr-only">
          Carregando dados pessoais.
        </span>
      </section>
    );
  }


  const nomeCompleto =
    textoOuPadrao(
      dados?.nomeCompleto
    );

  const nomeSocial =
    textoOuPadrao(
      dados?.nomeSocial
    );

  const cpf =
    dados?.cpf
      ? formatarCpf(dados.cpf)
      : "Não informado";

  const dataNascimento =
    formatarDataNascimento(
      dados?.dataNascimento
    );

  const idade =
    calcularIdade(
      dados?.dataNascimento
    );

  const idadeExibicao =
    idade === null
      ? "Não informada"
      : `${idade} ${
          idade === 1
            ? "ano"
            : "anos"
        }`;


  return (
    <section
      className="dados-pessoais"
      aria-labelledby="dados-pessoais-titulo"
    >
      <header className="dados-pessoais__header">
        <div className="dados-pessoais__title">
          <span className="dados-pessoais__title-icon">
            <UserRound
              size={18}
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 id="dados-pessoais-titulo">
              Dados Pessoais
            </h2>

            <p>
              Suas informações pessoais
            </p>
          </div>
        </div>

        <button
          type="button"
          className="dados-pessoais__edit"
          onClick={onEditar}
          disabled={!onEditar}
          aria-label="Editar dados pessoais"
          title={
            onEditar
              ? "Editar dados pessoais"
              : "Edição será disponibilizada após integração segura"
          }
        >
          <Pencil
            size={14}
            aria-hidden="true"
          />

          <span>
            Editar
          </span>
        </button>
      </header>


      <div className="dados-pessoais__fields">
        <CampoDados
          label="Nome completo"
          valor={nomeCompleto}
        />

        <CampoDados
          label="Nome social"
          valor={nomeSocial}
        />

        <CampoDados
          label="CPF"
          valor={cpf}
          icon={CreditCard}
        />

        <CampoDados
          label="Data de nascimento"
          valor={dataNascimento}
          icon={CalendarDays}
        />

        <CampoDados
          label="Idade"
          valor={idadeExibicao}
        />
      </div>
    </section>
  );
}