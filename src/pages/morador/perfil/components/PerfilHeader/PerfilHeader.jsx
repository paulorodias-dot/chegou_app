import React from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Home,
  KeyRound,
  Mail,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import "./PerfilHeader.css";


function textoOuPadrao(
  valor,
  padrao = "Não informado"
) {
  if (typeof valor !== "string") {
    return valor ?? padrao;
  }

  const texto = valor.trim();

  return texto || padrao;
}


function obterIniciais(nome) {
  const nomeNormalizado =
    typeof nome === "string"
      ? nome.trim()
      : "";

  if (!nomeNormalizado) {
    return "M";
  }

  const partes =
    nomeNormalizado
      .split(/\s+/)
      .filter(Boolean);

  if (partes.length === 1) {
    return partes[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    partes[0][0] +
    partes[partes.length - 1][0]
  ).toUpperCase();
}


function montarTorre({
  torreIdentificador,
  torreNome,
  torre,
}) {
  const identificador =
    textoOuPadrao(
      torreIdentificador,
      ""
    );

  const nome =
    textoOuPadrao(
      torreNome ?? torre,
      ""
    );

  if (identificador && nome) {
    return `${identificador} · ${nome}`;
  }

  return (
    identificador ||
    nome ||
    "Não informado"
  );
}


function converterData(data) {
  if (!data) {
    return null;
  }

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


function formatarData(data) {
  const valor =
    converterData(data);

  if (!valor) {
    return "Não informado";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(valor);
}


function obterSituacaoConta(dadosConta) {
  const situacao =
    typeof dadosConta?.situacaoConta === "string"
      ? dadosConta.situacaoConta.trim()
      : "";

  /*
   * Não inferir situação da conta a partir
   * de usuarios.ativo ou qualquer campo
   * isolado.
   */
  if (!situacao) {
    return {
      texto: "Não informada",
      tipo: "neutro",
    };
  }

  const tipoRecebido =
    typeof dadosConta?.situacaoContaTipo === "string"
      ? dadosConta.situacaoContaTipo
          .trim()
          .toLowerCase()
      : "";

  const tiposPermitidos =
    new Set([
      "ativa",
      "atencao",
      "neutro",
    ]);

  return {
    texto: situacao,

    tipo:
      tiposPermitidos.has(tipoRecebido)
        ? tipoRecebido
        : "neutro",
  };
}


function IconeSituacao({
  tipo,
  size = 14,
}) {
  if (tipo === "ativa") {
    return (
      <CheckCircle2
        size={size}
        aria-hidden="true"
      />
    );
  }

  if (tipo === "atencao") {
    return (
      <CircleAlert
        size={size}
        aria-hidden="true"
      />
    );
  }

  return (
    <ShieldCheck
      size={size}
      aria-hidden="true"
    />
  );
}


function LinhaConta({
  icon: Icon,
  label,
  children,
  destaque = false,
}) {
  return (
    <div className="perfil-header__account-row">
      <span className="perfil-header__account-row-icon">
        <Icon
          size={14}
          aria-hidden="true"
        />
      </span>

      <span className="perfil-header__account-row-label">
        {label}
      </span>

      <strong
        className={
          destaque
            ? "perfil-header__account-row-value perfil-header__account-row-value--highlight"
            : "perfil-header__account-row-value"
        }
      >
        {children}
      </strong>
    </div>
  );
}


export default function PerfilHeader({
  dados,
  dadosConta,
  loading = false,
}) {
  if (loading) {
    return (
      <section
        className="
          perfil-header
          perfil-header--loading
        "
        aria-label="Carregando informações do perfil"
        aria-busy="true"
      >
        <div className="perfil-header__main">
          <div
            className="
              perfil-header__skeleton
              perfil-header__skeleton--avatar
            "
            aria-hidden="true"
          />

          <div className="perfil-header__skeleton-main">
            <div
              className="
                perfil-header__skeleton
                perfil-header__skeleton--name
              "
              aria-hidden="true"
            />

            <div
              className="
                perfil-header__skeleton
                perfil-header__skeleton--role
              "
              aria-hidden="true"
            />

            <div
              className="
                perfil-header__skeleton
                perfil-header__skeleton--line
              "
              aria-hidden="true"
            />

            <div
              className="
                perfil-header__skeleton
                perfil-header__skeleton--line-small
              "
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="perfil-header__account">
          <div
            className="
              perfil-header__skeleton
              perfil-header__skeleton--account-title
            "
            aria-hidden="true"
          />

          <div
            className="
              perfil-header__skeleton
              perfil-header__skeleton--account-row
            "
            aria-hidden="true"
          />

          <div
            className="
              perfil-header__skeleton
              perfil-header__skeleton--account-row
            "
            aria-hidden="true"
          />

          <div
            className="
              perfil-header__skeleton
              perfil-header__skeleton--account-row
            "
            aria-hidden="true"
          />
        </div>

        <span className="sr-only">
          Carregando informações do perfil.
        </span>
      </section>
    );
  }


  const nomeExibicao =
    textoOuPadrao(
      dados?.nomeExibicao,
      "Nome não informado"
    );

  const condominio =
    textoOuPadrao(
      dados?.condominioNome
    );

  const torre =
    montarTorre({
      torreIdentificador:
        dados?.torreIdentificador,

      torreNome:
        dados?.torreNome,

      torre:
        dados?.torre,
    });

  const unidade =
    textoOuPadrao(
      dados?.unidade
    );

  const iniciais =
    obterIniciais(nomeExibicao);

  const fotoPerfil =
    typeof dados?.fotoPerfil === "string" &&
    dados.fotoPerfil.trim()
      ? dados.fotoPerfil.trim()
      : null;


  /*
   * MINHA CONTA
   *
   * Continua sendo um contrato independente
   * do contexto de identidade/residência.
   */
  const situacaoConta =
    obterSituacaoConta(
      dadosConta
    );

  const emailAcesso =
    textoOuPadrao(
      dadosConta?.emailAcesso
    );

  const dataCadastro =
    formatarData(
      dadosConta?.dataCadastro
    );


  return (
    <section
      className="perfil-header"
      aria-labelledby="perfil-header-nome"
    >
      <div className="perfil-header__main">
        <div
          className="perfil-header__avatar"
          aria-label={`Foto de ${nomeExibicao}`}
        >
          {fotoPerfil ? (
            <img
              src={fotoPerfil}
              alt=""
            />
          ) : (
            <span aria-hidden="true">
              {iniciais}
            </span>
          )}
        </div>


        <div className="perfil-header__content">
          <span className="perfil-header__label">
            Perfil do Morador
          </span>

          <h2 id="perfil-header-nome">
            {nomeExibicao}
          </h2>

          <div className="perfil-header__role">
            <UserRound
              size={14}
              aria-hidden="true"
            />

            <span>
              Morador Responsável
            </span>
          </div>


          <div
            className="perfil-header__residential"
            aria-label="Contexto residencial"
          >
            <div className="perfil-header__residential-line">
              <Building2
                size={15}
                aria-hidden="true"
              />

              <span>
                {condominio}
              </span>
            </div>

            <div className="perfil-header__residential-line">
              <MapPin
                size={15}
                aria-hidden="true"
              />

              <span>
                {torre}
              </span>

              <span
                className="perfil-header__separator"
                aria-hidden="true"
              >
                •
              </span>

              <Home
                size={15}
                aria-hidden="true"
              />

              <span>
                {unidade}
              </span>
            </div>
          </div>
        </div>
      </div>


      <aside
        className="perfil-header__account"
        aria-labelledby="perfil-header-conta-titulo"
      >
        <header className="perfil-header__account-header">
          <span className="perfil-header__account-icon">
            <ShieldCheck
              size={17}
              aria-hidden="true"
            />
          </span>

          <div>
            <h3 id="perfil-header-conta-titulo">
              Minha Conta
            </h3>

            <p>
              Acesso e segurança
            </p>
          </div>
        </header>


        <div className="perfil-header__account-rows">
          <div className="perfil-header__account-row">
            <span className="perfil-header__account-row-icon">
              <IconeSituacao
                tipo={situacaoConta.tipo}
                size={14}
              />
            </span>

            <span className="perfil-header__account-row-label">
              Situação
            </span>

            <strong
              className={`
                perfil-header__account-row-value
                perfil-header__account-row-value--${situacaoConta.tipo}
              `}
            >
              {situacaoConta.texto}
            </strong>
          </div>


          <LinhaConta
            icon={Mail}
            label="E-mail de acesso"
          >
            {emailAcesso}
          </LinhaConta>


          <LinhaConta
            icon={CalendarDays}
            label="Cadastro"
          >
            {dataCadastro}
          </LinhaConta>


          <LinhaConta
            icon={KeyRound}
            label="Senha"
          >
            Protegida
          </LinhaConta>
        </div>
      </aside>
    </section>
  );
}