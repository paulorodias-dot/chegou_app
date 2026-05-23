import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import "../styles/WizardMorador.css";

import WizardMoradorLayout from "../components/wizardMorador/WizardMoradorLayout";
import WizardMoradorTela1 from "../components/wizardMorador/telas/WizardMoradorTela1";
import WizardMoradorTela2 from "../components/wizardMorador/telas/WizardMoradorTela2";
import WizardMoradorTela3 from "../components/wizardMorador/telas/WizardMoradorTela3";
import WizardMoradorTela4 from "../components/wizardMorador/telas/WizardMoradorTela4";
import WizardMoradorTela5 from "../components/wizardMorador/telas/WizardMoradorTela5";
import WizardMoradorTela6 from "../components/wizardMorador/telas/WizardMoradorTela6";
import WizardMoradorTela7 from "../components/wizardMorador/telas/WizardMoradorTela7";

import {
  carregarWizardMorador,
  autosaveWizardMorador,
  salvarEtapaWizardMorador,
  enviarWizardParaAuditoria,
} from "../services/wizardMoradorService";

const TOTAL_ETAPAS = 7;

const formMoradorInicial = {
  nomeCompleto: "",
  cpf: "",
  dataNascimento: "",
  emailPrincipal: "",
  ddi: "55",
  ddd: "",
  whatsapp: "",
  notificacaoPush: true,
  notificacaoWhatsapp: true,
  notificacaoEmail: true,
  senha: "",
  confirmarSenha: "",
};

const formTela1Inicial = {
  perfilUnidade: "",
  confirmouDadosConvite: false,
};

const sandboxData = {
  token: "sandbox-token-morador",
  sessao_id: "sandbox-session",
  etapa_atual: 1,
  progresso: 14,
  pre_cadastro_id: "sandbox-pre-cadastro",
  business_id: "BUSINESS-LAPLACA",
  condominio_id: "sandbox-condominio",
  token_expira_em: "2026-12-31T23:59:59.000Z",

  condominio: {
    nome_fantasia: "Condomínio La Plaça",
    endereco: "Rua Exemplo, 123 • Vila Mariana • São Paulo/SP • CEP 04000-000",
    sindico_nome: "Carlos Roberto",
    sindico_whatsapp: "(11) 99999-9999",
    torres: 4,
    unidades: 128,
  },

  pre_cadastro: {
    torre_id: "torre-a",
    unidade_id: "apt-101",
    torre_nome: "Torre 1",
    unidade_nome: "101",
    tipo_cadastro: "pf",
    relacao_unidade: "",
    documento: "123.456.789-90",
    nome: "João da Silva Andrade",
    cpf: "123.456.789-90",
    email: "joao.andrade@email.com",
    ddi: "55",
    ddd: "11",
    telefone: "99999-9999",
  },

  torres: [
    { id: "torre-a", nome: "Torre 1" },
    { id: "torre-b", nome: "Torre 2" },
    { id: "torre-c", nome: "Torre 3" },
  ],

  unidades: [
    { id: "apt-101", torre_id: "torre-a", nome: "101" },
    { id: "apt-102", torre_id: "torre-a", nome: "102" },
    { id: "apt-201", torre_id: "torre-b", nome: "201" },
  ],
};

function extrairWhatsApp(pre = {}, dados = {}) {
  const ddi = String(pre.ddi || dados.ddi || "55").replace(/\D/g, "") || "55";
  const ddd = String(pre.ddd || dados.ddd || "").replace(/\D/g, "");
  const numeroBruto = String(pre.telefone || dados.telefone || "").replace(/\D/g, "");

  if (ddd && numeroBruto) {
    return {
      ddi,
      ddd,
      whatsapp: numeroBruto,
    };
  }

  if (numeroBruto.length >= 10) {
    return {
      ddi,
      ddd: numeroBruto.slice(0, 2),
      whatsapp: numeroBruto.slice(2),
    };
  }

  return {
    ddi,
    ddd: "",
    whatsapp: numeroBruto,
  };
}

export default function WizardMorador({ modoTeste = false }) {
  const autosaveTimer = useRef(null);

  const [loading, setLoading] = useState(true);
  const [wizardData, setWizardData] = useState(null);
  const [erroCarga, setErroCarga] = useState("");

  const [etapaAtual, setEtapaAtual] = useState(1);
  const [progresso, setProgresso] = useState(0);

  const [formTela1, setFormTela1] = useState(formTela1Inicial);
  const [formMorador, setFormMorador] = useState(formMoradorInicial);
  const [dependentes, setDependentes] = useState([]);
  const [termos, setTermos] = useState({
    aceiteTermos: false,
    aceiteLgpd: false,
    aceiteComunicacoes: false,
  });
  const [pesquisa, setPesquisa] = useState({});

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const dadosAtuais = wizardData || sandboxData;

  const inicializarFormulario = useCallback((dados) => {
    const pre = dados?.pre_cadastro || {};
    const telefone = extrairWhatsApp(pre, dados);

    setFormTela1({
      perfilUnidade: pre.relacao_unidade || dados?.relacao_unidade || "",
      confirmouDadosConvite: false,
    });

    setFormMorador({
      ...formMoradorInicial,
      nomeCompleto: dados?.nome || pre.nome || "",
      cpf: dados?.documento_cpf_cnpj || pre.cpf || pre.documento || "",
      dataNascimento: dados?.data_nascimento || pre.data_nascimento || "",
      emailPrincipal: dados?.email || pre.email || "",
      ddi: telefone.ddi,
      ddd: telefone.ddd,
      whatsapp: telefone.whatsapp,
    });

    setDependentes(Array.isArray(dados?.dependentes) ? dados.dependentes : []);

    setTermos({
      aceiteTermos: Boolean(dados?.aceite_termos),
      aceiteLgpd: Boolean(dados?.aceite_lgpd),
      aceiteComunicacoes: Boolean(dados?.aceite_comunicacoes),
    });

    setPesquisa(dados?.pesquisa || {});

    setEtapaAtual(dados?.etapa_atual || 1);
    setProgresso(dados?.progresso || 0);
  }, []);

  useEffect(() => {
    document.title = "Chegou! | Wizard Morador";
  }, []);


  const tokenUrl = new URLSearchParams(window.location.search).get("token");

  const usarModoTeste = modoTeste && !tokenUrl;

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

        if (!token) {
          throw new Error("Token do convite não informado.");
        }

        const tokenFinal = tokenUrl || token;

        const dados = await carregarWizardMorador(tokenFinal);

        const etapaSalva =
          Number(
            dados?.preCadastro?.etapa_atual ||
            dados?.pre_cadastro?.etapa_atual ||
            dados?.preCadastro?.etapaAtual ||
            dados?.pre_cadastro?.etapaAtual ||
            dados?.etapa_atual ||
            1
          ) || 1;

        const dadosComToken = {
          ...dados,
          token: tokenFinal,
          token_convite: tokenFinal,
          etapa_atual: etapaSalva,
        };

        setWizardData(dadosComToken);
        setEtapaAtual(etapaSalva);
        inicializarFormulario(dadosComToken);
        
      } catch (error) {
        console.error(error);
        setErroCarga(error.message || "Erro ao carregar wizard.");
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, [usarModoTeste, token, tokenUrl, inicializarFormulario]);

  const dispararAutosave = useCallback(
    (dadosParciais) => {
      if (modoTeste) return;
      if (!token) return;

      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }

      autosaveTimer.current = setTimeout(async () => {
        try {
          await autosaveWizardMorador({
            token,
            etapa: etapaAtual,
            dados: dadosParciais,
            sessaoId: dadosAtuais?.sessao_id || dadosAtuais?.sessao?.id,
            progresso,
          });
        } catch (error) {
          console.warn("Autosave falhou:", error);
        }
      }, 1200);
    },
    [modoTeste, token, etapaAtual, progresso, dadosAtuais]
  );

  const atualizarTela1 = useCallback(
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
          tela1: formTela1,
          tela2: novo,
        });

        return novo;
      });
    },
    [dispararAutosave, formTela1]
  );

  function obterProximaEtapa(etapaAtualRecebida) {
    const perfil = formTela1?.perfilUnidade;

    if (etapaAtualRecebida === 2) {
      if (
        perfil === "unidade_vazia" ||
        perfil === "proprietario_nao_residente"
      ) {
        toast("Algumas etapas foram puladas porque este perfil não possui dependentes vinculados ao uso da unidade.");
        return 4;
      }
    }

  return Math.min(etapaAtualRecebida + 1, TOTAL_ETAPAS);
}

  async function salvarEResponder(etapa, dados, avancar = true) {
    if (modoTeste) {
      if (avancar && etapaAtual < TOTAL_ETAPAS) {
        setEtapaAtual(obterProximaEtapa(etapa));
        setProgresso(Math.round(((etapa + 1) / TOTAL_ETAPAS) * 100));
      }

      return true;
    }

    try {
      await salvarEtapaWizardMorador({
        token,
        etapa,
        dados,
        avancar,
      });

      if (avancar && etapaAtual < TOTAL_ETAPAS) {
        setEtapaAtual((old) => old + 1);
      }

      setProgresso(Math.round(((etapa + 1) / TOTAL_ETAPAS) * 100));

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

    window.location.href = "/";
  }

  async function handleFinalizarWizard(payloadFinal) {
    try {
      await enviarWizardParaAuditoria({
        token,
        aceiteTermos: termos.aceiteTermos,
        aceiteLgpd: termos.aceiteLgpd,
        dadosFinais: payloadFinal,
      });

      toast.success("Cadastro enviado para análise.");
      setEtapaAtual(7);
      setProgresso(100);
    } catch (error) {
      toast.error(error.message || "Erro ao finalizar wizard.");
    }
  }

  function voltarEtapa() {
    setEtapaAtual((old) => Math.max(1, old - 1));
  }

  function irParaEtapa(numeroEtapa) {
    setEtapaAtual(Math.min(Math.max(numeroEtapa, 1), TOTAL_ETAPAS));
  }

  function renderizarTelaAtual() {
    switch (etapaAtual) {
      case 1:
        return (
          <WizardMoradorTela1
            dadosWizard={dadosAtuais}
            formTela1={formTela1}
            setFormTela1={atualizarTela1}
            onNext={(payload) => salvarEResponder(1, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(1, payload, false)}
            onCancel={handleCancelar}
          />
        );

      case 2:
        return (
          <WizardMoradorTela2
            dadosWizard={dadosAtuais}
            formTela1={formTela1}
            formMorador={formMorador}
            setFormMorador={atualizarFormMorador}
            onBack={voltarEtapa}
            onNext={(payload) => salvarEResponder(2, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(2, payload, false)}
            onCancel={handleCancelar}
          />
        );

      case 3:
        return (
          <WizardMoradorTela3
            dadosWizard={dadosAtuais}
            formTela1={formTela1}
            formMorador={formMorador}
            dependentes={dependentes}
            setDependentes={setDependentes}
            onBack={voltarEtapa}
            onNext={(payload) => salvarEResponder(3, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(3, payload, false)}
            onCancel={handleCancelar}
          />
        );

      case 4:
        return (
          <WizardMoradorTela4
            dadosWizard={dadosAtuais}
            formTela1={formTela1}
            formMorador={formMorador}
            dependentes={dependentes}
            termos={termos}
            setTermos={setTermos}
            onBack={voltarEtapa}
            onNext={(payload) => salvarEResponder(4, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(4, payload, false)}
            onCancel={handleCancelar}
          />
        );

      case 5:
        return (
          <WizardMoradorTela5
            dadosWizard={dadosAtuais}
            formTela1={formTela1}
            formMorador={formMorador}
            dependentes={dependentes}
            termos={termos}
            onBack={voltarEtapa}
            onNext={(payload) => salvarEResponder(5, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(5, payload, false)}
            onCancel={handleCancelar}
            irParaEtapa={irParaEtapa}
          />
        );

      case 6:
        return (
          <WizardMoradorTela6
            dadosWizard={dadosAtuais}
            formTela1={formTela1}
            formMorador={formMorador}
            dependentes={dependentes}
            pesquisa={pesquisa}
            setPesquisa={setPesquisa}
            onBack={voltarEtapa}
            onNext={(payload) => salvarEResponder(6, payload, true)}
            onSaveDraft={(payload) => salvarEResponder(6, payload, false)}
            onCancel={handleCancelar}
          />
        );

      case 7:
        return (
          <WizardMoradorTela7
            dadosWizard={dadosAtuais}
            formTela1={formTela1}
            formMorador={formMorador}
            dependentes={dependentes}
            termos={termos}
            pesquisa={pesquisa}
            onBack={voltarEtapa}
            onFinish={handleFinalizarWizard}
            onCancel={handleCancelar}
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

  return (
    <WizardMoradorLayout
      etapaAtual={etapaAtual}
      totalEtapas={TOTAL_ETAPAS}
      progresso={progresso}
      dadosWizard={dadosAtuais}
    >
      {renderizarTelaAtual()}
    </WizardMoradorLayout>
  );
}