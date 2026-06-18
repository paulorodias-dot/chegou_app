import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import "../styles/wizardMorador/WizardMoradorBase.css";
import "../styles/wizardMorador/WizardMoradorLayout.css";
import "../styles/wizardMorador/WizardMoradorMobile.css";
import "../styles/wizardMorador/WizardMoradorDark.css";

import WizardMoradorLayout from "../components/wizardMorador/WizardMoradorLayout";
import WizardMoradorWelcome from "../components/wizardMorador/WizardMoradorWelcome";

import WizardMoradorTela1 from "../components/wizardMorador/telas/WizardMoradorTela1";
import WizardMoradorTela2 from "../components/wizardMorador/telas/WizardMoradorTela2";
import WizardMoradorTela3 from "../components/wizardMorador/telas/WizardMoradorTela3";
import WizardMoradorTela4 from "../components/wizardMorador/telas/WizardMoradorTela4";
import WizardMoradorTela5 from "../components/wizardMorador/telas/WizardMoradorTela5";
import WizardMoradorTela6 from "../components/wizardMorador/telas/WizardMoradorTela6";
import WizardMoradorTela7 from "../components/wizardMorador/telas/WizardMoradorTela7";
import WizardMoradorTela8 from "../components/wizardMorador/telas/WizardMoradorTela8";
import WizardMoradorTela9 from "../components/wizardMorador/telas/WizardMoradorTela9";

import {
  carregarWizardMorador,
  autosaveWizardMorador,
  salvarEtapaWizardMorador,
  enviarWizardParaAuditoria,
} from "../services/wizardMoradorService";

const TOTAL_ETAPAS = 9;

const PERFIS_PULAM_ETAPAS = [
  "proprietario_nao_residente",
  "proprietario_unidade_alugada",
  "unidade_vazia",
];

const ETAPAS_PULADAS_SEM_MORADIA = [3, 4];

const formTela1Inicial = {
  perfilUnidade: "",
  confirmouDadosConvite: false,
};

const formMoradorInicial = {
  nomeCompleto: "",
  nomeSocial: "",
  cpf: "",
  dataNascimento: "",
  emailPrincipal: "",
  ddi: "+55",
  whatsapp: "",
  notificacaoPush: true,
  notificacaoWhatsapp: true,
  notificacaoEmail: true,
};

const termosInicial = {
  aceiteTermos: false,
  aceiteLgpd: false,
  aceiteComunicacoes: false,
};

const estruturaInicial = {
  possuiVeiculo: false,
  veiculos: [],
  possuiVaga: false,
  vagas: [],
};

const ecossistemaInicial = {
  possuiFuncionarioLar: false,
  funcionariosLar: [],
  possuiPet: false,
  pets: [],
};

const sandboxData = {
  token: "sandbox-token-morador",
  sessao_id: "sandbox-session",
  etapa_atual: 1,
  progresso: 11,
  pre_cadastro_id: "sandbox-pre-cadastro",
  business_id: "BUSINESS-LAPLACA",
  condominio_id: "sandbox-condominio",
  token_expira_em: "2026-12-31T23:59:59.000Z",

  condominio: {
    nome_fantasia: "Condomínio La Plaça",
    endereco: "Rua Exemplo, 123 • Vila Mariana • São Paulo/SP",
    sindico_nome: "Carlos Roberto",
    sindico_whatsapp: "(11) 99999-9999",
  },

  preCadastro: {
    torre: "Torre 1",
    unidade: "101",
    tipo_cadastro: "pf",
    relacao_unidade: "",
    documento: "123.456.789-90",
    nome: "João da Silva Andrade",
    nome_social: "",
    cpf: "123.456.789-90",
    email: "joao.andrade@email.com",
    ddi: "+55",
    telefone: "+5511999999999",
  },

  torres: [{ id: "torre-a", nome: "Torre 1" }],
  unidades: [{ id: "apt-101", torre_id: "torre-a", nome: "101" }],
};

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function formatarDDI(valor = "") {
  const numeros = somenteNumeros(valor).slice(0, 3);
  return numeros ? `+${numeros}` : "+55";
}

function formatarTelefoneBrasil(valor = "") {
  const numeros = somenteNumeros(valor).slice(0, 11);

  if (numeros.length <= 2) return numeros ? `(${numeros}` : "";

  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function extrairWhatsApp(pre = {}, dados = {}) {
  const telefoneBruto = String(pre.telefone || dados.telefone || "").replace(/\D/g, "");
  const ddi = String(pre.ddi || dados.ddi || "55").replace(/\D/g, "") || "55";

  let numero = telefoneBruto;

  if (numero.startsWith(ddi) && numero.length > 11) {
    numero = numero.slice(ddi.length);
  }

  return {
    ddi: formatarDDI(ddi),
    whatsapp: formatarTelefoneBrasil(numero),
  };
}

function obterPreCadastro(dados) {
  return dados?.preCadastro || dados?.pre_cadastro || {};
}

function obterProgresso(etapa) {
  return Math.round((Number(etapa || 1) / TOTAL_ETAPAS) * 100);
}

function rolarParaTopo() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function normalizarPerfilUnidade(perfil = "") {
  return String(perfil || "").trim();
}

function perfilDevePularEtapas(perfil = "") {
  return PERFIS_PULAM_ETAPAS.includes(normalizarPerfilUnidade(perfil));
}

function etapaPermitidaParaPerfil(etapa, perfil = "") {
  if (
    perfilDevePularEtapas(perfil) &&
    ETAPAS_PULADAS_SEM_MORADIA.includes(Number(etapa))
  ) {
    return false;
  }

  return true;
}

function corrigirEtapaParaPerfil(etapa, perfil = "") {
  const etapaNumero = Math.min(Math.max(Number(etapa || 1), 1), TOTAL_ETAPAS);

  if (
    perfilDevePularEtapas(perfil) &&
    ETAPAS_PULADAS_SEM_MORADIA.includes(etapaNumero)
  ) {
    return 5;
  }

  return etapaNumero;
}

function obterEtapasDesabilitadas(perfil = "") {
  return perfilDevePularEtapas(perfil) ? ETAPAS_PULADAS_SEM_MORADIA : [];
}

export default function WizardMorador({ modoTeste = false }) {
  const autosaveTimer = useRef(null);

  const [loading, setLoading] = useState(true);
  const [wizardData, setWizardData] = useState(null);
  const [erroCarga, setErroCarga] = useState("");

  const [mostrarWelcome, setMostrarWelcome] = useState(false);

  const [etapaAtual, setEtapaAtual] = useState(1);
  const [maiorEtapaLiberada, setMaiorEtapaLiberada] = useState(1);
  const [progresso, setProgresso] = useState(0);

  const [formTela1, setFormTela1] = useState(formTela1Inicial);
  const [formMorador, setFormMorador] = useState(formMoradorInicial);
  const [dependentes, setDependentes] = useState([]);
  const [ecossistema, setEcossistema] = useState(ecossistemaInicial);
  const [estrutura, setEstrutura] = useState(estruturaInicial);
  const [termos, setTermos] = useState(termosInicial);
  const [pesquisa, setPesquisa] = useState({});

  const tokenUrl = useMemo(() => {
    return new URLSearchParams(window.location.search).get("token");
  }, []);

  const usarModoTeste = modoTeste && !tokenUrl;
  const dadosAtuais = wizardData || sandboxData;

  const tokenAtual =
    tokenUrl ||
    wizardData?.token_convite ||
    wizardData?.token ||
    (usarModoTeste ? sandboxData.token : null);

  const perfilAtual = formTela1?.perfilUnidade || "";
  const etapasDesabilitadas = obterEtapasDesabilitadas(perfilAtual);

  const chaveWelcome = useMemo(() => {
    return `wizard_morador_welcome_visto_${tokenAtual || "sem_token"}`;
  }, [tokenAtual]);

  const inicializarFormulario = useCallback((dados) => {
    const pre = obterPreCadastro(dados);
    const telefone = extrairWhatsApp(pre, dados);

    const perfilInicial =
      pre.perfil_unidade ||
      pre.relacao_unidade ||
      dados?.perfil_unidade ||
      dados?.relacao_unidade ||
      "";

    const etapaSalva = Number(
      dados?.preCadastro?.etapa_atual ||
        dados?.pre_cadastro?.etapa_atual ||
        dados?.etapa_atual ||
        1
    );

    const etapaLocal = Number(
      sessionStorage.getItem("wizard_morador_etapa_atual") || 0
    );

    const etapaBase = etapaLocal || etapaSalva || 1;

    const etapaInicial = corrigirEtapaParaPerfil(etapaBase, perfilInicial);

    setFormTela1({
      perfilUnidade: perfilInicial,
      confirmouDadosConvite: false,
    });

    setFormMorador({
      ...formMoradorInicial,
      nomeCompleto: dados?.nome || pre.nome || "",
      nomeSocial: dados?.nome_social || pre.nome_social || dados?.nomeSocial || "",
      cpf: dados?.documento_cpf_cnpj || pre.cpf || pre.documento || "",
      dataNascimento: dados?.data_nascimento || pre.data_nascimento || "",
      emailPrincipal: dados?.email || pre.email || "",
      ddi: telefone.ddi,
      whatsapp: telefone.whatsapp,
      notificacaoPush: dados?.notificacao_push ?? true,
      notificacaoWhatsapp: dados?.notificacao_whatsapp ?? true,
      notificacaoEmail: dados?.notificacao_email ?? true,
    });

    setDependentes(Array.isArray(dados?.dependentes) ? dados.dependentes : []);

    setEcossistema({
      ...ecossistemaInicial,
      ...(dados?.ecossistema || dados?.funcionarios_pets || {}),
      funcionariosLar:
        dados?.funcionarios_lar ||
        dados?.funcionariosLar ||
        dados?.ecossistema?.funcionariosLar ||
        [],
      pets: dados?.pets || dados?.ecossistema?.pets || [],
    });

    setEstrutura({
      ...estruturaInicial,
      ...(dados?.estrutura || dados?.veiculos_vagas || {}),
      veiculos: dados?.veiculos || dados?.estrutura?.veiculos || [],
      vagas: dados?.vagas || dados?.estrutura?.vagas || [],
    });

    setTermos({
      aceiteTermos: Boolean(
        dados?.aceite_termos ||
          dados?.preCadastro?.aceite_termos ||
          dados?.pre_cadastro?.aceite_termos
      ),
      aceiteLgpd: Boolean(
        dados?.aceite_lgpd ||
          dados?.preCadastro?.aceite_lgpd ||
          dados?.pre_cadastro?.aceite_lgpd
      ),
      aceiteComunicacoes: Boolean(
        dados?.aceite_comunicacoes ||
          dados?.preCadastro?.aceite_comunicacoes ||
          dados?.pre_cadastro?.aceite_comunicacoes
      ),
    });

    setPesquisa(dados?.pesquisa || {});

    setEtapaAtual(etapaInicial);
    setMaiorEtapaLiberada(etapaInicial);
    setProgresso(obterProgresso(etapaInicial));
  }, []);

  useEffect(() => {
    document.title = "Chegou! | Wizard Morador";
  }, []);

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        setErroCarga("");

        if (usarModoTeste) {
          setWizardData(sandboxData);
          inicializarFormulario(sandboxData);
          return;
        }

        if (!tokenAtual) {
          throw new Error("Token do convite não informado.");
        }

        const dados = await carregarWizardMorador(tokenAtual);

        const dadosComToken = {
          ...dados,
          token: tokenAtual,
          token_convite: tokenAtual,
        };

        setWizardData(dadosComToken);
        inicializarFormulario(dadosComToken);
      } catch (error) {
        console.error(error);
        setErroCarga(error.message || "Erro ao carregar wizard.");
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [usarModoTeste, tokenAtual, inicializarFormulario]);

  useEffect(() => {
    if (loading || erroCarga) return;

    const jaViuWelcome = sessionStorage.getItem(chaveWelcome);

    if (!jaViuWelcome) {
      setMostrarWelcome(true);
    }
  }, [loading, erroCarga, chaveWelcome]);

  function fecharWelcome() {
    sessionStorage.setItem(chaveWelcome, "sim");
    setMostrarWelcome(false);

    setTimeout(() => {
      rolarParaTopo();
    }, 50);
  }

  const dispararAutosave = useCallback(
    (dadosParciais) => {
      if (usarModoTeste) return;
      if (!tokenAtual) return;

      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }

      autosaveTimer.current = setTimeout(async () => {
        try {
          await autosaveWizardMorador({
            token: tokenAtual,
            etapa: etapaAtual,
            dados: dadosParciais,
            sessaoId: dadosAtuais?.sessao_id || dadosAtuais?.sessao?.id,
            progresso,
          });
        } catch (error) {
          console.warn("Autosave falhou:", error);
        }
      }, 1000);
    },
    [usarModoTeste, tokenAtual, etapaAtual, progresso, dadosAtuais]
  );

  const atualizarFormTela1 = useCallback(
    (campo, valor) => {
      setFormTela1((old) => {
        const novo = {
          ...old,
          [campo]: valor,
        };

        dispararAutosave({
          etapa: 1,
          tela1: novo,
        });

        return novo;
      });
    },
    [dispararAutosave]
  );

  const atualizarFormMorador = useCallback(
    (atualizador) => {
      setFormMorador((old) => {
        const novo =
          typeof atualizador === "function" ? atualizador(old) : atualizador;

        dispararAutosave({
          etapa: 2,
          tela2: novo,
        });

        return novo;
      });
    },
    [dispararAutosave]
  );

  const atualizarEcossistema = useCallback(
    (dados) => {
      setEcossistema((old) => {
        const novo = {
          ...old,
          ...dados,
        };

        dispararAutosave({
          etapa: 4,
          tela4: novo,
        });

        return novo;
      });
    },
    [dispararAutosave]
  );

  const atualizarEstrutura = useCallback(
    (dados) => {
      setEstrutura((old) => {
        const novo = {
          ...old,
          ...dados,
        };

        dispararAutosave({
          etapa: 5,
          tela5: novo,
        });

        return novo;
      });
    },
    [dispararAutosave]
  );

  function obterProximaEtapa(etapaRecebida) {
    const etapa = Number(etapaRecebida || etapaAtual);

    if (perfilDevePularEtapas(perfilAtual) && etapa === 2) {
      return 5;
    }

    return Math.min(etapa + 1, TOTAL_ETAPAS);
  }

  function obterEtapaAnterior() {
    if (perfilDevePularEtapas(perfilAtual) && etapaAtual === 5) {
      return 2;
    }

    return Math.max(etapaAtual - 1, 1);
  }

  function aplicarMudancaEtapa(novaEtapa) {
    const etapaCorrigida = corrigirEtapaParaPerfil(novaEtapa, perfilAtual);

    setEtapaAtual(etapaCorrigida);
    setMaiorEtapaLiberada((old) => Math.max(old, etapaCorrigida));
    setProgresso(obterProgresso(etapaCorrigida));

    setTimeout(() => {
      rolarParaTopo();
    }, 50);
  }

  function irParaEtapa(numeroEtapa) {
    const etapa = Number(numeroEtapa);

    if (etapa > maiorEtapaLiberada) return;

    if (!etapaPermitidaParaPerfil(etapa, perfilAtual)) {
      toast("Esta etapa não se aplica ao perfil selecionado.");
      return;
    }

    aplicarMudancaEtapa(etapa);
  }

  useEffect(() => {
    function receberIrEtapa(event) {
      const etapa = Number(event.detail?.etapa || 1);

      if (etapa <= maiorEtapaLiberada) {
        irParaEtapa(etapa);
      }
    }

    window.addEventListener("wizard-morador-ir-etapa", receberIrEtapa);

    return () => {
      window.removeEventListener("wizard-morador-ir-etapa", receberIrEtapa);
    };
  }, [maiorEtapaLiberada, perfilAtual]);

  async function salvarEResponder(etapa, dados, avancar = true) {
    const proximaEtapa = avancar ? obterProximaEtapa(etapa) : etapa;

    if (usarModoTeste) {
      if (avancar) aplicarMudancaEtapa(proximaEtapa);
      return true;
    }

    try {
      await salvarEtapaWizardMorador({
        token: tokenAtual,
        etapa,
        dados,
        avancar,
      });

      if (avancar) {
        aplicarMudancaEtapa(proximaEtapa);
      } else {
        setProgresso(obterProgresso(etapa));
      }

      return true;
    } catch (error) {
      toast.error(error.message || "Erro ao salvar etapa.");
      return false;
    }
  }

  async function handleCancelar() {
    const confirmar = window.confirm(
      "Deseja realmente sair deste cadastro? Os dados salvos poderão ser retomados pelo mesmo convite."
    );

    if (!confirmar) return;

    window.location.assign("/");
  }

  async function handleFinalizarWizard(payloadFinal) {
    try {
      const retorno = await enviarWizardParaAuditoria({
        token: tokenAtual,
        aceiteTermos:
          termos.aceiteTermos ||
          payloadFinal?.tela7?.aceite_termos === true,

        aceiteLgpd:
          termos.aceiteLgpd ||
          payloadFinal?.tela7?.aceite_lgpd === true,
        dadosFinais: payloadFinal,
      });

      toast.success("Cadastro enviado para análise.");

      return retorno;
    } catch (error) {
      console.error("Erro ao finalizar WizardMorador:", error);

      toast.error(error.message || "Erro ao finalizar wizard.");

      throw error;
    }
  }

  function voltarEtapa() {
    aplicarMudancaEtapa(obterEtapaAnterior());
  }

  function renderizarTelaAtual() {
    const propsBase = {
      dadosWizard: dadosAtuais,
      formTela1,
      formMorador,
      dependentes,
      ecossistema,
      estrutura,
      termos,
      pesquisa,
      onCancel: handleCancelar,
      irParaEtapa,
      etapasDesabilitadas,
    };

    switch (etapaAtual) {
      case 1:
        return (
          <WizardMoradorTela1
            {...propsBase}
            setFormTela1={atualizarFormTela1}
            onNext={(payload) => salvarEResponder(1, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(1, payload, false)}
          />
        );

      case 2:
        return (
          <WizardMoradorTela2
            {...propsBase}
            setFormMorador={atualizarFormMorador}
            onBack={voltarEtapa}
            onNext={(payload) => salvarEResponder(2, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(2, payload, false)}
          />
        );

      case 3:
        return (
          <WizardMoradorTela3
            {...propsBase}
            setDependentes={setDependentes}
            onBack={voltarEtapa}
            onNext={(payload) => salvarEResponder(3, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(3, payload, false)}
          />
        );

      case 4:
        return (
          <WizardMoradorTela4
            {...propsBase}
            setEcossistema={atualizarEcossistema}
            onBack={voltarEtapa}
            onNext={(payload) => salvarEResponder(4, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(4, payload, false)}
          />
        );

      case 5:
        return (
          <WizardMoradorTela5
            {...propsBase}
            setEstrutura={atualizarEstrutura}
            onBack={voltarEtapa}
            onNext={(payload) => salvarEResponder(5, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(5, payload, false)}
          />
        );

      case 6:
        return (
          <WizardMoradorTela6
            {...propsBase}
            estruturaGaragem={estrutura}
            funcionarios={ecossistema?.funcionariosLar || []}
            pets={ecossistema?.pets || []}
            onVoltar={voltarEtapa}
            onIrParaEtapa={irParaEtapa}
            onSalvarRascunho={(payload) => salvarEResponder(6, payload, false)}
            onContinuar={(payload) => salvarEResponder(6, payload, true)}
          />
        );

      case 7:
        return (
          <WizardMoradorTela7
            {...propsBase}
            setTermos={setTermos}
            onBack={voltarEtapa}
            onNext={(payload) => {
              setTermos({
                aceiteTermos: Boolean(payload?.aceite_termos),
                aceiteLgpd: Boolean(payload?.aceite_lgpd),
                aceiteComunicacoes: Boolean(
                  payload?.aceite_comunicacoes ||
                  payload?.aceite_comunicacao_operacional
                ),
              });

              return salvarEResponder(7, payload, true);
            }}
            onSaveDraft={(payload) => salvarEResponder(7, payload, false)}
          />
        );

      case 8:
        return (
          <WizardMoradorTela8
            {...propsBase}
            setPesquisa={setPesquisa}
            onBack={voltarEtapa}
            onNext={(payload) => salvarEResponder(8, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(8, payload, false)}
          />
        );

      case 9:
        return (
          <WizardMoradorTela9
            {...propsBase}
            onBack={voltarEtapa}
            onFinish={handleFinalizarWizard}
          />
        );

      default:
        return null;
    }
  }

  if (loading) {
    return (
      <div className="wm-loading">
        <div className="wm-loading-card">
          <h2>Carregando Wizard Morador...</h2>
          <p>Validando convite e preparando cadastro.</p>
        </div>
      </div>
    );
  }

  if (erroCarga) {
    return (
      <div className="wm-loading">
        <div className="wm-loading-card">
          <h2>Não foi possível abrir o cadastro</h2>
          <p>{erroCarga}</p>
        </div>
      </div>
    );
  }

  if (mostrarWelcome) {
    return (
      <WizardMoradorWelcome
        dadosWizard={dadosAtuais}
        onStart={fecharWelcome}
      />
    );
  }

  return (
    <WizardMoradorLayout
      etapaAtual={etapaAtual}
      totalEtapas={TOTAL_ETAPAS}
      progresso={progresso}
      maiorEtapaLiberada={maiorEtapaLiberada}
      dadosWizard={dadosAtuais}
      etapasDesabilitadas={etapasDesabilitadas}
    >
      {renderizarTelaAtual()}
    </WizardMoradorLayout>
  );
}