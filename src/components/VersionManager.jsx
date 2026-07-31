import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  adiarAtualizacaoNaSessao,
  aplicarAtualizacao,
  avaliarAtualizacao,
  consumirConfirmacaoAtualizacao,
  normalizarModulo,
  VERSION_MANAGER_EVENTS,
  VERSION_MANAGER_STATUS,
} from "../services/versionManagerService";

import "./VersionManager.css";

/**
 * Sistema Chegou! — Version Manager
 *
 * Responsabilidades:
 * - verificar se existe uma nova release publicada;
 * - validar se a atualização se aplica ao módulo atual;
 * - apresentar aviso global de atualização;
 * - permitir atualização imediata;
 * - permitir adiamento durante a sessão, quando autorizado;
 * - aplicar atualizações obrigatórias;
 * - reagir aos eventos emitidos pelo Service Worker;
 * - confirmar ao usuário quando o sistema foi atualizado.
 */

const INTERVALO_VERIFICACAO_MS = 5 * 60 * 1000;
const ATRASO_VERIFICACAO_INICIAL_MS = 1500;

function VersionManager({
  moduloAtual,
  habilitado = true,
}) {
  const [manifesto, setManifesto] = useState(null);
  const [avisoAberto, setAvisoAberto] = useState(false);
  const [aplicandoAtualizacao, setAplicandoAtualizacao] =
    useState(false);
  const [erroAtualizacao, setErroAtualizacao] = useState("");
  const [ultimaAvaliacao, setUltimaAvaliacao] = useState(null);

  const componenteMontadoRef = useRef(true);
  const avaliacaoEmAndamentoRef = useRef(false);
  const atualizacaoEmAndamentoRef = useRef(false);
  const confirmacaoConsumidaRef = useRef(false);
  const primeiraVerificacaoExecutadaRef = useRef(false);

  const moduloNormalizado = normalizarModulo(moduloAtual);

  const atualizacaoObrigatoria = manifesto?.mandatory === true;

  /**
   * Confirma visualmente que a atualização foi concluída
   * após o recarregamento da aplicação.
   */
  useEffect(() => {
    if (
      !habilitado ||
      confirmacaoConsumidaRef.current
    ) {
      return;
    }

    confirmacaoConsumidaRef.current = true;

    const confirmacao =
      consumirConfirmacaoAtualizacao();

    if (!confirmacao) {
      return;
    }

    const versao =
      confirmacao.appVersion ||
      confirmacao.releaseId;

    toast.success(
      versao
        ? `Sistema atualizado para a versão ${versao}.`
        : "Sistema atualizado com sucesso.",
      {
        duration: 4500,
        icon: <CheckCircle2 size={20} />,
      }
    );
  }, [habilitado]);

  /**
   * Executa uma avaliação completa da release publicada.
   */
  const verificarAtualizacao = useCallback(
    async ({ forcar = false } = {}) => {
      if (
        !habilitado ||
        !moduloNormalizado ||
        avaliacaoEmAndamentoRef.current ||
        atualizacaoEmAndamentoRef.current
      ) {
        return null;
      }

      if (
        document.visibilityState === "hidden" &&
        !forcar
      ) {
        return null;
      }

      avaliacaoEmAndamentoRef.current = true;

      try {
        const resultado = await avaliarAtualizacao({
          moduloAtual: moduloNormalizado,
        });

        if (!componenteMontadoRef.current) {
          return resultado;
        }

        setUltimaAvaliacao(resultado);

        if (
          resultado.status ===
          VERSION_MANAGER_STATUS
            .ATUALIZACAO_DISPONIVEL
        ) {
          setManifesto(resultado.manifesto);
          setErroAtualizacao("");
          setAvisoAberto(true);

          return resultado;
        }

        if (
          resultado.status ===
            VERSION_MANAGER_STATUS
              .SEM_ATUALIZACAO ||
          resultado.status ===
            VERSION_MANAGER_STATUS
              .NAO_APLICAVEL ||
          resultado.status ===
            VERSION_MANAGER_STATUS
              .ADIADA_NA_SESSAO ||
          resultado.status ===
            VERSION_MANAGER_STATUS
              .REFERENCIA_INICIAL_REGISTRADA
        ) {
          setAvisoAberto(false);
          setManifesto(null);
          setErroAtualizacao("");
        }

        return resultado;
      } catch (error) {
        console.warn(
          "[Sistema Chegou!] Erro ao verificar atualização:",
          error
        );

        return null;
      } finally {
        avaliacaoEmAndamentoRef.current = false;
        primeiraVerificacaoExecutadaRef.current = true;
      }
    },
    [
      habilitado,
      moduloNormalizado,
    ]
  );

  /**
   * Verificação inicial e verificação periódica.
   */
  useEffect(() => {
    componenteMontadoRef.current = true;

    if (
      !habilitado ||
      !moduloNormalizado
    ) {
      return () => {
        componenteMontadoRef.current = false;
      };
    }

    const timeoutInicial = window.setTimeout(() => {
      void verificarAtualizacao({
        forcar: true,
      });
    }, ATRASO_VERIFICACAO_INICIAL_MS);

    const intervalo = window.setInterval(() => {
      void verificarAtualizacao();
    }, INTERVALO_VERIFICACAO_MS);

    return () => {
      componenteMontadoRef.current = false;

      window.clearTimeout(timeoutInicial);
      window.clearInterval(intervalo);
    };
  }, [
    habilitado,
    moduloNormalizado,
    verificarAtualizacao,
  ]);

  /**
   * Faz uma nova verificação quando:
   * - o usuário retorna para a aba;
   * - o dispositivo recupera conexão com a internet.
   */
  useEffect(() => {
    if (
      !habilitado ||
      !moduloNormalizado
    ) {
      return undefined;
    }

    function aoAlterarVisibilidade() {
      if (document.visibilityState === "visible") {
        void verificarAtualizacao({
          forcar: true,
        });
      }
    }

    function aoFicarOnline() {
      void verificarAtualizacao({
        forcar: true,
      });
    }

    document.addEventListener(
      "visibilitychange",
      aoAlterarVisibilidade
    );

    window.addEventListener(
      "online",
      aoFicarOnline
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        aoAlterarVisibilidade
      );

      window.removeEventListener(
        "online",
        aoFicarOnline
      );
    };
  }, [
    habilitado,
    moduloNormalizado,
    verificarAtualizacao,
  ]);

  /**
   * Reage aos eventos emitidos pelo registro oficial
   * do Service Worker localizado no main.jsx.
   */
  useEffect(() => {
    if (
      !habilitado ||
      !moduloNormalizado
    ) {
      return undefined;
    }

    function aoRegistrarServiceWorker() {
      void verificarAtualizacao({
        forcar: true,
      });
    }

    function aoEncontrarAtualizacaoServiceWorker() {
      void verificarAtualizacao({
        forcar: true,
      });
    }

    window.addEventListener(
      VERSION_MANAGER_EVENTS
        .SERVICE_WORKER_REGISTERED,
      aoRegistrarServiceWorker
    );

    window.addEventListener(
      VERSION_MANAGER_EVENTS
        .SERVICE_WORKER_UPDATE,
      aoEncontrarAtualizacaoServiceWorker
    );

    return () => {
      window.removeEventListener(
        VERSION_MANAGER_EVENTS
          .SERVICE_WORKER_REGISTERED,
        aoRegistrarServiceWorker
      );

      window.removeEventListener(
        VERSION_MANAGER_EVENTS
          .SERVICE_WORKER_UPDATE,
        aoEncontrarAtualizacaoServiceWorker
      );
    };
  }, [
    habilitado,
    moduloNormalizado,
    verificarAtualizacao,
  ]);

  /**
   * Permite adiar somente atualizações não obrigatórias.
   *
   * O adiamento fica exclusivamente no sessionStorage.
   */
  function atualizarDepois() {
    if (
      !manifesto ||
      manifesto.mandatory ||
      aplicandoAtualizacao
    ) {
      return;
    }

    adiarAtualizacaoNaSessao({
      releaseId: manifesto.releaseId,
      moduloAtual: moduloNormalizado,
    });

    setAvisoAberto(false);
    setErroAtualizacao("");

    toast(
      "A atualização foi adiada durante esta sessão.",
      {
        duration: 3500,
        icon: <Clock3 size={20} />,
      }
    );
  }

  /**
   * Aplica a atualização e recarrega a aplicação
   * uma única vez.
   */
  async function atualizarAgora() {
    if (
      !manifesto ||
      aplicandoAtualizacao ||
      atualizacaoEmAndamentoRef.current
    ) {
      return;
    }

    atualizacaoEmAndamentoRef.current = true;
    setAplicandoAtualizacao(true);
    setErroAtualizacao("");

    try {
      await aplicarAtualizacao({
        manifesto,
        moduloAtual: moduloNormalizado,
      });
    } catch (error) {
      console.error(
        "[Sistema Chegou!] Não foi possível aplicar a atualização:",
        error
      );

      atualizacaoEmAndamentoRef.current = false;

      if (componenteMontadoRef.current) {
        setAplicandoAtualizacao(false);
        setErroAtualizacao(
          "Não foi possível concluir a atualização. Verifique sua conexão e tente novamente."
        );
      }
    }
  }

  /**
   * Impede o fechamento externo quando a atualização
   * é obrigatória.
   */
  function fecharAviso() {
    if (
      atualizacaoObrigatoria ||
      aplicandoAtualizacao
    ) {
      return;
    }

    atualizarDepois();
  }

  /**
   * Fecha com Escape somente quando a atualização
   * pode ser adiada.
   */
  useEffect(() => {
    if (!avisoAberto) {
      return undefined;
    }

    function aoPressionarTecla(event) {
      if (
        event.key === "Escape" &&
        !atualizacaoObrigatoria &&
        !aplicandoAtualizacao
      ) {
        atualizarDepois();
      }
    }

    window.addEventListener(
      "keydown",
      aoPressionarTecla
    );

    return () => {
      window.removeEventListener(
        "keydown",
        aoPressionarTecla
      );
    };
  }, [
    avisoAberto,
    atualizacaoObrigatoria,
    aplicandoAtualizacao,
    manifesto,
    moduloNormalizado,
  ]);

  /**
   * Bloqueia o scroll da página enquanto o modal
   * de atualização estiver aberto.
   */
  useEffect(() => {
    if (!avisoAberto) {
      return undefined;
    }

    const overflowAnterior =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        overflowAnterior;
    };
  }, [avisoAberto]);

  if (
    !habilitado ||
    !moduloNormalizado ||
    !avisoAberto ||
    !manifesto
  ) {
    return null;
  }

  return (
    <div
      className="version-manager-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          fecharAviso();
        }
      }}
    >
      <section
        className="version-manager-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-manager-title"
        aria-describedby="version-manager-message"
      >
        {!atualizacaoObrigatoria && (
          <button
            type="button"
            className="version-manager-close"
            onClick={atualizarDepois}
            disabled={aplicandoAtualizacao}
            aria-label="Atualizar depois"
            title="Atualizar depois"
          >
            <X size={20} />
          </button>
        )}

        <div className="version-manager-visual">
          <div className="version-manager-icon">
            {atualizacaoObrigatoria ? (
              <ShieldCheck
                size={34}
                strokeWidth={2}
              />
            ) : (
              <Sparkles
                size={34}
                strokeWidth={2}
              />
            )}
          </div>

          <span className="version-manager-badge">
            {atualizacaoObrigatoria
              ? "Atualização necessária"
              : "Nova versão"}
          </span>
        </div>

        <div className="version-manager-content">
          <h2 id="version-manager-title">
            {manifesto.title}
          </h2>

          <p
            id="version-manager-message"
            className="version-manager-message"
          >
            {manifesto.message}
          </p>

          <div className="version-manager-version-info">
            <span>
              Versão{" "}
              <strong>
                {manifesto.appVersion}
              </strong>
            </span>

            <span
              className="version-manager-release"
              title={`Release ${manifesto.releaseId}`}
            >
              Release {manifesto.releaseId}
            </span>
          </div>

          {atualizacaoObrigatoria && (
            <div className="version-manager-required">
              <ShieldCheck size={19} />

              <p>
                Esta atualização é necessária
                para continuar utilizando o
                sistema com segurança e
                compatibilidade.
              </p>
            </div>
          )}

          {erroAtualizacao && (
            <div
              className="version-manager-error"
              role="alert"
            >
              <AlertTriangle size={19} />

              <p>{erroAtualizacao}</p>
            </div>
          )}
        </div>

        <div className="version-manager-actions">
          {!atualizacaoObrigatoria && (
            <button
              type="button"
              className="version-manager-button version-manager-button-secondary"
              onClick={atualizarDepois}
              disabled={aplicandoAtualizacao}
            >
              <Clock3 size={18} />
              Atualizar depois
            </button>
          )}

          <button
            type="button"
            className="version-manager-button version-manager-button-primary"
            onClick={atualizarAgora}
            disabled={aplicandoAtualizacao}
          >
            <RefreshCw
              size={18}
              className={
                aplicandoAtualizacao
                  ? "version-manager-spinner"
                  : ""
              }
            />

            {aplicandoAtualizacao
              ? "Atualizando..."
              : "Atualizar agora"}
          </button>
        </div>

        <p className="version-manager-footer">
          A atualização preserva seu acesso e
          recarrega o Sistema Chegou! apenas uma
          vez.
        </p>
      </section>
    </div>
  );
}

export default VersionManager;