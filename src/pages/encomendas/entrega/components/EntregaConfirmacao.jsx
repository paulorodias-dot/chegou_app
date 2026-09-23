import {
  CheckCircle2,
  CircleAlert,
  PackageCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import "./EntregaConfirmacao.css";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTREGA
// CONFIRMAÇÃO FÍSICA DA ENTREGA
// ============================================================

export default function EntregaConfirmacao({
  concluida = false,
  erro = null,
  mensagem = null,
  retiranteNome = null,
  numeroEncomenda = null,
  totalVolumes = 1,
  carregando = false,
  onConfirmar,
}) {
  const quantidade =
    Number(totalVolumes);

  const totalSeguro =
    Number.isFinite(quantidade) &&
    quantidade > 0
      ? quantidade
      : 1;

  const volumesTexto =
    totalSeguro === 1
      ? "1 volume"
      : `${totalSeguro} volumes`;

  return (
    <section
      className={[
        "entrega-confirmacao",
        concluida
          ? "entrega-confirmacao--concluida"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="entrega-confirmacao-title"
    >
      <header className="entrega-confirmacao__header">
        <div
          className="entrega-confirmacao__icon"
          aria-hidden="true"
        >
          <CheckCircle2 size={22} />
        </div>

        <div>
          <span className="entrega-confirmacao__eyebrow">
            {concluida
              ? "Concluído"
              : "Confirmação"}
          </span>

          <h4 id="entrega-confirmacao-title">
            {concluida
              ? "Entrega concluída"
              : "Pronto para entregar"}
          </h4>
        </div>
      </header>

      {concluida && mensagem ? (
        <div
          className="entrega-confirmacao__success"
          role="status"
        >
          <CheckCircle2
            size={18}
            aria-hidden="true"
          />
          <p>{mensagem}</p>
        </div>
      ) : null}

      {!concluida && erro ? (
        <div
          className="entrega-confirmacao__error"
          role="alert"
        >
          <CircleAlert
            size={18}
            aria-hidden="true"
          />
          <p>{erro}</p>
        </div>
      ) : null}

      <div className="entrega-confirmacao__summary">
        <div className="entrega-confirmacao__item">
          <UserRound size={17} aria-hidden="true" />
          <div>
            <span>
              {concluida
                ? "Retirado por"
                : "Quem está retirando"}
            </span>
            <strong>
              {retiranteNome || "Não informado"}
            </strong>
          </div>
        </div>

        <div className="entrega-confirmacao__item">
          <PackageCheck size={17} aria-hidden="true" />
          <div>
            <span>Encomenda</span>
            <strong>
              {numeroEncomenda != null
                ? `#${numeroEncomenda}`
                : "Não informada"}
            </strong>
          </div>
        </div>

        <div className="entrega-confirmacao__item">
          <PackageCheck size={17} aria-hidden="true" />
          <div>
            <span>Volumes</span>
            <strong>
              {concluida
                ? `${volumesTexto} entregue${totalSeguro === 1 ? "" : "s"}`
                : volumesTexto}
            </strong>
          </div>
        </div>
      </div>

      {!concluida ? (
        <>
          <div
            className="entrega-confirmacao__warning"
            role="note"
          >
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              Confirme somente depois de entregar
              a encomenda à pessoa.
            </p>
          </div>

          <button
            type="button"
            className="entrega-confirmacao__button"
            disabled={carregando}
            onClick={() => {
              if (!carregando) {
                onConfirmar?.();
              }
            }}
          >
            {carregando
              ? "Confirmando..."
              : "Confirmar entrega"}
          </button>
        </>
      ) : null}
    </section>
  );
}