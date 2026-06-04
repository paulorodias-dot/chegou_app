import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Car,
  Check,
  Edit3,
  HelpCircle,
  Home,
  Info,
  ParkingCircle,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import "../../../styles/wizardMorador/WizardMoradorTela5.css";

import veiculoUnidadeImg from "../../../assets/veiculo_de_unidade.png";
import vagasGaragemImg from "../../../assets/vagas_de_garagem.png";

const LIMITE_UPLOAD_FOTO_MB = 5;
const LIMITE_UPLOAD_FOTO_BYTES = LIMITE_UPLOAD_FOTO_MB * 1024 * 1024;

const estruturaInicial = {
  possuiVeiculo: false,
  veiculos: [],
  possuiVaga: false,
  vagas: [],
  garagemSituacao: "",
};

const vagaInicial = {
  id: null,
  identificacao: "",
  local: "",
  situacao: "",
  observacoes: "",
  idVeiculo: "",
};

const veiculoInicial = {
  id: null,
  placa: "",
  tipo: "",
  marca: "",
  modelo: "",
  cor: "",
  ano: "",
  combustivel: "",
  portas: "",
  foto_base64: "",
  foto_nome: "",
  foto_mime: "",
  foto_tamanho: "",
};

const OPCOES_GARAGEM = [
  {
    valor: "possui_vaga",
    titulo: "Sim, possuí",
    texto: "Tenho uma ou mais vagas vinculadas.",
    icon: Home,
  },
  {
    valor: "rotativa",
    titulo: "Vagas rotativas",
    texto: "As vagas não são vinculadas à unidade.",
    icon: RotateCcw,
  },
  {
    valor: "nao_possui",
    titulo: "Não possuí vaga",
    texto: "Esta unidade não possui vaga de garagem.",
    icon: X,
  },
  {
    valor: "nao_sei",
    titulo: "Não sei informar",
    texto: "Posso informar isso mais tarde.",
    icon: HelpCircle,
  },
];

const SITUACOES_VAGA = [
  {
    valor: "propria_em_uso",
    titulo: "Uso minha própria vaga",
    texto: "A vaga é de minha propriedade ou vinculada à minha unidade.",
  },
  {
    valor: "propria_alugada_terceiro",
    titulo: "Minha vaga está alugada para outra pessoa",
    texto: "A vaga é minha, mas está alugada para um terceiro.",
  },
  {
    valor: "uso_vaga_terceiro",
    titulo: "Uso uma vaga alugada/cedida de outro morador",
    texto: "Esta vaga não é minha. Estou usando com autorização.",
  },
  {
    valor: "sem_uso",
    titulo: "Minha vaga está sem uso no momento",
    texto: "A vaga está disponível e não está sendo utilizada no momento.",
  },
  {
    valor: "outro",
    titulo: "Outro cenário",
    texto: "Informe detalhes sobre a situação atual da vaga.",
  },
];

const LOCAIS_VAGA = [
  "Térreo",
  "1º Subsolo",
  "2º Subsolo",
  "3º Subsolo",
  "Garagem externa",
  "Cobertura",
  "Outro",
];

const TIPOS_VEICULO = [
  "Automóvel",
  "Moto",
  "SUV",
  "Caminhonete",
  "Van",
  "Outro",
];

const COMBUSTIVEIS = [
  "Flex",
  "Gasolina",
  "Etanol",
  "Diesel",
  "Híbrido",
  "Elétrico",
  "Outro",
];

const PORTAS = ["2 portas", "3 portas", "4 portas", "5 portas"];

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function capitalizarTexto(valor = "") {
  return String(valor)
    .trimStart()
    .toLowerCase()
    .replace(/(^|\s|-|')([\p{L}0-9]+)/gu, (_, sep, palavra) => {
      return `${sep}${palavra.charAt(0).toUpperCase()}${palavra.slice(1)}`;
    });
}

function gerarId(prefixo = "tmp") {
  return `${prefixo}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizarPlaca(valor = "") {
  return String(valor).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function formatarPlaca(valor = "") {
  const limpa = normalizarPlaca(valor);

  if (!limpa) return "";

  if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(limpa)) {
    return limpa;
  }

  if (/^[A-Z]{3}[0-9]{1,4}$/.test(limpa)) {
    return limpa.length > 3 ? `${limpa.slice(0, 3)}-${limpa.slice(3)}` : limpa;
  }

  return limpa;
}

function validarPlaca(valor = "") {
  const limpa = normalizarPlaca(valor);

  return /^[A-Z]{3}[0-9]{4}$/.test(limpa) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(limpa);
}

function validarAno(valor = "") {
  if (!valor) return true;

  const ano = Number(valor);
  const anoAtual = new Date().getFullYear();

  return Number.isInteger(ano) && ano >= 1900 && ano <= anoAtual + 1;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

async function processarImagemLocal(file) {
  if (!file) throw new Error("Arquivo inválido.");

  const tiposPermitidos = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/heic",
    "image/heif",
  ];

  if (!tiposPermitidos.includes(file.type)) {
    throw new Error("Envie uma imagem PNG, JPG, HEIC ou WebP.");
  }

  if (file.size > LIMITE_UPLOAD_FOTO_BYTES) {
    throw new Error(`A imagem deve ter no máximo ${LIMITE_UPLOAD_FOTO_MB}MB.`);
  }

  const previewBase64 = await fileToBase64(file);

  return {
    previewBase64,
    nome: file.name,
    mime: file.type,
    tamanhoEstimado: file.size,
  };
}

function traduzirPerfil(perfil = "") {
  const mapa = {
    proprietario_residente: "Proprietário Residente",
    proprietario_morador: "Proprietário Residente",
    proprietario_nao_residente: "Proprietário Não Residente",
    inquilino: "Morador Inquilino",
    responsavel_unidade_corporativa: "Unidade Corporativa",
    unidade_vazia: "Unidade Vazia",
  };

  return mapa[perfil] || perfil || "Perfil não informado";
}

function obterResumo(dadosWizard, formTela1, formMorador) {
  const pre = dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};

  const perfil =
    formTela1?.perfilUnidade ||
    formTela1?.relacaoUnidade ||
    pre.relacao_unidade ||
    dadosWizard?.perfil_unidade ||
    "";

  return {
    torre:
      pre.torre_nome ||
      pre.torre ||
      pre.bloco_nome ||
      pre.bloco ||
      dadosWizard?.torre ||
      "Torre",
    unidade:
      pre.unidade_nome || pre.unidade || dadosWizard?.unidade || "Unidade",
    perfil: traduzirPerfil(perfil),
    morador:
      formMorador?.nomeSocial ||
      formMorador?.nome_exibicao ||
      formMorador?.nomeCompleto ||
      pre.nome ||
      "Morador responsável",
  };
}

function veiculoDescricao(veiculo = {}) {
  return [veiculo.marca, veiculo.modelo, veiculo.cor, veiculo.ano]
    .filter(Boolean)
    .join(" • ");
}

function situacaoVagaLabel(valor = "") {
  return SITUACOES_VAGA.find((item) => item.valor === valor)?.titulo || "Situação não informada";
}

function faqTela5() {
  return [
    {
      pergunta: "O que são vagas vinculadas?",
      resposta:
        "São vagas de garagem associadas à sua unidade, mesmo que estejam sem uso, alugadas ou utilizadas por autorização.",
    },
    {
      pergunta: "E se meu condomínio usar vagas rotativas?",
      resposta:
        "Selecione a opção “Vagas rotativas”. Você não precisará cadastrar vagas específicas nesta etapa.",
    },
    {
      pergunta: "Posso cadastrar veículos depois?",
      resposta:
        "Sim. Você poderá adicionar, editar ou remover veículos posteriormente no Portal do Morador.",
    },
    {
      pergunta: "Posso cadastrar mais de uma vaga?",
      resposta:
        "Sim. Se sua unidade possuir mais de uma vaga, cadastre todas as vagas vinculadas.",
    },
  ];
}

function montarPayloadTela5({ dadosWizard, estrutura }) {
  const pre = dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};
  const veiculos = Array.isArray(estrutura?.veiculos) ? estrutura.veiculos : [];
  const vagas = Array.isArray(estrutura?.vagas) ? estrutura.vagas : [];

  return {
    business_id: dadosWizard?.business_id || null,
    condominio_id: dadosWizard?.condominio_id || null,
    pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
    unidade_id: pre.unidade_id || dadosWizard?.unidade_id || null,

    garagem_situacao: estrutura?.garagemSituacao || "",
    possui_veiculo: veiculos.length > 0,
    possui_vaga: vagas.length > 0,

    veiculos: veiculos.map((veiculo) => ({
      id: veiculo.id,
      placa: veiculo.placa,
      placa_normalizada: normalizarPlaca(veiculo.placa),
      tipo: veiculo.tipo,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      cor: veiculo.cor,
      ano: veiculo.ano || null,
      combustivel: veiculo.combustivel || "",
      portas: veiculo.portas || "",
      foto_base64: veiculo.foto_base64 || null,
      foto_nome: veiculo.foto_nome || null,
      foto_mime: veiculo.foto_mime || null,
      foto_tamanho: veiculo.foto_tamanho || null,
      status: "PENDENTE",
    })),

    vagas: vagas.map((vaga) => ({
      id: vaga.id,
      identificacao: vaga.identificacao,
      local: vaga.local,
      situacao: vaga.situacao,
      observacoes: vaga.observacoes || "",
      id_veiculo: vaga.idVeiculo || null,
      status: "PENDENTE",
    })),

    etapa_atual: 5,
    atualizado_em: new Date().toISOString(),
  };
}

export default function WizardMoradorTela5({
  dadosWizard,
  formTela1,
  formMorador,
  estrutura = estruturaInicial,
  setEstrutura,
  onBack,
  onNext,
  onSaveDraft,
}) {
  const estruturaSegura = {
    ...estruturaInicial,
    ...(estrutura || {}),
    veiculos: Array.isArray(estrutura?.veiculos) ? estrutura.veiculos : [],
    vagas: Array.isArray(estrutura?.vagas) ? estrutura.vagas : [],
  };

  const veiculos = estruturaSegura.veiculos;
  const vagas = estruturaSegura.vagas;

  const [modalVeiculoAberto, setModalVeiculoAberto] = useState(false);
  const [modalVagaAberto, setModalVagaAberto] = useState(false);
  const [veiculoAtual, setVeiculoAtual] = useState(null);
  const [vagaAtual, setVagaAtual] = useState(null);
  const [retornarParaModalVaga, setRetornarParaModalVaga] = useState(false);
  const [camposInvalidos, setCamposInvalidos] = useState({});
  const [modalExcluirVeiculo, setModalExcluirVeiculo] = useState(null);
  const [modalExcluirVaga, setModalExcluirVaga] = useState(null);

  const resumo = useMemo(
    () => obterResumo(dadosWizard, formTela1, formMorador),
    [dadosWizard, formTela1, formMorador]
  );

  function atualizarEstrutura(dados) {
    setEstrutura({
      ...estruturaSegura,
      ...dados,
    });
  }

  function selecionarSituacaoGaragem(valor) {
    atualizarEstrutura({
      garagemSituacao: valor,
      possuiVaga: valor === "possui_vaga",
      vagas: valor === "possui_vaga" ? vagas : [],
    });
  }

  function abrirNovoVeiculo({ voltarParaVaga = false } = {}) {
    setVeiculoAtual({ ...veiculoInicial, id: gerarId("vei") });
    setCamposInvalidos({});
    setRetornarParaModalVaga(Boolean(voltarParaVaga));
    setModalVeiculoAberto(true);
  }

  function editarVeiculo(veiculo) {
    setVeiculoAtual({ ...veiculoInicial, ...veiculo });
    setCamposInvalidos({});
    setRetornarParaModalVaga(false);
    setModalVeiculoAberto(true);
  }

  function fecharModalVeiculo() {
    setVeiculoAtual(null);
    setCamposInvalidos({});
    setModalVeiculoAberto(false);
    setRetornarParaModalVaga(false);
  }

  function abrirNovaVaga() {
    setVagaAtual({ ...vagaInicial, id: gerarId("vaga") });
    setCamposInvalidos({});
    setModalVagaAberto(true);
  }

  function editarVaga(vaga) {
    setVagaAtual({ ...vagaInicial, ...vaga });
    setCamposInvalidos({});
    setModalVagaAberto(true);
  }

  function fecharModalVaga() {
    setVagaAtual(null);
    setCamposInvalidos({});
    setModalVagaAberto(false);
  }

  function validarVeiculo(veiculo) {
    const invalidos = {};

    if (!validarPlaca(veiculo?.placa || "")) invalidos.placa = true;
    if (!veiculo?.tipo) invalidos.tipo = true;
    if (!veiculo?.marca?.trim()) invalidos.marca = true;
    if (!veiculo?.modelo?.trim()) invalidos.modelo = true;
    if (!veiculo?.cor?.trim()) invalidos.cor = true;

    if (veiculo?.ano && !validarAno(veiculo.ano)) {
      invalidos.ano = true;
      toast.error("Informe um ano válido.");
    }

    const placaNormalizada = normalizarPlaca(veiculo?.placa || "");
    const placaDuplicada = veiculos.some(
      (item) =>
        item.id !== veiculo.id &&
        normalizarPlaca(item.placa) === placaNormalizada
    );

    if (placaDuplicada) {
      invalidos.placa = true;
      toast.error("Esta placa já foi cadastrada.");
    }

    setCamposInvalidos(invalidos);

    if (Object.keys(invalidos).length > 0) {
      toast.error("Preencha os dados obrigatórios do veículo.");
      return false;
    }

    return true;
  }

  function salvarVeiculo() {
    if (!validarVeiculo(veiculoAtual)) return;

    const veiculoFinal = {
      ...veiculoAtual,
      placa: formatarPlaca(veiculoAtual.placa),
      marca: capitalizarTexto(veiculoAtual.marca || ""),
      modelo: capitalizarTexto(veiculoAtual.modelo || ""),
      cor: capitalizarTexto(veiculoAtual.cor || ""),
    };

    const novaLista = veiculos.some((item) => item.id === veiculoFinal.id)
      ? veiculos.map((item) => (item.id === veiculoFinal.id ? veiculoFinal : item))
      : [...veiculos, veiculoFinal];

    atualizarEstrutura({
      veiculos: novaLista,
      possuiVeiculo: novaLista.length > 0,
    });

    toast.success("Veículo salvo com sucesso.");

    setModalVeiculoAberto(false);
    setVeiculoAtual(null);

    if (retornarParaModalVaga) {
      setVagaAtual((old) => ({
        ...(old || vagaInicial),
        idVeiculo: veiculoFinal.id,
      }));

      setModalVagaAberto(true);
      setRetornarParaModalVaga(false);
    }
  }

  function excluirVeiculo(id) {
    const novaLista = veiculos.filter((item) => item.id !== id);
    const novasVagas = vagas.map((vaga) =>
      vaga.idVeiculo === id ? { ...vaga, idVeiculo: "" } : vaga
    );

    atualizarEstrutura({
      veiculos: novaLista,
      possuiVeiculo: novaLista.length > 0,
      vagas: novasVagas,
    });

    setModalExcluirVeiculo(null);
    toast.success("Veículo removido.");
  }

  function validarVaga(vaga) {
    const invalidos = {};

    if (!vaga?.situacao) invalidos.situacao = true;
    if (!vaga?.identificacao?.trim()) invalidos.identificacao = true;
    if (!vaga?.local) invalidos.local = true;

    const vagaDuplicada = vagas.some(
      (item) =>
        item.id !== vaga.id &&
        item.identificacao?.trim().toUpperCase() ===
          vaga.identificacao?.trim().toUpperCase() &&
        item.local === vaga.local
    );

    if (vagaDuplicada) {
      invalidos.identificacao = true;
      toast.error("Esta vaga já foi cadastrada neste local.");
    }

    setCamposInvalidos(invalidos);

    if (Object.keys(invalidos).length > 0) {
      toast.error("Preencha os dados obrigatórios da vaga.");
      return false;
    }

    return true;
  }
  
  function salvarVaga({ adicionarOutra = false } = {}) {
    if (!validarVaga(vagaAtual)) return;

    const vagaFinal = {
      ...vagaAtual,
      identificacao: String(vagaAtual.identificacao || "")
        .trim()
        .toUpperCase(),
      observacoes: String(vagaAtual.observacoes || "").trim(),
    };

    const novaLista = vagas.some((item) => item.id === vagaFinal.id)
      ? vagas.map((item) => (item.id === vagaFinal.id ? vagaFinal : item))
      : [...vagas, vagaFinal];

    atualizarEstrutura({
      garagemSituacao: "possui_vaga",
      possuiVaga: true,
      vagas: novaLista,
    });

    toast.success("Vaga salva com sucesso.");

    if (adicionarOutra) {
      setVagaAtual({
        ...vagaInicial,
        id: gerarId("vaga"),
      });

      setCamposInvalidos({});
      return;
    }

    fecharModalVaga();
  }

  function excluirVaga(id) {
    const novaLista = vagas.filter((item) => item.id !== id);

    atualizarEstrutura({
      vagas: novaLista,
      possuiVaga: novaLista.length > 0,
    });

    setModalExcluirVaga(null);
    toast.success("Vaga removida.");
  }

  async function salvarRascunho() {
    await onSaveDraft(
      montarPayloadTela5({
        dadosWizard,
        estrutura: estruturaSegura,
      })
    );

    toast.success("Rascunho salvo com sucesso.");
  }

  async function avancar() {
    if (!estruturaSegura?.garagemSituacao) {
      toast.error("Informe se a unidade possui vaga de garagem.");
      return;
    }

    if (
      estruturaSegura.garagemSituacao === "possui_vaga" &&
      vagas.length === 0
    ) {
      toast.error("Cadastre pelo menos uma vaga.");
      return;
    }

    await onNext(
      montarPayloadTela5({
        dadosWizard,
        estrutura: estruturaSegura,
      })
    );
  }

  function veiculosDisponiveisParaVaga(idVagaAtual) {
    return veiculos.filter((veiculo) => {
      const vinculadoEmOutraVaga = vagas.some(
        (vaga) =>
          vaga.id !== idVagaAtual &&
          vaga.idVeiculo === veiculo.id
      );

      return !vinculadoEmOutraVaga;
    });
  }

  return (
    <>
      <div className="wm-t5-page">
        <section className="wm-t5-card">
          <header className="wm-t5-title-row">
            <div className="wm-t5-title">
              <span className="wm-t5-step">5</span>

              <div>
                <h1>Veículos e garagem</h1>

                <p>
                  Cadastre os veículos utilizados pela unidade e informe as
                  vagas vinculadas atualmente.
                </p>
              </div>
            </div>

            <div className="wm-t5-safe-card">
              <ShieldCheck size={34} />

              <strong>
                Suas informações estão protegidas e poderão ser atualizadas
                posteriormente no Portal do Morador.
              </strong>
            </div>
          </header>

          <div className="wm-t5-divider" />

          <section className="wm-t5-summary">
            <div>
              <span>Torre / Bloco</span>
              <strong>{resumo.torre}</strong>
            </div>

            <div>
              <span>Unidade</span>
              <strong>{resumo.unidade}</strong>
            </div>

            <div>
              <span>Perfil</span>
              <strong>{resumo.perfil}</strong>
            </div>

            <div>
              <span>Responsável</span>
              <strong>{resumo.morador}</strong>
            </div>
          </section>

          <section className="wm-t5-garage-question">
            <div className="wm-t5-section-head">
              <h2>A unidade possui vaga(s) de garagem?</h2>

              <p>
                Informe como funciona atualmente na sua unidade.
              </p>
            </div>

            <div className="wm-t5-option-grid">
              {OPCOES_GARAGEM.map((opcao) => {
                const Icon = opcao.icon;
                const ativo =
                  estruturaSegura?.garagemSituacao === opcao.valor;

                return (
                  <button
                    key={opcao.valor}
                    type="button"
                    className={`wm-t5-garage-option ${
                      ativo ? "active" : ""
                    }`}
                    onClick={() =>
                      selecionarSituacaoGaragem(opcao.valor)
                    }
                  >
                    <span className="wm-t5-option-radio" />

                    <i>
                      <Icon size={34} />
                    </i>

                    <strong>{opcao.titulo}</strong>

                    <small>{opcao.texto}</small>
                  </button>
                );
              })}
            </div>
          </section>
          <div className="wm-t5-main-grid">
            <section className="wm-t5-left">
              <article className="wm-t5-content-card">
                <div className="wm-t5-card-head">
                  <div>
                    <h2>Veículos da unidade</h2>

                    <p>
                      Cadastre os veículos utilizados atualmente pela unidade.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="wm-t5-add-btn"
                    onClick={() => abrirNovoVeiculo()}
                  >
                    <Plus size={16} />
                    Adicionar veículo
                  </button>
                </div>

                <div className="wm-t5-hero">
                  <img
                    src={veiculoUnidadeImg}
                    alt="Veículos da unidade"
                  />
                </div>

                {veiculos.length > 0 ? (
                  <div className="wm-t5-items-grid">
                    {veiculos.map((veiculo) => {
                      const vinculado = vagas.find(
                        (vaga) => vaga.idVeiculo === veiculo.id
                      );

                      return (
                        <article
                          key={veiculo.id}
                          className="wm-t5-item-card"
                        >
                          <div className="wm-t5-item-top">
                            <div>
                              <strong>{veiculo.placa}</strong>

                              <span>
                                {[veiculo.tipo, veiculoDescricao(veiculo)]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </span>
                            </div>

                            <Car size={26} />
                          </div>

                          <div className="wm-t5-item-tags">
                            {vinculado ? (
                              <small className="linked">
                                Vinculado à vaga{" "}
                                {vinculado.identificacao}
                              </small>
                            ) : (
                              <small className="free">
                                Sem vaga vinculada
                              </small>
                            )}
                          </div>

                          <div className="wm-t5-item-actions">
                            <button
                              type="button"
                              onClick={() =>
                                editarVeiculo(veiculo)
                              }
                            >
                              <Edit3 size={14} />
                              Editar
                            </button>

                            <button
                              type="button"
                              className="danger"
                              onClick={() =>
                                setModalExcluirVeiculo(veiculo)
                              }
                            >
                              <Trash2 size={14} />
                              Excluir
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="wm-t5-empty">
                    <Car size={34} />

                    <strong>
                      Nenhum veículo cadastrado
                    </strong>

                    <p>
                      Você poderá cadastrar agora ou posteriormente
                      no Portal do Morador.
                    </p>
                  </div>
                )}
              </article>

              <article className="wm-t5-content-card">
                <div className="wm-t5-card-head">
                  <div>
                    <h2>Vagas de garagem vinculadas</h2>

                    <p>
                      Cadastre as vagas utilizadas atualmente pela
                      unidade.
                    </p>
                  </div>

                  {estruturaSegura?.garagemSituacao ===
                  "possui_vaga" ? (
                    <button
                      type="button"
                      className="wm-t5-add-btn"
                      onClick={abrirNovaVaga}
                    >
                      <Plus size={16} />
                      Adicionar vaga
                    </button>
                  ) : null}
                </div>

                <div className="wm-t5-hero">
                  <img
                    src={vagasGaragemImg}
                    alt="Vagas de garagem"
                  />
                </div>

                {estruturaSegura?.garagemSituacao ===
                "rotativa" ? (
                  <div className="wm-t5-note-card blue">
                    <RotateCcw size={20} />

                    <div>
                      <strong>
                        Vagas rotativas identificadas
                      </strong>

                      <p>
                        Este condomínio utiliza vagas rotativas
                        ou não vinculadas diretamente à unidade.
                      </p>
                    </div>
                  </div>
                ) : null}

                {estruturaSegura?.garagemSituacao ===
                "nao_possui" ? (
                  <div className="wm-t5-note-card">
                    <ParkingCircle size={20} />

                    <div>
                      <strong>
                        Unidade sem vaga vinculada
                      </strong>

                      <p>
                        Nenhuma vaga será vinculada à unidade
                        neste momento.
                      </p>
                    </div>
                  </div>
                ) : null}

                {estruturaSegura?.garagemSituacao ===
                "nao_sei" ? (
                  <div className="wm-t5-note-card">
                    <HelpCircle size={20} />

                    <div>
                      <strong>Informação pendente</strong>

                      <p>
                        Você poderá atualizar as informações da
                        garagem posteriormente.
                      </p>
                    </div>
                  </div>
                ) : null}
                {estruturaSegura?.garagemSituacao ===
                  "possui_vaga" && vagas.length > 0 ? (
                  <div className="wm-t5-items-grid">
                    {vagas.map((vaga) => {
                      const veiculo = veiculos.find(
                        (item) => item.id === vaga.idVeiculo
                      );

                      return (
                        <article key={vaga.id} className="wm-t5-item-card">
                          <div className="wm-t5-item-top">
                            <div>
                              <strong>{vaga.identificacao}</strong>

                              <span>
                                {[vaga.local, situacaoVagaLabel(vaga.situacao)]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </span>
                            </div>

                            <ParkingCircle size={26} />
                          </div>

                          <div className="wm-t5-item-tags">
                            {veiculo ? (
                              <small className="linked">
                                Veículo: {veiculo.placa}
                              </small>
                            ) : (
                              <small className="free">
                                Nenhum veículo vinculado
                              </small>
                            )}
                          </div>

                          {vaga.observacoes ? (
                            <div className="wm-t5-observation">
                              {vaga.observacoes}
                            </div>
                          ) : null}

                          <div className="wm-t5-item-actions">
                            <button
                              type="button"
                              onClick={() => editarVaga(vaga)}
                            >
                              <Edit3 size={14} />
                              Editar
                            </button>

                            <button
                              type="button"
                              className="danger"
                              onClick={() => setModalExcluirVaga(vaga)}
                            >
                              <Trash2 size={14} />
                              Excluir
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            </section>

            <aside className="wm-t5-right">
              <section className="wm-t5-side-card wm-t5-highlight">
                <span className="wm-t5-side-icon orange">
                  <Building2 size={22} />
                </span>

                <h3>Estrutura da unidade</h3>

                <p>
                  Finalize informações operacionais da unidade para melhorar o
                  fluxo condominial.
                </p>

                <div className="wm-t5-mini-tags">
                  <small>Veículos</small>
                  <small>Vagas</small>
                  <small>Estrutura</small>
                </div>
              </section>

              <section className="wm-t5-side-card">
                <span className="wm-t5-side-icon">
                  <ShieldCheck size={22} />
                </span>

                <h3>Boas práticas</h3>

                <ul>
                  <li>Cadastre veículos corretamente quando aplicável.</li>
                  <li>Informe vagas vinculadas à unidade.</li>
                  <li>Veículos vinculados a uma vaga não aparecem em outra.</li>
                  <li>Essas informações ajudam em futuras integrações operacionais.</li>
                </ul>
              </section>

              <section className="wm-t5-side-card">
                <span className="wm-t5-side-icon orange">
                  <Info size={22} />
                </span>

                <h3>Orientações úteis</h3>

                <p>
                  Se a garagem for rotativa ou você não souber informar agora,
                  poderá atualizar depois no Portal do Morador.
                </p>
              </section>

              <section className="wm-t5-side-card">
                <h3>Dúvidas frequentes</h3>

                <div className="wm-t5-faq-list">
                  {faqTela5().map((item) => (
                    <details key={item.pergunta}>
                      <summary>{item.pergunta}</summary>
                      <p>{item.resposta}</p>
                    </details>
                  ))}
                </div>

                <div className="wm-t5-info-footer">
                  <Info size={16} />

                  <span>
                    Dados complementares ajudam na experiência, mas o foco
                    principal continua sendo encomendas.
                  </span>
                </div>
              </section>
            </aside>
          </div>

          <footer className="wm-t5-actions">
            <button type="button" className="secondary" onClick={onBack}>
              <ArrowLeft size={16} />
              Voltar
            </button>

            <button type="button" className="outline" onClick={salvarRascunho}>
              <Save size={16} />
              Salvar e continuar depois
            </button>

            <button type="button" className="primary" onClick={avancar}>
              Salvar e continuar
              <ArrowRight size={18} />
            </button>
          </footer>
        </section>
      </div>
      {modalVeiculoAberto ? (
        <ModalVeiculo
          veiculo={veiculoAtual}
          setVeiculo={setVeiculoAtual}
          camposInvalidos={camposInvalidos}
          onClose={fecharModalVeiculo}
          onSave={salvarVeiculo}
        />
      ) : null}

      {modalVagaAberto ? (
        <ModalVaga
          vaga={vagaAtual}
          setVaga={setVagaAtual}
          camposInvalidos={camposInvalidos}
          veiculosDisponiveis={veiculosDisponiveisParaVaga(vagaAtual?.id)}
          veiculos={veiculos}
          onClose={fecharModalVaga}
          onSave={(opcoes) => salvarVaga(opcoes)}
          onCreateVehicle={() => {
            setModalVagaAberto(false);
            abrirNovoVeiculo({ voltarParaVaga: true });
          }}
        />
      ) : null}

      {modalExcluirVeiculo ? (
        <ModalConfirmacao
          titulo="Excluir veículo?"
          texto={`Deseja remover o veículo ${modalExcluirVeiculo.placa}?`}
          onClose={() => setModalExcluirVeiculo(null)}
          onConfirm={() => excluirVeiculo(modalExcluirVeiculo.id)}
        />
      ) : null}

      {modalExcluirVaga ? (
        <ModalConfirmacao
          titulo="Excluir vaga?"
          texto={`Deseja remover a vaga ${modalExcluirVaga.identificacao}?`}
          onClose={() => setModalExcluirVaga(null)}
          onConfirm={() => excluirVaga(modalExcluirVaga.id)}
        />
      ) : null}
    </>
  );
}

function ModalVaga({
  vaga,
  setVaga,
  camposInvalidos,
  veiculosDisponiveis,
  veiculos,
  onClose,
  onSave,
  onCreateVehicle,
}) {
  function atualizar(campo, valor) {
    setVaga((old) => ({ ...old, [campo]: valor }));
  }

  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-t5-modal">
        <header className="wm-t5-modal-head">
          <div>
            <h2>Adicionar vaga de garagem</h2>
            <p>Informe a situação de uso, identificação, local e veículo vinculado.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </header>

        <div className="wm-t5-modal-body">
          <section className="wm-t5-modal-section">
            <h3>1. Como esta vaga está sendo utilizada?</h3>

            <div className="wm-t5-situation-grid">
              {SITUACOES_VAGA.map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  className={`wm-t5-situation-card ${
                    vaga?.situacao === opcao.valor ? "active" : ""
                  } ${camposInvalidos.situacao ? "invalid" : ""}`}
                  onClick={() => atualizar("situacao", opcao.valor)}
                >
                  <span />
                  <strong>{opcao.titulo}</strong>
                  <small>{opcao.texto}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="wm-t5-modal-section">
            <h3>2. Identificação da vaga</h3>

            <div className="wm-t5-modal-grid two">
              <Field
                label="Número / código da vaga *"
                value={vaga?.identificacao}
                onChange={(v) => atualizar("identificacao", v.toUpperCase())}
                invalid={camposInvalidos.identificacao}
                placeholder="Ex.: 12A, B-08, G2-14"
              />

              <label className="wm-t5-field">
                <span>Local da vaga *</span>

                <select
                  value={vaga?.local || ""}
                  onChange={(e) => atualizar("local", e.target.value)}
                  className={camposInvalidos.local ? "invalid" : ""}
                >
                  <option value="">Selecione</option>
                  {LOCAIS_VAGA.map((local) => (
                    <option key={local} value={local}>
                      {local}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="wm-t5-field">
              <span>Observações (opcional)</span>

              <textarea
                value={vaga?.observacoes || ""}
                onChange={(e) => atualizar("observacoes", e.target.value)}
                placeholder="Ex.: vaga próxima ao elevador, vaga alugada de outro morador, detalhe importante etc."
              />
            </label>
          </section>

                    {[
            "propria_em_uso",
            "uso_vaga_terceiro",
            "outro",
          ].includes(vaga?.situacao) ? (
            <section className="wm-t5-modal-section">
              <h3>3. Veículo vinculado à vaga</h3>

              {veiculos.length > 0 ? (
                <label className="wm-t5-field">
                  <span>Selecionar veículo disponível</span>

                  <select
                    value={vaga?.idVeiculo || ""}
                    onChange={(e) =>
                      atualizar("idVeiculo", e.target.value)
                    }
                  >
                    <option value="">
                      Nenhum veículo vinculado
                    </option>

                    {veiculosDisponiveis.map((veiculo) => (
                      <option
                        key={veiculo.id}
                        value={veiculo.id}
                      >
                        {veiculo.placa} —{" "}
                        {veiculoDescricao(veiculo)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="wm-t5-empty small">
                  <Car size={26} />

                  <strong>
                    Nenhum veículo cadastrado
                  </strong>

                  <p>
                    Cadastre um veículo para vincular
                    a esta vaga.
                  </p>
                </div>
              )}

              <button
                type="button"
                className="wm-t5-create-vehicle"
                onClick={onCreateVehicle}
              >
                <Plus size={16} />
                Cadastrar novo veículo
              </button>
            </section>
          ) : null}
        </div>

        <footer className="wm-t5-modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>

          <button
            type="button"
            className="outline"
            onClick={() => onSave({ adicionarOutra: true })}
          >
            Salvar vaga + adicionar outra
          </button>

          <button type="button" className="primary" onClick={() => onSave()}>
            Salvar vaga
            <Check size={15} />
          </button>
        </footer>
      </div>
    </div>
  );
}

function ModalVeiculo({ veiculo, setVeiculo, camposInvalidos, onClose, onSave }) {
  const inputFotoRef = useRef(null);
  const inputCameraRef = useRef(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);

  function atualizar(campo, valor) {
    setVeiculo((old) => {
      const novo = {
        ...old,
        [campo]: valor,
      };

      if (campo === "tipo" && valor === "Moto") {
        novo.portas = "";
      }

      return novo;
    });
  }

  async function selecionarFoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setProcessandoFoto(true);
      const foto = await processarImagemLocal(file);

      atualizar("foto_base64", foto.previewBase64);
      atualizar("foto_nome", foto.nome);
      atualizar("foto_mime", foto.mime);
      atualizar("foto_tamanho", foto.tamanhoEstimado);

      toast.success("Foto processada com sucesso.");
    } catch (error) {
      toast.error(error.message || "Não foi possível processar a foto.");
    } finally {
        setProcessandoFoto(false);

        if (inputFotoRef.current) inputFotoRef.current.value = "";
        if (inputCameraRef.current) inputCameraRef.current.value = "";
      }
  }

  function removerFoto() {
    atualizar("foto_base64", "");
    atualizar("foto_nome", "");
    atualizar("foto_mime", "");
    atualizar("foto_tamanho", "");
  }

  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-t5-modal wm-t5-modal-vehicle">
        <header className="wm-t5-modal-head">
          <div>
            <h2>Adicionar veículo</h2>
            <p>Informe os dados principais do veículo vinculado à unidade.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </header>

        <div className="wm-t5-modal-body">
          <section className="wm-t5-modal-section">
            <h3>1. Dados do veículo</h3>

            <div className="wm-t5-modal-grid two">
              <Field
                label="Placa *"
                value={veiculo?.placa}
                onChange={(v) => atualizar("placa", formatarPlaca(v))}
                invalid={camposInvalidos.placa}
                placeholder="ABC-1234 ou ABC1D23"
              />

              <label className="wm-t5-field">
                <span>Tipo *</span>

                <select
                  value={veiculo?.tipo || ""}
                  onChange={(e) => atualizar("tipo", e.target.value)}
                  className={camposInvalidos.tipo ? "invalid" : ""}
                >
                  <option value="">Selecione</option>
                  {TIPOS_VEICULO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="wm-t5-modal-grid two">
              <Field
                label="Marca *"
                value={veiculo?.marca}
                onChange={(v) => atualizar("marca", v)}
                invalid={camposInvalidos.marca}
                placeholder="Ex.: Honda"
              />

              <Field
                label="Modelo *"
                value={veiculo?.modelo}
                onChange={(v) => atualizar("modelo", v)}
                invalid={camposInvalidos.modelo}
                placeholder="Ex.: Civic"
              />
            </div>

            <div className="wm-t5-modal-grid three">
              <Field
                label="Cor *"
                value={veiculo?.cor}
                onChange={(v) => atualizar("cor", v)}
                invalid={camposInvalidos.cor}
                placeholder="Ex.: Prata"
              />

              <Field
                label="Ano (opcional)"
                value={veiculo?.ano}
                onChange={(v) => atualizar("ano", somenteNumeros(v).slice(0, 4))}
                invalid={camposInvalidos.ano}
                inputMode="numeric"
                placeholder="2024"
              />

              <label className="wm-t5-field">
                <span>Combustível</span>

                <select
                  value={veiculo?.combustivel || ""}
                  onChange={(e) => atualizar("combustivel", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {COMBUSTIVEIS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {veiculo?.tipo !== "Moto" ? (
              <label className="wm-t5-field">
                <span>Portas</span>

                <select
                  value={veiculo?.portas || ""}
                  onChange={(e) => atualizar("portas", e.target.value)}
                >
                  <option value="">Selecione</option>
                  {PORTAS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </section>

          <section className="wm-t5-modal-section">
            <h3>2. Foto do veículo</h3>

            <div className="wm-t5-vehicle-preview">
              {veiculo?.foto_base64 ? (
                <img src={veiculo.foto_base64} alt="Foto do veículo" />
              ) : (
                <Car size={52} />
              )}
            </div>

            <p className="wm-t5-modal-help">
              O sistema poderá usar uma imagem ilustrativa automática baseada na descrição.
              Você também pode enviar uma foto real.
            </p>

            <div className="wm-t5-photo-actions">
              <button
                type="button"
                className="wm-t5-create-vehicle"
                onClick={() => inputFotoRef.current?.click()}
                disabled={processandoFoto}
              >
                <Upload size={16} />
                {processandoFoto ? "Processando..." : "Escolher arquivo"}
              </button>

              <button
                type="button"
                className="wm-t5-clear-btn"
                onClick={() => inputCameraRef.current?.click()}
                disabled={processandoFoto}
              >
                Tirar foto
              </button>

              {veiculo?.foto_base64 ? (
                <button
                  type="button"
                  className="wm-t5-clear-btn"
                  onClick={removerFoto}
                >
                  Remover foto
                </button>
              ) : null}

              <input
                ref={inputFotoRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,image/*"
                onChange={selecionarFoto}
                hidden
              />

              <input
                ref={inputCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={selecionarFoto}
                hidden
              />
            </div>
          </section>
        </div>

        <footer className="wm-t5-modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>

          <button type="button" className="primary" onClick={onSave}>
            Salvar veículo
            <Check size={15} />
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, invalid, placeholder, inputMode }) {
  return (
    <label className="wm-t5-field">
      <span>{label}</span>

      <input
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        className={invalid ? "invalid" : ""}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete="off"
      />
    </label>
  );
}

function ModalConfirmacao({ titulo, texto, onClose, onConfirm }) {
  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-modal-card">
        <button type="button" className="wm-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <h2>{titulo}</h2>
        <p>{texto}</p>

        <div className="wm-modal-actions">
          <button type="button" className="wm-modal-primary" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}