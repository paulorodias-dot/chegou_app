import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  ClipboardList,
  Info,
  Package,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  listarNotificacoes,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
} from "../services/notificacoesService";

import "./NotificationCenter.css";

function formatarTempoRelativo(valor) {
  if (!valor) return "Agora";

  const agora = new Date();
  const data = new Date(valor);
  const diffMin = Math.floor((agora.getTime() - data.getTime()) / 60000);

  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `Há ${diffMin} min`;

  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `Há ${diffHoras} h`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(data);
}

function obterIcone(tipo = "") {
  if (tipo.includes("morador")) return ClipboardList;
  if (tipo.includes("encomenda")) return Package;
  if (tipo.includes("auditoria")) return ShieldCheck;
  if (tipo.includes("sistema")) return Info;
  return Bell;
}

export default function NotificationCenter({
  aberto,
  perfil,
  role,
  onClose,
  onAtualizarContador,
  onNavigate,
}) {
  const [carregando, setCarregando] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);

  const naoLidas = useMemo(
    () => notificacoes.filter((item) => !item.lida).length,
    [notificacoes]
  );

  async function carregar() {
    try {
      setCarregando(true);

      const lista = await listarNotificacoes({
        perfil,
        role,
        limite: 30,
      });

      setNotificacoes(lista);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (aberto) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  async function marcarComoLida(item) {
    if (!item?.id || item.lida) return;

    try {
      await marcarNotificacaoComoLida({ notificacaoId: item.id });

      setNotificacoes((atuais) =>
        atuais.map((notificacao) =>
          notificacao.id === item.id
            ? { ...notificacao, lida: true }
            : notificacao
        )
      );

      onAtualizarContador?.();
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  }

  async function marcarTodas() {
    try {
      await marcarTodasNotificacoesComoLidas({ perfil, role });

      setNotificacoes((atuais) =>
        atuais.map((item) => ({
          ...item,
          lida: true,
        }))
      );

      onAtualizarContador?.();
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  }

  function navegarPorNotificacao(item) {
    marcarComoLida(item);

    if (item?.tipo === "morador_aguardando_auditoria") {
      onNavigate?.("admin-auditoria-moradores-auditoria");
      onClose?.();
      return;
    }

    if (item?.modulo === "moradores") {
      onNavigate?.("admin-auditoria-moradores-auditoria");
      onClose?.();
    }
  }

  if (!aberto) return null;

  return (
    <>
      <button
        type="button"
        className="notification-center-backdrop"
        onClick={onClose}
        aria-label="Fechar notificações"
      />

      <aside className="notification-center" aria-label="Central de notificações">
        <div className="notification-center-header">
          <div>
            <span>Central Chegou!</span>
            <h2>Notificações</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="notification-center-summary">
          <div>
            <strong>{naoLidas}</strong>
            <span>não lida(s)</span>
          </div>

          <button type="button" onClick={marcarTodas} disabled={!naoLidas}>
            <CheckCheck size={16} />
            Marcar todas
          </button>
        </div>

        <div className="notification-center-list">
          {carregando ? (
            <div className="notification-center-empty">
              Carregando notificações...
            </div>
          ) : notificacoes.length ? (
            notificacoes.map((item) => {
              const Icon = obterIcone(item.tipo || "");

              return (
                <button
                  type="button"
                  key={item.id}
                  className={
                    item.lida
                      ? "notification-item"
                      : "notification-item unread"
                  }
                  onClick={() => navegarPorNotificacao(item)}
                >
                  <span className="notification-item-icon">
                    <Icon size={17} />
                  </span>

                  <span className="notification-item-content">
                    <strong>{item.titulo}</strong>
                    <small>{item.mensagem}</small>
                    <em>{formatarTempoRelativo(item.created_at)}</em>
                  </span>

                  {!item.lida ? <i /> : null}
                </button>
              );
            })
          ) : (
            <div className="notification-center-empty">
              Nenhuma notificação encontrada.
            </div>
          )}
        </div>
      </aside>
    </>
  );
}