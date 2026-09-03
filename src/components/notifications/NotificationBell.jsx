import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Bell } from "lucide-react";

import {
  contarNotificacoesNaoLidas,
  listarNotificacoesSininho,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
} from "../../services/notifications/centralNotificationsService";

import {
  adaptarContadorNaoLidas,
  adaptarNotificacoesSininho,
} from "../../services/notifications/centralNotificationsAdapter";

import NotificationBadge from "./NotificationBadge";
import NotificationPopover from "./NotificationPopover";
import "./notifications.css";

const POLLING_INTERVAL_MS = 30000;

export default function NotificationBell({
  className = "",
  onOpenChange,
}) {
  const wrapperRef = useRef(null);

  const baselineProntoRef = useRef(false);
  const idsConhecidosRef = useRef(new Set());

  const audioContextRef = useRef(null);
  const audioLiberadoRef = useRef(false);

  const animationTimerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ringing, setRinging] = useState(false);

  const prepararAudio = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      audioLiberadoRef.current =
        audioContextRef.current.state === "running";
    } catch {
      audioLiberadoRef.current = false;
    }
  }, []);

  const tocarSomSininho = useCallback(() => {
    const context = audioContextRef.current;

    if (
      !audioLiberadoRef.current ||
      !context ||
      context.state !== "running"
    ) {
      return;
    }

    try {
      const agora = context.currentTime;

      const gain = context.createGain();
      const oscillatorA = context.createOscillator();
      const oscillatorB = context.createOscillator();

      oscillatorA.type = "sine";
      oscillatorB.type = "sine";

      oscillatorA.frequency.setValueAtTime(880, agora);
      oscillatorA.frequency.exponentialRampToValueAtTime(
        660,
        agora + 0.34
      );

      oscillatorB.frequency.setValueAtTime(1320, agora + 0.05);
      oscillatorB.frequency.exponentialRampToValueAtTime(
        990,
        agora + 0.32
      );

      gain.gain.setValueAtTime(0.0001, agora);
      gain.gain.exponentialRampToValueAtTime(
        0.12,
        agora + 0.015
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        agora + 0.42
      );

      oscillatorA.connect(gain);
      oscillatorB.connect(gain);
      gain.connect(context.destination);

      oscillatorA.start(agora);
      oscillatorB.start(agora + 0.05);

      oscillatorA.stop(agora + 0.44);
      oscillatorB.stop(agora + 0.44);
    } catch (erro) {
      console.debug(
        "Som da Central de Notificações indisponível:",
        erro
      );
    }
  }, []);

  const sinalizarNovaNotificacao = useCallback(() => {
    setRinging(true);
    tocarSomSininho();

    if (animationTimerRef.current) {
      window.clearTimeout(animationTimerRef.current);
    }

    animationTimerRef.current = window.setTimeout(() => {
      setRinging(false);
    }, 1400);
  }, [tocarSomSininho]);

  const registrarBaseline = useCallback((itens) => {
    idsConhecidosRef.current = new Set(
      itens.map((item) => item.id)
    );

    baselineProntoRef.current = true;
  }, []);

  const detectarNovasNotificacoes = useCallback(
    (itens) => {
      if (!baselineProntoRef.current) {
        registrarBaseline(itens);
        return false;
      }

      const novas = itens.filter(
        (item) => !idsConhecidosRef.current.has(item.id)
      );

      itens.forEach((item) => {
        idsConhecidosRef.current.add(item.id);
      });

      if (novas.length > 0) {
        sinalizarNovaNotificacao();
        return true;
      }

      return false;
    },
    [registrarBaseline, sinalizarNovaNotificacao]
  );

  const consultarCentral = useCallback(
    async ({ atualizarLista = false } = {}) => {
      const [itensBrutos, totalBruto] = await Promise.all([
        listarNotificacoesSininho(20),
        contarNotificacoesNaoLidas(),
      ]);

      const itens =
        adaptarNotificacoesSininho(itensBrutos);

      const total =
        adaptarContadorNaoLidas(totalBruto);

      detectarNovasNotificacoes(itens);

      setUnreadCount(total);

      if (atualizarLista) {
        setNotifications(itens);
      }

      return itens;
    },
    [detectarNovasNotificacoes]
  );

  const carregarPopover = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await consultarCentral({
        atualizarLista: true,
      });
    } catch (erro) {
      console.error(
        "Erro ao carregar Central de Notificações:",
        erro
      );

      setError(erro);
    } finally {
      setLoading(false);
    }
  }, [consultarCentral]);

  const fechar = useCallback(() => {
    setOpen(false);
  }, []);

  const alternar = useCallback(() => {
    prepararAudio();
    setOpen((estadoAtual) => !estadoAtual);
  }, [prepararAudio]);

  useEffect(() => {
    function liberarAudioPorInteracao() {
      prepararAudio();
    }

    window.addEventListener(
      "pointerdown",
      liberarAudioPorInteracao,
      { once: true }
    );

    window.addEventListener(
      "keydown",
      liberarAudioPorInteracao,
      { once: true }
    );

    return () => {
      window.removeEventListener(
        "pointerdown",
        liberarAudioPorInteracao
      );

      window.removeEventListener(
        "keydown",
        liberarAudioPorInteracao
      );
    };
  }, [prepararAudio]);

  useEffect(() => {
    let ativo = true;

    async function criarBaselineInicial() {
      try {
        const itensBrutos =
          await listarNotificacoesSininho(20);

        const itens =
          adaptarNotificacoesSininho(itensBrutos);

        const total =
          await contarNotificacoesNaoLidas();

        if (!ativo) {
          return;
        }

        registrarBaseline(itens);

        setUnreadCount(
          adaptarContadorNaoLidas(total)
        );
      } catch (erro) {
        console.error(
          "Erro ao carregar estado inicial da Central de Notificações:",
          erro
        );
      }
    }

    criarBaselineInicial();

    return () => {
      ativo = false;
    };
  }, [registrarBaseline]);

  useEffect(() => {
    let ativo = true;

    async function verificarNovidades() {
      try {
        const itensBrutos =
          await listarNotificacoesSininho(20);

        const totalBruto =
          await contarNotificacoesNaoLidas();

        if (!ativo) {
          return;
        }

        const itens =
          adaptarNotificacoesSininho(itensBrutos);

        detectarNovasNotificacoes(itens);

        setUnreadCount(
          adaptarContadorNaoLidas(totalBruto)
        );

        if (open) {
          setNotifications(itens);
        }
      } catch (erro) {
        console.error(
          "Erro ao atualizar Central de Notificações:",
          erro
        );
      }
    }

    const intervalo = window.setInterval(
      verificarNovidades,
      POLLING_INTERVAL_MS
    );

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [detectarNovasNotificacoes, open]);

  useEffect(() => {
    onOpenChange?.(open);

    if (open) {
      carregarPopover();
    }
  }, [
    open,
    onOpenChange,
    carregarPopover,
  ]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        fechar();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        fechar();
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, fechar]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        window.clearTimeout(
          animationTimerRef.current
        );
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  async function handleRead(inboxId) {
    try {
      await marcarNotificacaoComoLida(inboxId);

      /*
       * Reconsulta a Central para preservar timestamps
       * autoritativos do backend.
       */
      await consultarCentral({
        atualizarLista: true,
      });
    } catch (erro) {
      console.error(
        "Erro ao marcar notificação como lida:",
        erro
      );

      setError(erro);
    }
  }

  async function handleReadAll() {
    try {
      await marcarTodasNotificacoesComoLidas();

      await consultarCentral({
        atualizarLista: true,
      });
    } catch (erro) {
      console.error(
        "Erro ao marcar notificações como lidas:",
        erro
      );

      setError(erro);
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="central-notifications-bell-wrapper"
    >
      <button
        type="button"
        className={[
          className,
          ringing
            ? "central-notifications-bell-ringing"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={alternar}
        aria-label="Abrir notificações"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notificações"
      >
        <span
          className="central-notifications-bell-icon"
          aria-hidden="true"
        >
          <Bell size={20} />
        </span>

        <NotificationBadge
          count={unreadCount}
        />
      </button>

      <NotificationPopover
        open={open}
        notifications={notifications}
        loading={loading}
        error={error}
        onClose={fechar}
        onRetry={carregarPopover}
        onRead={handleRead}
        onReadAll={handleReadAll}
      />
    </div>
  );
}