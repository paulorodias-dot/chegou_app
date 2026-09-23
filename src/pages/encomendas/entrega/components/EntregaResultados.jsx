import {
  ArrowRight,
  Building2,
  Clock3,
  History,
  MapPin,
  Package,
  PackageCheck,
  ScanBarcode,
  UserRound,
  UsersRound,
} from "lucide-react";

import "./EntregaResultados.css";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTREGA
// RESULTADOS DA BUSCA
//
// Responsabilidade:
// - apresentar os diferentes shapes oficiais da busca;
// - exibir somente contexto operacional seguro;
// - abrir detalhe somente quando o backend retornou Encomenda.
//
// NÃO:
// - acessa Supabase;
// - decide elegibilidade;
// - inicia retirada;
// - valida Código/QR;
// - altera estado da Encomenda;
// - deriva Encomendas a partir de residência/pessoa.
// ============================================================


// ============================================================
// STATUS VISUAL
// ============================================================

function obterStatusVisual(
  status
) {
  switch (status) {
    case "DISPONIVEL_RETIRADA":
      return {
        label:
          "Disponível para retirada",

        classe:
          "entrega-resultado-status--available",
      };

    case "RETIRADA_AGENDADA":
      return {
        label:
          "Retirada agendada",

        classe:
          "entrega-resultado-status--scheduled",
      };

    case "EM_RETIRADA":
      return {
        label:
          "Retirada em andamento",

        classe:
          "entrega-resultado-status--progress",
      };

    case "FINALIZADA":
      return {
        label:
          "Entrega concluída",

        classe:
          "entrega-resultado-status--finished",
      };

    default:
      return {
        label:
          "Encomenda",

        classe:
          "",
      };
  }
}


// ============================================================
// RELACIONAMENTO
// ============================================================

function formatarRelacionamento(
  valor
) {
  const texto =
    String(
      valor ||
      ""
    )
      .trim()
      .replace(
        /_/g,
        " "
      );

  if (!texto) {
    return null;
  }

  return (
    texto.charAt(0).toUpperCase() +
    texto.slice(1).toLowerCase()
  );
}


// ============================================================
// RESIDÊNCIA
// ============================================================

function montarResidenciaObjeto(
  residencia
) {
  const numero =
    residencia?.numero ||
    null;

  const torre =
    residencia?.torre ||
    null;

  const identificador =
    torre?.identificador ||
    null;

  const nome =
    torre?.nome ||
    null;

  const partes =
    [];


  if (numero) {
    partes.push(
      `Unidade ${numero}`
    );
  }


  if (
    identificador ||
    nome
  ) {
    const torreTexto =
      [
        identificador
          ? `Torre ${identificador}`
          : null,

        nome ||
        null,
      ]
        .filter(Boolean)
        .join(" • ");

    if (torreTexto) {
      partes.push(
        torreTexto
      );
    }
  }


  return (
    partes.join(" • ") ||
    "Residência não informada"
  );
}


function montarResidenciaEncomenda(
  encomenda
) {
  return montarResidenciaObjeto(
    encomenda?.unidade
  );
}


// ============================================================
// LOCALIZAÇÃO
// ============================================================

function montarLocalizacao(
  localizacao
) {
  if (!localizacao) {
    return "Localização não informada";
  }

  const partes =
    [
      localizacao?.nome,
      localizacao?.codigo,
    ]
      .filter(Boolean);

  return (
    partes.join(" • ") ||
    "Localização não informada"
  );
}


// ============================================================
// QUANTIDADE
// ============================================================

function normalizarQuantidade(
  valor
) {
  const numero =
    Number(
      valor
    );

  return Number.isFinite(
    numero
  )
    ? Math.max(
        0,
        Math.trunc(
          numero
        )
      )
    : 0;
}


// ============================================================
// CARD — ENCOMENDA
// ============================================================

function EntregaResultadoEncomenda({
  encomenda,
  carregandoDetalhe = false,
  onVisualizar,
}) {
  const status =
    obterStatusVisual(
      encomenda?.status
    );

  const numero =
    encomenda
      ?.numero_encomenda ??
    "—";

  const destinatario =
    encomenda
      ?.destinatario_nome_exibicao ||
    "Destinatário não informado";

  const residencia =
    montarResidenciaEncomenda(
      encomenda
    );

  const localizacao =
    montarLocalizacao(
      encomenda?.localizacao
    );

  const rastreioEncontrado =
    encomenda
      ?.codigo_rastreio_encontrado ||
    null;


  function handleVisualizar() {
    if (
      !encomenda
        ?.encomenda_id ||
      carregandoDetalhe
    ) {
      return;
    }

    onVisualizar?.(
      encomenda.encomenda_id
    );
  }


  return (
    <article className="entrega-resultado-card">

      <div className="entrega-resultado-card__identity">

        <div
          className="entrega-resultado-card__package"
          aria-hidden="true"
        >
          <Package size={25} />
        </div>


        <div className="entrega-resultado-card__heading">

          <span className="entrega-resultado-card__eyebrow">
            ID Chegou!
          </span>

          <strong className="entrega-resultado-card__number">
            #{numero}
          </strong>


          <span
            className={[
              "entrega-resultado-status",
              status.classe,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {status.label}
          </span>

        </div>

      </div>


      <div className="entrega-resultado-card__details">

        <div className="entrega-resultado-detail">
          <UserRound
            size={16}
            aria-hidden="true"
          />

          <div>
            <span>
              Destinatário
            </span>

            <strong>
              {destinatario}
            </strong>
          </div>
        </div>


        <div className="entrega-resultado-detail">
          <Building2
            size={16}
            aria-hidden="true"
          />

          <div>
            <span>
              Residência
            </span>

            <strong>
              {residencia}
            </strong>
          </div>
        </div>


        <div className="entrega-resultado-detail">
          <MapPin
            size={16}
            aria-hidden="true"
          />

          <div>
            <span>
              Onde está
            </span>

            <strong>
              {localizacao}
            </strong>
          </div>
        </div>


        {rastreioEncontrado ? (
          <div className="entrega-resultado-detail">
            <ScanBarcode
              size={16}
              aria-hidden="true"
            />

            <div>
              <span>
                Rastreio localizado
              </span>

              <strong>
                {rastreioEncontrado}
              </strong>
            </div>
          </div>
        ) : null}

      </div>


      <div className="entrega-resultado-card__actions">

        <button
          type="button"
          className="entrega-resultado-card__view"
          disabled={
            carregandoDetalhe
          }
          onClick={
            handleVisualizar
          }
        >
          <span>
            {carregandoDetalhe
              ? "Abrindo"
              : "Visualizar"}
          </span>

          <ArrowRight
            size={17}
            aria-hidden="true"
          />
        </button>

      </div>

    </article>
  );
}


// ============================================================
// PESSOAS DA RESIDÊNCIA
// ============================================================

function EntregaPessoasResidencia({
  pessoas,
}) {
  const lista =
    Array.isArray(
      pessoas
    )
      ? pessoas
      : [];

  if (
    lista.length === 0
  ) {
    return null;
  }

  return (
    <div className="entrega-contexto-people">

      <div className="entrega-contexto-people__header">
        <UsersRound
          size={16}
          aria-hidden="true"
        />

        <span>
          Pessoas vinculadas
        </span>
      </div>


      <div className="entrega-contexto-people__list">

        {lista.map(
          (
            pessoa,
            index
          ) => {
            const nome =
              pessoa
                ?.nome_exibicao ||
              pessoa?.nome ||
              "Pessoa não informada";

            const relacionamento =
              formatarRelacionamento(
                pessoa?.relacionamento
              );

            const chave =
              pessoa?.id_contexto ||
              pessoa?.pessoa_id ||
              `${nome}-${index}`;

            return (
              <div
                key={chave}
                className="entrega-contexto-person"
              >
                <span
                  className="entrega-contexto-person__icon"
                  aria-hidden="true"
                >
                  <UserRound size={15} />
                </span>

                <div>
                  <strong>
                    {nome}
                  </strong>

                  {relacionamento ? (
                    <small>
                      {relacionamento}
                    </small>
                  ) : null}
                </div>
              </div>
            );
          }
        )}

      </div>

    </div>
  );
}


// ============================================================
// CARD — RESIDÊNCIA
// ============================================================

function EntregaResultadoResidencia({
  residencia,
}) {
  const residenciaTexto =
    montarResidenciaObjeto(
      residencia
    );

  const ativas =
    normalizarQuantidade(
      residencia
        ?.quantidade_encomendas_ativas
    );

  const historicas =
    normalizarQuantidade(
      residencia
        ?.quantidade_encomendas_historicas
    );

  return (
    <article className="entrega-contexto-card">

      <div className="entrega-contexto-card__header">

        <div
          className="entrega-contexto-card__icon"
          aria-hidden="true"
        >
          <Building2 size={22} />
        </div>

        <div>
          <span>
            Residência localizada
          </span>

          <strong>
            {residenciaTexto}
          </strong>
        </div>

      </div>


      <div className="entrega-contexto-stats">

        <div className="entrega-contexto-stat">
          <PackageCheck
            size={16}
            aria-hidden="true"
          />

          <div>
            <span>
              Para retirada
            </span>

            <strong>
              {ativas}
            </strong>
          </div>
        </div>


        <div className="entrega-contexto-stat">
          <History
            size={16}
            aria-hidden="true"
          />

          <div>
            <span>
              Histórico
            </span>

            <strong>
              {historicas}
            </strong>
          </div>
        </div>

      </div>


      <EntregaPessoasResidencia
        pessoas={
          residencia?.pessoas
        }
      />


      <p className="entrega-contexto-card__helper">
        A residência foi localizada com segurança.
        A seleção das encomendas desta residência será
        carregada pela etapa de consulta correspondente.
      </p>

    </article>
  );
}


// ============================================================
// CARD — PESSOA / RESIDÊNCIA
// ============================================================

function EntregaResultadoPessoa({
  resultado,
}) {
  const residencia =
    resultado?.residencia ||
    null;

  const residenciaTexto =
    montarResidenciaObjeto(
      residencia
    );

  const nome =
    resultado?.nome_exibicao ||
    "Pessoa não informada";

  const relacionamento =
    formatarRelacionamento(
      resultado?.relacionamento
    );

  const ativas =
    normalizarQuantidade(
      resultado
        ?.quantidade_encomendas_ativas
    );

  const historicas =
    normalizarQuantidade(
      resultado
        ?.quantidade_encomendas_historicas
    );


  return (
    <article className="entrega-contexto-card">

      <div className="entrega-contexto-card__header">

        <div
          className="entrega-contexto-card__icon"
          aria-hidden="true"
        >
          <UserRound size={22} />
        </div>


        <div>
          <span>
            Pessoa localizada
          </span>

          <strong>
            {nome}
          </strong>

          {relacionamento ? (
            <small>
              {relacionamento}
            </small>
          ) : null}
        </div>

      </div>


      <div className="entrega-contexto-residence">

        <Building2
          size={16}
          aria-hidden="true"
        />

        <div>
          <span>
            Residência
          </span>

          <strong>
            {residenciaTexto}
          </strong>
        </div>

      </div>


      <div className="entrega-contexto-stats">

        <div className="entrega-contexto-stat">
          <PackageCheck
            size={16}
            aria-hidden="true"
          />

          <div>
            <span>
              Para retirada
            </span>

            <strong>
              {ativas}
            </strong>
          </div>
        </div>


        <div className="entrega-contexto-stat">
          <Clock3
            size={16}
            aria-hidden="true"
          />

          <div>
            <span>
              Histórico
            </span>

            <strong>
              {historicas}
            </strong>
          </div>
        </div>

      </div>


      <p className="entrega-contexto-card__helper">
        Confirme a residência correta antes de avançar
        para a encomenda.
      </p>

    </article>
  );
}


// ============================================================
// CABEÇALHO
// ============================================================

function obterTitulo({
  tipoResultado,
  quantidade,
}) {
  switch (
    tipoResultado
  ) {
    case "RESIDENCIA":
      return "Residência localizada";

    case "AMBIGUO":
      return quantidade === 1
        ? "Residência localizada"
        : "Residências localizadas";

    case "PESSOAS_RESIDENCIAS":
      return quantidade === 1
        ? "Pessoa localizada"
        : "Pessoas localizadas";

    case "MULTIPLAS_ENCOMENDAS":
      return "Encomendas localizadas";

    case "ENCOMENDA":
    default:
      return quantidade === 1
        ? "Encomenda localizada"
        : "Encomendas localizadas";
  }
}


// ============================================================
// COMPONENTE
// ============================================================

export default function EntregaResultados({
  resultados = [],
  tipoResultado = null,
  carregandoDetalhe = false,
  encomendaSelecionadaId = null,
  onVisualizar,
}) {
  if (
    !Array.isArray(
      resultados
    ) ||
    resultados.length === 0
  ) {
    return null;
  }


  const ehResidencia =
    tipoResultado ===
      "RESIDENCIA" ||
    tipoResultado ===
      "AMBIGUO";

  const ehPessoas =
    tipoResultado ===
      "PESSOAS_RESIDENCIAS";

  const ehEncomendas =
    !ehResidencia &&
    !ehPessoas;


  const titulo =
    obterTitulo({
      tipoResultado,
      quantidade:
        resultados.length,
    });


  return (
    <section
      className="entrega-resultados"
      aria-label="Resultado da pesquisa"
    >

      <div className="entrega-resultados__header">

        <div>
          <span className="entrega-resultados__eyebrow">
            Resultado
          </span>

          <h3>
            {titulo}
          </h3>
        </div>


        <span className="entrega-resultados__count">
          {resultados.length}
        </span>

      </div>


      <div className="entrega-resultados__list">

        {ehEncomendas
          ? resultados.map(
              (
                encomenda
              ) => (
                <EntregaResultadoEncomenda
                  key={
                    encomenda
                      ?.encomenda_id ||
                    encomenda
                      ?.numero_encomenda
                  }
                  encomenda={
                    encomenda
                  }
                  carregandoDetalhe={
                    carregandoDetalhe &&
                    encomendaSelecionadaId ===
                      encomenda
                        ?.encomenda_id
                  }
                  onVisualizar={
                    onVisualizar
                  }
                />
              )
            )
          : null}


        {ehResidencia
          ? resultados.map(
              (
                residencia,
                index
              ) => (
                <EntregaResultadoResidencia
                  key={
                    residencia
                      ?.unidade_id ||
                    `${residencia?.numero}-${index}`
                  }
                  residencia={
                    residencia
                  }
                />
              )
            )
          : null}


        {ehPessoas
          ? resultados.map(
              (
                resultado,
                index
              ) => (
                <EntregaResultadoPessoa
                  key={
                    resultado
                      ?.id_contexto ||
                    `${resultado?.nome_exibicao}-${index}`
                  }
                  resultado={
                    resultado
                  }
                />
              )
            )
          : null}

      </div>

    </section>
  );
}