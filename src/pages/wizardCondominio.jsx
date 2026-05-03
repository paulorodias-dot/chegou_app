import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Building2, HelpCircle, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "../services/supabase";
import ModalChegou from "../components/common/ModalChegou";
import logo from "../assets/logo.png";
import "../styles/wizardCondominio.css";

const VERSAO_TERMOS = "1.1";
const VERSAO_PRIVACIDADE = "1.1";

const TERMO_ADESAO_CONDOMINIO = `
TERMO DE ADESÃO, RESPONSABILIDADE E POLÍTICA DE PRIVACIDADE
VERSÃO 1.1 – ABRIL DE 2026

1. DAS PARTES E DO OBJETO

O presente Termo regula o uso da plataforma “Chegou!”, sistema SaaS de gestão de encomendas em condomínios, desenvolvido e provido por PAULO ROBERTO OLIVEIRA DIAS, inscrito no CPF nº 858.147.765-87, doravante denominado PROVEDOR.

O usuário, na qualidade de SÍNDICO, ADMINISTRADOR ou RESPONSÁVEL LEGAL, declara possuir poderes para representar o condomínio e aderir a este Termo.

O sistema tem como finalidade registrar, organizar e acompanhar o fluxo de encomendas recebidas e entregues no condomínio, incluindo identificação de responsáveis pelo recebimento e horários de movimentação.

2. CADASTRO E VERACIDADE DAS INFORMAÇÕES

2.1. Para utilização do sistema, poderão ser solicitados dados como: nome, e-mail, telefone e CPF do responsável.

2.2. O usuário declara que todas as informações fornecidas são verdadeiras, atualizadas e de sua titularidade.

2.3. O fornecimento de dados falsos ou de terceiros poderá resultar em suspensão do acesso, cancelamento da conta e responsabilização civil e/ou criminal.

3. ESCOPO DO SISTEMA

O Sistema Chegou! é destinado exclusivamente à gestão de encomendas, contemplando registro de recebimento na portaria, identificação de quem recebeu, registro de data e hora e controle de entrega ao morador.

4. RESPONSABILIDADES DO USUÁRIO

O condomínio é responsável pela veracidade dos registros, conduta de seus funcionários e correta utilização da plataforma.

5. SEGURANÇA E PROTEÇÃO DE DADOS (LGPD)

O sistema adota autenticação segura, controle de acesso por perfil e registro de logs. Os dados coletados são utilizados para operação, segurança e rastreabilidade.

6. REGISTROS E RASTREABILIDADE

O sistema mantém registros operacionais para auditoria, segurança e controle operacional do condomínio.

7. GEOLOCALIZAÇÃO E ACESSO

O sistema poderá utilizar dados de acesso do dispositivo para segurança da conta e identificação de acessos suspeitos, sem monitoramento contínuo.

8. PROPRIEDADE INTELECTUAL E DIREITOS AUTORAIS

O sistema Chegou!, incluindo código-fonte, interface, banco de dados, fluxos, nome e marca, é de propriedade exclusiva do PROVEDOR. É proibida cópia, reprodução, engenharia reversa ou uso para solução concorrente.

9. LIMITAÇÃO DE RESPONSABILIDADE

O PROVEDOR não garante disponibilidade ininterrupta nem ausência total de falhas técnicas, nem responde por falhas operacionais do condomínio.

10. TRANSIÇÃO PARA PESSOA JURÍDICA

Este Termo poderá ser transferido para futura empresa de titularidade do PROVEDOR, mantendo-se as condições e integridade dos dados.

11. ACEITE

Ao clicar em “ACEITAR E FINALIZAR”, o usuário declara que leu, compreendeu, concorda com as condições e possui poderes para representar o condomínio.

12. ATUALIZAÇÕES DO SISTEMA E DOS TERMOS

O sistema Chegou! está em constante evolução. Alterações relevantes relacionadas à LGPD, segurança da informação ou direitos e deveres dos usuários poderão exigir novo aceite. Mudanças sem impacto jurídico, de segurança ou privacidade poderão ser implementadas sem novo aceite.
`;

const formInicial = {
  nome_condominio: "",
  razao_social: "",
  cnpj: "",
  codigo_condominio: "",
  email_condominio: "",
  telefone_condominio: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  nome_responsavel: "",
  email_responsavel: "",
  telefone_responsavel: "",
  username: "",
  quantidade_torres: 0,
  quantidade_unidades: "",
};

export default function WizardCondominio({ modoTeste = false }) {
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");
  const modo = searchParams.get("modo");
  const isModoValidacao = modo === "teste" || modoTeste;

  const [etapa, setEtapa] = useState(1);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [modalTorres, setModalTorres] = useState(false);
  const [modalAceite, setModalAceite] = useState(false);
  const [condominioId, setCondominioId] = useState(null);
  const [conviteId, setConviteId] = useState(null);

  const [aceite, setAceite] = useState({
    termos: false,
    lgpd: false,
  });

  const [mostrarTermoCompleto, setMostrarTermoCompleto] = useState(false);

  const [form, setForm] = useState(formInicial);
  const [qtdTorresModal, setQtdTorresModal] = useState("");
  const [torres, setTorres] = useState([]);

  useEffect(() => {
    async function carregarConvite() {
      try {
        setLoading(true);
        setErro("");

        const { data: convite, error: conviteError } = await supabase
          .from("convites_condominio")
          .select("*")
          .eq("token", token)
          .eq("status", "pendente")
          .maybeSingle();

        if (conviteError || !convite) {
          setErro("Convite inválido, expirado ou já utilizado.");
          return;
        }

        if (new Date(convite.expira_em) < new Date()) {
          setErro("Convite expirado.");
          return;
        }

        setConviteId(convite.id);
        setCondominioId(convite.condominio_id);

        const { data: condominio, error: condominioError } = await supabase
          .from("condominios")
          .select("*")
          .eq("id", convite.condominio_id)
          .single();

        if (condominioError || !condominio) {
          setErro("Não foi possível carregar os dados do condomínio.");
          return;
        }

        const { data: endereco } = await supabase
          .from("enderecos")
          .select("*")
          .eq("condominio_id", convite.condominio_id)
          .maybeSingle();

        const { data: responsavel } = await supabase
          .from("responsavel_logistica")
          .select("*")
          .eq("id", convite.responsavel_id)
          .maybeSingle();

        setForm({
          nome_condominio: condominio.nome_fantasia || "",
          razao_social: condominio.razao_social || "",
          cnpj: condominio.cnpj || "",
          codigo_condominio: condominio.codigo_condominio || "",
          email_condominio: condominio.email_condominio || "",
          telefone_condominio: condominio.telefone_condominio || "",
          cep: endereco?.cep || "",
          endereco: endereco?.logradouro || "",
          numero: endereco?.numero || "",
          complemento: endereco?.complemento || "",
          bairro: endereco?.bairro || "",
          cidade: endereco?.cidade || "",
          uf: endereco?.estado || endereco?.uf || "",
          nome_responsavel: responsavel?.nome || convite.nome_responsavel || "",
          email_responsavel: responsavel?.email || convite.email_destino || "",
          telefone_responsavel: responsavel?.telefone || "",
          username: "",
          quantidade_torres: condominio.quantidade_blocos || 0,
          quantidade_unidades: condominio.quantidade_unidades || "",
        });
      } catch (error) {
        console.error(error);
        setErro("Erro inesperado ao carregar o convite.");
      } finally {
        setLoading(false);
      }
    }

    function carregarModoValidacao() {
      setForm({
        ...formInicial,
        nome_condominio: "Condomínio Teste Chegou",
        razao_social: "Condomínio Teste Chegou LTDA",
        cnpj: "123456",
        codigo_condominio: "TESTE",
        email_condominio: "condominio.teste@email.com",
        telefone_condominio: "+55 (11) 99999-9999",
        cep: "00000-000",
        endereco: "Rua de Teste",
        numero: "123",
        bairro: "Centro",
        cidade: "São Paulo",
        uf: "SP",
        nome_responsavel: "Responsável Teste",
        email_responsavel: "responsavel.teste@email.com",
        telefone_responsavel: "+55 (11) 98888-8888",
        quantidade_torres: 0,
        quantidade_unidades: "",
      });

      setCondominioId(null);
      setConviteId(null);
      setErro("");
      setLoading(false);
    }

    if (isModoValidacao) {
      carregarModoValidacao();
      return;
    }

    if (token) {
      carregarConvite();
      return;
    }

    const timer = setTimeout(() => {
      setErro("Acesso não autorizado.");
      setLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [token, isModoValidacao]);

  function limparTexto(valor) {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
  }

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function gerarUsernameAutomatico() {
    if (isModoValidacao) {
      atualizarCampo("username", "teste.administrativo");
      toast.success("Username de teste gerado.");
      return;
    }

    const partesNome = form.nome_responsavel.trim().split(" ").filter(Boolean);

    if (partesNome.length < 2) {
      toast("Informe nome e sobrenome do responsável para gerar o username.", {
        icon: "⚠️",
      });
      return;
    }

    const primeiroNome = limparTexto(partesNome[0]);
    const ultimoSobrenome = limparTexto(partesNome[partesNome.length - 1]);

    atualizarCampo("username", `${primeiroNome}.${ultimoSobrenome}`);
    toast.success("Username sugerido com sucesso.");
  }

  function gerarCamposTorres() {
    const quantidade = Number(qtdTorresModal);

    if (!quantidade || quantidade <= 0) {
      toast("Informe uma quantidade válida de torres/blocos.", { icon: "⚠️" });
      return;
    }

    const novasTorres = Array.from({ length: quantidade }, (_, index) => ({
      ordem: index + 1,
      nome: torres[index]?.nome || "",
      identificador: torres[index]?.identificador || "",
    }));

    setTorres(novasTorres);
    toast.success("Campos de torres/blocos gerados.");
  }

  function atualizarTorre(index, campo, valor) {
    const lista = [...torres];
    lista[index][campo] = valor;
    setTorres(lista);
  }

  function salvarTorresModal() {
    if (torres.length === 0) {
      toast("Gere os campos das torres/blocos antes de salvar.", { icon: "⚠️" });
      return;
    }

    const incompletas = torres.some(
      (torre) => !torre.nome.trim() || !torre.identificador.trim()
    );

    if (incompletas) {
      toast.error("Preencha o nome e o número/letra de todas as torres/blocos.");
      return;
    }

    setForm((prev) => ({ ...prev, quantidade_torres: torres.length }));
    setModalTorres(false);
    toast.success("Torres/blocos salvos no cadastro.");
  }

  function avancarEtapa() {
    if (
      etapa === 1 &&
      (!form.nome_condominio || !form.cnpj || !form.codigo_condominio)
    ) {
      toast.error("Confirme nome do condomínio, CNPJ e código do condomínio.");
      return;
    }

    if (
      etapa === 2 &&
      (!form.quantidade_unidades || Number(form.quantidade_torres) <= 0)
    ) {
      toast.error("Cadastre as torres/blocos e informe a quantidade de unidades.");
      return;
    }

    setEtapa((atual) => atual + 1);
  }

  const podeSalvar = useMemo(() => {
    return (
      form.nome_condominio &&
      form.cnpj &&
      form.codigo_condominio &&
      form.quantidade_unidades &&
      Number(form.quantidade_torres) > 0 &&
      form.nome_responsavel &&
      form.email_responsavel &&
      form.username
    );
  }, [form]);

  function abrirModalAceite(e) {
    e.preventDefault();

    if (!podeSalvar) {
      toast.error("Preencha os campos obrigatórios antes de finalizar.");
      return;
    }

    setModalAceite(true);
  }

  async function confirmarFinalizacao() {
    if (!aceite.termos || !aceite.lgpd) {
      toast.error("É necessário aceitar os Termos e a Política de Privacidade.");
      return;
    }

    if (isModoValidacao) {
      toast.success("Modo validação: fluxo testado com sucesso. Nenhum dado foi salvo.");
      setModalAceite(false);
      return;
    }

    try {
      setSalvando(true);

      const agora = new Date().toISOString();

      const { error: condominioError } = await supabase
        .from("condominios")
        .update({
          nome_fantasia: form.nome_condominio,
          razao_social: form.razao_social,
          cnpj: form.cnpj,
          codigo_condominio: form.codigo_condominio,
          email_condominio: form.email_condominio,
          telefone_condominio: form.telefone_condominio,
          quantidade_blocos: Number(form.quantidade_torres),
          quantidade_unidades: Number(form.quantidade_unidades),
          status_cadastro: "em_validacao",
          atualizado_em: agora,
        })
        .eq("id", condominioId);

      if (condominioError) throw condominioError;

      const { data: enderecoExistente } = await supabase
        .from("enderecos")
        .select("id")
        .eq("condominio_id", condominioId)
        .maybeSingle();

      const payloadEndereco = {
        condominio_id: condominioId,
        cep: form.cep,
        logradouro: form.endereco,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.uf,
      };

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

      // Remove torres existentes
      await supabase
        .from("torres")
        .delete()
        .eq("condominio_id", condominioId);

      // Monta payload correto
      const torresPayload = torres.map((torre, index) => ({
        condominio_id: condominioId,
        nome: torre.nome,
        identificador: torre.identificador,
        business_id: `${form.codigo_condominio}-TORRE-${index + 1}`,
      }));

      // Insere novas torres
      const { error: torresError } = await supabase
        .from("torres")
        .insert(torresPayload);


      if (torresError) throw torresError;

      const { error: aceiteError } = await supabase.from("aceites_termos").insert({
        condominio_id: condominioId,
        convite_id: conviteId,
        tipo_usuario: "responsavel_condominio",
        nome: form.nome_responsavel,
        email: form.email_responsavel,
        aceite_termos: true,
        aceite_lgpd: true,
        versao_termos: VERSAO_TERMOS,
        versao_privacidade: VERSAO_PRIVACIDADE,
        user_agent: navigator.userAgent,
        aceito_em: agora,
      });

      if (aceiteError) throw aceiteError;

      await supabase
        .from("convites_condominio")
        .update({
          status: "aceito",
          aceito_em: agora,
        })
        .eq("token", token);

      toast.success("Cadastro enviado para validação com sucesso!");
      setModalAceite(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível finalizar o cadastro.");
    } finally {
      setSalvando(false);
    }
  }

  const steps = [
    { id: 1, label: "Identificação" },
    { id: 2, label: "Estrutura" },
    { id: 3, label: "Responsável" },
  ];

  if (loading) return <div className="wizard-loading">Carregando convite...</div>;

  if (erro) {
    return (
      <div className="wizard-wrapper">
        <div className="wizard-box wizard-error">
          <h1>Convite indisponível</h1>
          <p>{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-wrapper">
      <ModalChegou
        open={modalAceite}
        type="warning"
        title="Termos de Uso e Privacidade"
        description={`Versão ${VERSAO_TERMOS} — para concluir, confirme a leitura e aceite.`}
        confirmText="Aceitar e finalizar"
        cancelText="Revisar dados"
        loading={salvando}
        onCancel={() => setModalAceite(false)}
        onConfirm={confirmarFinalizacao}
      >
        <div className="aceite-modal-content">
          <div className="aceite-text-box">
            <strong>Termos de Uso - Chegou!</strong>
            <p>
              Declaro que as informações preenchidas são verdadeiras, que possuo
              poderes para representar o condomínio e que estou ciente de que o
              cadastro será auditado antes da liberação final.
            </p>
          </div>

          <div className="aceite-text-box">
            <strong>Privacidade e LGPD</strong>
              <p>
                Estou ciente de que os dados informados serão tratados para operação,
                segurança, auditoria e validação do cadastro.
              </p>
          </div>

          <button
            type="button"
            className="btn-ler-termos"
            onClick={() => setMostrarTermoCompleto((prev) => !prev)}
          >
            {mostrarTermoCompleto ? "Ocultar termos completos" : "Ler termos completos"}
          </button>

          {mostrarTermoCompleto && (
            <div className="termos-completos-box">
              <pre>{TERMO_ADESAO_CONDOMINIO}</pre>
            </div>
          )}

          <label className="aceite-check">
            <input
              type="checkbox"
              checked={aceite.termos}
              onChange={(e) =>
                setAceite((prev) => ({ ...prev, termos: e.target.checked }))
              }
            />
            Li e aceito os Termos de Uso versão {VERSAO_TERMOS}.
          </label>

          <label className="aceite-check">
            <input
              type="checkbox"
              checked={aceite.lgpd}
              onChange={(e) =>
                setAceite((prev) => ({ ...prev, lgpd: e.target.checked }))
              }
            />
            Li e aceito a Política de Privacidade/LGPD versão {VERSAO_PRIVACIDADE}.
          </label>
        </div>
      </ModalChegou>

      <div className="wizard-box">
        <header className="wizard-top">
          <div className="wizard-logo-area">
            <img src={logo} alt="Chegou!" />
          </div>

          <h1>Cadastro de dados do Condomínio</h1>

          {isModoValidacao && <span className="wizard-mode">Modo Validação</span>}
        </header>

        <div className="wizard-steps">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`wizard-step ${etapa === step.id ? "active" : ""} ${
                etapa > step.id ? "done" : ""
              }`}
            >
              <span>{etapa > step.id ? "✓" : step.id}</span>
              <small>{step.label}</small>
              {index < steps.length - 1 && <i />}
            </div>
          ))}
        </div>

        <form onSubmit={abrirModalAceite} className="wizard-form">
          {etapa === 1 && (
            <section className="wizard-content-grid">
              <div className="wizard-main-content">
                <div className="wizard-section-title">
                  <h2>1. Identificação do Condomínio</h2>
                  <p>Informe os dados básicos para validar o condomínio convidado.</p>
                </div>

                <div className="wizard-grid">
                  <label>
                    Nome do Condomínio *
                    <input
                      value={form.nome_condominio}
                      onChange={(e) => atualizarCampo("nome_condominio", e.target.value)}
                    />
                  </label>

                  <label>
                    Razão Social
                    <input
                      value={form.razao_social}
                      onChange={(e) => atualizarCampo("razao_social", e.target.value)}
                    />
                  </label>

                  <label>
                    CNPJ *
                    <input
                      value={form.cnpj}
                      onChange={(e) => atualizarCampo("cnpj", e.target.value)}
                    />
                  </label>

                  <label>
                    Código do Condomínio *
                    <input value={form.codigo_condominio} readOnly />
                    <small>Este código será usado para acesso de funcionários autorizados.</small>
                  </label>

                  <label>
                    E-mail do Condomínio *
                    <input
                      value={form.email_condominio}
                      onChange={(e) => atualizarCampo("email_condominio", e.target.value)}
                    />
                  </label>

                  <label>
                    Telefone / WhatsApp
                    <input
                      value={form.telefone_condominio}
                      onChange={(e) => atualizarCampo("telefone_condominio", e.target.value)}
                    />
                  </label>
                </div>

                <div className="wizard-section-title second">
                  <h2>Endereço</h2>
                  <p>Esses dados ajudam a organizar portaria, moradores e unidades.</p>
                </div>

                <div className="wizard-grid address-grid">
                  <label>
                    CEP *
                    <input
                      value={form.cep}
                      onChange={(e) => atualizarCampo("cep", e.target.value)}
                    />
                  </label>

                  <label className="wide">
                    Endereço *
                    <input
                      value={form.endereco}
                      onChange={(e) => atualizarCampo("endereco", e.target.value)}
                    />
                  </label>

                  <label>
                    Número *
                    <input
                      value={form.numero}
                      onChange={(e) => atualizarCampo("numero", e.target.value)}
                    />
                  </label>

                  <label>
                    Complemento
                    <input
                      value={form.complemento}
                      onChange={(e) => atualizarCampo("complemento", e.target.value)}
                    />
                  </label>

                  <label>
                    Bairro *
                    <input
                      value={form.bairro}
                      onChange={(e) => atualizarCampo("bairro", e.target.value)}
                    />
                  </label>

                  <label>
                    Cidade *
                    <input
                      value={form.cidade}
                      onChange={(e) => atualizarCampo("cidade", e.target.value)}
                    />
                  </label>

                  <label>
                    UF *
                    <input
                      value={form.uf}
                      onChange={(e) => atualizarCampo("uf", e.target.value.toUpperCase())}
                      maxLength={2}
                    />
                  </label>
                </div>
              </div>

              <aside className="wizard-side-tip">
                <div>
                  <HelpCircle size={22} />
                  <strong>Dicas</strong>
                </div>

                <ul>
                  <li>Confira CNPJ, e-mail e telefone antes de avançar.</li>
                  <li>O código do condomínio será importante para funcionários.</li>
                  <li>Somente o complemento pode ficar em branco.</li>
                </ul>
              </aside>
            </section>
          )}

          {etapa === 2 && (
            <section className="wizard-content-grid">
              <div className="wizard-main-content">
                <div className="wizard-section-title">
                  <h2>2. Estrutura do Condomínio</h2>
                  <p>Informe a estrutura de torres/blocos e a quantidade total de unidades.</p>
                </div>

                <div className="wizard-grid structure-grid">
                  <label>
                    Torres / Blocos cadastrados *
                    <input value={form.quantidade_torres} readOnly />
                  </label>

                  <label>
                    Quantidade de Unidades *
                    <input
                      type="number"
                      min="1"
                      value={form.quantidade_unidades}
                      onChange={(e) => atualizarCampo("quantidade_unidades", e.target.value)}
                    />
                  </label>
                </div>

                <div className="wizard-action-card big">
                  <Building2 size={38} />
                  <div>
                    <strong>Cadastre suas torres ou blocos</strong>
                    <p>Informe a quantidade de torres/blocos e identifique cada uma delas.</p>
                    <button type="button" onClick={() => setModalTorres(true)}>
                      Cadastrar Torres / Blocos
                    </button>
                  </div>
                </div>

                {torres.length > 0 && (
                  <div className="wizard-preview">
                    <strong>Torres cadastradas:</strong>
                    <div>
                      {torres.map((torre) => (
                        <span key={torre.ordem}>
                          {torre.nome} - {torre.identificador}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <aside className="wizard-side-tip">
                <div>
                  <HelpCircle size={22} />
                  <strong>Dicas</strong>
                </div>

                <ul>
                  <li>Cadastre todas as torres ou blocos do condomínio.</li>
                  <li>Depois será possível vincular unidades e moradores.</li>
                  <li>A quantidade total de unidades deve ser real.</li>
                </ul>
              </aside>
            </section>
          )}

          {etapa === 3 && (
            <section className="wizard-content-grid">
              <div className="wizard-main-content">
                <div className="wizard-section-title">
                  <h2>3. Responsável pela Logística</h2>
                  <p>Informe quem será o responsável inicial pela gestão das encomendas.</p>
                </div>

                <div className="wizard-grid">
                  <label>
                    Nome do Responsável *
                    <input
                      value={form.nome_responsavel}
                      onChange={(e) => atualizarCampo("nome_responsavel", e.target.value)}
                    />
                  </label>

                  <label>
                    E-mail do Responsável *
                    <input
                      value={form.email_responsavel}
                      onChange={(e) => atualizarCampo("email_responsavel", e.target.value)}
                    />
                  </label>

                  <label>
                    Telefone / WhatsApp
                    <input
                      value={form.telefone_responsavel}
                      onChange={(e) => atualizarCampo("telefone_responsavel", e.target.value)}
                    />
                  </label>

                  <label className="wide">
                    Username de acesso *
                    <div className="username-row">
                      <input
                        value={form.username}
                        onChange={(e) =>
                          atualizarCampo("username", e.target.value.toLowerCase().trim())
                        }
                        placeholder="ex: paulo.dias"
                      />

                      <button type="button" onClick={gerarUsernameAutomatico}>
                        <Sparkles size={15} />
                        Gerar sugestão
                      </button>
                    </div>
                  </label>
                </div>

                <div className="wizard-info-box">
                  <ShieldCheck size={24} />
                  <div>
                    <strong>O username será usado para acesso após aprovação.</strong>
                    <p>
                      O cadastro será analisado pela equipe Chegou! antes da liberação final.
                    </p>
                  </div>
                </div>

                <div className="wizard-info-box">
                  <Building2 size={24} />
                  <div>
                    <strong>
                      Código do Condomínio: {form.codigo_condominio || "não informado"}
                    </strong>
                    <p>
                      Guarde este código. Ele será usado para orientar funcionários vinculados
                      ao condomínio.
                    </p>
                  </div>
                </div>
              </div>

              <aside className="wizard-side-tip">
                <div>
                  <HelpCircle size={22} />
                  <strong>Dicas</strong>
                </div>

                <ul>
                  <li>Este usuário será o responsável inicial pelas operações.</li>
                  <li>O username deve ser simples e fácil de lembrar.</li>
                  <li>A liberação ocorre somente após auditoria do Master.</li>
                </ul>
              </aside>
            </section>
          )}

          <div className="wizard-footer">
            {etapa > 1 && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => setEtapa((atual) => atual - 1)}
              >
                Voltar
              </button>
            )}

            {etapa < 3 && (
              <button type="button" className="btn primary" onClick={avancarEtapa}>
                Próximo
              </button>
            )}

            {etapa === 3 && (
              <button
                type="submit"
                className="btn primary"
                disabled={!isModoValidacao && (!podeSalvar || salvando)}
              >
                {salvando ? "Salvando..." : "Finalizar cadastro"}
              </button>
            )}
          </div>
        </form>
      </div>

      {modalTorres && (
        <div className="wizard-modal-overlay">
          <div className="wizard-modal">
            <div className="wizard-modal-header">
              <div>
                <h2>Cadastro de Torres / Blocos</h2>
                <p>Defina a quantidade e identifique cada torre ou bloco.</p>
              </div>
              <button type="button" onClick={() => setModalTorres(false)}>
                ×
              </button>
            </div>

            <div className="wizard-modal-content">
              <label>
                Quantidade de Torres / Blocos
                <div className="wizard-inline">
                  <input
                    type="number"
                    min="1"
                    value={qtdTorresModal}
                    onChange={(e) => setQtdTorresModal(e.target.value)}
                  />
                  <button type="button" onClick={gerarCamposTorres}>
                    Gerar campos
                  </button>
                </div>
              </label>

              {torres.length > 0 && (
                <div className="wizard-torres-list">
                  {torres.map((torre, index) => (
                    <div className="wizard-torre-item" key={torre.ordem}>
                      <strong>{torre.ordem}</strong>
                      <input
                        placeholder="Nome. Ex: Torre A"
                        value={torre.nome}
                        onChange={(e) => atualizarTorre(index, "nome", e.target.value)}
                      />
                      <input
                        placeholder="Número ou letra. Ex: A, B, 1"
                        value={torre.identificador}
                        onChange={(e) =>
                          atualizarTorre(index, "identificador", e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="wizard-modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setModalTorres(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn primary" onClick={salvarTorresModal}>
                Salvar torres
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}