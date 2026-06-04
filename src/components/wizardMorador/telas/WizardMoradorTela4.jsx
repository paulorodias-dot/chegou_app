import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Edit3,
  IdCard,
  Info,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import "../../../styles/wizardMorador/WizardMoradorTela4.css";

const LIMITE_UPLOAD_FOTO_MB = 5;
const LIMITE_UPLOAD_FOTO_BYTES = LIMITE_UPLOAD_FOTO_MB * 1024 * 1024;

const TIPOS_FUNCAO = [
  "Babá",
  "Cuidador(a)",
  "Diarista",
  "Empregado(a) doméstico(a)",
  "Motorista particular",
  "Acompanhante",
  "Personal trainer",
  "Professor(a) particular",
  "Jardineiro particular",
  "Outro funcionário do lar",
];

const TIPOS_PET = [
  "Cachorro",
  "Gato",
  "Pássaro",
  "Peixe",
  "Coelho",
  "Hamster",
  "Tartaruga",
  "Outro",
];

const PORTES_PET = ["Pequeno", "Médio", "Grande", "Não se aplica"];

const funcionarioInicial = {
  id: null,
  nome: "",
  funcao: "",
  cpf: "",
  cpf_pendente_validacao: false,
  tentativas_cpf_invalidas: 0,
  ddi: "+55",
  whatsapp: "",
  email: "",
  foto_base64: "",
  foto_nome: "",
  foto_mime: "",
  foto_tamanho: "",
  autorizado_acesso_condominio: false,
  autorizado_receber_orientacoes: false,
  observacoes: "",
  status: "PENDENTE",
};

const petInicial = {
  id: null,
  nome: "",
  tipo: "",
  raca: "",
  porte: "",
  cor: "",
  foto_base64: "",
  foto_nome: "",
  foto_mime: "",
  foto_tamanho: "",
  observacoes: "",
  status: "PENDENTE",
};

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function normalizarDDI(valor = "") {
  const limpo = somenteNumeros(valor).slice(0, 4);
  return limpo ? `+${limpo}` : "+55";
}

function obterDDINumerico(valor = "") {
  return somenteNumeros(valor || "+55") || "55";
}

function formatarTelefoneBrasil(valor = "") {
  const numeros = somenteNumeros(valor).slice(0, 11);

  if (!numeros) return "";
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarTelefoneInternacional({ ddi = "+55", numero = "" }) {
  const ddiNumerico = obterDDINumerico(ddi);
  const numeroLimpo = somenteNumeros(numero);

  if (!numeroLimpo) return "";

  if (ddiNumerico === "55") {
    return formatarTelefoneBrasil(numeroLimpo);
  }

  return numeroLimpo.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

function montarTelefoneE164({ ddi = "+55", numero = "" }) {
  const ddiNumerico = obterDDINumerico(ddi);
  const telefoneNumerico = somenteNumeros(numero);

  if (!telefoneNumerico) return "";

  return `+${ddiNumerico}${telefoneNumerico}`;
}
function capitalizarNome(valor = "") {
  const minusculas = new Set(["da", "de", "do", "das", "dos", "e"]);

  return String(valor)
    .trimStart()
    .toLowerCase()
    .replace(/(^|\s|-|')([\p{L}]+)/gu, (_, sep, palavra) => {
      if (sep === " " && minusculas.has(palavra)) return `${sep}${palavra}`;
      return `${sep}${palavra.charAt(0).toUpperCase()}${palavra.slice(1)}`;
    });
}

function primeiroNome(nome = "") {
  return nome.trim().split(/\s+/)[0] || "Funcionário";
}

function iniciais(nome = "") {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return `${partes[0]?.[0] || "F"}${partes[1]?.[0] || ""}`.toUpperCase();
}

function formatarCpf(valor = "") {
  const v = somenteNumeros(valor).slice(0, 11);

  return v
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function validarCpf(cpf = "") {
  const valor = somenteNumeros(cpf);

  if (!valor) return true;
  if (valor.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(valor)) return false;

  let soma = 0;

  for (let i = 0; i < 9; i += 1) {
    soma += Number(valor[i]) * (10 - i);
  }

  let digito = 11 - (soma % 11);
  if (digito >= 10) digito = 0;
  if (digito !== Number(valor[9])) return false;

  soma = 0;

  for (let i = 0; i < 10; i += 1) {
    soma += Number(valor[i]) * (11 - i);
  }

  digito = 11 - (soma % 11);
  if (digito >= 10) digito = 0;

  return digito === Number(valor[10]);
}

function validarEmail(email = "") {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function gerarId() {
  return `func-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mascararToken(token = "") {
  const limpo = String(token).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (!limpo) return "PEN-NÃO-INFORMADO";

  const miolo = limpo.slice(0, 9);
  return `PEN-${miolo.slice(0, 3)}-${miolo.slice(3, 6)}-${miolo.slice(6, 9)}`;
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
  const condominio = dadosWizard?.condominio || {};

  const perfil =
    formTela1?.perfilUnidade ||
    pre.relacao_unidade ||
    dadosWizard?.perfil_unidade ||
    "";

  const nomeExibicao =
    formMorador?.nomeSocial ||
    formMorador?.nome_exibicao ||
    formMorador?.nomeCompleto ||
    pre.nome ||
    "Não informado";

  return {
    condominio:
      condominio.nome_fantasia ||
      condominio.nome ||
      dadosWizard?.nome_condominio ||
      "Condomínio",
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
    morador: nomeExibicao,
    cpf: formMorador?.cpf || pre.cpf || "",
    token:
      dadosWizard?.token_publico ||
      dadosWizard?.codigo_convite ||
      dadosWizard?.token ||
      "Token não informado",
  };
}
async function processarImagemLocal(file) {
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

  const dataUrlOriginal = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível carregar a foto."));

    reader.readAsDataURL(file);
  });

  const imagem = await new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível processar a imagem."));

    img.src = dataUrlOriginal;
  });

  const maxLado = 1024;
  const proporcao = Math.min(maxLado / imagem.width, maxLado / imagem.height, 1);
  const largura = Math.round(imagem.width * proporcao);
  const altura = Math.round(imagem.height * proporcao);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(imagem, 0, 0, largura, altura);

  const webpBase64 = canvas.toDataURL("image/webp", 0.86);
  const nomeBase = file.name.replace(/\.[^/.]+$/, "") || "foto-funcionario-lar";

  return {
    previewBase64: webpBase64,
    nome: `${nomeBase}.webp`,
    mime: "image/webp",
    tamanhoEstimado: Math.round((webpBase64.length * 3) / 4),
  };
}

function montarPayloadTela4({ dadosWizard, ecossistema }) {
  const pre = dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};
  const funcionariosLar = Array.isArray(ecossistema?.funcionariosLar)
    ? ecossistema.funcionariosLar
    : [];

  const pets = Array.isArray(ecossistema?.pets) ? ecossistema.pets : [];

  return {
    business_id: dadosWizard?.business_id || null,
    condominio_id: dadosWizard?.condominio_id || null,
    pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
    unidade_id: pre.unidade_id || dadosWizard?.unidade_id || null,

    possui_funcionarios_lar: Boolean(ecossistema?.possuiFuncionarioLar),
    funcionarios_lar: funcionariosLar.map((funcionario) => {
      const telefoneE164 = montarTelefoneE164({
        ddi: funcionario.ddi || "+55",
        numero: funcionario.whatsapp,
      });

      return {
        id: funcionario.id,
        nome: funcionario.nome,
        funcao: funcionario.funcao,
        cpf: somenteNumeros(funcionario.cpf),
        cpf_formatado: funcionario.cpf,
        cpf_pendente_validacao: funcionario.cpf_pendente_validacao,

        ddi: obterDDINumerico(funcionario.ddi || "+55"),
        whatsapp: somenteNumeros(funcionario.whatsapp),
        whatsapp_e164: telefoneE164,
        email: funcionario.email?.trim().toLowerCase() || "",

        foto_base64: funcionario.foto_base64 || null,
        foto_nome: funcionario.foto_nome || null,
        foto_mime: funcionario.foto_mime || null,
        foto_tamanho: funcionario.foto_tamanho || null,

        autorizado_acesso_condominio: Boolean(funcionario.autorizado_acesso_condominio),
        autorizado_receber_orientacoes: Boolean(funcionario.autorizado_receber_orientacoes),
        observacoes: funcionario.observacoes || "",

        status: funcionario.status || "PENDENTE",
        auditoria_status: "AGUARDANDO_AUDITORIA",
      };
    }),

    possui_pets: Boolean(ecossistema?.possuiPet),

    pets: pets.map((pet) => ({
      id: pet.id,
      nome: pet.nome,
      tipo: pet.tipo,
      raca: pet.raca || "",
      porte: pet.porte || "",
      cor: pet.cor || "",

      foto_base64: pet.foto_base64 || null,
      foto_nome: pet.foto_nome || null,
      foto_mime: pet.foto_mime || null,
      foto_tamanho: pet.foto_tamanho || null,

      observacoes: pet.observacoes || "",
      status: pet.status || "PENDENTE",
      auditoria_status: "AGUARDANDO_AUDITORIA",
    })),

    status: "RASCUNHO",
    etapa_atual: 4,
    atualizado_em: new Date().toISOString(),
  };
}
export default function WizardMoradorTela4({
  dadosWizard,
  formTela1,
  formMorador,
  ecossistema,
  setEcossistema,
  onBack,
  onNext,
  onSaveDraft,
}) {
  const funcionariosLar = Array.isArray(ecossistema?.funcionariosLar)
    ? ecossistema.funcionariosLar
    : [];

  const pets = Array.isArray(ecossistema?.pets) ? ecossistema.pets : [];

  const [modalAberto, setModalAberto] = useState(false);
  const [funcionarioAtual, setFuncionarioAtual] = useState(null);
  const [camposInvalidos, setCamposInvalidos] = useState({});
  const [modalExcluir, setModalExcluir] = useState(null);

  const [modalPetAberto, setModalPetAberto] = useState(false);
  const [petAtual, setPetAtual] = useState(null);
  const [camposPetInvalidos, setCamposPetInvalidos] = useState({});
  const [modalExcluirPet, setModalExcluirPet] = useState(null);

  const resumo = useMemo(
    () => obterResumo(dadosWizard, formTela1, formMorador),
    [dadosWizard, formTela1, formMorador]
  );

  function atualizarEcossistema(dados) {
    setEcossistema({
      ...ecossistema,
      ...dados,
    });
  }

  function abrirNovoFuncionario() {
    setFuncionarioAtual({ ...funcionarioInicial, id: gerarId() });
    setCamposInvalidos({});
    setModalAberto(true);
  }

  function editarFuncionario(funcionario) {
    setFuncionarioAtual({ ...funcionarioInicial, ...funcionario });
    setCamposInvalidos({});
    setModalAberto(true);
  }

  function fecharModal() {
    setFuncionarioAtual(null);
    setCamposInvalidos({});
    setModalAberto(false);
  }

  function cpfJaUsado(cpf, idAtual) {
    const cpfLimpo = somenteNumeros(cpf);
    const cpfResponsavel = somenteNumeros(formMorador?.cpf);

    if (!cpfLimpo) return false;

    if (cpfResponsavel && cpfLimpo === cpfResponsavel) {
      return "responsavel";
    }

    const repetido = funcionariosLar.some(
      (item) => item.id !== idAtual && somenteNumeros(item.cpf) === cpfLimpo
    );

    return repetido ? "funcionario" : false;
  }

  function validarFuncionario(funcionario) {
    const invalidos = {};

    if (!funcionario?.nome?.trim()) invalidos.nome = true;
    if (!funcionario?.funcao) invalidos.funcao = true;

    if (funcionario?.cpf) {
      const cpfDuplicado = cpfJaUsado(funcionario.cpf, funcionario.id);

      if (cpfDuplicado === "responsavel") {
        invalidos.cpf = true;
        toast.error("Este CPF já pertence ao morador responsável.");
      }

      if (cpfDuplicado === "funcionario") {
        invalidos.cpf = true;
        toast.error("Este CPF já foi informado em outro funcionário do lar.");
      }

      if (!validarCpf(funcionario.cpf)) {
        const tentativas = (funcionario.tentativas_cpf_invalidas || 0) + 1;

        if (tentativas < 3) {
          invalidos.cpf = true;

          setFuncionarioAtual((old) => ({
            ...old,
            tentativas_cpf_invalidas: tentativas,
          }));

          toast.error(
            `CPF inválido. Verifique os números informados. Tentativa ${tentativas}/3.`
          );
        } else {
          setFuncionarioAtual((old) => ({
            ...old,
            cpf_pendente_validacao: true,
          }));

          toast("CPF seguirá para auditoria administrativa.");
        }
      }
    }

    if (funcionario?.email && !validarEmail(funcionario.email)) {
      invalidos.email = true;
      toast.error("Informe um e-mail válido ou deixe o campo vazio.");
    }

    const whatsapp = somenteNumeros(funcionario?.whatsapp || "");
    const ddi = obterDDINumerico(funcionario?.ddi || "+55");

    if (whatsapp) {
      if (ddi === "55" && whatsapp.length < 10) {
        invalidos.whatsapp = true;
        toast.error("Informe um WhatsApp válido com DDD.");
      } else if (ddi !== "55" && whatsapp.length < 6) {
        invalidos.whatsapp = true;
        toast.error("Informe um telefone internacional válido.");
      }
    }

    setCamposInvalidos(invalidos);
    return Object.keys(invalidos).length === 0;
  }

  function salvarFuncionario() {
    if (!validarFuncionario(funcionarioAtual)) return;

    const funcionarioFinal = {
      ...funcionarioAtual,
      nome: capitalizarNome(funcionarioAtual.nome),
      email: funcionarioAtual.email?.trim().toLowerCase() || "",
      status: funcionarioAtual.status || "PENDENTE",
    };

    const novaLista = funcionariosLar.some((item) => item.id === funcionarioFinal.id)
      ? funcionariosLar.map((item) =>
          item.id === funcionarioFinal.id ? funcionarioFinal : item
        )
      : [...funcionariosLar, funcionarioFinal];

    atualizarEcossistema({
      possuiFuncionarioLar: true,
      funcionariosLar: novaLista,
    });

    toast.success("Funcionário do lar salvo com sucesso.");
    fecharModal();
  }

  function excluirFuncionario(id) {
    const novaLista = funcionariosLar.filter((item) => item.id !== id);

    atualizarEcossistema({
      funcionariosLar: novaLista,
      possuiFuncionarioLar: novaLista.length > 0,
    });

    setModalExcluir(null);
    toast.success("Funcionário do lar removido.");
  }

  function abrirNovoPet() {
    setPetAtual({ ...petInicial, id: `pet-${Date.now()}-${Math.random().toString(16).slice(2)}` });
    setCamposPetInvalidos({});
    setModalPetAberto(true);
  }

  function editarPet(pet) {
    setPetAtual({ ...petInicial, ...pet });
    setCamposPetInvalidos({});
    setModalPetAberto(true);
  }

  function fecharModalPet() {
    setPetAtual(null);
    setCamposPetInvalidos({});
    setModalPetAberto(false);
  }

  function validarPet(pet) {
    const invalidos = {};

    if (!pet?.nome?.trim()) invalidos.nome = true;
    if (!pet?.tipo) invalidos.tipo = true;

    setCamposPetInvalidos(invalidos);

    if (Object.keys(invalidos).length > 0) {
      toast.error("Informe pelo menos nome e tipo do pet.");
      return false;
    }

    return true;
  }

  function salvarPet() {
    if (!validarPet(petAtual)) return;

    const petFinal = {
      ...petAtual,
      nome: capitalizarNome(petAtual.nome),
      raca: capitalizarNome(petAtual.raca || ""),
      cor: capitalizarNome(petAtual.cor || ""),
      status: petAtual.status || "PENDENTE",
    };

    const novaLista = pets.some((item) => item.id === petFinal.id)
      ? pets.map((item) => (item.id === petFinal.id ? petFinal : item))
      : [...pets, petFinal];

    atualizarEcossistema({
      possuiPet: true,
      pets: novaLista,
    });

    toast.success("Pet salvo com sucesso.");
    fecharModalPet();
  }

  function excluirPet(id) {
    const novaLista = pets.filter((item) => item.id !== id);

    atualizarEcossistema({
      pets: novaLista,
      possuiPet: novaLista.length > 0,
    });

    setModalExcluirPet(null);
    toast.success("Pet removido.");
  }

    async function salvarRascunho() {
    await onSaveDraft(
      montarPayloadTela4({
        dadosWizard,
        ecossistema,
      })
    );

    toast.success("Rascunho salvo com sucesso.");
  }

  async function avancar() {
    await onNext(
      montarPayloadTela4({
        dadosWizard,
        ecossistema,
      })
    );
  }

  return (
    <>
      <div className="wm-t4-page">
        <section className="wm-t4-card">
          <header className="wm-t4-title">
            <span className="wm-t4-title-icon">
              <UsersRound size={24} />
            </span>

            <div>
              <h1>4. Funcionários do Lar</h1>
              <p>
                Cadastre funcionários recorrentes vinculados ao morador responsável.
                Horários, dias de trabalho e regras detalhadas poderão ser configurados
                depois no Portal do Morador.
              </p>
            </div>
          </header>

          <div className="wm-t4-divider" />

          <section className="wm-t4-summary-grid">
            <SummaryCard
              icon={<Building2 size={21} />}
              title="Unidade"
              lines={[`${resumo.torre} • ${resumo.unidade}`, `Perfil: ${resumo.perfil}`]}
            />

            <SummaryCard
              icon={<UserRound size={21} />}
              title="Morador responsável"
              lines={[resumo.morador, resumo.cpf ? `CPF: ${resumo.cpf}` : "CPF não informado"]}
            />

            <SummaryCard
              icon={<ShieldCheck size={21} />}
              title="Token"
              lines={[mascararToken(resumo.token), "Status: pendente"]}
            />
          </section>

          <section className="wm-t4-choice-card">
            <div>
              <h2>Deseja cadastrar funcionários do lar agora?</h2>
              <p>
                Inclua babá, cuidador(a), diarista, doméstica, motorista particular
                ou outro profissional recorrente vinculado à sua rotina.
              </p>
            </div>

            <div className="wm-t4-choice">
              <button
                type="button"
                className={ecossistema?.possuiFuncionarioLar ? "active" : ""}
                onClick={() => atualizarEcossistema({ possuiFuncionarioLar: true })}
              >
                <Check size={15} />
                Sim, quero cadastrar
              </button>

              <button
                type="button"
                className={!ecossistema?.possuiFuncionarioLar ? "active light" : "light"}
                onClick={() =>
                  atualizarEcossistema({
                    possuiFuncionarioLar: false,
                    funcionariosLar: [],
                  })
                }
              >
                Não quero cadastrar agora
              </button>
            </div>
          </section>

          {ecossistema?.possuiFuncionarioLar ? (
            <section className="wm-t4-list-section">
              <div className="wm-t4-list-head">
                <div>
                  <h2>Funcionários cadastrados ({funcionariosLar.length})</h2>
                  <p>Todos iniciam com status pendente até a auditoria administrativa.</p>
                </div>

                <button type="button" onClick={abrirNovoFuncionario}>
                  + Adicionar funcionário
                </button>
              </div>

              {funcionariosLar.length > 0 ? (
                <>
                  <div className="wm-t4-table-wrap">
                    <table className="wm-t4-table">
                      <thead>
                        <tr>
                          <th>Funcionário</th>
                          <th>Função</th>
                          <th>WhatsApp</th>
                          <th>Acesso ao condomínio</th>
                          <th>Recebe orientações</th>
                          <th>CPF</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>

                      <tbody>
                        {funcionariosLar.map((funcionario) => (
                          <tr key={funcionario.id}>
                            <td>
                              <PessoaMini pessoa={funcionario} />
                            </td>

                            <td>{funcionario.funcao}</td>
                            <td>{montarTelefoneE164({ ddi: funcionario.ddi, numero: funcionario.whatsapp }) || "—"}</td>

                            <td>
                              <Bool ativo={funcionario.autorizado_acesso_condominio} />
                            </td>

                            <td>
                              <Bool ativo={funcionario.autorizado_receber_orientacoes} />
                            </td>

                            <td>{funcionario.cpf || "—"}</td>

                            <td>
                              <Status status={funcionario.status} />
                            </td>

                            <td>
                              <div className="wm-t4-actions-mini">
                                <button type="button" onClick={() => editarFuncionario(funcionario)}>
                                  <Edit3 size={15} />
                                </button>

                                <button type="button" onClick={() => setModalExcluir(funcionario)}>
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="wm-t4-mobile-cards">
                    {funcionariosLar.map((funcionario) => (
                      <article key={funcionario.id} className="wm-t4-mobile-card">
                        <Avatar pessoa={funcionario} />

                        <div>
                          <strong>{funcionario.nome}</strong>
                          <span>{funcionario.funcao}</span>
                          <small>{funcionario.whatsapp || "WhatsApp não informado"}</small>
                        </div>

                        <Status status={funcionario.status} />

                        <div className="wm-t4-mobile-actions">
                          <button type="button" onClick={() => editarFuncionario(funcionario)}>
                            Editar
                          </button>

                          <button type="button" onClick={() => setModalExcluir(funcionario)}>
                            Excluir
                          </button>
                        </div>
                      </article>
                    ))}

                    <button type="button" className="wm-t4-mobile-add" onClick={abrirNovoFuncionario}>
                      <i>+</i>
                      <strong>Adicionar funcionário</strong>
                      <span>Funcionário do lar</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="wm-t4-empty">
                  <UsersRound size={34} />
                  <strong>Nenhum funcionário do lar cadastrado</strong>
                  <p>
                    Clique em “Adicionar funcionário” para incluir pessoas recorrentes
                    da rotina da unidade.
                  </p>
                </div>
              )}

              <div className="wm-t4-note">
                <Info size={16} />
                <span>
                  Este cadastro não define horários de trabalho. Dias, horários,
                  recorrência e regras detalhadas poderão ser configurados depois
                  no Portal do Morador.
                </span>
              </div>
            </section>
          ) : (
            <section className="wm-t4-empty">
              <UsersRound size={34} />
              <strong>Cadastro de funcionários pulado</strong>
              <p>Você poderá adicionar funcionários do lar posteriormente no Portal do Morador.</p>
            </section>
          )}

          <section className="wm-t4-pets-section">
            <div className="wm-t4-list-head">
              <div>
                <h2>Pets da unidade ({pets.length})</h2>
                <p>
                  Cadastre pets vinculados à unidade para facilitar identificação e orientações
                  administrativas quando necessário.
                </p>
              </div>

              <button type="button" onClick={abrirNovoPet}>
                + Adicionar pet
              </button>
            </div>

            {pets.length > 0 ? (
              <div className="wm-t4-pets-grid">
                {pets.map((pet) => (
                  <article key={pet.id} className="wm-t4-pet-card">
                    <AvatarPet pet={pet} />

                    <div className="wm-t4-pet-info">
                      <strong>{pet.nome}</strong>
                      <span>{pet.tipo}</span>
                      <small>
                        {[pet.raca, pet.porte, pet.cor].filter(Boolean).join(" • ") ||
                          "Sem detalhes adicionais"}
                      </small>
                    </div>

                    <Status status={pet.status} />

                    <div className="wm-t4-mobile-actions">
                      <button type="button" onClick={() => editarPet(pet)}>
                        Editar
                      </button>

                      <button type="button" onClick={() => setModalExcluirPet(pet)}>
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="wm-t4-empty compact">
                <UsersRound size={30} />
                <strong>Nenhum pet cadastrado</strong>
                <p>Você pode cadastrar agora ou adicionar depois no Portal do Morador.</p>
              </div>
            )}

            <div className="wm-t4-note">
              <Info size={16} />
              <span>
                O cadastro de pet é informativo. Regras de circulação, vacinação, áreas permitidas
                ou restrições específicas poderão ser tratadas em telas administrativas próprias.
              </span>
            </div>
          </section>          

          <section className="wm-t4-good-practices">
            <PracticeCard
              icon={<ShieldCheck size={20} />}
              title="Cadastro recorrente"
              text="Use esta etapa apenas para funcionários frequentes vinculados à rotina da unidade."
            />

            <PracticeCard
              icon={<Info size={20} />}
              title="Horários depois"
              text="Horários e regras de acesso serão definidos no Portal do Morador, não neste cadastro."
            />

            <PracticeCard
              icon={<Mail size={20} />}
              title="Comunicação"
              text="WhatsApp e e-mail ajudam em orientações administrativas quando necessário."
            />
          </section>

          <footer className="wm-t4-actions">
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
            {modalAberto ? (
        <ModalFuncionario
          funcionario={funcionarioAtual}
          setFuncionario={setFuncionarioAtual}
          camposInvalidos={camposInvalidos}
          funcionariosLar={funcionariosLar}
          cpfResponsavel={formMorador?.cpf}
          onClose={fecharModal}
          onSave={salvarFuncionario}
        />
      ) : null}

      {modalPetAberto ? (
        <ModalPet
          pet={petAtual}
          setPet={setPetAtual}
          camposInvalidos={camposPetInvalidos}
          onClose={fecharModalPet}
          onSave={salvarPet}
        />
      ) : null}

      {modalExcluir ? (
        <ModalConfirmacao
          titulo="Excluir funcionário?"
          texto={`Deseja remover ${modalExcluir.nome} da lista de funcionários do lar?`}
          onClose={() => setModalExcluir(null)}
          onConfirm={() => excluirFuncionario(modalExcluir.id)}
        />
      ) : null}

      {modalExcluirPet ? (
        <ModalConfirmacao
          titulo="Excluir pet?"
          texto={`Deseja remover ${modalExcluirPet.nome} da lista de pets da unidade?`}
          onClose={() => setModalExcluirPet(null)}
          onConfirm={() => excluirPet(modalExcluirPet.id)}
        />
      ) : null}

    </>
  );
}

function SummaryCard({ icon, title, lines = [] }) {
  return (
    <div className="wm-t4-summary-card">
      <span>{icon}</span>

      <div>
        <strong>{title}</strong>

        {lines.filter(Boolean).map((line) => (
          <small key={line}>{line}</small>
        ))}
      </div>
    </div>
  );
}

function PessoaMini({ pessoa }) {
  return (
    <div className="wm-t4-person-mini">
      <Avatar pessoa={pessoa} />

      <div>
        <strong>{pessoa.nome}</strong>
        <small>{pessoa.funcao}</small>
      </div>
    </div>
  );
}

function Avatar({ pessoa }) {
  if (pessoa.foto_base64) {
    return (
      <img
        className="wm-t4-avatar"
        src={pessoa.foto_base64}
        alt={pessoa.nome}
      />
    );
  }

  return <span className="wm-t4-avatar fallback">{iniciais(pessoa.nome)}</span>;
}

function Bool({ ativo }) {
  return (
    <span className={`wm-t4-bool ${ativo ? "ok" : "no"}`}>
      {ativo ? <Check size={12} /> : <X size={12} />}
    </span>
  );
}

function Status({ status = "PENDENTE" }) {
  const label = {
    PENDENTE: "Pendente",
    REVISAO: "Revisão",
    APROVADO: "Aprovado",
    REJEITADO: "Rejeitado",
  }[status] || "Pendente";

  return <span className={`wm-t4-status ${status.toLowerCase()}`}>{label}</span>;
}

function PracticeCard({ icon, title, text }) {
  return (
    <article className="wm-t4-practice-card">
      <span>{icon}</span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

function ModalFuncionario({
  funcionario,
  setFuncionario,
  camposInvalidos,
  funcionariosLar,
  cpfResponsavel,
  onClose,
  onSave,
}) {
  const inputFotoRef = useRef(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);

  const cpfLimpo = somenteNumeros(funcionario?.cpf);
  const cpfValido = cpfLimpo.length === 11 && validarCpf(funcionario?.cpf);

  function cpfDuplicadoLocal(cpf) {
    const cpfAtual = somenteNumeros(cpf);
    if (!cpfAtual) return false;

    if (somenteNumeros(cpfResponsavel) === cpfAtual) {
      return "responsavel";
    }

    const existe = funcionariosLar.some(
      (item) => item.id !== funcionario.id && somenteNumeros(item.cpf) === cpfAtual
    );

    return existe ? "funcionario" : false;
  }

  function atualizar(campo, valor) {
    setFuncionario((old) => {
      const novo = { ...old, [campo]: valor };

      if (campo === "nome") {
        novo.nome = capitalizarNome(valor);
      }

      if (campo === "cpf") {
        novo.cpf = formatarCpf(valor);
        novo.cpf_pendente_validacao = false;

        const duplicado = cpfDuplicadoLocal(novo.cpf);

        if (duplicado === "responsavel") {
          toast.error("Este CPF já pertence ao morador responsável.");
        }

        if (duplicado === "funcionario") {
          toast.error("Este CPF já foi informado em outro funcionário.");
        }
      }

      if (campo === "ddi") {
        const novoDDI = normalizarDDI(valor);
        novo.ddi = novoDDI;
        novo.whatsapp = formatarTelefoneInternacional({
          ddi: novoDDI,
          numero: novo.whatsapp,
        });
      }

      if (campo === "whatsapp") {
        novo.whatsapp = formatarTelefoneInternacional({
          ddi: novo.ddi || "+55",
          numero: valor,
        });
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

      toast.success("Foto otimizada com sucesso.");
    } catch (error) {
      toast.error(error.message || "Não foi possível processar a foto.");
    } finally {
      setProcessandoFoto(false);
      if (event.target) event.target.value = "";
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
      <div className="wm-t4-modal">
        <header className="wm-t4-modal-head">
          <div>
            <h2>Adicionar funcionário do lar</h2>
            <p>Informe os dados principais. Horários poderão ser configurados depois.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </header>

        <div className="wm-t4-modal-body">
          <section className="wm-t4-modal-section">
            <h3>1. Dados básicos</h3>

            <div className="wm-t4-photo-line">
              <div className="wm-t4-photo-preview">
                {funcionario.foto_base64 ? (
                  <img src={funcionario.foto_base64} alt="Foto do funcionário" />
                ) : (
                  <UserRound size={36} />
                )}
              </div>

              <div className="wm-t4-photo-info">
                <strong>Foto do funcionário (opcional)</strong>
                <span>JPG, PNG, HEIC ou WebP até 5MB. Otimização automática para WebP.</span>

                <div className="wm-t4-photo-actions">
                  <button
                    type="button"
                    className="wm-t4-mini-btn"
                    onClick={() => inputFotoRef.current?.click()}
                    disabled={processandoFoto}
                  >
                    <Upload size={14} />
                    {processandoFoto ? "Processando..." : "Escolher foto"}
                  </button>

                  {funcionario.foto_base64 ? (
                    <button type="button" className="wm-t4-mini-btn ghost" onClick={removerFoto}>
                      Remover
                    </button>
                  ) : null}

                  <input
                    ref={inputFotoRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
                    onChange={selecionarFoto}
                    hidden
                  />
                </div>
              </div>
            </div>

            <div className="wm-t4-modal-grid two">
              <Field
                label="Nome completo *"
                value={funcionario.nome}
                onChange={(v) => atualizar("nome", v)}
                invalid={camposInvalidos.nome}
                placeholder="Nome do funcionário"
              />

              <label className="wm-t4-field">
                <span>Função *</span>

                <select
                  value={funcionario.funcao}
                  onChange={(e) => atualizar("funcao", e.target.value)}
                  className={camposInvalidos.funcao ? "invalid" : ""}
                  autoComplete="off"
                >
                  <option value="">Selecione</option>

                  {TIPOS_FUNCAO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="wm-t4-modal-grid two">
              <Field
                label="CPF (opcional)"
                value={funcionario.cpf}
                onChange={(v) => atualizar("cpf", v)}
                invalid={camposInvalidos.cpf}
                inputMode="numeric"
                valid={cpfValido && !cpfDuplicadoLocal(funcionario.cpf)}
                placeholder="000.000.000-00"
              />

              <Field
                label="E-mail (opcional)"
                value={funcionario.email}
                onChange={(v) => atualizar("email", v.toLowerCase())}
                invalid={camposInvalidos.email}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="wm-t4-modal-grid phone-full">
              <Field
                label="DDI"
                value={funcionario.ddi || "+55"}
                onChange={(v) => atualizar("ddi", v)}
                inputMode="tel"
                placeholder="+55"
              />

              <Field
                label="WhatsApp"
                value={funcionario.whatsapp}
                onChange={(v) => atualizar("whatsapp", v)}
                invalid={camposInvalidos.whatsapp}
                inputMode="tel"
                icon={<Phone size={15} />}
                placeholder="(11) 99999-9999"
              />
            </div>
          </section>

          <section className="wm-t4-modal-section">
            <h3>2. Autorizações iniciais</h3>

            <PermissionCard
              checked={funcionario.autorizado_acesso_condominio}
              title="Pode ser identificado como funcionário recorrente"
              text="Permite que a portaria visualize este cadastro como funcionário do lar vinculado ao morador."
              onChange={(v) => atualizar("autorizado_acesso_condominio", v)}
            />

            <PermissionCard
              checked={funcionario.autorizado_receber_orientacoes}
              title="Pode receber orientações administrativas"
              text="Permite contato para orientações operacionais quando necessário. Não define horários de entrada."
              onChange={(v) => atualizar("autorizado_receber_orientacoes", v)}
              green
            />

            <label className="wm-t4-field">
              <span>Observações (opcional)</span>

              <textarea
                value={funcionario.observacoes || ""}
                onChange={(e) => atualizar("observacoes", e.target.value)}
                placeholder="Ex.: trabalha com a família há anos, cuidadora da moradora, etc."
              />
            </label>
          </section>
        </div>

        <footer className="wm-t4-modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>

          <button type="button" className="primary" onClick={onSave}>
            Salvar funcionário
            <Check size={15} />
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  invalid,
  inputMode,
  icon,
  valid,
  placeholder,
}) {
  return (
    <label className="wm-t4-field">
      <span>{label}</span>

      <div className={`wm-t4-input ${invalid ? "invalid" : ""} ${valid ? "valid" : ""}`}>
        {icon}

        <input
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          inputMode={inputMode}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />

        {valid ? (
          <i className="wm-t4-input-check">
            <Check size={14} />
          </i>
        ) : null}
      </div>
    </label>
  );
}

function PermissionCard({ checked, title, text, onChange, green }) {
  return (
    <button
      type="button"
      className={`wm-t4-permission ${checked ? "active" : ""} ${green ? "green" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span>{checked ? <Check size={13} /> : null}</span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </button>
  );
}

function AvatarPet({ pet }) {
  if (pet.foto_base64) {
    return (
      <img
        className="wm-t4-pet-avatar"
        src={pet.foto_base64}
        alt={pet.nome}
      />
    );
  }

  return <span className="wm-t4-pet-avatar fallback">{iniciais(pet.nome)}</span>;
}

function ModalPet({ pet, setPet, camposInvalidos, onClose, onSave }) {
  const inputFotoRef = useRef(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);

  function atualizar(campo, valor) {
    setPet((old) => {
      const novo = { ...old, [campo]: valor };

      if (campo === "nome") novo.nome = capitalizarNome(valor);
      if (campo === "raca") novo.raca = capitalizarNome(valor);
      if (campo === "cor") novo.cor = capitalizarNome(valor);

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

      toast.success("Foto do pet otimizada com sucesso.");
    } catch (error) {
      toast.error(error.message || "Não foi possível processar a foto.");
    } finally {
      setProcessandoFoto(false);
      if (event.target) event.target.value = "";
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
      <div className="wm-t4-modal wm-t4-pet-modal">
        <header className="wm-t4-modal-head">
          <div>
            <h2>Adicionar pet</h2>
            <p>Cadastre os dados principais do pet vinculado à unidade.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </header>

        <div className="wm-t4-modal-body">
          <section className="wm-t4-modal-section">
            <h3>1. Dados do pet</h3>

            <div className="wm-t4-photo-line">
              <div className="wm-t4-photo-preview">
                {pet.foto_base64 ? (
                  <img src={pet.foto_base64} alt="Foto do pet" />
                ) : (
                  <UserRound size={36} />
                )}
              </div>

              <div className="wm-t4-photo-info">
                <strong>Foto do pet (opcional)</strong>
                <span>JPG, PNG, HEIC ou WebP até 5MB. Otimização automática para WebP.</span>

                <div className="wm-t4-photo-actions">
                  <button
                    type="button"
                    className="wm-t4-mini-btn"
                    onClick={() => inputFotoRef.current?.click()}
                    disabled={processandoFoto}
                  >
                    <Upload size={14} />
                    {processandoFoto ? "Processando..." : "Escolher foto"}
                  </button>

                  {pet.foto_base64 ? (
                    <button type="button" className="wm-t4-mini-btn ghost" onClick={removerFoto}>
                      Remover
                    </button>
                  ) : null}

                  <input
                    ref={inputFotoRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
                    onChange={selecionarFoto}
                    hidden
                  />
                </div>
              </div>
            </div>

            <div className="wm-t4-modal-grid two">
              <Field
                label="Nome do pet *"
                value={pet.nome}
                onChange={(v) => atualizar("nome", v)}
                invalid={camposInvalidos.nome}
                placeholder="Nome do pet"
              />

              <label className="wm-t4-field">
                <span>Tipo *</span>

                <select
                  value={pet.tipo}
                  onChange={(e) => atualizar("tipo", e.target.value)}
                  className={camposInvalidos.tipo ? "invalid" : ""}
                  autoComplete="off"
                >
                  <option value="">Selecione</option>

                  {TIPOS_PET.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="wm-t4-modal-grid three">
              <Field
                label="Raça (opcional)"
                value={pet.raca}
                onChange={(v) => atualizar("raca", v)}
                placeholder="Ex.: SRD, Poodle, Siamês"
              />

              <label className="wm-t4-field">
                <span>Porte</span>

                <select
                  value={pet.porte}
                  onChange={(e) => atualizar("porte", e.target.value)}
                  autoComplete="off"
                >
                  <option value="">Selecione</option>

                  {PORTES_PET.map((porte) => (
                    <option key={porte} value={porte}>
                      {porte}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="Cor (opcional)"
                value={pet.cor}
                onChange={(v) => atualizar("cor", v)}
                placeholder="Ex.: Caramelo"
              />
            </div>
          </section>

          <section className="wm-t4-modal-section">
            <h3>2. Observações</h3>

            <label className="wm-t4-field">
              <span>Observações (opcional)</span>

              <textarea
                value={pet.observacoes || ""}
                onChange={(e) => atualizar("observacoes", e.target.value)}
                placeholder="Ex.: dócil, usa guia, tem restrição, informação relevante para administração."
              />
            </label>

            <div className="wm-t4-note inside-modal">
              <Info size={16} />
              <span>
                Este cadastro é informativo. Regras específicas de convivência e circulação
                serão tratadas pelo condomínio quando aplicável.
              </span>
            </div>
          </section>
        </div>

        <footer className="wm-t4-modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>

          <button type="button" className="primary" onClick={onSave}>
            Salvar pet
            <Check size={15} />
          </button>
        </footer>
      </div>
    </div>
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