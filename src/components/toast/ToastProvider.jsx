import {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import ToastContainer from "./ToastContainer";

export const ToastContext = createContext(null);

const DURACAO_PADRAO = 5000;
const LIMITE_VISIVEL = 4;

function gerarToastId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removerToast = useCallback((id) => {
    const timer = timersRef.current.get(id);

    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((atuais) =>
      atuais.filter((toast) => toast.id !== id)
    );
  }, []);

  const pausarToast = useCallback((id) => {
    const timer = timersRef.current.get(id);

    if (!timer) return;

    window.clearTimeout(timer);
    timersRef.current.delete(id);
  }, []);

  const retomarToast = useCallback(
    (toast) => {
      if (
        toast.persistente ||
        toast.duracao === 0 ||
        timersRef.current.has(toast.id)
      ) {
        return;
      }

      const timer = window.setTimeout(() => {
        removerToast(toast.id);
      }, toast.duracao || DURACAO_PADRAO);

      timersRef.current.set(toast.id, timer);
    },
    [removerToast]
  );

  const adicionarToast = useCallback(
    ({
      tipo = "info",
      titulo,
      mensagem,
      duracao = DURACAO_PADRAO,
      persistente = false,
      acao = null,
      chave = null,
    }) => {
      const id = gerarToastId();

      setToasts((atuais) => {
        if (chave) {
          const jaExiste = atuais.some(
            (toast) => toast.chave === chave
          );

          if (jaExiste) {
            return atuais;
          }
        }

        const novoToast = {
          id,
          tipo,
          titulo:
            titulo ||
            (tipo === "success"
              ? "Operação concluída"
              : tipo === "error"
                ? "Não foi possível concluir"
                : tipo === "warning"
                  ? "Atenção"
                  : "Informação"),
          mensagem: mensagem || "",
          duracao,
          persistente,
          acao,
          chave,
          criadoEm: new Date().toISOString(),
        };

        return [novoToast, ...atuais].slice(
          0,
          LIMITE_VISIVEL
        );
      });

      if (!persistente && duracao !== 0) {
        const timer = window.setTimeout(() => {
          removerToast(id);
        }, duracao);

        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removerToast]
  );

  const sucesso = useCallback(
    (titulo, mensagem, opcoes = {}) =>
      adicionarToast({
        ...opcoes,
        tipo: "success",
        titulo,
        mensagem,
      }),
    [adicionarToast]
  );

  const erro = useCallback(
    (titulo, mensagem, opcoes = {}) =>
      adicionarToast({
        ...opcoes,
        tipo: "error",
        titulo,
        mensagem,
        duracao: opcoes.duracao ?? 7000,
      }),
    [adicionarToast]
  );

  const atencao = useCallback(
    (titulo, mensagem, opcoes = {}) =>
      adicionarToast({
        ...opcoes,
        tipo: "warning",
        titulo,
        mensagem,
      }),
    [adicionarToast]
  );

  const info = useCallback(
    (titulo, mensagem, opcoes = {}) =>
      adicionarToast({
        ...opcoes,
        tipo: "info",
        titulo,
        mensagem,
      }),
    [adicionarToast]
  );

  const novaNotificacao = useCallback(
    (titulo, mensagem, opcoes = {}) =>
      adicionarToast({
        ...opcoes,
        tipo: "notification",
        titulo,
        mensagem,
      }),
    [adicionarToast]
  );

  const limparTodos = useCallback(() => {
    timersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });

    timersRef.current.clear();
    setToasts([]);
  }, []);

  const value = useMemo(
    () => ({
      adicionarToast,
      removerToast,
      limparTodos,
      sucesso,
      erro,
      atencao,
      info,
      novaNotificacao,
    }),
    [
      adicionarToast,
      removerToast,
      limparTodos,
      sucesso,
      erro,
      atencao,
      info,
      novaNotificacao,
    ]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <ToastContainer
        toasts={toasts}
        onClose={removerToast}
        onPause={pausarToast}
        onResume={retomarToast}
      />
    </ToastContext.Provider>
  );
}