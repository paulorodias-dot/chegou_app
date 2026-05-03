import { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../services/supabase";
import ModalChegou from "../../components/common/ModalChegou";
import {
  Search,
  Save,
  Send,
  X,
  HelpCircle,
  FileSearch,
  Lightbulb,
  CheckCircle,
  Mail,
  ChevronDown,
} from "lucide-react";
import "./CadastroCondominio.css";

const onlyNumbers = (value = "") => value.replace(/\D/g, "");

const maskCNPJ = (value) =>
  onlyNumbers(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

const maskCEP = (value) =>
  onlyNumbers(value).slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

const maskPhone = (value) => {
  let nums = onlyNumbers(value);

  if (!nums.startsWith("55") && nums.length >= 10) {
    nums = `55${nums}`;
  }

  nums = nums.slice(0, 13);

  return nums
    .replace(/^(\d{2})(\d)/, "+$1 ($2")
    .replace(/^(\+\d{2}) \((\d{2})(\d)/, "$1 ($2) $3")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

const normalizarCodigo = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 14);

function gerarCodigoCondominio(nome = "", cnpj = "") {
  const base = normalizarCodigo(nome);

  if (base) return base;

  const cnpjLimpo = onlyNumbers(cnpj);
  if (cnpjLimpo) return `COND${cnpjLimpo.slice(-6)}`;

  return "";
}

function SectionCard({
  id,
  number,
  title,
  children,
  className = "",
  isOpen,
  onToggle,
}) {
  return (
    <section className={`section-card ${className} ${!isOpen ? "collapsed" : ""}`}>
      <button
        type="button"
        className="section-title section-title-button"
        onClick={() => onToggle(id)}
      >
        <span className="step-number">{number}</span>
        <h2>{title}</h2>
        <ChevronDown className="section-chevron" size={18} />
      </button>

      <div className="section-body">{children}</div>
    </section>
  );
}

export default function CadastroCondominio() {
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [modalConvite, setModalConvite] = useState(false);

  const [openSections, setOpenSections] = useState({
    identificacao: true,
    dados: true,
    endereco: true,
    configuracoes: true,
    responsavel: true,
  });

  const [config, setConfig] = useState({
    notificacao_whatsapp: true,
    notificacao_email: true,
    controle_unidade: true,
    controle_morador: true,
    exige_identificacao_retirada: true,
    permite_multiplos_responsaveis: false,
  });

  const [form, setForm] = useState({
    cnpj: "",
    codigo_condominio: "",
    razao_social: "",
    nome_fantasia: "",
    email_condominio: "",
    telefone_condominio: "",
    tipo_condominio: "",
    qtd_unidades: 0,
    qtd_blocos: 0,
    possui_portaria: "",
    tipo_portaria: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    responsavel_nome: "",
    responsavel_email: "",
    responsavel_telefone: "",
    responsavel_funcao: "Síndico",
  });

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleConfig(field) {
    setConfig((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function toggleSection(section) {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function handleNomeFantasiaChange(value) {
    setForm((prev) => ({
      ...prev,
      nome_fantasia: value,
      codigo_condominio:
        prev.codigo_condominio || gerarCodigoCondominio(value, prev.cnpj),
    }));
  }

  function handleCodigoChange(value) {
    updateField("codigo_condominio", normalizarCodigo(value));
  }

  async function buscarCNPJ() {
    const cnpjLimpo = onlyNumbers(form.cnpj);

    if (cnpjLimpo === "123456") {
      setForm((prev) => ({
        ...prev,
        codigo_condominio:
          prev.codigo_condominio ||
          gerarCodigoCondominio(prev.nome_fantasia || "Condominio Teste", cnpjLimpo),
      }));

      toast.success("CNPJ Fake 123456 identificado. Dados de teste liberados.");
      return;
    }

    const { data: existente } = await supabase
      .from("condominios")
      .select("id")
      .eq("cnpj", cnpjLimpo)
      .maybeSingle();

    if (existente) {
      toast.error("Este CNPJ já está cadastrado no sistema.");

      setForm((prev) => ({
        ...prev,
        cnpj: "",
      }));

      return;
    }

    if (cnpjLimpo.length !== 14) {
      toast.error("Informe um CNPJ válido com 14 números.");
      return;
    }

    try {
      setLoadingCnpj(true);

      const { data, error } = await supabase.functions.invoke("consultar-cnpj", {
        body: { cnpj: cnpjLimpo },
      });

      if (error) {
        throw new Error(error.message || "Erro ao consultar CNPJ.");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const cnpjData = data?.data;

      if (!cnpjData) {
        throw new Error("Nenhum dado retornado para este CNPJ.");
      }

      const nomeBase = cnpjData.nome_fantasia || cnpjData.razao_social || "";

      setForm((prev) => ({
        ...prev,
        razao_social: cnpjData.razao_social || "",
        nome_fantasia: nomeBase,
        codigo_condominio:
          prev.codigo_condominio || gerarCodigoCondominio(nomeBase, cnpjLimpo),
        cep: maskCEP(cnpjData.cep || ""),
        endereco: cnpjData.logradouro || "",
        numero: cnpjData.numero || "",
        complemento: cnpjData.complemento || "",
        bairro: cnpjData.bairro || "",
        cidade: cnpjData.municipio || "",
        uf: cnpjData.uf || "",
        telefone_condominio: cnpjData.ddd_telefone_1
          ? maskPhone(cnpjData.ddd_telefone_1)
          : prev.telefone_condominio,
        email_condominio: cnpjData.email || prev.email_condominio,
      }));

      toast.success("Dados do CNPJ preenchidos com sucesso.");
    } catch (error) {
      toast.error(error.message || "Erro ao consultar CNPJ.");
    } finally {
      setLoadingCnpj(false);
    }
  }

  async function buscarCEP() {
    const cepLimpo = onlyNumbers(form.cep);

    if (cepLimpo.length !== 8) {
      toast.error("Informe um CEP válido com 8 números.");
      return;
    }

    try {
      setLoadingCep(true);

      const response = await fetch(
        `https://brasilapi.com.br/api/cep/v2/${cepLimpo}`
      );

      if (!response.ok) {
        throw new Error("CEP não encontrado.");
      }

      const data = await response.json();

      setForm((prev) => ({
        ...prev,
        endereco: data.street || "",
        bairro: data.neighborhood || "",
        cidade: data.city || "",
        uf: data.state || "",
      }));

      toast.success("Endereço preenchido com sucesso.");
    } catch (error) {
      toast.error(error.message || "Erro ao consultar CEP.");
    } finally {
      setLoadingCep(false);
    }
  }

  async function salvarCadastroBase({ mostrarAlerta = false } = {}) {
    const cnpjLimpo = onlyNumbers(form.cnpj);
    const codigoLimpo = normalizarCodigo(form.codigo_condominio);

    if (!cnpjLimpo || (cnpjLimpo !== "123456" && cnpjLimpo.length !== 14)) {
      throw new Error("Informe um CNPJ válido antes de continuar.");
    }

    if (!form.razao_social && !form.nome_fantasia) {
      throw new Error("Informe a Razão Social ou Nome Fantasia do condomínio.");
    }

    if (!codigoLimpo) {
      throw new Error("Informe o código do condomínio antes de continuar.");
    }

    const { data: codigoExistente } = await supabase
      .from("condominios")
      .select("id")
      .eq("codigo_condominio", codigoLimpo)
      .neq("cnpj", cnpjLimpo)
      .maybeSingle();

    if (codigoExistente) {
      throw new Error("Este código de condomínio já está em uso. Informe outro código.");
    }

    const payloadCondominio = {
      cnpj: cnpjLimpo,
      codigo_condominio: codigoLimpo,
      razao_social: form.razao_social,
      nome_fantasia: form.nome_fantasia,
      email_condominio: form.email_condominio,
      telefone_condominio: onlyNumbers(form.telefone_condominio),
      tipo_condominio: form.tipo_condominio,
      quantidade_unidades: Number(form.qtd_unidades || 0),
      quantidade_blocos: Number(form.qtd_blocos || 0),
      possui_portaria: form.possui_portaria === "sim",
      tipo_portaria: form.tipo_portaria,
      status_cadastro: "pendente",
      ativo: true,
      configuracoes: config,
    };

    const { data: condominioExistente } = await supabase
      .from("condominios")
      .select("*")
      .eq("cnpj", cnpjLimpo)
      .maybeSingle();

    let condominio;

    if (condominioExistente) {
      const { data, error } = await supabase
        .from("condominios")
        .update(payloadCondominio)
        .eq("id", condominioExistente.id)
        .select()
        .single();

      if (error) throw error;
      condominio = data;
    } else {
      const { data, error } = await supabase
        .from("condominios")
        .insert(payloadCondominio)
        .select()
        .single();

      if (error) throw error;
      condominio = data;
    }

    if (form.cep) {
      const payloadEndereco = {
        condominio_id: condominio.id,
        cep: onlyNumbers(form.cep),
        logradouro: form.endereco,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.uf,
      };

      const { data: enderecoExistente } = await supabase
        .from("enderecos")
        .select("id")
        .eq("condominio_id", condominio.id)
        .maybeSingle();

      if (enderecoExistente) {
        const { error } = await supabase
          .from("enderecos")
          .update(payloadEndereco)
          .eq("id", enderecoExistente.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("enderecos").insert(payloadEndereco);
        if (error) throw error;
      }
    }

    let responsavel = null;

    if (form.responsavel_nome) {
      const payloadResponsavel = {
        condominio_id: condominio.id,
        nome: form.responsavel_nome,
        email: form.responsavel_email || null,
        telefone: onlyNumbers(form.responsavel_telefone),
        funcao: form.responsavel_funcao,
        status: "pendente",
      };

      let responsavelExistente = null;

      if (form.responsavel_email) {
        const { data } = await supabase
          .from("responsavel_logistica")
          .select("*")
          .eq("condominio_id", condominio.id)
          .eq("email", form.responsavel_email)
          .maybeSingle();

        responsavelExistente = data;
      }

      if (responsavelExistente) {
        const { data, error } = await supabase
          .from("responsavel_logistica")
          .update(payloadResponsavel)
          .eq("id", responsavelExistente.id)
          .select()
          .single();

        if (error) throw error;
        responsavel = data;
      } else {
        const { data, error } = await supabase
          .from("responsavel_logistica")
          .insert(payloadResponsavel)
          .select()
          .single();

        if (error) throw error;
        responsavel = data;
      }
    }

    if (mostrarAlerta) {
      toast.success("Condomínio salvo com status pendente.");
    }

    return { condominio, responsavel };
  }

  async function salvarCondominio() {
    try {
      setSaving(true);
      await salvarCadastroBase({ mostrarAlerta: true });
    } catch (error) {
      toast.error(error.message || "Erro ao salvar condomínio.");
    } finally {
      setSaving(false);
    }
  }

  function abrirConfirmacaoConvite() {
    const emailDestino = form.responsavel_email || form.email_condominio;

    if (!emailDestino) {
      toast.error("Informe o e-mail do responsável ou do condomínio.");
      return;
    }

    if (!form.responsavel_nome) {
      toast.error("Informe ao menos o nome do responsável.");
      return;
    }

    setModalConvite(true);
  }

  async function confirmarEnvioConvite() {
    try {
      setSendingInvite(true);

      const emailDestino = form.responsavel_email || form.email_condominio;

      const { condominio, responsavel } = await salvarCadastroBase();

      const { error } = await supabase.functions.invoke("enviar-convite", {
        body: {
          condominio_id: condominio.id,
          responsavel_id: responsavel?.id || null,
          email: emailDestino,
          nome_responsavel: form.responsavel_nome || null,
          nome_condominio: form.nome_fantasia || form.razao_social,
        },
      });

      if (error) throw error;

      toast.success("Condomínio salvo e convite enviado com sucesso.");
      setModalConvite(false);
    } catch (error) {
      console.error("Erro ao enviar convite:", error);
      toast.error("Não foi possível enviar o convite. Verifique os dados e tente novamente.");
    } finally {
      setSendingInvite(false);
    }
  }

  return (
    <div className="cadastro-condominio-page">
      <ModalChegou
        open={modalConvite}
        type="warning"
        title="Enviar convite ao responsável?"
        description="O condomínio será salvo e um convite será enviado para o e-mail informado. O responsável poderá validar os dados pelo link recebido."
        confirmText="Enviar convite"
        cancelText="Revisar dados"
        loading={sendingInvite}
        onCancel={() => setModalConvite(false)}
        onConfirm={confirmarEnvioConvite}
      />

      <div className="breadcrumb">
        <span>Início</span>
        <span>›</span>
        <span>Condomínios</span>
        <span>›</span>
        <strong>Cadastro de Condomínio</strong>
      </div>

      <div className="cadastro-top">
        <div>
          <h1>Cadastro de Condomínio</h1>
          <p>Preencha os dados do condomínio para iniciar a gestão.</p>
        </div>

        <button type="button" className="btn-ajuda">
          <HelpCircle size={16} />
          Ajuda
        </button>
      </div>

      <div className="cadastro-layout">
        <main className="cadastro-main">
          <section className="consulta-card">
            <SectionCard
              id="identificacao"
              number="1"
              title="Identificação do Condomínio"
              className="cnpj-card"
              isOpen={openSections.identificacao}
              onToggle={toggleSection}
            >
              <div className="mini-grid codigo-cnpj-grid">
                <div>
                  <label className="field-label">CNPJ</label>
                  <div className="field-row">
                    <input
                      value={form.cnpj}
                      onChange={(e) => updateField("cnpj", maskCNPJ(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                          buscarCNPJ();
                        }
                      }}
                      placeholder="00.000.000/0000-00"
                    />

                    <button
                      type="button"
                      className="btn-outline-orange"
                      onClick={buscarCNPJ}
                      disabled={loadingCnpj}
                    >
                      <Search size={17} />
                      {loadingCnpj ? "Consultando..." : "Consultar"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="field-label">Código do Condomínio</label>
                  <input
                    value={form.codigo_condominio}
                    onChange={(e) => handleCodigoChange(e.target.value)}
                    placeholder="Ex: LAPLACA"
                    maxLength={14}
                  />
                </div>
              </div>

              <small>
                O código será usado futuramente para facilitar o acesso de funcionários
                vinculados ao condomínio.
              </small>
            </SectionCard>

            <div className="consulta-info">
              <FileSearch size={58} />
              <p>A consulta preencherá automaticamente os dados do condomínio.</p>
            </div>
          </section>

          <div className="cards-grid">
            <SectionCard
              id="dados"
              number="2"
              title="Dados do Condomínio"
              isOpen={openSections.dados}
              onToggle={toggleSection}
            >
              <div className="mini-grid two">
                <div>
                  <label className="field-label">Razão Social</label>
                  <input
                    value={form.razao_social}
                    onChange={(e) => updateField("razao_social", e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Nome Fantasia</label>
                  <input
                    value={form.nome_fantasia}
                    onChange={(e) => handleNomeFantasiaChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="mini-grid three">
                <div>
                  <label className="field-label">Tipo de Condomínio</label>
                  <select
                    value={form.tipo_condominio}
                    onChange={(e) => updateField("tipo_condominio", e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option value="residencial">Residencial</option>
                    <option value="comercial">Comercial</option>
                    <option value="misto">Misto</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Qtd. de Unidades</label>
                  <input
                    type="number"
                    min="0"
                    value={form.qtd_unidades}
                    onChange={(e) => updateField("qtd_unidades", e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Qtd. de Blocos</label>
                  <input
                    type="number"
                    min="0"
                    value={form.qtd_blocos}
                    onChange={(e) => updateField("qtd_blocos", e.target.value)}
                  />
                </div>
              </div>

              <div className="mini-grid two">
                <div>
                  <label className="field-label">Possui Portaria?</label>
                  <select
                    value={form.possui_portaria}
                    onChange={(e) => updateField("possui_portaria", e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Tipo de Portaria</label>
                  <select
                    value={form.tipo_portaria}
                    onChange={(e) => updateField("tipo_portaria", e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option value="fisica">Física</option>
                    <option value="remota">Remota</option>
                    <option value="hibrida">Híbrida</option>
                    <option value="sem_portaria">Sem portaria</option>
                  </select>
                </div>
              </div>

              <div className="mini-grid two">
                <div>
                  <label className="field-label">Email Condomínio</label>
                  <input
                    type="email"
                    value={form.email_condominio}
                    onChange={(e) => updateField("email_condominio", e.target.value)}
                    placeholder="condominio@email.com"
                  />
                </div>

                <div>
                  <label className="field-label">Telefone/WhatsApp</label>
                  <input
                    value={form.telefone_condominio}
                    onChange={(e) =>
                      updateField("telefone_condominio", maskPhone(e.target.value))
                    }
                    placeholder="+55 (11) 99999-9999"
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="endereco"
              number="3"
              title="Endereço"
              isOpen={openSections.endereco}
              onToggle={toggleSection}
            >
              <label className="field-label">CEP</label>
              <div className="field-row">
                <input
                  value={form.cep}
                  onChange={(e) => updateField("cep", maskCEP(e.target.value))}
                  placeholder="00000-000"
                />

                <button
                  type="button"
                  className="btn-outline-orange"
                  onClick={buscarCEP}
                  disabled={loadingCep}
                >
                  <Search size={16} />
                  {loadingCep ? "Consultando..." : "Consultar CEP"}
                </button>
              </div>

              <label className="field-label">Logradouro</label>
              <input
                value={form.endereco}
                onChange={(e) => updateField("endereco", e.target.value)}
              />

              <div className="mini-grid two">
                <div>
                  <label className="field-label">Número</label>
                  <input
                    value={form.numero}
                    onChange={(e) => updateField("numero", e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Complemento</label>
                  <input
                    value={form.complemento}
                    onChange={(e) => updateField("complemento", e.target.value)}
                  />
                </div>
              </div>

              <label className="field-label">Bairro</label>
              <input
                value={form.bairro}
                onChange={(e) => updateField("bairro", e.target.value)}
              />

              <div className="mini-grid city-state">
                <div>
                  <label className="field-label">Cidade</label>
                  <input
                    value={form.cidade}
                    onChange={(e) => updateField("cidade", e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Estado</label>
                  <select value={form.uf} onChange={(e) => updateField("uf", e.target.value)}>
                    <option value="">Selecione</option>
                    {[
                      "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
                      "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
                      "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
                    ].map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="configuracoes"
              number="4"
              title="Configurações do Sistema"
              isOpen={openSections.configuracoes}
              onToggle={toggleSection}
            >
              <div className="toggle-grid">
                {[
                  ["notificacao_whatsapp", "Permite notificação por WhatsApp"],
                  ["controle_morador", "Controle por morador"],
                  ["notificacao_email", "Permite notificação por E-mail"],
                  ["exige_identificacao_retirada", "Exige identificação para retirada"],
                  ["controle_unidade", "Controle por unidade"],
                  ["permite_multiplos_responsaveis", "Permitir múltiplos responsáveis"],
                ].map(([field, label]) => (
                  <button
                    key={field}
                    type="button"
                    className="toggle-item"
                    onClick={() => toggleConfig(field)}
                  >
                    <span>{label}</span>
                    <i className={config[field] ? "on" : ""}></i>
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              id="responsavel"
              number="5"
              title="Responsável pelo Condomínio"
              isOpen={openSections.responsavel}
              onToggle={toggleSection}
            >
              <label className="field-label">Nome do Responsável</label>
              <input
                value={form.responsavel_nome}
                onChange={(e) => updateField("responsavel_nome", e.target.value)}
                placeholder="Digite o nome completo"
              />

              <label className="field-label">E-mail do Responsável</label>
              <input
                type="email"
                value={form.responsavel_email}
                onChange={(e) => updateField("responsavel_email", e.target.value)}
                placeholder="exemplo@email.com"
              />

              <label className="field-label">Telefone/WhatsApp do Responsável</label>
              <input
                value={form.responsavel_telefone}
                onChange={(e) =>
                  updateField("responsavel_telefone", maskPhone(e.target.value))
                }
                placeholder="+55 (11) 99999-9999"
              />

              <div className="convite-box">
                <div>
                  <Mail size={18} />
                  <span>
                    Enviaremos um convite para o responsável validar o cadastro do
                    condomínio.
                  </span>
                </div>

                <button type="button" onClick={abrirConfirmacaoConvite} disabled={sendingInvite}>
                  <Send size={16} />
                  {sendingInvite ? "Enviando..." : "Enviar Convite"}
                </button>
              </div>
            </SectionCard>
          </div>

          <div className="footer-actions">
            <button type="button" className="btn-cancelar">
              <X size={20} />
              Cancelar
            </button>

            <button
              type="button"
              className="btn-salvar"
              onClick={salvarCondominio}
              disabled={saving}
            >
              <Save size={18} />
              {saving ? "Salvando..." : "Salvar Condomínio"}
            </button>
          </div>
        </main>

        <aside className="cadastro-help">
          <div className="help-card">
            <div className="help-title">
              <span className="step-number">1</span>
              <strong>Sobre a consulta de CNPJ</strong>
            </div>

            <p>
              Utilizamos dados oficiais da Receita Federal para garantir informações
              confiáveis e atualizadas.
            </p>

            <strong className="help-subtitle">Serão preenchidos automaticamente:</strong>

            <ul className="check-list">
              <li><CheckCircle size={15} /> Razão Social</li>
              <li><CheckCircle size={15} /> Nome Fantasia</li>
              <li><CheckCircle size={15} /> Endereço quando disponível</li>
              <li><CheckCircle size={15} /> Código sugerido do condomínio</li>
            </ul>
          </div>

          <div className="help-card">
            <div className="tips-title">
              <Lightbulb size={22} />
              <strong>Dicas</strong>
            </div>

            <ul className="tips-list">
              <li>O código do condomínio será usado por funcionários autorizados.</li>
              <li>Use códigos simples e fáceis de lembrar, como LAPLACA.</li>
              <li>Após cadastrar, envie o convite para o responsável.</li>
              <li>
                Se o e-mail do responsável não for informado, será usado o e-mail do
                condomínio.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}