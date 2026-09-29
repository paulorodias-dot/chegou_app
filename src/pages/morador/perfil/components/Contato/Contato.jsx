import React from "react";
import {
  Mail,
  Pencil,
  Phone,
} from "lucide-react";

import "./Contato.css";


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


function formatarTelefone(telefone) {
  const numeros =
    somenteNumeros(telefone);

  /*
   * Celular brasileiro com DDD:
   * 11999999999 -> (11) 99999-9999
   */
  if (numeros.length === 11) {
    return numeros.replace(
      /(\d{2})(\d{5})(\d{4})/,
      "($1) $2-$3"
    );
  }

  /*
   * Telefone brasileiro com DDD:
   * 1133334444 -> (11) 3333-4444
   */
  if (numeros.length === 10) {
    return numeros.replace(
      /(\d{2})(\d{4})(\d{4})/,
      "($1) $2-$3"
    );
  }

  /*
   * Não inventamos normalização para formatos
   * que ainda não tenham contrato oficial.
   */
  return textoOuPadrao(
    telefone
  );
}


function CampoContato({
  label,
  valor,
  icon: Icon,
}) {
  return (
    <div className="contato-perfil__field">
      <div className="contato-perfil__field-label">
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


export default function Contato({
  dados,
  loading = false,
  onEditar,
}) {
  if (loading) {
    return (
      <section
        className="
          contato-perfil
          contato-perfil--loading
        "
        aria-label="Carregando informações de contato"
        aria-busy="true"
      >
        <div className="contato-perfil__header">
          <div
            className="
              contato-perfil__skeleton
              contato-perfil__skeleton--title
            "
            aria-hidden="true"
          />

          <div
            className="
              contato-perfil__skeleton
              contato-perfil__skeleton--button
            "
            aria-hidden="true"
          />
        </div>

        <div className="contato-perfil__fields">
          {Array.from({
            length: 2,
          }).map((_, index) => (
            <div
              className="contato-perfil__skeleton-field"
              key={index}
              aria-hidden="true"
            >
              <div
                className="
                  contato-perfil__skeleton
                  contato-perfil__skeleton--label
                "
              />

              <div
                className="
                  contato-perfil__skeleton
                  contato-perfil__skeleton--value
                "
              />
            </div>
          ))}
        </div>

        <span className="sr-only">
          Carregando informações de contato.
        </span>
      </section>
    );
  }


  const telefone =
    dados?.telefone
      ? formatarTelefone(
          dados.telefone
        )
      : "Não informado";

  const email =
    textoOuPadrao(
      dados?.email
    );


  return (
    <section
      className="contato-perfil"
      aria-labelledby="contato-perfil-titulo"
    >
      <header className="contato-perfil__header">
        <div className="contato-perfil__title">
          <span className="contato-perfil__title-icon">
            <Phone
              size={18}
              aria-hidden="true"
            />
          </span>

          <div>
            <h2 id="contato-perfil-titulo">
              Contato
            </h2>

            <p>
              Seus canais de contato
            </p>
          </div>
        </div>

        <button
          type="button"
          className="contato-perfil__edit"
          onClick={onEditar}
          disabled={!onEditar}
          aria-label="Editar informações de contato"
          title={
            onEditar
              ? "Editar informações de contato"
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


      <div className="contato-perfil__fields">
        <div className="contato-perfil__field">
          <div className="contato-perfil__field-label">
            <img
              src="/email-assets/social/whatsapp.png"
              alt=""
              className="contato-perfil__whatsapp-icon"
              aria-hidden="true"
            />

            <span>
              Telefone
            </span>
          </div>

          <strong>
            {telefone}
          </strong>
        </div>

        <CampoContato
          label="E-mail de contato"
          valor={email}
          icon={Mail}
        />
      </div>
    </section>
  );
}