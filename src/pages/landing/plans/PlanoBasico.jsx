import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ArrowRight,
  Bell,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  FileText,
  Info,
  KeyRound,
  MessageCircle,
  Package,
  ShieldCheck,
  ChartColumn,
} from "lucide-react";

import PlanoBasicoHeader from "./components/PlanoBasicoHeader";
import LandingFooter from "../components/LandingFooter";

import LandingBackToTop from "../components/LandingBackToTop";

import {
  LandingNavigationProvider,
} from "../navigation/LandingNavigationContext";

import mascoteHero from "../../../assets/landing/hero/landing-hero-mascote.png";
import mascoteBanner from "../../../assets/landing/illustrations/mascote-plano-basico.png";
import fundoBanner from "../../../assets/landing/decorations/banner-plano-basico.png";

import {
  PLANO_BASICO,
  FAIXAS_PLANO_BASICO,
  RECURSOS_PLANO_BASICO,
  formatarValorMensal,
  obterFaixaBasicoPorId,
} from "./data/planoBasico";

import "../LandingPremium.css";
import "./PlanoBasico.css";

/* ==========================================================
   ÍCONES DOS RECURSOS
========================================================== */

const ICONES_RECURSOS = {

  Package,

  Building2,

  Bell,

  KeyRound,

  FileText,

  ChartColumn,

};

/* ==========================================================

   CONDIÇÕES COMERCIAIS

========================================================== */

const INFORMACOES_COMERCIAIS = [

  "Os valores apresentados são referências das condições comerciais vigentes e poderão ser atualizados conforme as condições aplicáveis.",

  "Na tela de orçamento, o próprio cliente informará a quantidade real de unidades do condomínio. Essa informação será utilizada na preparação do orçamento.",

  "A faixa escolhida define a capacidade máxima de unidades cadastráveis no Sistema Chegou! e não precisa corresponder ao total de unidades físicas do condomínio.",

  "A escolha da faixa é livre, respeitada a capacidade de unidades cadastráveis contratada.",

  "A quantidade de torres não determina isoladamente a mensalidade.",

  "Módulos adicionais e serviços contratados separadamente não estão incluídos nos valores apresentados.",

];

/* ==========================================================

   REFERÊNCIA PARA CÁLCULO POR UNIDADE

   Regra comercial desta tela:

   B1:

   - exemplo de referência com 96 unidades.

   B2–B9:

   - utilizar a quantidade inicial da faixa.

   B10:

   - não calcular valor unitário porque a mensalidade

     é "Sob consulta".

   Este cálculo é exclusivamente informativo.

   A quantidade real será fornecida pelo cliente

   na futura etapa de orçamento.

========================================================== */

const QUANTIDADE_REFERENCIA_POR_FAIXA = {

  B1: 96,

  B2: 101,

  B3: 151,

  B4: 201,

  B5: 251,

  B6: 301,

  B7: 401,

  B8: 501,

  B9: 751,

  B10: null,

};

/* ==========================================================

   FORMATAÇÃO DE VALOR UNITÁRIO

========================================================== */

function formatarValorPorUnidade(valor) {

  if (

    typeof valor !== "number" ||

    !Number.isFinite(valor)

  ) {

    return null;

  }

  return new Intl.NumberFormat("pt-BR", {

    style: "currency",

    currency: "BRL",

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

  }).format(valor);

}

/* ==========================================================
   BRAND — SISTEMA CHEGOU!
========================================================== */

function renderizarTextoComBrand(texto) {
  if (typeof texto !== "string" || !texto) {
    return texto;
  }

  const partes = texto.split(/(Sistema Chegou!|Chegou!)/g);

  return partes.map((parte, indice) => {
    if (
      parte !== "Sistema Chegou!" &&
      parte !== "Chegou!"
    ) {
      return parte;
    }

    const nomeSemExclamacao =
      parte.slice(0, -1);

    return (
      <strong
        key={`${parte}-${indice}`}
        className="plano-basico__brand"
      >
        {nomeSemExclamacao}

        <span className="plano-basico__brand-exclamation">
          !
        </span>
      </strong>
    );
  });
}

/* ==========================================================

   CONTEÚDO DA PÁGINA

========================================================== */

function PlanoBasicoConteudo() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.destino !== "inicio") {
      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [
    location.pathname,
    location.state,
    navigate,
  ]);

  const [faixaSelecionadaId, setFaixaSelecionadaId] =
    useState("B1");

  const faixaSelecionada =

    obterFaixaBasicoPorId(faixaSelecionadaId) ??

    FAIXAS_PLANO_BASICO[0];

  const quantidadeReferencia =

    QUANTIDADE_REFERENCIA_POR_FAIXA[

      faixaSelecionada.id

    ] ?? null;

  const possuiValorMensal =

    typeof faixaSelecionada.valorMensal === "number" &&

    Number.isFinite(faixaSelecionada.valorMensal);

  const valorPorUnidade =

    possuiValorMensal &&

    typeof quantidadeReferencia === "number" &&

    quantidadeReferencia > 0

      ? faixaSelecionada.valorMensal /

        quantidadeReferencia

      : null;

  /* ========================================================
    AÇÕES
  ======================================================== */

  function avancarParaOrcamento() {
    navigate("/orcamento");
  }

  function falarComEquipe() {
    const mensagem =
      "Olá! Estou conhecendo o Plano Básico do Sistema Chegou! " +
      `e gostaria de esclarecer algumas dúvidas sobre a faixa ${faixaSelecionada.id}.`;

    const url =
      "https://wa.me/5511922106522?text=" +
      encodeURIComponent(mensagem);

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  /* ========================================================

     RENDER

  ======================================================== */

  return (

    <div className="landing-premium plano-basico">

      <a

        href="#plano-basico-conteudo"

        className="landing-premium__skip-link"

      >

        Ir para o conteúdo principal

      </a>

      <PlanoBasicoHeader />

      <main id="plano-basico-conteudo">

        {/* ==================================================

            HERO — COMPOSIÇÃO HOMOLOGADA

        ================================================== */}

        <section

          className="plano-basico__hero"

          id="inicio"

          aria-labelledby="plano-basico-titulo"

        >

          <div className="plano-basico__container plano-basico__hero-grid">

            <div className="plano-basico__hero-content">

              <span className="plano-basico__hero-pill">

                PLANO BÁSICO

              </span>

              <h1 id="plano-basico-titulo">

                A gestão das

                <br />

                suas encomendas

                <br />

                <span>começa aqui.</span>

              </h1>

              <p className="plano-basico__hero-lead">

                {PLANO_BASICO.descricao}

              </p>

              <p className="plano-basico__hero-support">

                {renderizarTextoComBrand(
                  PLANO_BASICO.apresentacao
                )}

              </p>

              <div className="plano-basico__hero-price">

                <span className="plano-basico__price-prefix">

                  A partir de

                </span>

                <div className="plano-basico__price-line">

                  <strong>

                    {formatarValorMensal(

                      PLANO_BASICO.precoInicial

                    )}

                  </strong>

                  <span>/mês</span>

                </div>

                <small>

                  Para condomínios de até{" "}

                  {PLANO_BASICO.capacidadeInicial}{" "}

                  unidades cadastráveis.

                </small>

              </div>

              <div className="plano-basico__hero-actions">

                <button
                  type="button"
                  className="plano-basico__button plano-basico__button--primary"
                  onClick={avancarParaOrcamento}
                >
                  Avançar para orçamento
                  <ArrowRight
                    size={18}
                    aria-hidden="true"
                  />
                </button>

                <button

                  type="button"

                  className="plano-basico__button plano-basico__button--secondary"

                  onClick={falarComEquipe}

                >

                  <MessageCircle

                    size={19}

                    aria-hidden="true"

                  />

                  <span>

                    Ainda tem dúvidas?

                    <small>

                      Falar com a equipe

                    </small>

                  </span>

                </button>

              </div>

              <div

                className="plano-basico__hero-trust"

                aria-label="Benefícios do Plano Básico"

              >

                <span>

                  <CheckCircle2

                    size={16}

                    aria-hidden="true"

                  />

                  Operação organizada

                </span>

                <span>

                  <ShieldCheck

                    size={16}

                    aria-hidden="true"

                  />

                  Moradores mais informados

                </span>

                <span>

                  <ShieldCheck

                    size={16}

                    aria-hidden="true"

                  />

                  Informações protegidas

                </span>

              </div>

            </div>

            {/* VISUAL HERO */}

            <div className="plano-basico__hero-visual">

              <div className="plano-basico__hero-image-shape">

                <img

                  src={mascoteHero}

                  alt="Mascote oficial do Sistema Chegou! em frente a um condomínio"

                  width="900"

                  height="620"

                  fetchPriority="high"

                />

              </div>

            </div>

          </div>

        </section>

        {/* ==================================================

            RECURSOS

        ================================================== */}

        <section

          className="plano-basico__features"

          id="plano-basico-recursos"

          aria-labelledby="plano-basico-recursos-titulo"

        >

          <div className="plano-basico__container">

            <div className="plano-basico__features-heading">

              <h2 id="plano-basico-recursos-titulo">

                O que o Plano Básico oferece?

              </h2>

              <p>

                Uma solução para a rotina essencial

                de encomendas, da chegada à retirada.

              </p>

            </div>

            <div className="plano-basico__features-grid">

              {RECURSOS_PLANO_BASICO.map(

                (recurso) => {

                  const Icone =

                    ICONES_RECURSOS[

                      recurso.icone

                    ] ?? Package;

                  return (

                    <article

                      key={recurso.id}

                      className="plano-basico__feature-card"

                    >

                      <div

                        className="plano-basico__feature-icon"

                        aria-hidden="true"

                      >

                        <Icone

                          size={29}

                          strokeWidth={1.9}

                        />

                      </div>

                      <div className="plano-basico__feature-content">

                        <h3>

                          {recurso.titulo}

                        </h3>

                        <p>
                          {renderizarTextoComBrand(
                            recurso.descricao
                          )}
                        </p>

                      </div>

                    </article>

                  );

                }

              )}

            </div>

          </div>

        </section>

        {/* ==================================================

            FAIXAS B1–B10

        ================================================== */}

        <section

          className="plano-basico__pricing"

          id="plano-basico-precos"

          aria-labelledby="plano-basico-precos-titulo"

        >

          <div className="plano-basico__container">

            <div className="plano-basico__pricing-heading">

              <h2 id="plano-basico-precos-titulo">

                Escolha a capacidade ideal

                para o seu condomínio

              </h2>

              <p>

                A faixa define o número máximo

                de unidades cadastráveis no sistema,

                não necessariamente o total de

                unidades físicas existentes

                no condomínio.

              </p>

            </div>

            <div className="plano-basico__pricing-grid">

              {/* ============================================

                  TABELA

              ============================================ */}

              <div className="plano-basico__table-wrap">

                <table className="plano-basico__table">

                  <caption className="plano-basico__visually-hidden">

                    Faixas comerciais B1 a B10

                    do Plano Básico

                  </caption>

                  <thead>

                    <tr>

                      <th scope="col">

                        Faixa

                      </th>

                      <th scope="col">

                        Unidades cadastráveis

                      </th>

                      <th scope="col">

                        Mensalidade

                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {FAIXAS_PLANO_BASICO.map(

                      (faixa) => {

                        const selecionada =

                          faixa.id ===

                          faixaSelecionadaId;

                        return (

                          <tr

                            key={faixa.id}

                            className={

                              selecionada

                                ? "plano-basico__table-row plano-basico__table-row--selected"

                                : "plano-basico__table-row"

                            }

                            tabIndex={0}

                            role="radio"

                            aria-checked={selecionada}

                            aria-label={`${faixa.id}, ${faixa.descricao}, ${formatarValorMensal(

                              faixa.valorMensal

                            )}`}

                            onClick={() =>

                              selecionarFaixa(

                                faixa.id

                              )

                            }

                            onKeyDown={(event) =>

                              selecionarFaixaPorTeclado(

                                event,

                                faixa.id

                              )

                            }

                          >

                            <th scope="row">

                              <label

                                className="plano-basico__table-choice"

                                onClick={(event) =>

                                  event.stopPropagation()

                                }

                              >

                                <input

                                  type="radio"

                                  name="faixa-plano-basico"

                                  value={faixa.id}

                                  checked={

                                    selecionada

                                  }

                                  onChange={() =>

                                    selecionarFaixa(

                                      faixa.id

                                    )

                                  }

                                  aria-label={`Selecionar faixa ${faixa.id}`}

                                />

                                <span

                                  className="plano-basico__table-radio"

                                  aria-hidden="true"

                                />

                                <strong>

                                  {faixa.id}

                                </strong>

                              </label>

                            </th>

                            <td>

                              {faixa.descricao}

                            </td>

                            <td>

                              {formatarValorMensal(

                                faixa.valorMensal

                              )}

                            </td>

                          </tr>

                        );

                      }

                    )}

                  </tbody>

                </table>

              </div>

              {/* ============================================

                  INFORMAÇÕES LATERAIS

              ============================================ */}

              <div className="plano-basico__pricing-asides">

                {/* CONDIÇÃO DE REFERÊNCIA */}

                <aside className="plano-basico__reference-card">

                  <div

                    className="plano-basico__aside-icon"

                    aria-hidden="true"

                  >

                    <Calculator size={25} />

                  </div>

                  <div className="plano-basico__reference-content">

                    <h3>

                      Condição de referência

                    </h3>

                    <strong className="plano-basico__reference-faixa">

                      {faixaSelecionada.id}

                    </strong>

                    {faixaSelecionada.id ===

                    "B10" ? (

                      <>

                        <p>

                          Para capacidades acima de

                          1.000 unidades cadastráveis,

                          a mensalidade é apresentada

                          sob consulta.

                        </p>

                        <p className="plano-basico__reference-note">

                          O cliente informará a

                          quantidade real de unidades

                          na futura tela de orçamento

                          para preparação da proposta.

                        </p>

                      </>

                    ) : (

                      <>

                        <p>

                          Considerando{" "}

                          <strong>

                            {quantidadeReferencia}{" "}

                            {quantidadeReferencia === 1

                              ? "unidade"

                              : "unidades"}

                          </strong>

                          {faixaSelecionada.id ===

                          "B1"

                            ? " como exemplo de referência para a faixa B1"

                            : `, quantidade inicial da faixa ${faixaSelecionada.id}`}

                          , a mensalidade de{" "}

                          <strong>

                            {formatarValorMensal(

                              faixaSelecionada.valorMensal

                            )}

                          </strong>{" "}

                          corresponde a aproximadamente{" "}

                          <strong className="plano-basico__reference-unit-price">

                            {formatarValorPorUnidade(

                              valorPorUnidade

                            )}{" "}

                            por unidade/mês

                          </strong>

                          .

                        </p>

                        <p className="plano-basico__reference-note">

                          Referência informativa.

                          O valor por unidade varia

                          conforme a quantidade real

                          considerada dentro da faixa.

                        </p>

                      </>

                    )}

                  </div>

                </aside>

                {/* IMPORTANTE */}

                <aside className="plano-basico__important-card">

                  <div className="plano-basico__important-title">

                    <Info

                      size={19}

                      aria-hidden="true"

                    />

                    <h3>

                      Importante

                    </h3>

                  </div>

                  <ul>

                    {INFORMACOES_COMERCIAIS.map(

                      (informacao) => (

                        <li key={informacao}>

                          <Check

                            size={16}

                            aria-hidden="true"

                          />

                          <span>

                            {renderizarTextoComBrand(informacao)}

                          </span>

                        </li>

                      )

                    )}

                  </ul>

                </aside>

                {/* RESUMO DA SELEÇÃO */}

                <p

                  className="plano-basico__selection-status"

                  aria-live="polite"

                  aria-atomic="true"

                >

                  Faixa selecionada:{" "}

                  <strong>

                    {faixaSelecionada.id}

                  </strong>

                  {" — "}

                  {faixaSelecionada.descricao}

                  {" — "}

                  <strong>

                    {formatarValorMensal(

                      faixaSelecionada.valorMensal

                    )}

                    {faixaSelecionada.valorMensal !==

                      null && "/mês"}

                  </strong>

                  . Seleção informativa,

                  sem contratação.

                </p>

              </div>

            </div>

          </div>

        </section>

        {/* ==================================================

            BANNER COMERCIAL

        ================================================== */}

        <section

          className="plano-basico__closing"

          aria-labelledby="plano-basico-closing-titulo"

        >

          <div

            className="plano-basico__container plano-basico__closing-card"

            style={{

              "--plano-basico-banner":

                `url("${fundoBanner}")`,

            }}

          >

            <div className="plano-basico__closing-content">

              <h2 id="plano-basico-closing-titulo">

                Pronto para modernizar

                a gestão de encomendas

                do seu condomínio?

              </h2>

              <p>

                Avance para a tela de orçamento

                e escolha a faixa que melhor

                atende à sua operação.

                Nossa equipe poderá apresentar

                os detalhes.

              </p>

              <div className="plano-basico__closing-actions">

                <button
                  type="button"
                  className="plano-basico__button plano-basico__button--primary"
                  onClick={avancarParaOrcamento}
                >
                  Avançar para orçamento
                  <ArrowRight
                    size={18}
                    aria-hidden="true"
                  />
                </button>

                <button

                  type="button"

                  className="plano-basico__button plano-basico__button--secondary"

                  onClick={falarComEquipe}

                >

                  <MessageCircle

                    size={19}

                    aria-hidden="true"

                  />

                  <span>

                    Ainda tem dúvidas?

                    <small>

                      Falar com a equipe

                    </small>

                  </span>

                </button>

              </div>

            </div>

            <img

              src={mascoteBanner}

              alt=""

              className="plano-basico__closing-mascot"

              loading="lazy"

            />

          </div>

        </section>

        {/* ==================================================

            SEGURANÇA

        ================================================== */}

        <section

          className="plano-basico__security"

          aria-label="Segurança e proteção de dados"

        >

          <div className="plano-basico__container plano-basico__security-bar">

            <ShieldCheck

              size={25}

              strokeWidth={1.9}

              aria-hidden="true"

            />

            <p>

              <strong>

                A segurança não depende

                do plano contratado.

              </strong>{" "}

              Todos os planos utilizam a mesma

              base estrutural de proteção de dados,

              com isolamento entre condomínios,

              controle de acesso, políticas de

              segurança e princípios aplicáveis

              da LGPD.

            </p>

          </div>

        </section>

      </main>

      <LandingFooter />

      <LandingBackToTop />

    </div>

  );

}

/* ==========================================================

   PROVIDER

========================================================== */

export default function PlanoBasico() {

  return (

    <LandingNavigationProvider>

      <PlanoBasicoConteudo />

    </LandingNavigationProvider>

  );

}
