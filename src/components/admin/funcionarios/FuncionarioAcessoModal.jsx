import { useEffect, useMemo, useState } from "react";
import {
  X,
  KeyRound,
  Mail,
  RefreshCcw,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Phone,
  UserRound,
} from "lucide-react";
import { supabase } from "../../../services/supabase";

export default function FuncionarioAcessoModal({
  aberto,
  funcionario,
  modo = "criar",
  onClose,
  onConcluido,
  mostrarToast,
}) {
  const [processando, setProcessando] = useState(false);
  const [statusAtual, setStatusAtual] = useState(null);
  const [erro, setErro] = useState(null);

  const [emailEnvio, setEmailEnvio] = useState("");
  const [username, setUsername] = useState("");
  const [ddiWhatsapp, setDdiWhatsapp] = useState("+55");
  const [whatsapp, setWhatsapp] = useState("");

  const funcionarioId =
    funcionario?.vinculo_operacional?.funcionario_condominio_id ||
    funcionario?.funcionario_condominio_id ||
    funcionario?.id;

  const condominioId =
    funcionario?.vinculo_operacional?.condominio_id ||
    funcionario?.condominio_id ||
    null;

  const nomeFuncionario =
    funcionario?.dados_pessoais?.nome_completo ||
    funcionario?.nome_completo ||
    "Funcionário";

  const cargoFuncionario =
    funcionario?.cargo_funcao?.cargo_nome ||
    funcionario?.cargo_nome ||
    funcionario?.cargo_funcao?.funcao_nome ||
    funcionario?.funcao_nome ||
    "Função não informada";

  const emailFuncionario =
    funcionario?.dados_pessoais?.email ||
    funcionario?.email ||
    funcionario?.acesso?.usuario_email ||
    "";

  const titulo = useMemo(() => {
    if (modo === "reenviar") return "Reenviar convite de acesso";
    if (modo === "reset") return "Resetar senha";
    return "Criar acesso ao sistema";
  }, [modo]);

  const acessoJaSolicitado =
    statusAtual?.status_acesso === "ACESSO_SOLICITADO" ||
    statusAtual?.convite_status === "AGUARDANDO_ENVIO" ||
    statusAtual?.convite_status === "PROCESSANDO" ||
    statusAtual?.convite_status === "ENVIADO";

  useEffect(() => {
    if (!aberto || !funcionarioId) return;

    setErro(null);
    setEmailEnvio(emailFuncionario || "");
    setDdiWhatsapp(
      funcionario?.vinculo_operacional?.ddi_whatsapp ||
        funcionario?.ddi_whatsapp ||
        "+55"
    );
    setWhatsapp(
      mascaraTelefone(
        funcionario?.vinculo_operacional?.whatsapp ||
          funcionario?.whatsapp ||
          ""
      )
    );

    carregarStatus();
    prepararUsername();
  }, [aberto, funcionarioId, modo]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape" && !processando) onClose?.();
      if (e.key === "Enter" && e.ctrlKey && !processando) executarFluxo();
    }

    if (aberto) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aberto, processando, funcionarioId, modo, emailEnvio, username]);

  if (!aberto) return null;

  async function carregarStatus() {
    const { data, error } = await supabase.rpc(
      "rpc_admin_funcionario_status_consolidado_v1",
      { p_funcionario_condominio_id: funcionarioId }
    );

    if (!error) {
      const status = data?.[0] || null;
      setStatusAtual(status);

      if (status?.email) {
        setEmailEnvio(status.email);
      }

      if (status?.username && !status.username.includes("@")) {
        setUsername(normalizarUsername(status.username));
      }
    }

    const { data: conviteData } = await supabase
      .from("convites_acesso_funcionarios")
      .select("email, username, status, criado_em")
      .eq("funcionario_condominio_id", funcionarioId)
      .not("username", "is", null)
      .order("criado_em", { ascending: false })
      .limit(5);

    const conviteValido = conviteData?.find(
      (c) => c.username && !c.username.includes("@")
    );

    if (conviteValido?.username) {
      setUsername(normalizarUsername(conviteValido.username));
    }

    if (conviteValido?.email) {
      setEmailEnvio(conviteValido.email);
    }
  }

  async function prepararUsername() {
    if (modo !== "criar") return;

    try {
      if (condominioId) {
        const { data, error } = await supabase.rpc(
          "sugerir_usernames_funcionario",
          {
            p_nome_completo: nomeFuncionario,
            p_condominio_id: condominioId,
          }
        );

        if (!error && data?.[0]?.username) {
          setUsername(normalizarUsername(data[0].username));
          return;
        }
      }

      setUsername(gerarUsernameLocal(nomeFuncionario));
    } catch {
      setUsername(gerarUsernameLocal(nomeFuncionario));
    }
  }

  function limparNumeros(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function mascaraTelefone(valor) {
    const numeros = limparNumeros(valor).slice(0, 11);

    if (!numeros) return "";

    if (numeros.length <= 10) {
      return numeros
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return numeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function mascaraDdi(valor) {
    const numeros = limparNumeros(valor).slice(0, 3);
    return numeros ? `+${numeros}` : "+";
  }

  function normalizarUsername(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, ".")
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/\.+/g, ".")
      .replace(/^\./, "")
      .replace(/\.$/, "")
      .slice(0, 60);
  }

  function gerarUsernameLocal(nome) {
    const partes = String(nome || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (partes.length === 0) return "";

    if (partes.length === 1) return normalizarUsername(partes[0]);

    return normalizarUsername(`${partes[0]}.${partes[partes.length - 1]}`);
  }

  function dadosTecnicos() {
    const ua = navigator.userAgent || "";

    return {
      p_ip: null,
      p_user_agent: ua,
      p_navegador: identificarNavegador(ua),
      p_sistema_operacional: identificarSistema(ua),
    };
  }

  function identificarNavegador(ua) {
    if (ua.includes("Edg")) return "Edge";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    return "Navegador não identificado";
  }

  function identificarSistema(ua) {
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    if (ua.includes("Mac")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    return "Sistema não identificado";
  }

  function validarAntesDeEnviar() {
    if (modo === "criar") {
      if (!emailEnvio || !emailEnvio.includes("@")) {
        setErro("Informe um e-mail válido para envio do convite.");
        return false;
      }

      if (!username || username.length < 3) {
        setErro("Informe um login com pelo menos 3 caracteres.");
        return false;
      }
    }

    return true;
  }

  async function executarFluxo() {
    if (!funcionarioId || processando) return;
    if (!validarAntesDeEnviar()) return;

    setErro(null);
    setProcessando(true);

    try {
      let conviteId = null;
      let token = null;

      if (modo === "reenviar") {
        const { data, error } = await supabase.rpc(
          "rpc_admin_funcionario_reenviar_convite_acesso_v1",
          { p_funcionario_condominio_id: funcionarioId }
        );

        if (error) throw error;

        conviteId = data?.[0]?.convite_id;
        token = data?.[0]?.token;
      } else if (modo === "reset") {
        const { data, error } = await supabase.rpc(
          "rpc_admin_funcionario_solicitar_reset_senha_v1",
          { p_funcionario_condominio_id: funcionarioId }
        );

        if (error) throw error;

        conviteId = data?.[0]?.convite_id;
        token = data?.[0]?.token;
      } else {
        const { data, error } = await supabase.rpc(
          "rpc_admin_funcionario_solicitar_acesso_v2",
          {
            p_funcionario_condominio_id: funcionarioId,
            p_email: emailEnvio.trim().toLowerCase(),
            p_username: normalizarUsername(username),
            p_canal_solicitado: "EMAIL",
            ...dadosTecnicos(),
          }
        );

        if (error) throw error;

        conviteId = data?.[0]?.convite_id;
        token = data?.[0]?.token;
      }

      if (!conviteId || !token) {
        throw new Error("Convite não retornado.");
      }

      const { error: filaError } = await supabase.rpc(
        "rpc_admin_funcionario_convite_enfileirar_email_v1",
        {
          p_convite_id: conviteId,
          p_token: token,
        }
      );

      if (filaError) throw filaError;

      mostrarToast?.(
        modo === "reset"
          ? "E-mail para redefinição de senha enviado para a fila."
          : "Convite de acesso enviado para a fila.",
        "sucesso"
      );

      await carregarStatus();
      onConcluido?.();
      onClose?.();
    } catch (error) {
      console.error("Erro no fluxo de acesso:", error);
      setErro(
        "Não foi possível concluir esta ação. Verifique os dados do funcionário e tente novamente."
      );
      mostrarToast?.("Não foi possível concluir a ação de acesso.", "erro");
    } finally {
      setProcessando(false);
    }
  }

  function textoBotao() {
    if (processando) {
      if (modo === "reset") return "Enviando reset...";
      if (modo === "reenviar") return "Reenviando...";
      return "Criando acesso...";
    }

    if (modo === "reset") return "Enviar reset de senha";
    if (modo === "reenviar") return "Reenviar convite";
    return "Criar acesso";
  }

  function descricaoFluxo() {
    if (modo === "reset") {
      return "Será enviado um link seguro para o funcionário criar uma nova senha. O link anterior será invalidado automaticamente.";
    }

    if (modo === "reenviar") {
      return "Será gerado um novo convite de acesso. Qualquer convite anterior ainda não utilizado será invalidado.";
    }

    return "Revise o e-mail e o login antes de enviar o convite de primeiro acesso.";
  }

  return (
    <div className="funcionarios-modal-overlay" role="presentation">
      <div className="funcionarios-modal func-acesso-modal" role="dialog" aria-modal="true">
        <div className="funcionarios-modal-header">
          <div>
            <span className="funcionarios-eyebrow">ACESSO</span>
            <h2>{titulo}</h2>
          </div>

          <button
            type="button"
            className="func-modal-close"
            onClick={onClose}
            disabled={processando}
          >
            <X size={20} />
          </button>
        </div>

        <div className="funcionarios-modal-body">
          <section className="func-acesso-card">
            <div className="func-acesso-icon">
              <KeyRound size={24} />
            </div>

            <div>
              <h3>{nomeFuncionario}</h3>
              <p>{cargoFuncionario}</p>
            </div>
          </section>

          <section className="func-acesso-info">
            <div className="func-acesso-info-title">
              <UserRound size={18} />
              <h4>Dados de acesso</h4>
            </div>

            <p>{descricaoFluxo()}</p>

            <div className="func-acesso-form-grid">
              <label className="func-form-field span-2">
                <span>E-mail para envio</span>
                <input
                  value={emailEnvio}
                  onChange={(e) => setEmailEnvio(e.target.value)}
                  placeholder="email@exemplo.com"
                  type="email"
                  disabled={modo !== "criar" || processando || acessoJaSolicitado}
                />
              </label>

              <label className="func-form-field span-2">
                <span>Login sugerido</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(normalizarUsername(e.target.value))}
                  placeholder="nome.sobrenome"
                  disabled={modo !== "criar" || processando || acessoJaSolicitado}
                />
              </label>

              {acessoJaSolicitado && (
                <div className="func-acesso-bloqueio span-2">
                  O convite já foi gerado. Para alterar e-mail ou login, aguarde o primeiro acesso
                  do funcionário ou revogue o acesso antes de iniciar um novo convite.
                </div>
              )}

              <label className="func-form-field span-2">
                <span>WhatsApp preparado</span>
                <div className="func-whatsapp-row">
                  <input
                    value={ddiWhatsapp}
                    onChange={(e) => setDdiWhatsapp(mascaraDdi(e.target.value))}
                    placeholder="+55"
                    inputMode="numeric"
                    disabled={processando}
                  />
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(mascaraTelefone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    inputMode="numeric"
                    disabled={processando}
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="func-acesso-info">
            <div className="func-acesso-info-title">
              <Mail size={18} />
              <h4>Status do convite</h4>
            </div>

            <div className="func-acesso-status-grid">
              <StatusItem icon={Clock} label="Status atual" value={statusAtual?.badge_acesso || "Não informado"} />
              <StatusItem icon={Mail} label="Último convite" value={statusAtual?.convite_status || "Sem convite recente"} />
              <StatusItem icon={CheckCircle2} label="Canal" value="E-mail" />
            </div>
          </section>

          <section className="func-acesso-alerta">
            <ShieldAlert size={18} />
            <p>
              O funcionário só terá acesso ao sistema após abrir o link recebido
              e criar a senha. O acesso será limitado ao condomínio e às permissões configuradas.
            </p>
          </section>

          <section className="func-acesso-whatsapp">
            <div>
              <strong>WhatsApp</strong>
              <p>Envio por WhatsApp ficará disponível após homologação da integração.</p>
            </div>
            <span>Em preparação</span>
          </section>

          {erro ? <div className="func-acesso-erro">{erro}</div> : null}
        </div>

        <div className="funcionarios-modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={processando}>
            Cancelar
          </button>

          <button
            type="button"
            className={modo === "criar" ? "btn-orange" : "btn-primary"}
            onClick={executarFluxo}
            disabled={processando}
          >
            {processando ? <RefreshCcw size={17} className="func-spin" /> : <KeyRound size={17} />}
            {textoBotao()}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ icon: Icon, label, value }) {
  return (
    <div className="func-acesso-status-item">
      <Icon size={17} />
      <span>{label}</span>
      <strong>{value || "Não informado"}</strong>
    </div>
  );
}