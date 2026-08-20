import { useEffect, useMemo, useState } from "react";
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
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import "../../../styles/wizardMorador/WizardMoradorTela4.css";

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
  autorizado_acesso_condominio: false,
  autorizado_receber_orientacoes: false,
  observacoes: "",
};

const petInicial = {
  id: null,
  nome: "",
  tipo: "",
  raca: "",
  porte: "",
  cor: "",
  observacoes: "",
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
  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

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
    .replace(/(^|\s|-|')([\p{L}]+)/gu, (_, separador, palavra) => {
      if (separador === " " && minusculas.has(palavra)) {
        return `${separador}${palavra}`;
      }

      return `${separador}${palavra.charAt(0).toUpperCase()}${palavra.slice(1)}`;
    });
}

function iniciais(nome = "") {
  const partes = String(nome).trim().split(/\s+/).filter(Boolean);

  return `${partes[0]?.[0] || "P"}${partes[1]?.[0] || ""}`.toUpperCase();
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

function gerarId(prefixo) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function traduzirPerfil(perfil = "") {
  const mapa = {
    proprietario_residente: "Proprietário residente",
    proprietario_morador: "Proprietário residente",
    proprietario_nao_residente: "Proprietário não residente",
    proprietario_unidade_alugada: "Proprietário não residente",
    inquilino: "Morador inquilino",
    responsavel_unidade_corporativa: "Responsável por unidade corporativa",
    unidade_vazia: "Responsável por unidade vazia",
  };

  return mapa[perfil] || "Não informado";
}

function obterResumo(dadosWizard, formTela1, formMorador) {
  const pre = dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};
  const condominio = dadosWizard?.condominio || {};

  const perfil =
    formTela1?.perfilUnidade ||
    formTela1?.perfil_unidade ||
    pre.perfil_unidade ||
    pre.relacao_unidade ||
    dadosWizard?.perfil_unidade ||
    "";

  const nomeExibicao =
    formMorador?.nomeSocial ||
    formMorador?.nomeCompleto ||
    pre.nome ||
    "Não informado";

  return {
    condominio:
      condominio.nome_fantasia ||
      condominio.nome ||
      dadosWizard?.nome_condominio ||
      "Condomínio não informado",

    torre:
      pre.torre_nome ||
      pre.torre ||
      pre.bloco_nome ||
      pre.bloco ||
      dadosWizard?.torre_nome ||
      dadosWizard?.torre ||
      dadosWizard?.bloco ||
      "Torre / bloco não informado",

    unidade:
      pre.unidade_nome ||
      pre.unidade ||
      dadosWizard?.unidade_nome ||
      dadosWizard?.unidade ||
      "Unidade não informada",

    perfil: traduzirPerfil(perfil),
    morador: nomeExibicao,
    cpf: formMorador?.cpf || pre.cpf || "",
  };
}

function montarPayloadTela4({ ecossistema }) {
  const funcionariosLar = Array.isArray(ecossistema?.funcionariosLar)
    ? ecossistema.funcionariosLar
    : [];

  const pets = Array.isArray(ecossistema?.pets)
    ? ecossistema.pets
    : [];

  return {
    possui_funcionarios_lar: Boolean(ecossistema?.possuiFuncionarioLar),

    funcionarios_lar: Boolean(ecossistema?.possuiFuncionarioLar)
      ? funcionariosLar.map((funcionario) => {
          const telefoneE164 = montarTelefoneE164({
            ddi: funcionario.ddi || "+55",
            numero: funcionario.whatsapp,
          });

          return {
            id: funcionario.id,
            nome: funcionario.nome?.trim() || "",
            funcao: funcionario.funcao || "",
            cpf: somenteNumeros(funcionario.cpf),
            cpf_formatado: funcionario.cpf || "",
            cpf_pendente_validacao: Boolean(funcionario.cpf_pendente_validacao),
            ddi: funcionario.whatsapp
              ? obterDDINumerico(funcionario.ddi || "+55")
              : "",
            whatsapp: funcionario.whatsapp
              ? somenteNumeros(funcionario.whatsapp)
              : "",
            whatsapp_e164: funcionario.whatsapp ? telefoneE164 : "",
            email: funcionario.email?.trim().toLowerCase() || "",
            autorizado_acesso_condominio: Boolean(
              funcionario.autorizado_acesso_condominio
            ),
            autorizado_receber_orientacoes: Boolean(
              funcionario.autorizado_receber_orientacoes
            ),
            observacoes: funcionario.observacoes?.trim() || "",
          };
        })
      : [],

    possui_pets: pets.length > 0,

    pets: pets.map((pet) => ({
      id: pet.id,
      nome: pet.nome?.trim() || "",
      tipo: pet.tipo || "",
      raca: pet.raca?.trim() || "",
      porte: pet.porte || "",
      cor: pet.cor?.trim() || "",
      observacoes: pet.observacoes?.trim() || "",
    })),
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

  const pets = Array.isArray(ecossistema?.pets)
    ? ecossistema.pets
    : [];

  const [modalAberto, setModalAberto] = useState(false);
  const [funcionarioAtual, setFuncionarioAtual] = useState(null);
  const [camposInvalidos, setCamposInvalidos] = useState({});
  const [modalExcluir, setModalExcluir] = useState(null);

  const [modalPetAberto, setModalPetAberto] = useState(false);
  const [petAtual, setPetAtual] = useState(null);
  const [camposPetInvalidos, setCamposPetInvalidos] = useState({});
  const [modalExcluirPet, setModalExcluirPet] = useState(null);

  const [
    processando,
    setProcessando,
  ] = useState(false);

  const [
    salvandoRascunho,
    setSalvandoRascunho,
  ] = useState(false);

  const resumo = useMemo(
    () => obterResumo(dadosWizard, formTela1, formMorador),
    [dadosWizard, formTela1, formMorador]
  );

  const algumModalAberto = Boolean(
    modalAberto || modalPetAberto || modalExcluir || modalExcluirPet
  );

  useEffect(() => {
    if (!algumModalAberto) return undefined;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function fecharComEsc(event) {
      if (event.key !== "Escape") return;

      if (modalExcluir) {
        setModalExcluir(null);
        return;
      }

      if (modalExcluirPet) {
        setModalExcluirPet(null);
        return;
      }

      if (modalAberto) {
        fecharModal();
        return;
      }

      if (modalPetAberto) {
        fecharModalPet();
      }
    }

    window.addEventListener("keydown", fecharComEsc);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", fecharComEsc);
    };
  }, [algumModalAberto, modalAberto, modalPetAberto, modalExcluir, modalExcluirPet]);

  function atualizarEcossistema(dados) {
    setEcossistema({
      ...ecossistema,
      ...dados,
    });
  }

  function abrirNovoFuncionario() {
    setFuncionarioAtual({
      ...funcionarioInicial,
      id: gerarId("func"),
    });
    setCamposInvalidos({});
    setModalAberto(true);
  }

  function editarFuncionario(funcionario) {
    setFuncionarioAtual({
      ...funcionarioInicial,
      ...funcionario,
    });
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
      (item) =>
        item.id !== idAtual &&
        somenteNumeros(item.cpf) === cpfLimpo
    );

    return repetido ? "funcionario" : false;
  }

  function validarFuncionario(funcionario) {
    const invalidos = {};

    if (!funcionario?.nome?.trim()) {
      invalidos.nome = true;
    }

    if (!funcionario?.funcao) {
      invalidos.funcao = true;
    }

    if (funcionario?.cpf) {
      const cpfDuplicado = cpfJaUsado(funcionario.cpf, funcionario.id);

      if (cpfDuplicado === "responsavel") {
        invalidos.cpf = true;
        toast.error("Este CPF já foi informado para o responsável pela unidade.");
      } else if (cpfDuplicado === "funcionario") {
        invalidos.cpf = true;
        toast.error("Este CPF já foi informado para outra pessoa nesta etapa.");
      } else if (!validarCpf(funcionario.cpf)) {
        const tentativas = (funcionario.tentativas_cpf_invalidas || 0) + 1;

        if (tentativas < 3) {
          invalidos.cpf = true;

          setFuncionarioAtual((old) => ({
            ...old,
            tentativas_cpf_invalidas: tentativas,
          }));

          toast.error("Confira os números do CPF informado.");
        } else {
          setFuncionarioAtual((old) => ({
            ...old,
            tentativas_cpf_invalidas: tentativas,
            cpf_pendente_validacao: true,
          }));

          toast(
            "Você poderá continuar. A administração conferirá este CPF antes da aprovação do cadastro."
          );
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
        toast.error("Informe o WhatsApp com DDD.");
      } else if (ddi !== "55" && whatsapp.length < 6) {
        invalidos.whatsapp = true;
        toast.error("Confira o número de telefone informado.");
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
    };

    const novaLista = funcionariosLar.some(
      (item) => item.id === funcionarioFinal.id
    )
      ? funcionariosLar.map((item) =>
          item.id === funcionarioFinal.id ? funcionarioFinal : item
        )
      : [...funcionariosLar, funcionarioFinal];

    atualizarEcossistema({
      possuiFuncionarioLar: true,
      funcionariosLar: novaLista,
    });

    toast.success("Funcionário do lar adicionado.");
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

  function selecionarSemFuncionarios() {
    if (funcionariosLar.length > 0) {
      const confirmar = window.confirm(
        "Existem funcionários cadastrados nesta etapa. Deseja remover esses dados e continuar sem funcionários do lar?"
      );

      if (!confirmar) return;
    }

    atualizarEcossistema({
      possuiFuncionarioLar: false,
      funcionariosLar: [],
    });
  }

  function abrirNovoPet() {
    setPetAtual({
      ...petInicial,
      id: gerarId("pet"),
    });
    setCamposPetInvalidos({});
    setModalPetAberto(true);
  }

  function editarPet(pet) {
    setPetAtual({
      ...petInicial,
      ...pet,
    });
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

    if (!pet?.nome?.trim()) {
      invalidos.nome = true;
    }

    if (!pet?.tipo) {
      invalidos.tipo = true;
    }

    setCamposPetInvalidos(invalidos);

    if (Object.keys(invalidos).length > 0) {
      toast.error("Informe o nome e o tipo do pet.");
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
    };

    const novaLista = pets.some((item) => item.id === petFinal.id)
      ? pets.map((item) => (item.id === petFinal.id ? petFinal : item))
      : [...pets, petFinal];

    atualizarEcossistema({
      possuiPet: true,
      pets: novaLista,
    });

    toast.success("Pet adicionado.");
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
    if (
      salvandoRascunho ||
      processando
    ) {
      return;
    }

    try {
      setSalvandoRascunho(true);

      const salvou =
        await onSaveDraft(
          montarPayloadTela4({
            ecossistema,
          })
        );

      if (salvou !== false) {
        toast.success(
          "Suas informações foram salvas."
        );
      }
    } catch (error) {
      console.error(
        "Erro ao salvar a Tela 4:",
        error
      );
    } finally {
      setSalvandoRascunho(false);
    }
  }

  async function avancar() {
    if (
      processando ||
      salvandoRascunho
    ) {
      return;
    }

    if (
      ecossistema?.possuiFuncionarioLar &&
      funcionariosLar.length === 0
    ) {
      toast.error(
        "Adicione pelo menos um funcionário do lar ou escolha continuar sem cadastrar."
      );

      return;
    }

    try {
      setProcessando(true);

      /*
      * Dá tempo para o navegador exibir
      * o estado de transição antes do salvamento.
      */
      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            300
          )
      );

      const salvou =
        await onNext(
          montarPayloadTela4({
            ecossistema,
          })
        );

      if (salvou === false) {
        setProcessando(false);
      }
    } catch (error) {
      console.error(
        "Erro ao continuar a Tela 4:",
        error
      );

      setProcessando(false);
    }
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
              <h1>4. Funcionários do lar e pets</h1>
              <p>
                Informe pessoas que trabalham com frequência na unidade e, se desejar,
                cadastre também os pets.
              </p>
            </div>
          </header>

          <div className="wm-t4-divider" />

          <section className="wm-t4-summary-grid">
            <SummaryCard
              icon={<Building2 size={21} />}
              title="Unidade"
              lines={[
                `${resumo.torre} • ${resumo.unidade}`,
                resumo.perfil,
              ]}
            />

            <SummaryCard
              icon={<UserRound size={21} />}
              title="Responsável"
              lines={[
                resumo.morador,
                resumo.cpf ? `CPF: ${resumo.cpf}` : "CPF não informado",
              ]}
            />
          </section>

          <section className="wm-t4-choice-card">
            <div>
              <h2>Deseja cadastrar funcionários do lar agora?</h2>
              <p>
                Inclua apenas pessoas que trabalham com frequência na rotina da unidade.
                Cadastros ocasionais poderão ser tratados posteriormente.
              </p>
            </div>

            <div className="wm-t4-choice">
              <button
                type="button"
                className={ecossistema?.possuiFuncionarioLar ? "active" : ""}
                onClick={() =>
                  atualizarEcossistema({
                    possuiFuncionarioLar: true,
                  })
                }
              >
                <Check size={15} />
                Sim, quero cadastrar
              </button>

              <button
                type="button"
                className={
                  !ecossistema?.possuiFuncionarioLar ? "active light" : "light"
                }
                onClick={selecionarSemFuncionarios}
              >
                Continuar sem cadastrar
              </button>
            </div>
          </section>

          {ecossistema?.possuiFuncionarioLar ? (
            <section className="wm-t4-list-section">
              <div className="wm-t4-list-head">
                <div>
                  <h2>Funcionários do lar ({funcionariosLar.length})</h2>
                  <p>
                    Confira os dados antes de seguir para a próxima etapa.
                  </p>
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
                          <th>Identificação na portaria</th>
                          <th>Pode receber orientações</th>
                          <th>CPF</th>
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

                            <td>
                              {funcionario.whatsapp
                                ? `+${obterDDINumerico(
                                    funcionario.ddi
                                  )} ${funcionario.whatsapp}`
                                : "—"}
                            </td>

                            <td>
                              <Bool ativo={funcionario.autorizado_acesso_condominio} />
                            </td>

                            <td>
                              <Bool ativo={funcionario.autorizado_receber_orientacoes} />
                            </td>

                            <td>{funcionario.cpf || "—"}</td>

                            <td>
                              <div className="wm-t4-actions-mini">
                                <button
                                  type="button"
                                  onClick={() => editarFuncionario(funcionario)}
                                  aria-label={`Editar ${funcionario.nome}`}
                                >
                                  <Edit3 size={15} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setModalExcluir(funcionario)}
                                  aria-label={`Excluir ${funcionario.nome}`}
                                >
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
                        <Avatar nome={funcionario.nome} />

                        <div className="wm-t4-mobile-card-main">
                          <strong>{funcionario.nome}</strong>
                          <span>{funcionario.funcao}</span>
                          <small>
                            {funcionario.whatsapp || "WhatsApp não informado"}
                          </small>
                        </div>

                        <div className="wm-t4-mobile-actions">
                          <button
                            type="button"
                            onClick={() => editarFuncionario(funcionario)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => setModalExcluir(funcionario)}
                          >
                            Excluir
                          </button>
                        </div>
                      </article>
                    ))}

                    <button
                      type="button"
                      className="wm-t4-mobile-add"
                      onClick={abrirNovoFuncionario}
                    >
                      <i>+</i>
                      <strong>Adicionar funcionário</strong>
                      <span>Funcionário do lar</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="wm-t4-empty">
                  <UsersRound size={34} />
                  <strong>Nenhum funcionário adicionado</strong>
                  <p>
                    Adicione uma pessoa ou escolha continuar sem cadastrar funcionários
                    do lar.
                  </p>
                </div>
              )}

              <div className="wm-t4-note">
                <Info size={16} />
                <span>
                  Horários, dias de trabalho e outras regras poderão ser informados
                  posteriormente, quando necessário.
                </span>
              </div>
            </section>
          ) : (
            <section className="wm-t4-empty">
              <UsersRound size={34} />
              <strong>Nenhum funcionário será informado agora</strong>
              <p>
                Você poderá cadastrar funcionários do lar posteriormente pelo Chegou!.
              </p>
            </section>
          )}

          <section className="wm-t4-pets-section">
            <div className="wm-t4-list-head">
              <div>
                <h2>Pets da unidade ({pets.length})</h2>
                <p>
                  O cadastro é opcional e ajuda na identificação quando necessário.
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
                    <Avatar nome={pet.nome} pet />

                    <div className="wm-t4-pet-info">
                      <strong>{pet.nome}</strong>
                      <span>{pet.tipo}</span>
                      <small>
                        {[pet.raca, pet.porte, pet.cor].filter(Boolean).join(" • ") ||
                          "Sem detalhes adicionais"}
                      </small>
                    </div>

                    <div className="wm-t4-mobile-actions">
                      <button type="button" onClick={() => editarPet(pet)}>
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalExcluirPet(pet)}
                      >
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
                <p>Você pode deixar esta parte em branco e continuar normalmente.</p>
              </div>
            )}

            <div className="wm-t4-note">
              <Info size={16} />
              <span>
                Informe apenas dados úteis para identificação. Regras específicas do
                condomínio continuam sendo definidas pela administração.
              </span>
            </div>
          </section>

          <section className="wm-t4-good-practices">
            <PracticeCard
              icon={<ShieldCheck size={20} />}
              title="Cadastre apenas pessoas recorrentes"
              text="Use esta etapa para quem trabalha com frequência na rotina da unidade."
            />

            <PracticeCard
              icon={<Info size={20} />}
              title="Você poderá atualizar depois"
              text="Mudanças na rotina poderão ser informadas posteriormente pelo Chegou!."
            />

            <PracticeCard
              icon={<Mail size={20} />}
              title="Contato é opcional"
              text="WhatsApp e e-mail só precisam ser informados se forem úteis para contato."
            />
          </section>

          <footer className="wm-t4-actions">
            <button
              type="button"
              className="secondary"
              onClick={onBack}
              disabled={
                processando ||
                salvandoRascunho
              }
            >
              <ArrowLeft size={16} />
              Voltar
            </button>

            <button
              type="button"
              className="outline"
              onClick={salvarRascunho}
              disabled={
                processando ||
                salvandoRascunho
              }
            >
              <Save size={16} />

              {salvandoRascunho
                ? "Salvando..."
                : "Salvar e continuar depois"}
            </button>

            <button
              type="button"
              className="primary"
              onClick={avancar}
              disabled={
                processando ||
                salvandoRascunho
              }
              aria-busy={processando}
            >
              {processando
                ? "Salvando informações..."
                : "Continuar"}

              <ArrowRight size={18} />
            </button>
          </footer>
        </section>
      </div>

      {modalAberto && funcionarioAtual ? (
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

      {modalPetAberto && petAtual ? (
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
          texto={`Deseja remover ${modalExcluir.nome} desta etapa?`}
          onClose={() => setModalExcluir(null)}
          onConfirm={() => excluirFuncionario(modalExcluir.id)}
        />
      ) : null}

      {modalExcluirPet ? (
        <ModalConfirmacao
          titulo="Excluir pet?"
          texto={`Deseja remover ${modalExcluirPet.nome} desta etapa?`}
          onClose={() => setModalExcluirPet(null)}
          onConfirm={() => excluirPet(modalExcluirPet.id)}
        />
      ) : null}

      {processando ? (
        <div
          className="wm-t4-processing"
          role="status"
          aria-live="polite"
        >
          <div className="wm-t4-processing-card">
            <span className="wm-t4-processing-spinner" />

            <strong>
              Salvando suas informações
            </strong>

            <p>
              Aguarde um instante. Estamos preparando a próxima etapa.
            </p>
          </div>
        </div>
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
      <Avatar nome={pessoa.nome} />

      <div>
        <strong>{pessoa.nome}</strong>
        <small>{pessoa.funcao}</small>
      </div>
    </div>
  );
}

function Avatar({ nome, pet = false }) {
  return (
    <span className={pet ? "wm-t4-pet-avatar fallback" : "wm-t4-avatar fallback"}>
      {iniciais(nome)}
    </span>
  );
}

function Bool({ ativo }) {
  return (
    <span
      className={`wm-t4-bool ${ativo ? "ok" : "no"}`}
      aria-label={ativo ? "Sim" : "Não"}
      title={ativo ? "Sim" : "Não"}
    >
      {ativo ? <Check size={12} /> : <X size={12} />}
    </span>
  );
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
  const cpfLimpo = somenteNumeros(funcionario?.cpf);
  const cpfValido =
    cpfLimpo.length === 11 &&
    validarCpf(funcionario?.cpf);

  function cpfDuplicadoLocal(cpf) {
    const cpfAtual = somenteNumeros(cpf);

    if (!cpfAtual) return false;

    if (somenteNumeros(cpfResponsavel) === cpfAtual) {
      return "responsavel";
    }

    const existe = funcionariosLar.some(
      (item) =>
        item.id !== funcionario.id &&
        somenteNumeros(item.cpf) === cpfAtual
    );

    return existe ? "funcionario" : false;
  }

  function atualizar(campo, valor) {
    setFuncionario((old) => {
      const novo = {
        ...old,
        [campo]: valor,
      };

      if (campo === "nome") {
        novo.nome = capitalizarNome(valor);
      }

      if (campo === "cpf") {
        novo.cpf = formatarCpf(valor);
        novo.cpf_pendente_validacao = false;
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

  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-t4-modal">
        <header className="wm-t4-modal-head">
          <div>
            <h2>
              {funcionario.id ? "Funcionário do lar" : "Adicionar funcionário do lar"}
            </h2>
            <p>Informe os dados que você souber. CPF e contatos são opcionais.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        <div className="wm-t4-modal-body">
          <section className="wm-t4-modal-section">
            <h3>Dados principais</h3>

            <div className="wm-t4-modal-grid two">
              <Field
                label="Nome completo *"
                value={funcionario.nome}
                onChange={(valor) => atualizar("nome", valor)}
                invalid={camposInvalidos.nome}
                placeholder="Nome do funcionário"
                autoComplete="name"
              />

              <label className="wm-t4-field">
                <span>Função *</span>

                <select
                  value={funcionario.funcao}
                  onChange={(event) => atualizar("funcao", event.target.value)}
                  className={camposInvalidos.funcao ? "invalid" : ""}
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
                onChange={(valor) => atualizar("cpf", valor)}
                invalid={camposInvalidos.cpf}
                inputMode="numeric"
                valid={cpfValido && !cpfDuplicadoLocal(funcionario.cpf)}
                placeholder="000.000.000-00"
                icon={<IdCard size={15} />}
              />

              <Field
                label="E-mail (opcional)"
                value={funcionario.email}
                onChange={(valor) => atualizar("email", valor.toLowerCase())}
                invalid={camposInvalidos.email}
                placeholder="email@exemplo.com"
                inputMode="email"
                icon={<Mail size={15} />}
                autoComplete="email"
              />
            </div>

            <div className="wm-t4-modal-grid phone-full">
              <Field
                label="Código do país"
                value={funcionario.ddi || "+55"}
                onChange={(valor) => atualizar("ddi", valor)}
                inputMode="tel"
                placeholder="+55"
                autoComplete="tel-country-code"
              />

              <Field
                label="WhatsApp (opcional)"
                value={funcionario.whatsapp}
                onChange={(valor) => atualizar("whatsapp", valor)}
                invalid={camposInvalidos.whatsapp}
                inputMode="tel"
                icon={<Phone size={15} />}
                placeholder="(11) 99999-9999"
                autoComplete="tel-national"
              />
            </div>
          </section>

          <section className="wm-t4-modal-section">
            <h3>Informações adicionais</h3>

            <PermissionCard
              checked={funcionario.autorizado_acesso_condominio}
              title="Pode ser identificado na portaria como funcionário do lar"
              text="Ajuda a portaria a reconhecer esta pessoa como vinculada à unidade."
              onChange={(valor) =>
                atualizar("autorizado_acesso_condominio", valor)
              }
            />

            <PermissionCard
              checked={funcionario.autorizado_receber_orientacoes}
              title="Pode receber orientações quando necessário"
              text="Use esta opção se a administração puder entrar em contato para orientações relacionadas à rotina da unidade."
              onChange={(valor) =>
                atualizar("autorizado_receber_orientacoes", valor)
              }
              green
            />

            <label className="wm-t4-field">
              <span>Observações (opcional)</span>

              <textarea
                value={funcionario.observacoes || ""}
                onChange={(event) =>
                  atualizar("observacoes", event.target.value)
                }
                placeholder="Ex.: cuidadora da moradora, trabalha com a família há anos."
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
  autoComplete = "off",
}) {
  return (
    <label className="wm-t4-field">
      <span>{label}</span>

      <div
        className={`wm-t4-input ${invalid ? "invalid" : ""} ${
          valid ? "valid" : ""
        }`}
      >
        {icon ? <i className="wm-t4-field-icon">{icon}</i> : null}

        <input
          value={value || ""}
          onChange={(event) => onChange?.(event.target.value)}
          inputMode={inputMode}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCorrect="off"
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
      className={`wm-t4-permission ${checked ? "active" : ""} ${
        green ? "green" : ""
      }`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span>{checked ? <Check size={13} /> : null}</span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </button>
  );
}

function ModalPet({
  pet,
  setPet,
  camposInvalidos,
  onClose,
  onSave,
}) {
  function atualizar(campo, valor) {
    setPet((old) => {
      const novo = {
        ...old,
        [campo]: valor,
      };

      if (campo === "nome") {
        novo.nome = capitalizarNome(valor);
      }

      if (campo === "raca") {
        novo.raca = capitalizarNome(valor);
      }

      if (campo === "cor") {
        novo.cor = capitalizarNome(valor);
      }

      return novo;
    });
  }

  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-t4-modal wm-t4-pet-modal">
        <header className="wm-t4-modal-head">
          <div>
            <h2>Pet da unidade</h2>
            <p>Informe apenas os dados necessários para identificação.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        <div className="wm-t4-modal-body">
          <section className="wm-t4-modal-section">
            <h3>Dados do pet</h3>

            <div className="wm-t4-modal-grid two">
              <Field
                label="Nome do pet *"
                value={pet.nome}
                onChange={(valor) => atualizar("nome", valor)}
                invalid={camposInvalidos.nome}
                placeholder="Nome do pet"
              />

              <label className="wm-t4-field">
                <span>Tipo *</span>

                <select
                  value={pet.tipo}
                  onChange={(event) => atualizar("tipo", event.target.value)}
                  className={camposInvalidos.tipo ? "invalid" : ""}
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
                onChange={(valor) => atualizar("raca", valor)}
                placeholder="Ex.: SRD, Poodle, Siamês"
              />

              <label className="wm-t4-field">
                <span>Porte</span>

                <select
                  value={pet.porte}
                  onChange={(event) => atualizar("porte", event.target.value)}
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
                onChange={(valor) => atualizar("cor", valor)}
                placeholder="Ex.: Caramelo"
              />
            </div>
          </section>

          <section className="wm-t4-modal-section">
            <h3>Observações</h3>

            <label className="wm-t4-field">
              <span>Observações (opcional)</span>

              <textarea
                value={pet.observacoes || ""}
                onChange={(event) =>
                  atualizar("observacoes", event.target.value)
                }
                placeholder="Ex.: dócil, usa guia, possui alguma necessidade de atenção."
              />
            </label>

            <div className="wm-t4-note inside-modal">
              <Info size={16} />
              <span>
                Este cadastro serve para identificação. As regras de convivência e
                circulação continuam sendo definidas pelo condomínio.
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

function ModalConfirmacao({
  titulo,
  texto,
  onClose,
  onConfirm,
}) {
  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-modal-card">
        <button
          type="button"
          className="wm-modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <h2>{titulo}</h2>
        <p>{texto}</p>

        <div className="wm-modal-actions">
          <button type="button" className="wm-modal-secondary" onClick={onClose}>
            Cancelar
          </button>

          <button
            type="button"
            className="wm-modal-primary"
            onClick={onConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}