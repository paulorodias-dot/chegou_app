import { useEffect, useState } from "react";
import {
  X,
  User,
  BriefcaseBusiness,
  Building2,
  KeyRound,
  Clock,
  Pencil,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { supabase } from "../../../services/supabase";

export default function FuncionarioDrawer({
  aberto,
  funcionarioId,
  bloquearEsc = false,
  onClose,
  onEditar,
  onCriarAcesso,
  onReenviarConvite,
  mostrarToast,
}) {
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (aberto && funcionarioId) {
      carregarDetalhes();
    }
  }, [aberto, funcionarioId]);

  useEffect(() => {
    function onKeyDown(e) {
        if (e.key === "Escape" && !bloquearEsc) {
        onClose?.();
        }
    }

    if (aberto) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    }, [aberto, bloquearEsc, onClose]);

  if (!aberto) return null;

  async function carregarDetalhes() {
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc(
        "rpc_admin_funcionario_detalhes_drawer_v1",
        {
          p_funcionario_condominio_id: funcionarioId,
        }
      );

      if (error) throw error;

      setDados(data);
    } catch (error) {
      console.error("Erro ao carregar funcionário:", error);
      mostrarToast?.("Não foi possível carregar os dados do funcionário.", "erro");
    } finally {
      setLoading(false);
    }
  }

  const pessoais = dados?.dados_pessoais || {};
  const vinculo = dados?.vinculo_operacional || {};
  const cargo = dados?.cargo_funcao || {};
  const fornecedor = dados?.fornecedor || {};
  const acesso = dados?.acesso || {};
  const historico = dados?.historico_recente || [];
  const metadados = dados?.metadados || {};

  return (
    <div className="funcionarios-drawer-overlay">
      <aside className="funcionarios-drawer" role="dialog" aria-modal="true">
        <div className="funcionarios-drawer-header">
          <div>
            <span className="funcionarios-eyebrow">FUNCIONÁRIO</span>
            <h2>Detalhes do Funcionário</h2>
          </div>

          <button type="button" className="func-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="funcionarios-drawer-body">
          {loading ? (
            <div className="func-drawer-empty">Carregando dados do funcionário...</div>
          ) : !dados ? (
            <div className="func-drawer-empty">Nenhum dado encontrado.</div>
          ) : (
            <>
                <section className="func-drawer-profile">
                    <div className="func-drawer-avatar">
                        {vinculo.foto_url ? (
                        <img src={vinculo.foto_url} alt="" />
                        ) : (
                        <span>{(pessoais.nome_completo || "?").slice(0, 1)}</span>
                        )}
                    </div>

                    <div className="func-drawer-profile-info">
                        <div className="func-drawer-ids">
                          <span>Cadastro de funcionário</span>
                        </div>

                        <h3>{pessoais.nome_completo || "Funcionário"}</h3>
                        <p>{cargo.cargo_nome || cargo.funcao_nome || "Cargo não informado"}</p>
                    </div>
                </section>

              <div className="func-drawer-actions">
                <button type="button" className="btn-primary" onClick={() => onEditar?.(dados)}>
                  <Pencil size={16} />
                  Editar
                </button>

                {vinculo.status_acesso === "SEM_ACESSO" && (
                  <button
                    type="button"
                    className="btn-orange"
                    onClick={() => onCriarAcesso?.(dados)}
                  >
                    <KeyRound size={16} />
                    Criar acesso
                  </button>
                )}

                {["ACESSO_SOLICITADO", "PRIMEIRO_ACESSO_PENDENTE"].includes(
                  vinculo.status_acesso
                ) && (
                  <button type="button" className="btn-ghost" onClick={() => onReenviarConvite?.(dados)}>
                    <Mail size={16} />
                    Reenviar
                  </button>
                )}
              </div>

              <DrawerSection icon={User} title="Dados pessoais">
                <InfoRow label="CPF" value={formatarCpf(pessoais.cpf)} />
                <InfoRow label="E-mail" value={pessoais.email} />
                <InfoRow label="Telefone" value={formatarTelefone(pessoais.telefone)} />
                <InfoRow
                  label="WhatsApp"
                  value={`${vinculo.ddi_whatsapp || "+55"} ${formatarTelefone(vinculo.whatsapp)}`}
                />
              </DrawerSection>

              <DrawerSection icon={BriefcaseBusiness} title="Vínculo operacional">
                <InfoRow label="Tipo" value={formatarTipo(vinculo.tipo_funcionario)} />
                <InfoRow label="Situação" value={formatarSituacao(vinculo.situacao)} />
                <InfoRow label="Categoria" value={cargo.categoria_nome} />
                <InfoRow label="Cargo" value={cargo.cargo_nome} />
                <InfoRow label="Função" value={cargo.funcao_nome} />
                <InfoRow label="Admissão" value={formatarData(vinculo.data_admissao)} />
                <InfoRow label="Início do vínculo" value={formatarData(vinculo.data_inicio_vinculo)} />
                <InfoRow label="Fim do vínculo" value={formatarData(vinculo.data_fim_vinculo)} />
              </DrawerSection>

              {vinculo.tipo_funcionario === "TERCEIRIZADO" && (
                <DrawerSection icon={Building2} title="Fornecedor vinculado">
                  <InfoRow
                    label="Fornecedor"
                    value={fornecedor.nome_fantasia || fornecedor.razao_social}
                  />
                  <InfoRow label="Documento" value={formatarDocumento(fornecedor.documento)} />
                  <InfoRow label="Situação" value={formatarSituacaoFornecedor(fornecedor.situacao)} />
                </DrawerSection>
              )}

              <DrawerSection icon={KeyRound} title="Acesso ao sistema">
                <InfoRow label="Status" value={formatarAcesso(vinculo.status_acesso)} />
                <InfoRow label="Login" value={acesso.username} />
                <InfoRow label="E-mail de acesso" value={acesso.email_login || acesso.usuario_email} />
                <InfoRow label="Nível" value={acesso.nivel_id} />
                <InfoRow label="Último login" value={formatarDataHora(acesso.ultimo_login_em)} />
                <InfoRow label="Último dispositivo" value={acesso.ultimo_dispositivo} />
              </DrawerSection>

              <DrawerSection icon={ShieldCheck} title="Permissões extras">
                {dados.permissoes_extras?.length ? (
                  dados.permissoes_extras.map((p) => (
                    <div key={p.id} className="func-permissao-item">
                      <strong>{p.permissao_nome}</strong>
                      <span>{p.modulo || "Módulo não informado"}</span>
                    </div>
                  ))
                ) : (
                  <p className="func-drawer-muted">Nenhuma permissão extra ativa.</p>
                )}
              </DrawerSection>

              <DrawerSection icon={Clock} title="Histórico recente">
                {historico.length ? (
                  historico.map((h) => (
                    <div key={h.id} className="func-historico-item">
                      <strong>{formatarEvento(h.tipo_evento)}</strong>
                      <span>{h.motivo || "Movimentação registrada"}</span>
                      <small>{formatarDataHora(h.criado_em)}</small>
                    </div>
                  ))
                ) : (
                  <p className="func-drawer-muted">Nenhuma movimentação recente.</p>
                )}
              </DrawerSection>

              <DrawerSection icon={Clock} title="Metadados">
                <InfoRow label="Criado por" value={metadados.criado_por_nome} />
                <InfoRow label="Criado em" value={formatarDataHora(metadados.criado_em)} />
                <InfoRow label="Última edição por" value={metadados.editado_por_nome} />
                <InfoRow label="Atualizado em" value={formatarDataHora(metadados.atualizado_em)} />
              </DrawerSection>

              {vinculo.observacoes && (
                <DrawerSection icon={Pencil} title="Observações">
                  <p className="func-drawer-text">{vinculo.observacoes}</p>
                </DrawerSection>
              )}
            </>
          )}
        </div>

        <div className="funcionarios-modal-footer">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </aside>
    </div>
  );
}

function DrawerSection({ icon: Icon, title, children }) {
  return (
    <section className="func-drawer-section">
      <div className="func-drawer-section-title">
        <Icon size={17} />
        <h4>{title}</h4>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="func-info-row">
      <span>{label}</span>
      <strong>{value || "Não informado"}</strong>
    </div>
  );
}

function formatarCpf(valor) {
  const n = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (n.length !== 11) return valor || "Não informado";
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function formatarTelefone(valor) {
  const n = String(valor || "").replace(/\D/g, "");
  if (!n) return "Não informado";
  if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return n.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function formatarData(valor) {
  if (!valor) return "Não informado";
  return new Date(valor).toLocaleDateString("pt-BR");
}

function formatarDataHora(valor) {
  if (!valor) return "Não informado";
  return new Date(valor).toLocaleString("pt-BR");
}

function formatarTipo(valor) {
  return valor === "TERCEIRIZADO" ? "Funcionário terceirizado" : "Funcionário do condomínio";
}

function formatarSituacao(valor) {
  const mapa = {
    ATIVO: "Ativo",
    EM_EXPERIENCIA: "Em experiência",
    FERIAS: "Em férias",
    LICENCA: "Em licença",
    AFASTADO: "Afastado",
    SUSPENSO: "Suspenso",
    INATIVO: "Inativo",
    DESLIGADO: "Desligado",
  };

  return mapa[valor] || "Não informado";
}

function formatarAcesso(valor) {
  const mapa = {
    SEM_ACESSO: "Sem acesso",
    ACESSO_SOLICITADO: "Convite solicitado",
    PRIMEIRO_ACESSO_PENDENTE: "Primeiro acesso pendente",
    ACESSO_ATIVO: "Acesso ativo",
    ACESSO_BLOQUEADO: "Acesso bloqueado",
    ACESSO_REVOGADO: "Acesso revogado",
  };

  return mapa[valor] || "Não informado";
}

function formatarDocumento(valor) {
  const n = String(valor || "").replace(/\D/g, "");

  if (n.length === 11) {
    return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (n.length === 14) {
    return n.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }

  return valor || "Não informado";
}

function formatarSituacaoFornecedor(valor) {
  const mapa = {
    ATIVO: "Ativo",
    EM_HOMOLOGACAO: "Em homologação",
    SUSPENSO: "Suspenso",
    INATIVO: "Inativo",
    BLOQUEADO: "Bloqueado",
  };

  return mapa[valor] || "Não informado";
}

function formatarEvento(evento) {
  const mapa = {
    FUNCIONARIO_CADASTRADO: "Funcionário cadastrado",
    FUNCIONARIO_EDITADO: "Cadastro atualizado",
    VINCULO_FUNCIONARIO_ALTERADO: "Vínculo alterado",
    ACESSO_FUNCIONARIO_SOLICITADO: "Acesso solicitado",
    ACESSO_FUNCIONARIO_REVOGADO: "Acesso revogado",
    ACESSO_FUNCIONARIO_REATIVADO: "Acesso reativado",
    CONVITE_ACESSO_FUNCIONARIO_REENVIADO: "Convite reenviado",
    PRIMEIRO_ACESSO_FUNCIONARIO_REALIZADO: "Primeiro acesso realizado",
    PERMISSAO_EXTRA_CONCEDIDA: "Permissão concedida",
    PERMISSAO_EXTRA_REMOVIDA: "Permissão removida",
  };

  return mapa[evento] || "Movimentação registrada";
}