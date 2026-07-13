import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  ShieldAlert,
  X,
} from "lucide-react";

import {
  alterarStatusTransportadoraMaster,
} from "../../../services/transportadorasService";

import "./TransportadoraStatusModal.css";

const STATUS = [
  {
    value: "ATIVA",
    label: "Ativa",
    descricao:
      "Disponível normalmente para novos registros de encomendas.",
    classe: "ativa",
  },
  {
    value: "EM_OBSERVACAO",
    label: "Em observação",
    descricao:
      "Permanece disponível, mas exige acompanhamento da Equipe Chegou!.",
    classe: "observacao",
  },
  {
    value: "INSTAVEL",
    label: "Instável",
    descricao:
      "Permanece disponível com alerta operacional. Futuramente poderá ser definido automaticamente pelo CSIC.",
    classe: "instavel",
  },
  {
    value: "BLOQUEADA",
    label: "Bloqueada",
    descricao:
      "Impede novas utilizações temporariamente por risco, inconsistência ou análise.",
    classe: "bloqueada",
  },
  {
    value: "INATIVA",
    label: "Inativa",
    descricao:
      "Não estará disponível para novas utilizações, mas todo o histórico será preservado.",
    classe: "inativa",
  },
];

function TransportadoraStatusModal({
  aberto,
  transportadora,
  onClose,
  onConcluido,
}) {
  const [novoStatus, setNovoStatus] = useState("");
  const [justificativa, setJustificativa] =
    useState("");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const statusAtual = transportadora?.status || "";

  const exigeJustificativa = useMemo(() => {
    return ["BLOQUEADA", "INATIVA"].includes(
      novoStatus
    );
  }, [novoStatus]);

  const statusSelecionado = useMemo(() => {
    return STATUS.find(
      (item) => item.value === novoStatus
    );
  }, [novoStatus]);

  useEffect(() => {
    if (!aberto) return;

    setNovoStatus(statusAtual);
    setJustificativa("");
    setErro("");
    setSalvando(false);
  }, [aberto, statusAtual]);

  useEffect(() => {
    if (!aberto) return;

    function fecharComEsc(event) {
      if (event.key === "Escape" && !salvando) {
        onClose();
      }
    }

    window.addEventListener("keydown", fecharComEsc);

    return () => {
      window.removeEventListener(
        "keydown",
        fecharComEsc
      );
    };
  }, [aberto, salvando, onClose]);

  if (!aberto || !transportadora) return null;

  async function salvar(event) {
    event.preventDefault();

    if (!novoStatus) {
      setErro("Selecione o novo status.");
      return;
    }

    if (novoStatus === statusAtual) {
      setErro(
        "Selecione um status diferente do atual."
      );
      return;
    }

    if (
      exigeJustificativa &&
      justificativa.trim().length < 10
    ) {
      setErro(
        "Informe uma justificativa com pelo menos 10 caracteres."
      );
      return;
    }

    setSalvando(true);
    setErro("");

    try {
      const resultado =
        await alterarStatusTransportadoraMaster({
          transportadoraId: transportadora.id,
          status: novoStatus,
          justificativa:
            justificativa.trim() || null,
        });

      await onConcluido?.({
        tipo: "status_alterado",
        mensagem:
          "Status da transportadora atualizado com sucesso.",
        resultado,
      });

      onClose();
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível alterar o status."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="tr-status-overlay"
      data-modal-open="true"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !salvando
        ) {
          onClose();
        }
      }}
    >
      <section
        className="tr-status-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tr-status-title"
      >
        <header className="tr-status-topbar">
          <div>
            <span>Governança operacional</span>
            <h2 id="tr-status-title">
              Alterar Status
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={salvar}>
          <div className="tr-status-body">
            <section className="tr-status-transportadora">
              <div>
                <span>Transportadora</span>
                <strong>
                  {transportadora.nome_fantasia}
                </strong>
                <small>
                  {transportadora.business_id}
                </small>
              </div>

              <span className="tr-status-current">
                Status atual:{" "}
                {STATUS.find(
                  (item) =>
                    item.value === statusAtual
                )?.label || statusAtual}
              </span>
            </section>

            {erro ? (
              <div className="tr-status-error">
                <AlertCircle size={18} />
                <span>{erro}</span>
              </div>
            ) : null}

            <section className="tr-status-card">
              <div className="tr-status-card-title">
                <div>
                  <h3>Selecione o novo status</h3>
                  <p>
                    A alteração será registrada na
                    auditoria e nos eventos do CSIC.
                  </p>
                </div>

                <Activity size={20} />
              </div>

              <div className="tr-status-options">
                {STATUS.map((item) => {
                  const selecionado =
                    novoStatus === item.value;

                  const atual =
                    statusAtual === item.value;

                  return (
                    <label
                      key={item.value}
                      className={[
                        "tr-status-option",
                        selecionado
                          ? "selected"
                          : "",
                        atual ? "current" : "",
                        `status-${item.classe}`,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <input
                        type="radio"
                        name="novo-status"
                        value={item.value}
                        checked={selecionado}
                        onChange={() =>
                          setNovoStatus(item.value)
                        }
                        disabled={atual || salvando}
                      />

                      <span className="tr-status-option-dot" />

                      <span>
                        <strong>
                          {item.label}
                          {atual ? " — atual" : ""}
                        </strong>

                        <small>
                          {item.descricao}
                        </small>
                      </span>

                      {selecionado && !atual ? (
                        <CheckCircle2 size={19} />
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </section>

            {novoStatus === "INSTAVEL" ? (
              <section className="tr-status-warning">
                <AlertCircle size={20} />

                <div>
                  <strong>
                    Monitoramento futuro
                  </strong>

                  <p>
                    O status Instável ainda será
                    definido manualmente. Quando as
                    integrações estiverem disponíveis,
                    o CSIC poderá sugerir ou aplicar
                    esse status com análise leve e
                    periódica.
                  </p>
                </div>
              </section>
            ) : null}

            {exigeJustificativa ? (
              <section className="tr-status-card">
                <div className="tr-status-card-title">
                  <div>
                    <h3>
                      Justificativa obrigatória
                    </h3>

                    <p>
                      Explique o motivo da decisão para
                      preservar a rastreabilidade.
                    </p>
                  </div>

                  <ShieldAlert size={20} />
                </div>

                <label className="tr-status-field">
                  <span>
                    Motivo da{" "}
                    {novoStatus === "BLOQUEADA"
                      ? "restrição"
                      : "inativação"}{" "}
                    *
                  </span>

                  <textarea
                    value={justificativa}
                    onChange={(event) =>
                      setJustificativa(
                        event.target.value
                      )
                    }
                    placeholder={
                      novoStatus === "BLOQUEADA"
                        ? "Ex.: Cadastro bloqueado temporariamente para análise..."
                        : "Ex.: Serviço encerrado ou substituído por outro cadastro oficial..."
                    }
                    rows={4}
                    maxLength={800}
                  />

                  <small>
                    {justificativa.length}/800
                  </small>
                </label>
              </section>
            ) : null}

            {statusSelecionado ? (
              <section className="tr-status-summary">
                <span>
                  <Activity size={18} />
                </span>

                <div>
                  <strong>
                    Resultado da alteração
                  </strong>

                  <p>
                    O status será alterado de{" "}
                    <b>
                      {STATUS.find(
                        (item) =>
                          item.value === statusAtual
                      )?.label || statusAtual}
                    </b>{" "}
                    para{" "}
                    <b>{statusSelecionado.label}</b>.
                  </p>
                </div>
              </section>
            ) : null}
          </div>

          <footer className="tr-status-footer">
            <button
              type="button"
              className="tr-status-cancel"
              onClick={onClose}
              disabled={salvando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="tr-status-save"
              disabled={
                salvando ||
                !novoStatus ||
                novoStatus === statusAtual
              }
            >
              {salvando ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="tr-status-spinning"
                  />
                  Atualizando...
                </>
              ) : (
                "Confirmar alteração"
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default TransportadoraStatusModal;