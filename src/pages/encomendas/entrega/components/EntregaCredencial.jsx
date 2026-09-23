import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import "./EntregaCredencial.css";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTREGA
// CREDENCIAL DE RETIRADA
//
// Responsabilidade:
// - apresentar Código e QR Code;
// - receber o Código informado pelo operador;
// - receber futura leitura de QR;
// - permitir acesso visual às outras opções;
// - apresentar orientações simples para a Portaria.
//
// NÃO:
// - acessa Supabase;
// - decide autorização;
// - inicia retirada;
// - confere credencial no servidor;
// - conclui entrega;
// - cria regra de domínio.
// ============================================================


// ============================================================
// NORMALIZAR CÓDIGO PARA EXIBIÇÃO
//
// O campo aceita somente os caracteres digitados.
// A conferência real continuará pertencendo ao backend.
// ============================================================

function normalizarCodigoVisual(
  valor
) {
  return String(
    valor ||
    ""
  )
    .toUpperCase()
    .replace(
      /\D/g,
      ""
    )
    .slice(
      0,
      6
    );
}


// ============================================================
// COMPONENTE
// ============================================================

export default function EntregaCredencial({
  retiranteSelecionado = null,
  metodo = null,
  codigo = "",
  identidadeConfirmada = false,
  carregando = false,
  desabilitado = false,
  onMetodoChange,
  onCodigoChange,
  onIdentidadeConfirmadaChange,
  onConferirCodigo,
  onLerQr,
  onOutrasOpcoes,
}) {
  if (
    !retiranteSelecionado
  ) {
    return null;
  }


  const nomeRetirante =
    retiranteSelecionado
      ?.nome ||
    "Pessoa selecionada";


  const codigoVisual =
    normalizarCodigoVisual(
      codigo
    );


  const codigoCompleto =
    codigoVisual.length ===
    6;


  const bloqueado =
    carregando ||
    desabilitado;


  // ==========================================================
  // MÉTODO AINDA NÃO ESCOLHIDO
  // ==========================================================

  const metodoEscolhido =
    metodo === "TOKEN" ||
    metodo === "QR";


  return (
    <section
      className="entrega-credencial"
      aria-labelledby="entrega-credencial-title"
    >

      {/* =====================================================
          CABEÇALHO
      ===================================================== */}

      <header className="entrega-credencial__header">

        <div
          className="entrega-credencial__header-icon"
          aria-hidden="true"
        >
          <ShieldCheck size={18} />
        </div>


        <div className="entrega-credencial__header-content">

          <span className="entrega-credencial__eyebrow">
            Próxima etapa
          </span>

          <h4 id="entrega-credencial-title">
            Conferir retirada
          </h4>

          <p>
            Confira a credencial apresentada pela
            pessoa antes de entregar a encomenda.
          </p>

        </div>

      </header>


      {/* =====================================================
          PESSOA SELECIONADA
      ===================================================== */}

      <div className="entrega-credencial__person">

        <span
          className="entrega-credencial__person-icon"
          aria-hidden="true"
        >
          <CheckCircle2 size={17} />
        </span>


        <div>
          <span>
            Quem está retirando
          </span>

          <strong>
            {nomeRetirante}
          </strong>
        </div>

      </div>


      {/* =====================================================
          ESCOLHA DA CREDENCIAL
      ===================================================== */}

      <div className="entrega-credencial__method">

        <span className="entrega-credencial__label">
          Como deseja conferir?
        </span>


        <div
          className="entrega-credencial__method-grid"
          role="group"
          aria-label="Forma de conferência"
        >

          <button
            type="button"
            className={[
              "entrega-credencial-method",

              metodo === "TOKEN"
                ? "entrega-credencial-method--selected"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={
              bloqueado
            }
            aria-pressed={
              metodo === "TOKEN"
            }
            onClick={() =>
              onMetodoChange?.(
                "TOKEN"
              )
            }
          >

            <span
              className="entrega-credencial-method__icon"
              aria-hidden="true"
            >
              <KeyRound size={19} />
            </span>


            <span className="entrega-credencial-method__content">
              <strong>
                Código
              </strong>

              <small>
                Digite o código apresentado
              </small>
            </span>

          </button>


          <button
            type="button"
            className={[
              "entrega-credencial-method",

              metodo === "QR"
                ? "entrega-credencial-method--selected"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={
              bloqueado
            }
            aria-pressed={
              metodo === "QR"
            }
            onClick={() =>
              onMetodoChange?.(
                "QR"
              )
            }
          >

            <span
              className="entrega-credencial-method__icon"
              aria-hidden="true"
            >
              <QrCode size={19} />
            </span>


            <span className="entrega-credencial-method__content">
              <strong>
                QR Code
              </strong>

              <small>
                Leia o QR apresentado
              </small>
            </span>

          </button>

        </div>

      </div>


      {/* =====================================================
          CÓDIGO
      ===================================================== */}

      {metodo === "TOKEN" ? (

        <div className="entrega-credencial__body">

          <div className="entrega-credencial__instruction">

            <KeyRound
              size={17}
              aria-hidden="true"
            />

            <div>
              <strong>
                Código apresentado pelo morador
              </strong>

              <span>
                Digite os 6 dígitos exibidos
                no aplicativo.
              </span>
            </div>

          </div>


          <div className="entrega-credencial__code">

            <label
              htmlFor="entrega-codigo-retirada"
              className="entrega-credencial__label"
            >
              Código de retirada
            </label>


            <input
              id="entrega-codigo-retirada"
              name="codigo-retirada-nao-salvar"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-autocomplete="none"
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              maxLength={6}
              value={
                codigoVisual
              }
              disabled={
                bloqueado
              }
              placeholder="______"
              aria-describedby="entrega-codigo-helper"
              onChange={(
                event
              ) =>
                onCodigoChange?.(
                  normalizarCodigoVisual(
                    event.target.value
                  )
                )
              }
            />


            <div
              id="entrega-codigo-helper"
              className="entrega-credencial__code-helper"
            >
              <span>
                {codigoVisual.length}/6
              </span>

              <span>
                Confira o código antes de continuar.
              </span>
            </div>

          </div>

          <div className="entrega-credencial__identity-confirmation">

            <label>

              <input
                type="checkbox"
                checked={
                  identidadeConfirmada
                }
                disabled={
                  bloqueado
                }
                onChange={(
                  event
                ) =>
                  onIdentidadeConfirmadaChange?.(
                    event.target.checked
                  )
                }
              />

              <span>
                Confirmo que a pessoa presente é{" "}
                <strong>
                  {nomeRetirante}
                </strong>
              </span>

            </label>

          </div>


          <button
            type="button"
            className="entrega-credencial__primary"
            disabled={
              bloqueado ||
              !codigoCompleto ||
              !identidadeConfirmada
            }
            onClick={() =>
              onConferirCodigo?.()
            }
          >

            <ShieldCheck
              size={17}
              aria-hidden="true"
            />

            <span>
              {carregando
                ? "Conferindo..."
                : "Conferir código"}
            </span>

          </button>

        </div>

      ) : null}


      {/* =====================================================
          QR CODE
      ===================================================== */}

      {metodo === "QR" ? (

        <div className="entrega-credencial__body">

          <div className="entrega-credencial__qr">

            <div
              className="entrega-credencial__qr-icon"
              aria-hidden="true"
            >
              <QrCode size={32} />
            </div>


            <div className="entrega-credencial__qr-content">

              <strong>
                Leia o QR Code
              </strong>

              <p>
                Aponte a câmera para o QR Code
                apresentado pela pessoa que está
                retirando a encomenda.
              </p>

            </div>

          </div>


          <button
            type="button"
            className="entrega-credencial__primary"
            disabled={
              bloqueado
            }
            onClick={() =>
              onLerQr?.()
            }
          >

            <Smartphone
              size={17}
              aria-hidden="true"
            />

            <span>
              Ler QR Code
            </span>

          </button>

        </div>

      ) : null}


      {/* =====================================================
          ORIENTAÇÃO INICIAL
      ===================================================== */}

      {!metodoEscolhido ? (

        <div className="entrega-credencial__empty">

          <ShieldCheck
            size={19}
            aria-hidden="true"
          />

          <p>
            Escolha Código ou QR Code para
            continuar a conferência.
          </p>

        </div>

      ) : null}


      {/* =====================================================
          OUTRAS OPÇÕES
      ===================================================== */}

      <div className="entrega-credencial__alternative">

        <div className="entrega-credencial__alternative-text">

          <span>
            Não consegue usar a credencial?
          </span>

          <small>
            Existem opções controladas para
            situações excepcionais.
          </small>

        </div>


        <button
          type="button"
          disabled={
            bloqueado
          }
          onClick={() =>
            onOutrasOpcoes?.()
          }
        >
          <span>
            Outras opções
          </span>

          <ChevronRight
            size={16}
            aria-hidden="true"
          />
        </button>

      </div>


      {/* =====================================================
          AVISO
      ===================================================== */}

      <div
        className="entrega-credencial__notice"
        role="note"
      >

        <AlertTriangle
          size={16}
          aria-hidden="true"
        />

        <p>
          A entrega somente deve ser confirmada
          depois que a encomenda estiver nas mãos
          da pessoa indicada.
        </p>

      </div>

    </section>
  );
}