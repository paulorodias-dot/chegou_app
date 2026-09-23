import {
  CheckCircle2,
  UserRound,
} from "lucide-react";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTREGA
// SELEÇÃO DE QUEM ESTÁ RETIRANDO
//
// Responsabilidade:
// - exibir somente pessoas já liberadas pelo backend;
// - permitir selecionar quem está realizando a retirada;
// - devolver a pessoa selecionada para o controle da tela.
//
// NÃO:
// - decide quem pode retirar;
// - inicia retirada;
// - confere Código/QR;
// - confirma entrega;
// - acessa Supabase.
// ============================================================


// ============================================================
// CHAVE ESTÁVEL DA PESSOA
// ============================================================

function obterChaveRetirante(
  pessoa,
  index
) {
  return (
    pessoa?.dependente_unidade_id ||
    pessoa?.usuario_id ||
    pessoa?.pessoa_id ||
    `retirante-${index}`
  );
}


// ============================================================
// COMPONENTE
// ============================================================

export default function EntregaRetirante({
  retirantes = [],
  retiranteSelecionado = null,
  onSelecionar,
  desabilitado = false,
}) {
  const pessoas =
    Array.isArray(
      retirantes
    )
      ? retirantes.filter(
          (
            pessoa
          ) =>
            pessoa?.selecionavel ===
            true
        )
      : [];


  if (
    pessoas.length === 0
  ) {
    return null;
  }


  const chaveSelecionada =
    retiranteSelecionado
      ?.dependente_unidade_id ||
    retiranteSelecionado
      ?.usuario_id ||
    retiranteSelecionado
      ?.pessoa_id ||
    null;


  return (
    <section className="entrega-detalhe-section">

      <div className="entrega-detalhe-section__heading">

        <UserRound
          size={16}
          aria-hidden="true"
        />

        <div>
          <span>
            Retirada
          </span>

          <h4>
            Quem está retirando?
          </h4>
        </div>

      </div>


      <div
        className="entrega-detalhe__people"
        role="radiogroup"
        aria-label="Quem está retirando"
      >

        {pessoas.map(
          (
            pessoa,
            index
          ) => {
            const chave =
              obterChaveRetirante(
                pessoa,
                index
              );

            const selecionado =
              chaveSelecionada ===
              chave;


            return (
              <label
                key={chave}
                className={[
                  "entrega-detalhe-person",

                  selecionado
                    ? "entrega-detalhe-person--selected"
                    : "",

                  desabilitado
                    ? "entrega-detalhe-person--disabled"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >

                <input
                  type="radio"
                  name="entrega-retirante"
                  value={chave}
                  checked={
                    selecionado
                  }
                  disabled={
                    desabilitado
                  }
                  onChange={() => {
                    if (
                      desabilitado
                    ) {
                      return;
                    }

                    onSelecionar?.(
                      pessoa
                    );
                  }}
                />


                <span
                  className="entrega-detalhe-person__radio"
                  aria-hidden="true"
                />


                <span className="entrega-detalhe-person__name">
                  {pessoa?.nome ||
                    "Pessoa não informada"}
                </span>


                {selecionado ? (
                  <CheckCircle2
                    size={17}
                    aria-hidden="true"
                  />
                ) : null}

              </label>
            );
          }
        )}

      </div>


      <p className="entrega-detalhe-section__helper">
        {retiranteSelecionado
          ? "Pessoa selecionada. Continue para conferir a retirada."
          : "Selecione a pessoa que está realizando a retirada para continuar."}
      </p>

    </section>
  );
}