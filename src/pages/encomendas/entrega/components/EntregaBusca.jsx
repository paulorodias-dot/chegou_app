import {
  ArrowRight,
  Eraser,
  Building2,
  Hash,
  LoaderCircle,
  ScanBarcode,
  Search,
  UserRound,
} from "lucide-react";

import {
  ENTREGA_MODOS_BUSCA,
} from "../services/entregaEncomendasService";

import "./EntregaBusca.css";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTREGA
// BUSCA OPERACIONAL
//
// Responsabilidade:
// - escolher a forma de localização;
// - receber o termo;
// - disparar a busca somente por Enter ou "Ir";
// - adaptar teclado mobile.
//
// NÃO:
// - consulta Supabase;
// - interpreta resultado;
// - abre detalhe;
// - altera estado da Encomenda;
// - decide autorização.
// ============================================================


const MODOS = Object.freeze([
  {
    id:
      ENTREGA_MODOS_BUSCA.ID_CHEGOU,

    label:
      "ID Chegou!",

    shortLabel:
      "ID",

    description:
      "Número da encomenda",

    icon:
      Hash,
  },

  {
    id:
      ENTREGA_MODOS_BUSCA.RASTREIO,

    label:
      "Rastreio",

    shortLabel:
      "Rastreio",

    description:
      "Código da transportadora",

    icon:
      ScanBarcode,
  },

  {
    id:
      ENTREGA_MODOS_BUSCA.UNIDADE,

    label:
      "Unidade",

    shortLabel:
      "Unidade",

    description:
      "Ex.: 101/1",

    icon:
      Building2,
  },

  {
    id:
      ENTREGA_MODOS_BUSCA.NOME,

    label:
      "Nome",

    shortLabel:
      "Nome",

    description:
      "Nome do destinatário",

    icon:
      UserRound,
  },
]);


// ============================================================
// CONFIGURAÇÃO DO CAMPO
// ============================================================

function obterConfiguracaoCampo(
  modo
) {
  switch (modo) {
    case ENTREGA_MODOS_BUSCA.ID_CHEGOU:
      return {
        label:
          "ID Chegou!",

        placeholder:
          "Digite o número da encomenda",

        inputMode:
          "numeric",

        autoComplete:
          "off",

        enterKeyHint:
          "search",
      };

    case ENTREGA_MODOS_BUSCA.RASTREIO:
      return {
        label:
          "Código de rastreio",

        placeholder:
          "Digite ou leia o código de rastreio",

        inputMode:
          "text",

        autoComplete:
          "off",

        enterKeyHint:
          "search",
      };

    case ENTREGA_MODOS_BUSCA.UNIDADE:
      return {
        label:
          "Unidade e torre",

        placeholder:
          "Ex.: 101/1",

        inputMode:
          "text",

        autoComplete:
          "off",

        enterKeyHint:
          "search",
      };

    case ENTREGA_MODOS_BUSCA.NOME:
      return {
        label:
          "Nome do destinatário",

        placeholder:
          "Digite o nome do destinatário",

        inputMode:
          "text",

        autoComplete:
          "off",

        enterKeyHint:
          "search",
      };

    default:
      return {
        label:
          "Localizar encomenda",

        placeholder:
          "Digite para pesquisar",

        inputMode:
          "text",

        autoComplete:
          "off",

        enterKeyHint:
          "search",
      };
  }
}


// ============================================================
// COMPONENTE
// ============================================================

export default function EntregaBusca({
  modo,
  termo,
  carregando = false,
  podeBuscar = false,
  erro = null,
  onModoChange,
  onTermoChange,
  onBuscar,
  onLimpar,
}) {
  const configuracao =
    obterConfiguracaoCampo(
      modo
    );


  // ==========================================================
  // ALTERAR MODO
  // ==========================================================

  function handleModoChange(
    novoModo
  ) {
    if (
      carregando ||
      novoModo === modo
    ) {
      return;
    }

    onModoChange?.(
      novoModo
    );
  }


  // ==========================================================
  // ALTERAR TERMO
  // ==========================================================

  function handleTermoChange(
    event
  ) {
    let valor =
      event.target.value;

    if (
      modo ===
      ENTREGA_MODOS_BUSCA.ID_CHEGOU
    ) {
      valor =
        valor.replace(
          /\D/g,
          ""
        );
    }

    onTermoChange?.(
      valor
    );
  }


  // ==========================================================
  // EXECUTAR BUSCA
  // ==========================================================

  function executarBusca() {
    if (
      carregando ||
      !podeBuscar
    ) {
      return;
    }

    onBuscar?.();
  }


  // ==========================================================
  // ENTER
  //
  // Leitores de código normalmente também enviam Enter.
  // ==========================================================

  function handleKeyDown(
    event
  ) {
    if (
      event.key !==
      "Enter"
    ) {
      return;
    }

    event.preventDefault();

    executarBusca();
  }


  return (
    <section
      className="entrega-busca"
      aria-labelledby="entrega-busca-title"
    >
      <div className="entrega-busca__heading">
        <div className="entrega-busca__heading-icon">
          <Search
            size={19}
            aria-hidden="true"
          />
        </div>

        <div className="entrega-busca__heading-content">
          <h3 id="entrega-busca-title">
            Localizar encomenda
          </h3>

          <p>
            Escolha uma forma de pesquisa e encontre
            rapidamente a encomenda para retirada.
          </p>
        </div>

        <button
          type="button"
          className="entrega-busca__clear"
          disabled={carregando}
          onClick={onLimpar}
          aria-label="Limpar pesquisa e resultado atual"
          title="Limpar pesquisa"
        >
          <Eraser
            size={16}
            aria-hidden="true"
          />

          <span>
            Limpar
          </span>
        </button>
      </div>


      {/* =====================================================
          MODOS DE BUSCA
      ===================================================== */}

      <div
        className="entrega-busca__modes"
        role="group"
        aria-label="Forma de pesquisa"
      >
        {MODOS.map(
          (
            item
          ) => {
            const Icon =
              item.icon;

            const ativo =
              item.id ===
              modo;

            return (
              <button
                key={item.id}
                type="button"
                className={[
                  "entrega-busca-mode",
                  ativo
                    ? "entrega-busca-mode--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={ativo}
                disabled={carregando}
                onClick={() =>
                  handleModoChange(
                    item.id
                  )
                }
              >
                <span
                  className="entrega-busca-mode__icon"
                  aria-hidden="true"
                >
                  <Icon size={17} />
                </span>

                <span className="entrega-busca-mode__text">
                  <strong>
                    {item.label}
                  </strong>

                  <small>
                    {item.description}
                  </small>
                </span>
              </button>
            );
          }
        )}
      </div>


      {/* =====================================================
          CAMPO + IR
      ===================================================== */}

      <div className="entrega-busca__form">
        <label
          className="entrega-busca__field"
        >
          <span className="entrega-busca__label">
            {configuracao.label}
          </span>

          <div
            className={[
              "entrega-busca__input-shell",
              erro
                ? "entrega-busca__input-shell--error"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <Search
              size={18}
              aria-hidden="true"
              className="entrega-busca__input-icon"
            />

            <input
              type="text"
              value={termo}
              placeholder={
                configuracao.placeholder
              }
              inputMode={
                configuracao.inputMode
              }
              enterKeyHint={
                configuracao.enterKeyHint
              }
              autoComplete={
                configuracao.autoComplete
              }
              autoCapitalize={
                modo ===
                ENTREGA_MODOS_BUSCA.NOME
                  ? "words"
                  : "none"
              }
              spellCheck={
                modo ===
                ENTREGA_MODOS_BUSCA.NOME
              }
              disabled={carregando}
              onChange={
                handleTermoChange
              }
              onKeyDown={
                handleKeyDown
              }
              aria-invalid={
                Boolean(
                  erro
                )
              }
              aria-describedby={
                erro
                  ? "entrega-busca-error"
                  : undefined
              }
            />
          </div>
        </label>


        <button
          type="button"
          className="entrega-busca__submit"
          disabled={
            carregando ||
            !podeBuscar
          }
          onClick={
            executarBusca
          }
        >
          {carregando ? (
            <>
              <LoaderCircle
                size={18}
                className="entrega-busca__spinner"
                aria-hidden="true"
              />

              <span>
                Buscando
              </span>
            </>
          ) : (
            <>
              <span>
                Ir
              </span>

              <ArrowRight
                size={18}
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </div>


      {/* =====================================================
          ERRO OPERACIONAL
      ===================================================== */}

      {erro?.mensagem ? (
        <div
          id="entrega-busca-error"
          className="entrega-busca__error"
          role="alert"
        >
          {erro.mensagem}
        </div>
      ) : (
        <p className="entrega-busca__helper">
          Pressione Enter ou selecione
          <strong> Ir</strong> para pesquisar.
        </p>
      )}
    </section>
  );
}