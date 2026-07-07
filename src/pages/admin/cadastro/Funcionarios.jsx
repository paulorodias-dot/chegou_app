import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Pencil,
  KeyRound,
  Mail,
  RefreshCcw,
  ShieldCheck,
  MessageSquare,
  BookOpen,
  Clock,
  Info 
} from "lucide-react";
import { supabase } from "../../../services/supabase";
import "./Funcionarios.css";

import FuncionarioFormModal from "../../../components/admin/funcionarios/FuncionarioFormModal";
import FuncionarioDrawer from "../../../components/admin/funcionarios/FuncionarioDrawer";
import FuncionarioAcessoModal from "../../../components/admin/funcionarios/FuncionarioAcessoModal";

export default function Funcionarios({ perfil }) {
  const [loading, setLoading] = useState(true);
  const [funcionarios, setFuncionarios] = useState([]);
  const [kpis, setKpis] = useState({
    funcionarios_ativos: 0,
    funcionarios_inativos: 0,
    funcionarios_terceirizados: 0,
    funcionarios_com_acesso: 0,
  });

  const [movimentacoes, setMovimentacoes] = useState([]);
  const [opcoes, setOpcoes] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);

  const [busca, setBusca] = useState("");
  const [tipoFuncionario, setTipoFuncionario] = useState("");
  const [situacao, setSituacao] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [cargoId, setCargoId] = useState("");

  const [menuPosicao, setMenuPosicao] = useState(null);

  const [pagina, setPagina] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [menuAberto, setMenuAberto] = useState(null);
  const [toast, setToast] = useState(null);

  const [modalFuncionarioAberto, setModalFuncionarioAberto] = useState(false);
  const [modoModal, setModoModal] = useState("novo");
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);

  const [drawerAberto, setDrawerAberto] = useState(false);
  const [funcionarioDrawerId, setFuncionarioDrawerId] = useState(null);

  const [modalAcessoAberto, setModalAcessoAberto] = useState(false);
  const [modoAcesso, setModoAcesso] = useState("criar");
  const [funcionarioAcesso, setFuncionarioAcesso] = useState(null);

  const limite = 10;

  const condominioId = useMemo(() => {
    return (
        perfil?.condominio_id ||
        perfil?.condominioId ||
        localStorage.getItem("condominio_id") ||
        localStorage.getItem("chegou_condominio_id")
    );
    }, [perfil]);

  useEffect(() => {
    if (condominioId) {
      carregarTudo();
    }
  }, [
    condominioId,
    pagina,
    tipoFuncionario,
    situacao,
    categoriaId,
    cargoId,
  ]);

  function abrirNovoFuncionario() {
    setModoModal("novo");
    setFuncionarioSelecionado(null);
    setModalFuncionarioAberto(true);
  }

  function abrirVisualizarFuncionario(funcionario) {
    setFuncionarioDrawerId(funcionario.id);
    setDrawerAberto(true);
    setMenuAberto(null);
  }

  function abrirCriarAcesso(funcionarioOuDados) {
    setFuncionarioAcesso(funcionarioOuDados);
    setModoAcesso("criar");
    setModalAcessoAberto(true);
    setMenuAberto(null);
  }

  function abrirReenviarConvite(funcionarioOuDados) {
    setFuncionarioAcesso(funcionarioOuDados);
    setModoAcesso("reenviar");
    setModalAcessoAberto(true);
    setMenuAberto(null);
  }

  function abrirResetSenha(funcionarioOuDados) {
    setFuncionarioAcesso(funcionarioOuDados);
    setModoAcesso("reset");
    setModalAcessoAberto(true);
    setMenuAberto(null);
  }

  function alternarMenuAcoes(event, funcionarioId) {
    const rect = event.currentTarget.getBoundingClientRect();

    if (menuAberto === funcionarioId) {
      setMenuAberto(null);
      setMenuPosicao(null);
      return;
    }

    setMenuAberto(funcionarioId);
    setMenuPosicao({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }

  async function carregarTudo() {
    if (!condominioId) {
      mostrarToast("Não foi possível identificar o condomínio selecionado.", "erro");
      setLoading(false);
      return;
    }

    setLoading(true);

    await Promise.all([
      carregarKpis(),
      carregarFuncionarios(),
      carregarMovimentacoes(),
      carregarOpcoes(),
      carregarFornecedores(),
    ]);

    setLoading(false);
  }

  async function carregarKpis() {
    const { data, error } = await supabase.rpc("rpc_admin_funcionarios_kpis", {
      p_condominio_id: condominioId,
    });

    if (error) {
      mostrarToast("Não foi possível carregar os indicadores.", "erro");
      return;
    }

    setKpis(data?.[0] || kpis);
  }

  async function carregarFuncionarios() {
    const { data, error } = await supabase.rpc("rpc_admin_funcionarios_listar", {
      p_condominio_id: condominioId,
      p_busca: busca || null,
      p_tipo_funcionario: tipoFuncionario || null,
      p_situacao: situacao || null,
      p_categoria_id: categoriaId || null,
      p_cargo_id: cargoId || null,
      p_limit: limite,
      p_offset: (pagina - 1) * limite,
    });

    if (error) {
      mostrarToast("Não foi possível carregar os funcionários.", "erro");
      return;
    }

    setFuncionarios(data || []);
    setTotalRegistros(data?.[0]?.total_registros || 0);
  }

  async function carregarMovimentacoes() {
    const { data, error } = await supabase.rpc(
      "rpc_admin_funcionarios_movimentacoes_listar",
      {
        p_condominio_id: condominioId,
        p_limit: 5,
        p_offset: 0,
      }
    );

    if (!error) setMovimentacoes(data || []);
  }

  async function carregarOpcoes() {
    const [statusResp, cargosResp] = await Promise.all([
      supabase.rpc("rpc_admin_funcionarios_opcoes_status_v1"),
      supabase.rpc("rpc_admin_funcionarios_opcoes_cargos_funcoes_v1", {
        p_condominio_id: condominioId,
      }),
    ]);

    setOpcoes({
      status: statusResp.data,
      cargosFuncoes: cargosResp.data,
    });
  }

  async function carregarFornecedores() {
    if (!condominioId) return;

    const { data, error } = await supabase.rpc(
      "rpc_admin_funcionarios_opcoes_fornecedores_v1",
      {
        p_condominio_id: condominioId,
      }
    );

    if (error) {
      mostrarToast("Não foi possível carregar os fornecedores.", "erro");
      return;
    }

    setFornecedores(data || []);
  }

  function mostrarToast(mensagem, tipo = "sucesso") {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 5200);
  }

  function buscar() {
    setPagina(1);
    carregarFuncionarios();
  }

  function limparFiltros() {
    setBusca("");
    setTipoFuncionario("");
    setSituacao("");
    setCategoriaId("");
    setCargoId("");
    setPagina(1);
    setTimeout(carregarTudo, 100);
  }

  async function abrirEditarFuncionario(funcionario) {
    try {
      setMenuAberto(null);

      const { data, error } = await supabase.rpc(
        "rpc_admin_funcionario_detalhes_drawer_v1",
        {
          p_funcionario_condominio_id: funcionario.id,
        }
      );

      if (error) throw error;

      const dados = data || {};

      const funcionarioCompleto = {
        id: funcionario.id,

        nome_completo: dados?.dados_pessoais?.nome_completo || funcionario.nome_completo,
        cpf: dados?.dados_pessoais?.cpf || funcionario.cpf,
        email: dados?.dados_pessoais?.email || funcionario.email,
        telefone: dados?.dados_pessoais?.telefone || funcionario.telefone,

        tipo_funcionario:
          dados?.vinculo_operacional?.tipo_funcionario || funcionario.tipo_funcionario,
        situacao:
          dados?.vinculo_operacional?.situacao || funcionario.situacao,
        status_acesso:
          dados?.vinculo_operacional?.status_acesso || funcionario.status_acesso,
        data_admissao:
          dados?.vinculo_operacional?.data_admissao || "",
        ddi_whatsapp:
          dados?.vinculo_operacional?.ddi_whatsapp || "+55",
        whatsapp:
          dados?.vinculo_operacional?.whatsapp || "",
        foto_url:
          dados?.vinculo_operacional?.foto_url || "",
        observacoes:
          dados?.vinculo_operacional?.observacoes || "",

        categoria_id:
          dados?.cargo_funcao?.categoria_id || "",
        cargo_id:
          dados?.cargo_funcao?.cargo_id || "",
        funcao_id:
          dados?.cargo_funcao?.funcao_id || "",

        fornecedor_condominio_id:
          dados?.fornecedor?.fornecedor_condominio_id || "",
      };

      setModoModal("editar");
      setFuncionarioSelecionado(funcionarioCompleto);
      setModalFuncionarioAberto(true);
    } catch (error) {
      console.error("Erro ao abrir edição do funcionário:", error);
      mostrarToast(
        "Não foi possível carregar os dados do funcionário para edição.",
        "erro"
      );
    }
  }

  function labelTipo(tipo) {
    return tipo === "TERCEIRIZADO" ? "Terceirizado" : "Condomínio";
  }

  function labelSituacao(valor) {
    const item = opcoes?.status?.situacoes?.find((s) => s.codigo === valor);
    return item?.nome || "Não informado";
  }

  function labelAcesso(valor) {
    const item = opcoes?.status?.status_acesso?.find((s) => s.codigo === valor);
    return item?.nome || "Sem acesso";
  }

  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / limite));

  return (
    <div className="funcionarios-page">
      {toast && (
        <div className={`funcionarios-toast ${toast.tipo}`}>
          {toast.mensagem}
        </div>
      )}

      <main className="funcionarios-main">
        <section className="funcionarios-content">
          <div className="funcionarios-header">
            <div>
              <span className="funcionarios-eyebrow">CADASTRO</span>
              <h1>Funcionários</h1>
              <p>
                Gestão de vínculos, cargos, permissões e acessos dos funcionários do condomínio.
              </p>
            </div>

            <button
              className="btn-primary"
              onClick={abrirNovoFuncionario}
          >
              <UserPlus size={18} />
              Novo Funcionário
          </button>
          </div>

          <div className="funcionarios-kpis">
            <KpiCard icon={Users} label="Funcionários ativos" value={kpis.funcionarios_ativos} />
            <KpiCard icon={RefreshCcw} label="Inativos / desligados" value={kpis.funcionarios_inativos} />
            <KpiCard icon={ShieldCheck} label="Terceirizados" value={kpis.funcionarios_terceirizados} />
            <KpiCard icon={KeyRound} label="Com acesso" value={kpis.funcionarios_com_acesso} />
          </div>

          <div className="funcionarios-card">
            <div className="funcionarios-filtros">
              <div className="search-box">
                <Search size={17} />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscar()}
                  placeholder="Buscar por nome, CPF, e-mail ou cargo"
                />
              </div>

              <select value={tipoFuncionario} onChange={(e) => setTipoFuncionario(e.target.value)}>
                <option value="">Tipos</option>
                <option value="PROPRIO">Funcionário do condomínio</option>
                <option value="TERCEIRIZADO">Funcionário terceirizado</option>
              </select>

              <select value={situacao} onChange={(e) => setSituacao(e.target.value)}>
                <option value="">Situações</option>
                {opcoes?.status?.situacoes?.map((s) => (
                  <option key={s.codigo} value={s.codigo}>{s.nome}</option>
                ))}
              </select>

              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                <option value="">Categorias</option>
                {opcoes?.cargosFuncoes?.categorias?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>

              <select value={cargoId} onChange={(e) => setCargoId(e.target.value)}>
                <option value="">Cargos</option>
                {opcoes?.cargosFuncoes?.cargos?.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>

              <button className="btn-filter" onClick={buscar}>
                <Filter size={16} />
                Filtrar
              </button>

              <button className="btn-ghost" onClick={limparFiltros}>
                Limpar
              </button>
            </div>

            <div className="funcionarios-table-wrap">
              <table className="funcionarios-table">
                <thead>
                  <tr>
                    <th>Funcionário</th>
                    <th>CPF</th>
                    <th>Tipo</th>
                    <th>Cargo/Função</th>
                    <th>Situação</th>
                    <th>Acesso</th>
                    <th>Última alteração</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="empty-cell">Carregando funcionários...</td>
                    </tr>
                  ) : funcionarios.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-cell">Nenhum funcionário encontrado.</td>
                    </tr>
                  ) : (
                    funcionarios.map((f) => (
                      <tr key={f.id}>
                        <td>
                          <div className="funcionario-cell">
                            <div className="funcionario-avatar">
                              {f.foto_url ? (
                                <img src={f.foto_url} alt="" />
                              ) : (
                                <span>{(f.nome_completo || "?").slice(0, 1)}</span>
                              )}
                            </div>
                            <div>
                              <strong>{f.nome_completo}</strong>
                              <small>{f.email || "E-mail não informado"}</small>
                            </div>
                          </div>
                        </td>

                        <td>{f.cpf || "Não informado"}</td>
                        <td>{labelTipo(f.tipo_funcionario)}</td>
                        <td>{f.cargo_nome || f.funcao_nome || "Não informado"}</td>
                        <td>
                          <span className={`badge situacao-${f.situacao?.toLowerCase()}`}>
                            {labelSituacao(f.situacao)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge acesso-${f.status_acesso?.toLowerCase()}`}>
                            {labelAcesso(f.status_acesso)}
                          </span>
                        </td>
                        <td>
                          {f.atualizado_em
                            ? new Date(f.atualizado_em).toLocaleDateString("pt-BR")
                            : "Não informado"}
                        </td>
                        <td className="actions-cell">
                          <button
                            className="btn-actions"
                            onClick={(e) => alternarMenuAcoes(e, f.id)}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {menuAberto === f.id && (
                            <div
                              className="actions-menu actions-menu-floating"
                              style={{
                                top: `${menuPosicao?.top || 0}px`,
                                right: `${menuPosicao?.right || 24}px`,
                              }}
                            >
                              <button onClick={() => abrirVisualizarFuncionario(f)}>
                                <Eye size={15} />
                                Visualizar
                              </button>
                              <button onClick={() => abrirEditarFuncionario(f)}>
                                <Pencil size={15} />
                                Editar Cadastro
                              </button>
                              {f.status_acesso === "SEM_ACESSO" && (
                                <button onClick={() => abrirCriarAcesso(f)}>
                                  <KeyRound size={15} />
                                  Criar Acesso
                                </button>
                              )}
                              {["ACESSO_SOLICITADO", "PRIMEIRO_ACESSO_PENDENTE"].includes(f.status_acesso) && (
                                <button onClick={() => abrirReenviarConvite(f)}>
                                  <Mail size={15} />
                                  Reenviar Convite
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="funcionarios-pagination">
              <span>
                Página {pagina} de {totalPaginas}
              </span>
              <div>
                <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
                  Anterior
                </button>
                <button disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="funcionarios-sidebar">
          <SideCard icon={Users} title="Como funciona">
            <p>
              Cadastre funcionários próprios ou terceirizados, defina cargos, permissões e acompanhe o acesso ao sistema.
            </p>
          </SideCard>

          <div className="side-card communication-card">
            <div className="communication-card-header">
              <Info size={18} />
              <h3>
                Painel de Comunicados Chegou<span>!</span>
              </h3>
            </div>

            <div className="communication-card-box">
              <strong>Comunicados do Módulo</strong>
              <p>Espaço reservado para avisos do Sistema ou Administrativo.</p>
            </div>

            <p className="communication-card-footer">
              Este espaço será usado para comunicados operacionais, orientações,
              novidades do sistema e avisos importantes.
            </p>
          </div>

          <SideCard icon={Clock} title="Últimas movimentações">
            {movimentacoes.length === 0 ? (
              <p>Nenhuma movimentação recente.</p>
            ) : (
              <div className="movimentacoes-list">
                {movimentacoes.map((m) => (
                  <div key={m.id} className="movimentacao-item">
                    <strong>{m.funcionario_nome}</strong>
                    <span>{formatarEvento(m.tipo_evento)}</span>
                    <small>{new Date(m.criado_em).toLocaleString("pt-BR")}</small>
                  </div>
                ))}
                <button className="link-button">Ver mais</button>
              </div>
            )}
          </SideCard>

          <SideCard icon={BookOpen} title="Ajuda e Manual">
            <p>Consulte orientações sobre cadastro, vínculos, acessos e permissões.</p>
          </SideCard>
                </aside>
              </main>

              <FuncionarioFormModal
                aberto={modalFuncionarioAberto}
                modo={modoModal}
                funcionario={funcionarioSelecionado}
                condominioId={condominioId}
                opcoes={opcoes}
                fornecedores={fornecedores}
                onClose={() => setModalFuncionarioAberto(false)}
                onSaved={() => {
                  carregarTudo();
                }}
                mostrarToast={mostrarToast}
              />

              <FuncionarioDrawer
                aberto={drawerAberto}
                funcionarioId={funcionarioDrawerId}
                bloquearEsc={modalFuncionarioAberto || modalAcessoAberto}
                onClose={() => setDrawerAberto(false)}
                onEditar={(dados) => {
                  const funcionarioCompleto = {
                    id: dados?.vinculo_operacional?.funcionario_condominio_id,
                    nome_completo: dados?.dados_pessoais?.nome_completo,
                    cpf: dados?.dados_pessoais?.cpf,
                    email: dados?.dados_pessoais?.email,
                    telefone: dados?.dados_pessoais?.telefone,
                    tipo_funcionario: dados?.vinculo_operacional?.tipo_funcionario,
                    situacao: dados?.vinculo_operacional?.situacao,
                    data_admissao: dados?.vinculo_operacional?.data_admissao,
                    ddi_whatsapp: dados?.vinculo_operacional?.ddi_whatsapp,
                    whatsapp: dados?.vinculo_operacional?.whatsapp,
                    foto_url: dados?.vinculo_operacional?.foto_url,
                    observacoes: dados?.vinculo_operacional?.observacoes,
                    categoria_id: dados?.cargo_funcao?.categoria_id,
                    cargo_id: dados?.cargo_funcao?.cargo_id,
                    funcao_id: dados?.cargo_funcao?.funcao_id,
                    fornecedor_condominio_id: dados?.fornecedor?.fornecedor_condominio_id,
                  };

                  setModoModal("editar");
                  setFuncionarioSelecionado(funcionarioCompleto);
                  setModalFuncionarioAberto(true);
                }}
                onCriarAcesso={(dados) => abrirCriarAcesso(dados)}
                onReenviarConvite={(dados) => abrirReenviarConvite(dados)}
                mostrarToast={mostrarToast}
              />

              <FuncionarioAcessoModal
                aberto={modalAcessoAberto}
                funcionario={funcionarioAcesso}
                modo={modoAcesso}
                onClose={() => setModalAcessoAberto(false)}
                onConcluido={() => {
                  carregarTudo();
                }}
                mostrarToast={mostrarToast}
              />
            </div>
          );
        }



function KpiCard({ icon: Icon, label, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value || 0}</strong>
      </div>
    </div>
  );
}

function SideCard({ icon: Icon, title, children }) {
  return (
    <div className="side-card">
      <div className="side-card-header">
        <Icon size={18} />
        <h3>{title}</h3>
      </div>
      {children}
    </div>
  );
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