import {
  AlertCircle,
  ArchiveRestore,
  ChevronRight,
  Clock3,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  listarPendenciasArmazenamento,
} from "../services/entradaArmazenamentoService";

import EntradaArmazenamentoRecuperacaoDrawer
  from "./EntradaArmazenamentoRecuperacaoDrawer";

import "./EntradaArmazenamentoPendentes.css";

function formatarNumero(numero) {
  if (numero === null || numero === undefined) {
    return "—";
  }

  const n = Number(numero);
  if (!Number.isFinite(n)) return String(numero);
  return `#${String(n).padStart(3, "0")}`;
}

function formatarTipo(tipo) {
  return String(tipo || "")
    .replaceAll("_", " ")
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)(\p{L})/gu, (_, a, b) =>
      `${a}${b.toLocaleUpperCase("pt-BR")}`
    );
}

export default function EntradaArmazenamentoPendentes({
  condominioId,
  refreshKey = 0,
  onArmazenado,
}) {
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  const [itens, setItens] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selecionado, setSelecionado] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ++requestRef.current;
    };
  }, []);

  const carregar = useCallback(async () => {
    if (!condominioId) {
      setItens([]);
      setTotal(0);
      setError(null);
      return;
    }

    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    try {
      const resultado = await listarPendenciasArmazenamento({
        condominioId,
        limite: 50,
        offset: 0,
      });

      if (!mountedRef.current || requestId !== requestRef.current) {
        return;
      }

      setItens(resultado.itens);
      setTotal(resultado.total);
    } catch (err) {
      if (!mountedRef.current || requestId !== requestRef.current) {
        return;
      }

      setItens([]);
      setTotal(0);
      setError(
        err?.message ||
          "Não foi possível carregar as pendências de armazenamento."
      );
    } finally {
      if (mountedRef.current && requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [condominioId]);

  useEffect(() => {
    carregar();
  }, [carregar, refreshKey]);

  function abrir(item) {
    setSelecionado(item);
    setDrawerOpen(true);
  }

  function fechar() {
    setDrawerOpen(false);
    setSelecionado(null);
  }

  async function handleArmazenado(resultado) {
    const encomendaConcluida = selecionado?.encomendaId;

    if (encomendaConcluida) {
      setItens((atuais) =>
        atuais.filter(
          (item) => item.encomendaId !== encomendaConcluida
        )
      );
      setTotal((atual) => Math.max(0, atual - 1));
    }

    fechar();
    await carregar();
    await onArmazenado?.(resultado);
  }

  return (
    <>
      <section
        className="entrada-storage-pending"
        aria-labelledby="entrada-storage-pending-title"
      >
        <div className="entrada-storage-pending__heading">
          <div className="entrada-storage-pending__heading-copy">
            <span className="entrada-storage-pending__eyebrow">
              Continuidade operacional
            </span>

            <div className="entrada-storage-pending__title-row">
              <h2 id="entrada-storage-pending-title">
                Pendentes de armazenamento
              </h2>

              {!loading && !error ? (
                <span
                  className="entrada-storage-pending__count"
                  aria-label={`${total} pendências de armazenamento`}
                >
                  {total}
                </span>
              ) : null}
            </div>

            <p>
              Entradas já confirmadas que ainda precisam ter o local físico registrado.
            </p>
          </div>

          <button
            type="button"
            className="entrada-storage-pending__refresh"
            onClick={carregar}
            disabled={loading || !condominioId}
            aria-label="Atualizar pendências de armazenamento"
          >
            <RefreshCw
              size={17}
              className={loading ? "entrada-storage-pending__spin" : ""}
            />
            <span>Atualizar</span>
          </button>
        </div>

        {loading ? (
          <div className="entrada-storage-pending__state" role="status">
            <LoaderCircle
              size={22}
              className="entrada-storage-pending__spin"
            />
            <div>
              <strong>Carregando pendências</strong>
              <p>Consultando o estado oficial do armazenamento.</p>
            </div>
          </div>
        ) : error ? (
          <div
            className="entrada-storage-pending__state entrada-storage-pending__state--error"
            role="alert"
          >
            <AlertCircle size={22} />
            <div>
              <strong>Não foi possível carregar</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={carregar}>
              Tentar novamente
            </button>
          </div>
        ) : itens.length === 0 ? (
          <div className="entrada-storage-pending__empty">
            <PackageCheck size={24} />
            <div>
              <strong>Nenhuma Entrada aguardando armazenamento</strong>
              <p>Não há continuidade operacional pendente neste momento.</p>
            </div>
          </div>
        ) : (
          <div className="entrada-storage-pending__list">
            {itens.map((item, index) => (
              <button
                type="button"
                className="entrada-storage-pending__item"
                key={item.encomendaId}
                onClick={() => abrir(item)}
              >
                <span className="entrada-storage-pending__order">
                  {index + 1}
                </span>

                <span className="entrada-storage-pending__item-main">
                  <span className="entrada-storage-pending__item-title">
                    <strong>{formatarNumero(item.numeroEncomenda)}</strong>
                    <span>{item.destinatarioNome || "Destinatário identificado"}</span>
                  </span>

                  <span className="entrada-storage-pending__meta">
                    <span>
                      <Clock3 size={14} />
                      {item.entradaConfirmadaEmLocal || "Entrada confirmada"}
                    </span>
                    <span>
                      <ArchiveRestore size={14} />
                      {formatarTipo(item.tipoEntrega) || "Tipo oficial"}
                    </span>
                  </span>
                </span>

                <span className="entrada-storage-pending__action">
                  Armazenar
                  <ChevronRight size={17} />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <EntradaArmazenamentoRecuperacaoDrawer
        open={drawerOpen}
        item={selecionado}
        onClose={fechar}
        onArmazenado={handleArmazenado}
      />
    </>
  );
}
