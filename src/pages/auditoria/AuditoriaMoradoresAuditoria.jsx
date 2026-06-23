import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Info,
  MoreVertical,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";



import DateRangePickerPremium from "../../components/premium/DateRangePickerPremium";
import { supabase } from "../../services/supabase";
import "./AuditoriaMoradoresAuditoria.css";
import {
  buscarTorresAuditoriaMoradores,
  formatarStatusAuditoria,
  marcarAuditoriaIniciada,
  registrarDecisaoAuditoriaMorador,
  listarMoradoresParaAuditoria,
  obterResumoAuditoriaMoradores,
} from "../../services/auditoriaMoradoresAuditoriaService";

const STATUS_FILTROS = [
  { value: "TODOS", label: "Todos" },
  { value: "AGUARDANDO_AUDITORIA", label: "Aguardando Auditoria" },
  { value: "AUDITORIA_INICIADA", label: "Auditoria Iniciada" },
  { value: "REAUDITORIA_PENDENTE", label: "Reauditoria Pendente" },
];

function formatarDataHora(valor) {
  if (!valor) return "—";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(valor));
  } catch {
    return "—";
  }
}

function valor(valorCampo) {
  if (valorCampo === null || valorCampo === undefined || String(valorCampo).trim() === "") {
    return "Não informado";
  }

  return valorCampo;
}

function obterIniciais(nome = "") {
  const partes = String(nome).trim().split(" ").filter(Boolean);

  if (!partes.length) return "CH";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function classeStatus(status = "") {
  const valorStatus = String(status || "").toUpperCase();

  if (valorStatus === "AGUARDANDO_AUDITORIA") return "aguardando";
  if (valorStatus === "AUDITORIA_INICIADA") return "iniciada";
  if (valorStatus === "REAUDITORIA_PENDENTE") return "reauditoria";
  if (valorStatus === "CORRECAO_SOLICITADA") return "correcao";
  if (valorStatus === "APROVADO") return "aprovado";
  if (valorStatus === "REPROVADO") return "reprovado";

  return "neutro";
}

function dataHojeInput() {
  return new Date().toISOString().slice(0, 10);
}

function dataMenosDiasInput(dias = 30) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  return data.toISOString().slice(0, 10);
}

function KpiCard({ icon: Icon, titulo, valor, detalhe, variante = "azul" }) {
  return (
    <div className="ama-kpi-card">
      <div className={`ama-kpi-icon ama-kpi-icon-${variante}`}>
        <Icon size={22} strokeWidth={2.1} />
      </div>

      <div className="ama-kpi-content">
        <span>{titulo}</span>
        <strong>{valor}</strong>

        <div className="ama-kpi-footer">
          <small>{detalhe}</small>
        </div>
      </div>
    </div>
  );
}

function AcaoLinhaMenu({ item, aberto, onToggle, onAcao }) {
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });

  const opcoes = ["Auditar", "Visualizar Resumo"];

  function abrirMenu(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const larguraMenu = 196;
    const alturaMenu = Math.min(180, opcoes.length * 34 + 14);

    let left = rect.right - larguraMenu - 25;
    let top = rect.top - alturaMenu + 28;

    if (left < 12) left = 12;
    if (left + larguraMenu > window.innerWidth - 12) {
      left = window.innerWidth - larguraMenu - 12;
    }

    if (top < 12) top = rect.bottom + 8;

    if (top + alturaMenu > window.innerHeight - 12) {
      top = window.innerHeight - alturaMenu - 12;
    }

    setPosicao({ top, left });
    onToggle(aberto ? null : item.id);
  }

  function executarOpcao(opcao) {
    onToggle(null);
    onAcao(opcao, item);
  }

  return (
    <div className="ama-row-actions">
      <button
        type="button"
        className="ama-icon-action ama-row-menu-btn"
        onClick={abrirMenu}
        aria-label="Abrir ações"
      >
        <MoreVertical size={18} />
      </button>

      {aberto ? (
        <>
          <button
            type="button"
            className="ama-menu-overlay"
            onClick={() => onToggle(null)}
            aria-label="Fechar menu"
          />

          <div
            className="ama-row-menu ama-row-menu-fixed"
            style={{
              top: `${posicao.top}px`,
              left: `${posicao.left}px`,
            }}
          >
            {opcoes.map((opcao) => (
              <button key={opcao} type="button" onClick={() => executarOpcao(opcao)}>
                {opcao}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function CampoLeitura({ label, value }) {
  return (
    <div className="ama-read-field">
      <span>{label}</span>
      <strong>{valor(value)}</strong>
    </div>
  );
}

function AccordionItem({
  id,
  titulo,
  subtitulo,
  status,
  icon: Icon,
  aberto,
  onToggle,
  children,
}) {
  return (
    <section className={aberto ? "ama-accordion-item open" : "ama-accordion-item"}>
      <button type="button" className="ama-accordion-head" onClick={() => onToggle(id)}>
        <div className="ama-accordion-title">
          <div className="ama-accordion-icon">
            <Icon size={18} />
          </div>

          <div>
            <strong>{titulo}</strong>
            <span>{subtitulo}</span>
          </div>
        </div>

        <div className="ama-accordion-status">
          <span>{status}</span>
          <ChevronRight size={17} />
        </div>
      </button>

      {aberto ? <div className="ama-accordion-body">{children}</div> : null}
    </section>
  );
}

function ModalConflitoGaragem({ item, onClose }) {
  if (!item) return null;

  const conflitos = item.garagem?.filter((vaga) => vaga?.conflito) || [];

  return (
    <>
      <button
        type="button"
        className="ama-drawer-backdrop"
        onClick={onClose}
        aria-label="Fechar conflito"
      />

      <div className="ama-conflict-modal">
        <header>
          <div>
            <span>Conflito de Garagem</span>
            <h2>Verificação de conflito</h2>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="ama-conflict-content">
          <div className="ama-conflict-card">
            <span>Unidade em auditoria</span>
            <strong>
              {item.torre} / Apto {item.unidade}
            </strong>
            <p>{item.nome}</p>
          </div>

          <div className="ama-conflict-card danger">
            <span>Conflito identificado</span>
            <strong>
              {valor(conflitos[0]?.torre_conflito)} / Apto{" "}
              {valor(conflitos[0]?.unidade_conflito)}
            </strong>
            <p>{valor(conflitos[0]?.morador_conflito)}</p>
          </div>
        </div>

        <p className="ama-conflict-note">
          Se houver erro nos dados de garagem, solicite correção ao morador. O
          Administrativo não deve editar placa, vaga ou vínculo informado no Wizard.
        </p>
      </div>
    </>
  );
}
function ListaCampos({ campos = [] }) {
  return (
    <div className="ama-fields-grid">
      {campos.map((campo) => (
        <CampoLeitura key={campo.label} label={campo.label} value={campo.value} />
      ))}
    </div>
  );
}

function ListaDependentes({ dependentes = [] }) {
  if (!dependentes.length) {
    return <div className="ama-empty-inline">Nenhum dependente informado.</div>;
  }

  return (
    <div className="ama-list-stack">
      {dependentes.map((dependente, index) => (
        <div className="ama-dependent-card" key={dependente.id || `${dependente.nome}-${index}`}>
          <div className="ama-dependent-head">
            <div>
              <strong>{valor(dependente.nome)}</strong>
              <span>
                {valor(dependente.parentesco || dependente.vinculo)} •{" "}
                {dependente.idade !== null && dependente.idade !== undefined
                  ? `${dependente.idade} anos`
                  : "Idade não informada"}
              </span>
            </div>

            {dependente.login_proprio ? (
              <em className="ama-tag ama-tag-blue">Login próprio</em>
            ) : (
              <em className="ama-tag">Sem login</em>
            )}
          </div>

          <ListaCampos
            campos={[
              { label: "Data de nascimento", value: dependente.data_nascimento },
              { label: "CPF", value: dependente.cpf_mascarado || dependente.cpf || "Não informado" },
              { label: "E-mail", value: dependente.login_proprio ? dependente.email : "Não informado" },
              { label: "WhatsApp", value: dependente.login_proprio ? dependente.telefone : "Não informado" },
              { label: "Permissão de retirada", value: dependente.permite_retirada ? "Sim" : "Não informado" },
              {
                label: "Autorização menor de 16",
                value: dependente.autorizacao_menor_16 ? "Informada" : "Não informado",
              },
            ]}
          />
        </div>
      ))}
    </div>
  );
}

function ListaFuncionariosPets({ funcionarios = [], pets = [] }) {
  return (
    <div className="ama-list-stack">
      <div className="ama-subsection">
        <h4>Funcionários do lar</h4>

        {funcionarios.length ? (
          funcionarios.map((funcionario, index) => (
            <div className="ama-simple-card" key={funcionario.id || `${funcionario.nome}-${index}`}>
              <ListaCampos
                campos={[
                  { label: "Nome", value: funcionario.nome },
                  { label: "Função", value: funcionario.funcao },
                  { label: "CPF", value: funcionario.cpf_mascarado || funcionario.cpf || "Não informado" },
                  { label: "WhatsApp", value: funcionario.telefone },
                  { label: "Dias autorizados", value: funcionario.dias_autorizados },
                  { label: "Observações", value: funcionario.observacoes },
                ]}
              />
            </div>
          ))
        ) : (
          <div className="ama-empty-inline">Nenhum funcionário do lar informado.</div>
        )}
      </div>

      <div className="ama-subsection">
        <h4>Pets</h4>

        {pets.length ? (
          pets.map((pet, index) => (
            <div className="ama-simple-card" key={pet.id || `${pet.nome}-${index}`}>
              <ListaCampos
                campos={[
                  { label: "Nome", value: pet.nome },
                  { label: "Tipo", value: pet.tipo },
                  { label: "Raça", value: pet.raca },
                  { label: "Porte", value: pet.porte },
                  { label: "Observações", value: pet.observacoes },
                ]}
              />
            </div>
          ))
        ) : (
          <div className="ama-empty-inline">Nenhum pet informado.</div>
        )}
      </div>
    </div>
  );
}

function ListaVeiculosGaragem({ item, onVerConflito }) {
  const veiculos = item.veiculos || [];
  const garagem = item.garagem || [];
  const possuiConflito = item.resumo?.possuiConflitoGaragem;

  return (
    <div className="ama-list-stack">
      <div className="ama-subsection">
        <h4>Veículos</h4>

        {veiculos.length ? (
          veiculos.map((veiculo, index) => (
            <div className="ama-simple-card" key={veiculo.id || `${veiculo.placa}-${index}`}>
              <ListaCampos
                campos={[
                  { label: "Tipo", value: veiculo.tipo },
                  { label: "Marca", value: veiculo.marca },
                  { label: "Modelo", value: veiculo.modelo },
                  { label: "Cor", value: veiculo.cor },
                  { label: "Placa", value: veiculo.placa },
                  { label: "Observações", value: veiculo.observacoes },
                ]}
              />
            </div>
          ))
        ) : (
          <div className="ama-empty-inline">Nenhum veículo informado.</div>
        )}
      </div>

      <div className="ama-subsection">
        <h4>Garagem</h4>

        {possuiConflito ? (
          <div className="ama-conflict-alert">
            <div>
              <strong>Conflito de garagem identificado</strong>
              <p>
                Existe vaga ou vínculo de garagem em conflito com outra unidade.
                Solicite correção ao morador se a informação estiver incorreta.
              </p>
            </div>

            <button type="button" onClick={() => onVerConflito(item)}>
              Verificar Conflito
            </button>
          </div>
        ) : null}

        {garagem.length ? (
          garagem.map((vaga, index) => (
            <div
              className={vaga.conflito ? "ama-simple-card danger" : "ama-simple-card"}
              key={vaga.id || `${vaga.numero_vaga}-${index}`}
            >
              <ListaCampos
                campos={[
                  { label: "Tipo de vaga", value: vaga.tipo_vaga },
                  { label: "Número da vaga", value: vaga.numero_vaga },
                  { label: "Vínculo", value: vaga.vinculo },
                  { label: "Unidade vinculada", value: vaga.unidade_vinculada },
                  { label: "Situação", value: vaga.conflito ? "Conflito identificado" : "Sem conflito" },
                  { label: "Observações", value: vaga.observacoes },
                ]}
              />
            </div>
          ))
        ) : (
          <div className="ama-empty-inline">Nenhuma garagem/vaga informada.</div>
        )}
      </div>
    </div>
  );
}

function DrawerAuditoria({
  item,
  abertoSecao,
  setAbertoSecao,
  onClose,
  onDecisao,
  onVerConflito,
}) {
  if (!item) return null;

  return (
    <>
      <button
        type="button"
        className="ama-drawer-backdrop"
        onClick={onClose}
        aria-label="Fechar auditoria"
      />

      <aside className="ama-audit-drawer">
        <header className="ama-audit-head">
          <div>
            <span>Auditoria do Morador</span>
            <h2>{item.nome}</h2>
            <p>Cadastro finalizado em {formatarDataHora(item.wizard_finalizado_em)}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <section className="ama-audit-profile">
          <div className="ama-profile-avatar">
            {obterIniciais(item.nome)}
          </div>

          <div className="ama-profile-main">
            <div className="ama-profile-title">
              <h3>{item.nome}</h3>
              <span>{item.perfil_morador}</span>
            </div>

            <p>
              Unidade {item.unidade} • Torre {item.torre}
            </p>

            <div className="ama-profile-grid">
              <CampoLeitura label="CPF" value={item.cpf} />
              <CampoLeitura label="E-mail" value={item.email} />
              <CampoLeitura label="WhatsApp" value={item.telefone} />
              <CampoLeitura
                label="Status atual"
                value={formatarStatusAuditoria(item.status_auditoria)}
              />
            </div>
          </div>

          <div className="ama-profile-summary">
            <span>Resumo rápido</span>
            <strong>{item.resumo.dependentes} dependentes</strong>
            <strong>{item.resumo.pets} pets</strong>
            <strong>{item.resumo.veiculos} veículos</strong>

            {item.resumo.possuiConflitoGaragem ? (
              <em className="danger">Garagem: conflito</em>
            ) : (
              <em>Garagem: sem conflito</em>
            )}
          </div>
        </section>

        <main className="ama-accordion-list">
          <AccordionItem
            id="identificacao"
            titulo="1. Identificação da Unidade"
            subtitulo="Dados da unidade, torre e apartamento"
            icon={ClipboardCheck}
            status="Conferir"
            aberto={abertoSecao === "identificacao"}
            onToggle={setAbertoSecao}
          >
            <ListaCampos
              campos={[
                { label: "Torre", value: item.torre },
                { label: "Unidade", value: item.unidade },
                { label: "Perfil do cadastro", value: item.perfil_morador },
                { label: "Business ID", value: item.business_id },
              ]}
            />
          </AccordionItem>

          <AccordionItem
            id="responsavel"
            titulo="2. Dados do Morador Responsável"
            subtitulo="Dados pessoais, contato e perfil"
            icon={UserRound}
            status="Conferir"
            aberto={abertoSecao === "responsavel"}
            onToggle={setAbertoSecao}
          >
            <ListaCampos
              campos={[
                { label: "Nome completo", value: item.nome },
                { label: "CPF", value: item.cpf },
                { label: "E-mail", value: item.email },
                { label: "WhatsApp", value: item.telefone },
                { label: "Perfil", value: item.perfil_morador },
                { label: "Observações", value: item.raw?.observacoes },
              ]}
            />
          </AccordionItem>

          <AccordionItem
            id="dependentes"
            titulo="3. Dependentes"
            subtitulo="Ordenados por idade, do maior para o menor"
            icon={UserRound}
            status={`${item.resumo.dependentes} dependentes`}
            aberto={abertoSecao === "dependentes"}
            onToggle={setAbertoSecao}
          >
            <ListaDependentes dependentes={item.dependentes} />
          </AccordionItem>

          <AccordionItem
            id="funcionarios-pets"
            titulo="4. Funcionários do Lar e Pets"
            subtitulo="Funcionários autorizados e animais de estimação"
            icon={UserRound}
            status={`${item.resumo.funcionarios + item.resumo.pets} registros`}
            aberto={abertoSecao === "funcionarios-pets"}
            onToggle={setAbertoSecao}
          >
            <ListaFuncionariosPets
              funcionarios={item.funcionarios_lar}
              pets={item.pets}
            />
          </AccordionItem>

          <AccordionItem
            id="veiculos-garagem"
            titulo="5. Veículos e Garagem"
            subtitulo="Veículos, vagas e estrutura de garagem"
            icon={AlertTriangle}
            status={
              item.resumo.possuiConflitoGaragem
                ? "Conflito identificado"
                : "Sem conflito"
            }
            aberto={abertoSecao === "veiculos-garagem"}
            onToggle={setAbertoSecao}
          >
            <ListaVeiculosGaragem item={item} onVerConflito={onVerConflito} />
          </AccordionItem>

          <AccordionItem
            id="preferencias"
            titulo="6. Preferências e Comunicação"
            subtitulo="Preferências do morador e canais de comunicação"
            icon={Info}
            status="Conferir"
            aberto={abertoSecao === "preferencias"}
            onToggle={setAbertoSecao}
          >
            <ListaCampos
              campos={[
                { label: "Canal preferencial", value: item.preferencias?.canal_preferencial },
                { label: "Receber notificações", value: item.preferencias?.notificacoes ? "Sim" : "Não informado" },
                { label: "Privacidade", value: item.preferencias?.privacidade },
                { label: "Observações", value: item.preferencias?.observacoes },
              ]}
            />
          </AccordionItem>

          <AccordionItem
            id="divergencias"
            titulo="7. Divergências e Observações"
            subtitulo="Pontos de atenção e histórico de auditoria"
            icon={AlertTriangle}
            status={`${item.divergencias?.length || 0} divergências`}
            aberto={abertoSecao === "divergencias"}
            onToggle={setAbertoSecao}
          >
            {item.divergencias?.length ? (
              <div className="ama-list-stack">
                {item.divergencias.map((divergencia, index) => (
                  <div className="ama-simple-card danger" key={divergencia.id || index}>
                    <ListaCampos
                      campos={[
                        { label: "Tipo", value: divergencia.tipo },
                        { label: "Campo", value: divergencia.campo },
                        { label: "Descrição", value: divergencia.descricao },
                        { label: "Severidade", value: divergencia.severidade },
                      ]}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="ama-empty-inline">Nenhuma divergência registrada.</div>
            )}
          </AccordionItem>
        </main>

        <div className="ama-audit-warning">
          <Info size={17} />
          <div>
            <strong>Nenhuma informação pode ser editada nesta tela.</strong>
            <span>
              Em caso de erro ou divergência, solicite correção ao morador.
            </span>
          </div>
        </div>

        <footer className="ama-audit-footer">
          <button
            type="button"
            className="ama-footer-action approve"
            onClick={() => onDecisao("APROVADO", item)}
          >
            <CheckCircle2 size={17} />
            <span>
              <strong>Aprovar Cadastro</strong>
              <small>Aprova e avança para o próximo</small>
            </span>
          </button>

          <button
            type="button"
            className="ama-footer-action correction"
            onClick={() => onDecisao("CORRECAO_SOLICITADA", item)}
          >
            <AlertTriangle size={17} />
            <span>
              <strong>Solicitar Correção</strong>
              <small>Envia para o morador corrigir</small>
            </span>
          </button>

          <button
            type="button"
            className="ama-footer-action reject"
            onClick={() => onDecisao("REPROVADO", item)}
          >
            <XCircle size={17} />
            <span>
              <strong>Reprovar Cadastro</strong>
              <small>Reprova e avança para o próximo</small>
            </span>
          </button>

          <button type="button" className="ama-footer-action neutral" onClick={onClose}>
            <span>
              <strong>Fechar</strong>
              <small>Sair sem alterações</small>
            </span>
          </button>
        </footer>
      </aside>
    </>
  );
}
export default function AuditoriaMoradoresAuditoria({ perfil, onNavigate }) {
  
  const condominioId =
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio?.condominio_id ||
    null;

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [registros, setRegistros] = useState([]);
  const [resumo, setResumo] = useState({
    aguardando: 0,
    iniciada: 0,
    reauditoraPendente: 0,
    conflitosGaragem: 0,
    aprovadosHoje: 0,
    total: 0,
  });

  const [torres, setTorres] = useState([]);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("TODOS");
  const [torre, setTorre] = useState("TODAS");
  const [unidade, setUnidade] = useState("TODAS");
  const [dataInicio, setDataInicio] = useState(() => dataMenosDiasInput(30));
  const [dataFim, setDataFim] = useState(() => dataHojeInput());

  const [menuAberto, setMenuAberto] = useState(null);
  const [auditoriaSelecionada, setAuditoriaSelecionada] = useState(null);
  const [secaoAberta, setSecaoAberta] = useState("identificacao");
  const [conflitoSelecionado, setConflitoSelecionado] = useState(null);

  const [decisaoPendente, setDecisaoPendente] = useState(null);
  const [observacaoDecisao, setObservacaoDecisao] = useState("");
  const [salvandoDecisao, setSalvandoDecisao] = useState(false);

  const [pagina, setPagina] = useState(1);
  const [linhasPorPagina, setLinhasPorPagina] = useState(10);

  async function carregarDados() {
    if (!condominioId) {
      setErro("Condomínio autenticado não encontrado.");
      setCarregando(false);
      return;
    }

    try {
      setCarregando(true);
      setErro("");

      const [lista, resumoAtual, torresAtual] = await Promise.all([
        listarMoradoresParaAuditoria({
          condominioId,
          busca,
          status,
          torre,
          unidade,
          dataInicio,
          dataFim,
          limite: 100,
        }),
        obterResumoAuditoriaMoradores({ condominioId }),
        buscarTorresAuditoriaMoradores({ condominioId }),
      ]);

      setRegistros(lista);
      setResumo(resumoAtual);
      setTorres(torresAtual);
      setPagina(1);
    } catch (error) {
      console.error(error);
      setErro(error?.message || "Erro ao carregar auditoria de moradores.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId, status, torre, unidade, dataInicio, dataFim]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      carregarDados();
    }, 450);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  useEffect(() => {
    function handleEsc(event) {
      if (event.key === "Escape") {
        setMenuAberto(null);
        setAuditoriaSelecionada(null);
        setConflitoSelecionado(null);
        setDecisaoPendente(null);
        setObservacaoDecisao("");
      }
    }

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const unidades = useMemo(() => {
    const lista = registros
      .map((item) => item.unidade)
      .filter(Boolean)
      .filter((valorUnidade) => valorUnidade !== "Não informado");

    return [...new Set(lista)].sort((a, b) => String(a).localeCompare(String(b)));
  }, [registros]);

  const totalPaginas = Math.max(1, Math.ceil(registros.length / linhasPorPagina));

  const registrosPagina = useMemo(() => {
    const inicio = (pagina - 1) * linhasPorPagina;
    return registros.slice(inicio, inicio + linhasPorPagina);
  }, [pagina, registros, linhasPorPagina]);

  async function abrirAuditoria(item) {
    try {
      setSecaoAberta("identificacao");

      const atualizado = await marcarAuditoriaIniciada({
        perfil,
        preCadastroId: item.pre_cadastro_id,
      });

      const itemAtualizado =
        atualizado?.id
          ? {
              ...item,
              raw: {
                ...item.raw,
                ...atualizado,
              },
              status_auditoria: atualizado.status_auditoria || item.status_auditoria,
              atualizado_em: atualizado.atualizado_em || item.atualizado_em,
            }
          : item;

      setAuditoriaSelecionada(itemAtualizado);

      if (item.status_auditoria === "AGUARDANDO_AUDITORIA") {
        carregarDados();
      }
    } catch (error) {
      toast.error(error?.message || "Não foi possível iniciar a auditoria.");
      setAuditoriaSelecionada(item);
    }
  }

  function handleAcaoLinha(acao, item) {
    if (acao === "Auditar" || acao === "Visualizar Resumo") {
      abrirAuditoria(item);
      return;
    }
  }

  function handleDecisao(decisao, item) {
    setDecisaoPendente({ decisao, item });
    setObservacaoDecisao("");
  }

  async function confirmarDecisaoAuditoria() {
    if (!decisaoPendente?.item || !decisaoPendente?.decisao) return;

    try {
      setSalvandoDecisao(true);

      if (decisaoPendente.decisao === "APROVADO") {
        const { data, error } = await supabase.functions.invoke("aprovar-morador", {
          body: {
            pre_cadastro_id: decisaoPendente.item.pre_cadastro_id,
            condominio_id: condominioId,
            aprovado_por: perfil?.id || null,
            aprovado_por_nome: perfil?.nome || null,
            aprovado_por_email: perfil?.email || null,
          },
        });

        if (error || data?.error) {
          throw new Error(
            data?.error ||
              error?.message ||
              "Não foi possível aprovar o morador."
          );
        }
      } else {
        await registrarDecisaoAuditoriaMorador({
          perfil,
          preCadastroId: decisaoPendente.item.pre_cadastro_id,
          decisao: decisaoPendente.decisao,
          observacao: observacaoDecisao,
        });
      }

      const mensagens = {
        APROVADO: "Cadastro aprovado, conta criada e acesso liberado.",
        CORRECAO_SOLICITADA: "Correção solicitada ao morador.",
        REPROVADO: "Cadastro reprovado com sucesso.",
      };

      toast.success(mensagens[decisaoPendente.decisao] || "Auditoria atualizada.");

      const idAtual = decisaoPendente.item.id;
      const listaAtualizada = registros.filter((item) => item.id !== idAtual);

      setRegistros(listaAtualizada);
      setDecisaoPendente(null);
      setObservacaoDecisao("");

      const proximo = listaAtualizada[0] || null;

      if (proximo) {
        abrirAuditoria(proximo);
      } else {
        setAuditoriaSelecionada(null);
        await carregarDados();
      }
    } catch (error) {
      toast.error(error?.message || "Não foi possível registrar a decisão.");
    } finally {
      setSalvandoDecisao(false);
    }
  }

  function fecharAuditoria() {
    setAuditoriaSelecionada(null);
    setSecaoAberta("identificacao");
  }

  function handleAcaoTopo(acao) {
    toast(`${acao} será conectado na próxima etapa.`, {
      icon: "⚙️",
    });
  }

  return (
    <div className="ama-page">
      <div className="ama-main">
        <div className="ama-breadcrumb">
          <span>Auditoria</span>
          <ChevronRight size={14} />
          <span>Moradores</span>
          <ChevronRight size={14} />
          <strong>Auditoria</strong>
        </div>

        <div className="ama-header">
          <div>
            <h1>
              Auditoria de Moradores
              <Info size={17} />
            </h1>

            <p>
              Analise os cadastros finalizados pelos moradores, valide informações,
              solicite correções quando necessário e aprove apenas dados consistentes.
            </p>
          </div>
        </div>

        <div className="ama-tabs">
          <button
            type="button"
            onClick={() => onNavigate?.("admin-auditoria-moradores-pre-cadastro")}
          >
            Pré-Cadastro
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("admin-auditoria-moradores-convite")}
          >
            Convite
          </button>

          <button type="button" className="active">
            Auditoria
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.("admin-auditoria-moradores-historico")}
          >
            Histórico
          </button>
        </div>

        <section className="ama-kpis">
          <KpiCard
            icon={ClipboardCheck}
            titulo="Aguardando Auditoria"
            valor={resumo.aguardando}
            detalhe="Wizard finalizado"
            variante="azul"
          />

          <KpiCard
            icon={ShieldCheck}
            titulo="Auditoria Iniciada"
            valor={resumo.iniciada}
            detalhe="Em análise"
            variante="roxo"
          />

          <KpiCard
            icon={AlertTriangle}
            titulo="Reauditoria Pendente"
            valor={resumo.reauditoraPendente}
            detalhe="Correção reenviada"
            variante="laranja"
          />

          <KpiCard
            icon={XCircle}
            titulo="Conflitos Garagem"
            valor={resumo.conflitosGaragem}
            detalhe="Atenção operacional"
            variante="vermelho"
          />
        </section>

        <section className="ama-table-card">
          <div className="ama-filters">
            <div className="ama-search">
              <Search size={18} />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por nome, unidade, torre ou ID do morador..."
              />
            </div>

            <label>
              <span>Status Auditoria</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {STATUS_FILTROS.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Torre</span>
              <select value={torre} onChange={(event) => setTorre(event.target.value)}>
                <option value="TODAS">Todas</option>
                {torres.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Unidade</span>
              <select value={unidade} onChange={(event) => setUnidade(event.target.value)}>
                <option value="TODAS">Todas</option>
                {unidades.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="ama-periodo-premium">
              <DateRangePickerPremium
                dataInicio={dataInicio}
                dataFim={dataFim}
                persistKey="admin-auditoria-moradores-auditoria-periodo"
                onChange={({ inicio, fim }) => {
                  setDataInicio(inicio);
                  setDataFim(fim);
                  setPagina(1);
                }}
              />
            </div>

            <button
              type="button"
              className="ama-filter-extra"
              onClick={() => {
                setBusca("");
                setStatus("TODOS");
                setTorre("TODAS");
                setUnidade("TODAS");
                setDataInicio(dataMenosDiasInput(30));
                setDataFim(dataHojeInput());
                setPagina(1);
              }}
            >
              Limpar
            </button>
          </div>

          {erro ? <div className="ama-error">{erro}</div> : null}

          <div className="ama-table-wrap">
            <table className="ama-table">
              <thead>
                <tr>
                  <th>Unidade</th>
                  <th>Torre</th>
                  <th>Nome Completo</th>
                  <th>Status de Preenchimento</th>
                  <th>Status Auditoria</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan="6">
                      <div className="ama-loading">
                        <RefreshCw size={18} className="ama-spin" />
                        Carregando auditorias...
                      </div>
                    </td>
                  </tr>
                ) : registrosPagina.length ? (
                  registrosPagina.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>Apto {item.unidade}</strong>
                      </td>

                      <td>
                        <strong>{item.torre}</strong>
                      </td>

                      <td>
                        <div className="ama-person">
                          <div className="ama-avatar">{obterIniciais(item.nome)}</div>
                          <div>
                            <strong>{item.nome}</strong>
                            <span>ID: {item.business_id || "—"}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <strong>{item.percentual_preenchimento || 100}%</strong>
                        <span>WIZARD FINALIZADO</span>
                      </td>

                      <td>
                        <span className={`ama-status ama-status-${classeStatus(item.status_auditoria)}`}>
                          {formatarStatusAuditoria(item.status_auditoria)}
                        </span>
                      </td>

                      <td>
                        <AcaoLinhaMenu
                          item={item}
                          aberto={menuAberto === item.id}
                          onToggle={setMenuAberto}
                          onAcao={handleAcaoLinha}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">
                      <div className="ama-empty">
                        <strong>Nenhum cadastro aguardando auditoria</strong>
                        <p>
                          Cadastros em preenchimento continuam sendo acompanhados na aba Convite.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
                    <div className="ama-table-footer">
            <span>
              Mostrando {registrosPagina.length ? (pagina - 1) * linhasPorPagina + 1 : 0} a{" "}
              {Math.min(pagina * linhasPorPagina, registros.length)} de {registros.length} registros
            </span>

            <div className="ama-pagination">
              <button
                type="button"
                disabled={pagina === 1}
                onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
              >
                <ChevronLeft size={16} />
              </button>

              <strong>{pagina}</strong>

              <button
                type="button"
                disabled={pagina === totalPaginas}
                onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <label className="ama-per-page">
              Linhas por página:
              <select
                value={linhasPorPagina}
                onChange={(event) => {
                  setLinhasPorPagina(Number(event.target.value));
                  setPagina(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <aside className="ama-rightbar">
        <section className="ama-side-card">
          <div className="ama-side-title">
            <ClipboardCheck size={17} />
            <strong>Resumo da Auditoria</strong>
          </div>

          <div className="ama-side-metrics">
            <div>
              <span>Aguardando</span>
              <strong>{resumo.aguardando}</strong>
            </div>

            <div>
              <span>Iniciadas</span>
              <strong>{resumo.iniciada}</strong>
            </div>

            <div>
              <span>Conflitos garagem</span>
              <strong>{resumo.conflitosGaragem}</strong>
            </div>
          </div>
        </section>

        <section className="ama-side-card ama-side-card-orange">
          <div className="ama-side-title">
            <Info size={17} />
            <strong>
              Painel de Comunicados Chegou<span className="ama-orange">!</span>
            </strong>
          </div>

          <div className="ama-communication-placeholder">
            <div>
              <strong>Comunicados do Módulo</strong>
              <span>Espaço reservado para avisos do Master ou Administrativo.</span>
            </div>
          </div>

          <p>
            Este espaço será padronizado futuramente no componente global de comunicados.
          </p>
        </section>

        <section className="ama-side-card">
          <h3>Critérios e Boas Práticas</h3>

          <ul className="ama-orientation-list">
            <li>Não edite dados do morador nesta etapa.</li>
            <li>Se houver erro, solicite correção ao morador.</li>
            <li>Confira dependentes, permissões e menores de idade.</li>
            <li>Revise conflitos de garagem antes de aprovar.</li>
            <li>Aprovar somente cadastros consistentes.</li>
          </ul>
        </section>
      </aside>

      <DrawerAuditoria
        item={auditoriaSelecionada}
        abertoSecao={secaoAberta}
        setAbertoSecao={(secao) =>
          setSecaoAberta((atual) => (atual === secao ? "" : secao))
        }
        onClose={fecharAuditoria}
        onDecisao={handleDecisao}
        onVerConflito={setConflitoSelecionado}
      />

      <ModalConflitoGaragem
        item={conflitoSelecionado}
        onClose={() => setConflitoSelecionado(null)}
      />

      {decisaoPendente ? (
        <>
          <button
            type="button"
            className="ama-drawer-backdrop"
            onClick={() => {
              if (!salvandoDecisao) {
                setDecisaoPendente(null);
                setObservacaoDecisao("");
              }
            }}
            aria-label="Fechar decisão"
          />

          <aside className="ama-decision-modal">
            <header className="ama-decision-modal-header">
              <div>
                <span>Decisão da Auditoria</span>
                <h2>{formatarStatusAuditoria(decisaoPendente.decisao)}</h2>
              </div>

              <button
                type="button"
                disabled={salvandoDecisao}
                onClick={() => {
                  setDecisaoPendente(null);
                  setObservacaoDecisao("");
                }}
                aria-label="Fechar decisão"
              >
                ×
              </button>
            </header>

            <section className="ama-decision-modal-section">
              <h3>Morador</h3>
              <p>
                <strong>{decisaoPendente.item.nome}</strong>
                <br />
                Unidade {decisaoPendente.item.unidade} • Torre {decisaoPendente.item.torre}
              </p>
            </section>

            {decisaoPendente.decisao === "APROVADO" ? (
              <section className="ama-decision-modal-section">
                <h3>Confirmação</h3>
                <p>
                  Ao confirmar, o cadastro será aprovado e o sistema seguirá para o próximo
                  responsável pendente de auditoria.
                </p>
              </section>
            ) : (
              <section className="ama-decision-modal-section">
                <h3>
                  {decisaoPendente.decisao === "CORRECAO_SOLICITADA"
                    ? "Orientação para correção"
                    : "Motivo da reprovação"}
                </h3>

                <textarea
                  value={observacaoDecisao}
                  onChange={(event) => setObservacaoDecisao(event.target.value)}
                  placeholder={
                    decisaoPendente.decisao === "CORRECAO_SOLICITADA"
                      ? "Descreva claramente o que o morador deve corrigir..."
                      : "Informe o motivo da reprovação..."
                  }
                  rows={6}
                  className="ama-decision-modal-textarea"
                />

                <p className="ama-decision-modal-helper">
                  Esta informação será usada no fluxo de comunicação com o morador.
                </p>
              </section>
            )}

            <footer className="ama-decision-modal-actions">
              <button
                type="button"
                className="ama-btn ama-btn-outline"
                disabled={salvandoDecisao}
                onClick={() => {
                  setDecisaoPendente(null);
                  setObservacaoDecisao("");
                }}
              >
                Voltar
              </button>

              <button
                type="button"
                className="ama-btn ama-btn-primary"
                disabled={salvandoDecisao}
                onClick={confirmarDecisaoAuditoria}
              >
                {salvandoDecisao ? "Salvando..." : "Confirmar"}
              </button>
            </footer>
          </aside>
        </>
      ) : null}
    </div>
  );
}

