import {
  ArchiveRestore,
  Clock3,
  PackageCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import EntradaArmazenamento from "./EntradaArmazenamento";
import "./EntradaArmazenamentoRecuperacaoDrawer.css";

function formatarNumero(numero) {
  if (numero === null || numero === undefined) return "—";
  const n = Number(numero);
  return Number.isFinite(n)
    ? `#${String(n).padStart(3, "0")}`
    : `#${numero}`;
}

export default function EntradaArmazenamentoRecuperacaoDrawer({
  open,
  item,
  onClose,
  onArmazenado,
}) {
  const closeRef = useRef(null);
  const [operacaoEmCurso, setOperacaoEmCurso] = useState(false);

  useEffect(() => {
    if (!open) {
      setOperacaoEmCurso(false);
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape" && !operacaoEmCurso) {
        event.preventDefault();
        onClose?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => closeRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, operacaoEmCurso, onClose]);

  if (!open || !item) return null;

  const contextoValido = Boolean(
    item.encomendaId &&
      item.condominioId &&
      item.tipoEntrega &&
      item.entradaId &&
      item.volumeId
  );

  function fechar() {
    if (!operacaoEmCurso) onClose?.();
  }

  return (
    <div
      className="entrada-storage-recovery-root"
      data-hide-mobile-nav="true"
    >
      <button
        type="button"
        className="entrada-storage-recovery__backdrop"
        onClick={operacaoEmCurso ? undefined : fechar}
        disabled={operacaoEmCurso}
        aria-label="Fechar armazenamento pendente"
      />

      <aside
        className="entrada-storage-recovery"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entrada-storage-recovery-title"
      >
        <header className="entrada-storage-recovery__header">
          <div>
            <span>Continuidade da Entrada Oficial</span>
            <h2 id="entrada-storage-recovery-title">
              Armazenar {formatarNumero(item.numeroEncomenda)}
            </h2>
          </div>

          <button
            ref={closeRef}
            type="button"
            className="entrada-storage-recovery__close"
            onClick={fechar}
            disabled={operacaoEmCurso}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        <div className="entrada-storage-recovery__content">
          <section className="entrada-storage-recovery__notice">
            <ArchiveRestore size={20} />
            <div>
              <strong>A Entrada já está confirmada</strong>
              <p>
                Esta ação recupera somente o armazenamento pendente. A Entrada não será executada novamente.
              </p>
            </div>
          </section>

          <section className="entrada-storage-recovery__facts">
            <div>
              <PackageCheck size={17} />
              <span>
                <small>Encomenda</small>
                <strong>{formatarNumero(item.numeroEncomenda)}</strong>
              </span>
            </div>

            <div>
              <UserRound size={17} />
              <span>
                <small>Destinatário</small>
                <strong>{item.destinatarioNome || "Identificado"}</strong>
              </span>
            </div>

            <div>
              <Clock3 size={17} />
              <span>
                <small>Entrada confirmada</small>
                <strong>
                  {item.entradaConfirmadaEmLocal || "Registrada"}
                </strong>
              </span>
            </div>
          </section>

          {contextoValido ? (
            <EntradaArmazenamento
              encomendaId={item.encomendaId}
              condominioId={item.condominioId}
              tipoEntrega={item.tipoEntrega}
              onEstadoOperacaoChange={setOperacaoEmCurso}
              onArmazenado={onArmazenado}
            />
          ) : (
            <section className="entrada-storage-recovery__error" role="alert">
              O backend não retornou o contexto oficial completo para este armazenamento. Não repita a Entrada.
            </section>
          )}
        </div>

        <footer className="entrada-storage-recovery__footer">
          <button
            type="button"
            onClick={fechar}
            disabled={operacaoEmCurso}
          >
            Fechar
          </button>
        </footer>
      </aside>
    </div>
  );
}
