import { useState } from "react";
import { supabase } from "../../services/supabase";
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

export default function CadastroCondominio() {
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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

  function toast(message, type = "info") {
    setToastMessage({ message, type });

    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleConfig(field) {
    setConfig((prev) => ({ ...prev, [field]: !prev[field] }));
  }

async function buscarCNPJ() {
  const cnpjLimpo = onlyNumbers(form.cnpj);

  if (cnpjLimpo === "123456") {
    toast("CNPJ Fake 123456 identificado. Dados de teste liberados.", "success");
    return;
  }

  const { data: existente } = await supabase
    .from("condominios")
    .select("id")
    .eq("cnpj", cnpjLimpo)
    .maybeSingle();

  if (existente) {
    toast("Este CNPJ já está cadastrado no sistema.", "error");

    setForm((prev) => ({
      ...prev,
      cnpj: "",
    }));

    return;
  }

  if (cnpjLimpo.length !== 14) {
    toast("Informe um CNPJ válido com 14 números.", "error");
    return;
  }



  try {
    setLoadingCnpj(true);

    const { data, error } = await supabase.functions.invoke("consultar-cnpj", {
      body: {
        cnpj: cnpjLimpo,
      },
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

    setForm((prev) => ({
      ...prev,
      razao_social: cnpjData.razao_social || "",
      nome_fantasia: cnpjData.nome_fantasia || cnpjData.razao_social || "",
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

    toast("Dados do CNPJ preenchidos com sucesso.", "success");
  } catch (error) {
    toast(error.message || "Erro ao consultar CNPJ.", "error");
  } finally {
    setLoadingCnpj(false);
  }
}

  async function buscarCEP() {
    const cepLimpo = onlyNumbers(form.cep);

    if (cepLimpo.length !== 8) {
      toast("Informe um CEP válido com 8 números.", "error");
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

      toast("Endereço preenchido com sucesso.", "success");
    } catch (error) {
      toast(error.message || "Erro ao consultar CEP.", "error");
    } finally {
      setLoadingCep(false);
    }
  }

  async function salvarCadastroBase({ mostrarAlerta = false } = {}) {
    const cnpjLimpo = onlyNumbers(form.cnpj);

    if (!cnpjLimpo || (cnpjLimpo !== "123456" && cnpjLimpo.length !== 14)) {
      throw new Error("Informe um CNPJ válido antes de continuar.");
    }

    if (!form.razao_social && !form.nome_fantasia) {
      throw new Error("Informe a Razão Social ou Nome Fantasia do condomínio.");
    }

    const payloadCondominio = {
      cnpj: cnpjLimpo,
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

      if (error) {
        console.error("Erro ao atualizar condomínio:", error);
        throw error;
      }

      condominio = data;
    } else {
      const { data, error } = await supabase
        .from("condominios")
        .insert(payloadCondominio)
        .select()
        .single();

      if (error) {
        console.error("Erro ao inserir condomínio:", error);
        throw error;
      }

      condominio = data;
    }

    // 📍 salvar endereço vinculado ao condomínio
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

        if (error) {
          console.error("Erro ao atualizar endereço:", error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("enderecos")
          .insert(payloadEndereco);

        if (error) {
          console.error("Erro ao inserir endereço:", error);
          throw error;
        }
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

        if (error) {
          console.error("Erro ao salvar responsável:", error);
          throw error;
        }
        responsavel = data;
      } else {
        const { data, error } = await supabase
          .from("responsavel_logistica")
          .insert(payloadResponsavel)
          .select()
          .single();

        if (error) {
          console.error("Erro ao salvar responsável:", error);
          throw error;
        }
        responsavel = data;
      }
    }

    if (mostrarAlerta) {
      toast("Condomínio salvo com status pendente.", "success");
    }

    return { condominio, responsavel };
  }

  async function salvarCondominio() {
    try {
      setSaving(true);
      await salvarCadastroBase({ mostrarAlerta: true });
    } catch (error) {
      toast(error.message || "Erro ao salvar condomínio.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function enviarConvite() {
  try {
    setSendingInvite(true);

    const { data: authData } = await supabase.auth.getUser();
    console.log("Usuário autenticado Supabase:", authData?.user);

    const { data: isMaster, error: isMasterError } = await supabase.rpc("is_master");
    console.log("Resultado public.is_master():", isMaster);
    console.log("Erro public.is_master():", isMasterError);

    const emailDestino = form.responsavel_email || form.email_condominio;

    if (!emailDestino) {
      toast(
        "Informe o e-mail do responsável ou o e-mail do condomínio para enviar o convite.",
        "error"
      );
      return;
    }

    const { condominio, responsavel } = await salvarCadastroBase();

    if (!responsavel && !form.responsavel_nome) {
      toast("Informe ao menos o nome do responsável.", "error");
      return;
    }

    const { data, error } = await supabase.functions.invoke("enviar-convite", {
      body: {
        condominio_id: condominio.id,
        responsavel_id: responsavel?.id || null,
        email: emailDestino,
        nome_responsavel: form.responsavel_nome || null,
        nome_condominio: form.nome_fantasia || form.razao_social,
      },
    });

    if (error) throw error;

    console.log("Convite criado:", data);
    console.log("Link do convite:", data?.link);

    toast("Condomínio salvo e convite criado com sucesso. Verifique o link no console.", "success");
  } catch (error) {
    toast(error.message || "Erro ao gerar convite.", "error");
  } finally {
    setSendingInvite(false);
  }
}

  return (
    <div className="cadastro-condominio-page">
      {toastMessage && (
        <div className={`toast-chegou ${toastMessage.type}`}>
          {toastMessage.message}
        </div>
      )}

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
            <div className="section-card cnpj-card">
              <div className="section-title">
                <span className="step-number">1</span>
                <h2>Identificação do Condomínio (CNPJ)</h2>
              </div>

              <label className="field-label">CNPJ</label>
              <div className="field-row">
                <input
                  value={form.cnpj}
                  onChange={(e) => updateField("cnpj", maskCNPJ(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") buscarCNPJ();
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
                  {loadingCnpj ? "Consultando..." : "Consultar CNPJ"}
                </button>
              </div>

              <small>Digite o CNPJ e pressione ENTER ou clique em Consultar.</small>
            </div>

            <div className="consulta-info">
              <FileSearch size={58} />
              <p>A consulta preencherá automaticamente os dados do condomínio.</p>
            </div>
          </section>

          <div className="cards-grid">
            <section className="section-card">
              <div className="section-title">
                <span className="step-number">2</span>
                <h2>Dados do Condomínio</h2>
              </div>

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
                    onChange={(e) => updateField("nome_fantasia", e.target.value)}
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
            </section>

            <section className="section-card">
              <div className="section-title">
                <span className="step-number">3</span>
                <h2>Endereço (separado)</h2>
              </div>

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
                  <select
                    value={form.uf}
                    onChange={(e) => updateField("uf", e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option value="AC">AC</option>
                    <option value="AL">AL</option>
                    <option value="AP">AP</option>
                    <option value="AM">AM</option>
                    <option value="BA">BA</option>
                    <option value="CE">CE</option>
                    <option value="DF">DF</option>
                    <option value="ES">ES</option>
                    <option value="GO">GO</option>
                    <option value="MA">MA</option>
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="PA">PA</option>
                    <option value="PB">PB</option>
                    <option value="PR">PR</option>
                    <option value="PE">PE</option>
                    <option value="PI">PI</option>
                    <option value="RJ">RJ</option>
                    <option value="RN">RN</option>
                    <option value="RS">RS</option>
                    <option value="RO">RO</option>
                    <option value="RR">RR</option>
                    <option value="SC">SC</option>
                    <option value="SP">SP</option>
                    <option value="SE">SE</option>
                    <option value="TO">TO</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="section-card">
              <div className="section-title">
                <span className="step-number">4</span>
                <h2>Configurações do Sistema</h2>
              </div>

              <div className="toggle-grid">
                <button
                  type="button"
                  className="toggle-item"
                  onClick={() => toggleConfig("notificacao_whatsapp")}
                >
                  <span>Permite notificação por WhatsApp</span>
                  <i className={config.notificacao_whatsapp ? "on" : ""}></i>
                </button>

                <button
                  type="button"
                  className="toggle-item"
                  onClick={() => toggleConfig("controle_morador")}
                >
                  <span>Controle por morador</span>
                  <i className={config.controle_morador ? "on" : ""}></i>
                </button>

                <button
                  type="button"
                  className="toggle-item"
                  onClick={() => toggleConfig("notificacao_email")}
                >
                  <span>Permite notificação por E-mail</span>
                  <i className={config.notificacao_email ? "on" : ""}></i>
                </button>

                <button
                  type="button"
                  className="toggle-item"
                  onClick={() => toggleConfig("exige_identificacao_retirada")}
                >
                  <span>Exige identificação para retirada</span>
                  <i
                    className={
                      config.exige_identificacao_retirada ? "on" : ""
                    }
                  ></i>
                </button>

                <button
                  type="button"
                  className="toggle-item"
                  onClick={() => toggleConfig("controle_unidade")}
                >
                  <span>Controle por unidade</span>
                  <i className={config.controle_unidade ? "on" : ""}></i>
                </button>

                <button
                  type="button"
                  className="toggle-item"
                  onClick={() => toggleConfig("permite_multiplos_responsaveis")}
                >
                  <span>Permitir múltiplos responsáveis</span>
                  <i
                    className={
                      config.permite_multiplos_responsaveis ? "on" : ""
                    }
                  ></i>
                </button>
              </div>
            </section>

            <section className="section-card">
              <div className="section-title">
                <span className="step-number">5</span>
                <h2>Responsável pelo Condomínio (Convite)</h2>
              </div>

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

              <label className="field-label">
                Telefone/WhatsApp do Responsável
              </label>
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
                    Enviaremos um convite para o responsável acessar o sistema e
                    administrar o condomínio.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={enviarConvite}
                  disabled={sendingInvite}
                >
                  <Send size={16} />
                  {sendingInvite ? "Enviando..." : "Enviar Convite"}
                </button>
              </div>
            </section>
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
              Utilizamos dados oficiais da Receita Federal para garantir
              informações confiáveis e atualizadas.
            </p>

            <strong className="help-subtitle">
              Serão preenchidos automaticamente:
            </strong>

            <ul className="check-list">
              <li>
                <CheckCircle size={15} /> Razão Social
              </li>
              <li>
                <CheckCircle size={15} /> Nome Fantasia
              </li>
              <li>
                <CheckCircle size={15} /> Situação Cadastral
              </li>
              <li>
                <CheckCircle size={15} /> Endereço quando disponível
              </li>
            </ul>
          </div>

          <div className="help-card">
            <div className="tips-title">
              <Lightbulb size={22} />
              <strong>Dicas</strong>
            </div>

            <ul className="tips-list">
              <li>
                Mantenha o CNPJ atualizado para garantir a precisão dos dados.
              </li>
              <li>O endereço é obrigatório para o funcionamento do sistema.</li>
              <li>Após cadastrar, envie o convite para o responsável.</li>
              <li>
                Se o e-mail do responsável não for informado, será usado o
                e-mail do condomínio.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}