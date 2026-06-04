import {
  Building2,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Info,
  LockKeyhole,
  Moon,
  PawPrint,
  SearchCheck,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import logoBranco from "../../assets/logo_branco.png";
import logoAzulRoyal from "../../assets/logo_azulroyal.png";

const ETAPAS = [
  { numero: 1, titulo: "Identificação", subtitulo: "da Unidade" },
  { numero: 2, titulo: "Dados", subtitulo: "Pessoais" },
  { numero: 3, titulo: "Dependentes", subtitulo: "Autorizados" },
  { numero: 4, titulo: "Funcionários", subtitulo: "e Pets" },
  { numero: 5, titulo: "Estrutura", subtitulo: "da Unidade" },
  { numero: 6, titulo: "Revisão", subtitulo: "dos Dados" },
  { numero: 7, titulo: "Senha e", subtitulo: "Aceites" },
  { numero: 8, titulo: "Pesquisa", subtitulo: "(opcional)" },
  { numero: 9, titulo: "Finalização", subtitulo: "e Status" },
];

const SIDEBAR_POR_ETAPA = {
  1: {
    icon: ShieldCheck,
    titulo: "Segurança em primeiro lugar",
    texto:
      "Confirme os dados recebidos no convite e selecione o perfil correto da unidade.",
    chips: ["Acesso via convite", "Dados protegidos", "Perfil auditável"],
    blocoTitulo: "Por que pedimos essas informações?",
    itens: [
      "Para identificar corretamente quem deve receber cada encomenda.",
      "Para separar proprietário, inquilino e responsável quando necessário.",
      "Para manter as notificações vinculadas ao perfil correto.",
    ],
    faq: [
      {
        pergunta: "Posso alterar meus dados depois?",
        resposta:
          "Sim. Na próxima etapa você poderá revisar e corrigir dados pessoais, como nome, e-mail e WhatsApp. Dados ligados ao convite, como condomínio, torre e unidade, podem depender da administração do condomínio.",
      },
      {
        pergunta: "O proprietário também precisa ter acesso?",
        resposta:
          "Sim, quando houver necessidade de acompanhar comunicações, unidade vazia ou unidade alugada. O proprietário e o morador/inquilino podem ter acessos separados para evitar mistura de notificações e responsabilidades.",
      },
      {
        pergunta: "O que acontece se eu escolher o perfil errado?",
        resposta:
          "Você poderá voltar e corrigir antes de finalizar o cadastro. Se a divergência for identificada após o envio, o responsável administrativo poderá solicitar ajuste ou corrigir durante a auditoria.",
      },
    ],
    importante:
      "As notificações de encomendas serão sempre enviadas ao perfil cadastrado neste momento.",
  },

  2: {
    icon: UserRound,
    titulo: "Dados pessoais seguros",
    texto:
      "Use dados reais e atualizados para permitir auditoria, contato e recuperação de acesso.",
    chips: ["CPF auditável", "E-mail validado", "WhatsApp atualizado"],
    blocoTitulo: "Boas práticas de preenchimento",
    itens: [
      "Digite seu nome completo como aparece em documento.",
      "Use e-mail que você acessa com frequência.",
      "Informe WhatsApp ativo para comunicações importantes.",
    ],
    faq: [
      {
        pergunta: "Por que o CPF é solicitado?",
        resposta:
          "O CPF ajuda na identificação segura do morador responsável, evita duplicidade de cadastro e permite auditoria administrativa antes da liberação do acesso.",
      },
      {
        pergunta: "Posso trocar meu e-mail depois?",
        resposta:
          "Sim. Após a aprovação e primeiro acesso, o e-mail poderá ser atualizado no perfil, conforme regras de segurança do condomínio.",
      },
      {
        pergunta: "O WhatsApp receberá token de retirada?",
        resposta:
          "Não. O WhatsApp poderá receber avisos operacionais, mas tokens e QR Codes de retirada devem aparecer dentro do Sistema Chegou! para maior segurança.",
      },
    ],
    importante:
      "As preferências de notificação escolhidas aqui serão usadas no Módulo Morador após a aprovação do cadastro.",
  },

  3: {
    icon: UserRound,
    titulo: "Dependentes e autorizações",
    texto:
      "Cadastre pessoas vinculadas à unidade e defina permissões de retirada com cuidado.",
    chips: ["Permissões claras", "Menores com termo", "Retirada controlada"],
    blocoTitulo: "Atenção às autorizações",
    itens: [
      "Dependentes não devem vir autorizados por padrão.",
      "Você decide quem pode receber ou retirar encomendas.",
      "Menores podem exigir ciência específica do responsável.",
    ],
    faq: [
      {
        pergunta: "Posso cadastrar dependentes depois?",
        resposta:
          "Sim. O cadastro inicial pode ser concluído sem dependentes. Depois da aprovação, o morador responsável poderá incluir ou atualizar pessoas vinculadas no Portal do Morador.",
      },
      {
        pergunta: "O dependente já pode retirar encomendas?",
        resposta:
          "Não automaticamente. A retirada na portaria só será permitida se o responsável marcar essa autorização e ela estiver ativa no sistema.",
      },
      {
        pergunta: "O convite do dependente será enviado agora?",
        resposta:
          "Não. O convite do dependente será enviado somente depois, pelo morador responsável, com token temporário e de uso único.",
      },
    ],
    importante:
      "Autorize retirada apenas para pessoas de confiança. Essas permissões serão usadas pela Portaria após a aprovação do cadastro.",
  },

  4: {
    icon: PawPrint,
    titulo: "Funcionários do lar e pets",
    texto:
      "Cadastre funcionários recorrentes e pets vinculados ao morador responsável para apoio operacional e segurança condominial.",
    chips: ["Funcionários", "Pets", "Cadastro opcional"],
    blocoTitulo: "Quando preencher?",
    itens: [
      "Cadastre funcionários recorrentes, como diarista, babá, cuidador(a) ou motorista particular.",
      "Prestadores eventuais não entram aqui; eles terão fluxo próprio de autorização de visita.",
      "Pets podem ser cadastrados para identificação e orientações administrativas futuras.",
    ],
    faq: [
      {
        pergunta: "O funcionário terá acesso ao Sistema Chegou!?",
        resposta:
          "Não neste momento. Este cadastro serve inicialmente para identificação e autorização. O acesso próprio poderá ser liberado futuramente conforme regras do condomínio.",
      },
      {
        pergunta: "Posso cadastrar prestador eventual?",
        resposta:
          "Não. Prestadores ocasionais, como técnicos, instaladores ou entregadores de serviço pontual, deverão ser cadastrados futuramente no fluxo de visitas ou autorizações temporárias.",
      },
      {
        pergunta: "O funcionário pode retirar encomendas?",
        resposta:
          "Somente se o morador responsável conceder essa permissão e ela estiver ativa no sistema. Por padrão, o cadastro não libera retirada automaticamente.",
      },
      {
        pergunta: "Pets são obrigatórios?",
        resposta:
          "Não. O cadastro de pets é opcional e informativo. Ele poderá ajudar em identificação, regras internas e comunicação administrativa do condomínio.",
      },
      {
        pergunta: "Posso alterar ou remover depois?",
        resposta:
          "Sim. Após a aprovação do cadastro, o morador responsável poderá incluir, editar ou remover funcionários e pets no Portal do Morador.",
      },
    ],
    importante:
      "Funcionários do lar ficam vinculados ao morador responsável, não diretamente à unidade. Se o morador mudar, esse vínculo poderá acompanhar o perfil dele.",
  },

  5: {
    icon: Building2,
    titulo: "Estrutura da unidade",
    texto:
      "Informe veículos e vagas de garagem vinculados à unidade, quando aplicável.",
    chips: ["Veículos", "Garagem", "Vagas"],
    blocoTitulo: "Orientações úteis",
    itens: [
      "Cadastre veículos utilizados pela unidade.",
      "Informe se a unidade possui vaga própria, rotativa ou nenhuma vaga.",
      "Se houver vaga vinculada, cadastre a identificação e o local.",
    ],
    faq: [
      {
        pergunta: "Preciso cadastrar veículo agora?",
        resposta:
          "Não obrigatoriamente. Você pode concluir o cadastro sem veículo e adicionar depois no Portal do Morador.",
      },
      {
        pergunta: "E se meu condomínio usa vaga rotativa?",
        resposta:
          "Selecione a opção de vagas rotativas. Nesse caso, não é necessário cadastrar uma vaga fixa nesta etapa.",
      },
      {
        pergunta: "Posso cadastrar mais de uma vaga?",
        resposta:
          "Sim. Se sua unidade possuir mais de uma vaga vinculada, cadastre todas para facilitar a validação administrativa.",
      },
      {
        pergunta: "Posso usar uma vaga de outro morador?",
        resposta:
          "Sim, informe essa situação na vaga. A administração poderá validar posteriormente se a vaga está cedida, alugada ou autorizada.",
      },
      {
        pergunta: "A placa será consultada automaticamente?",
        resposta:
          "Não. A placa será informada manualmente e usada apenas para identificação interna no sistema.",
      },
    ],
    importante:
      "As informações de veículos e vagas serão usadas para apoio operacional e validação administrativa. Cenários avançados poderão ser ajustados depois pelo condomínio.",
  },

  6: {
    icon: SearchCheck,
    titulo: "Revise antes de continuar",
    texto:
      "Confira todas as informações antes de criar a senha, aceitar os termos e enviar para auditoria.",
    chips: ["Conferência", "Correção", "Auditoria"],
    blocoTitulo: "Checklist rápido",
    itens: [
      "Confirme perfil da unidade, torre/bloco e número da unidade.",
      "Revise nome, CPF, e-mail, WhatsApp e preferências de notificação.",
      "Confira dependentes, permissões, funcionários, pets, veículos e vagas.",
    ],
    faq: [
      {
        pergunta: "Posso corrigir dados nesta etapa?",
        resposta:
          "Sim. Use o botão “Editar dados” em cada bloco da revisão para voltar diretamente à etapa correspondente e ajustar as informações.",
      },
      {
        pergunta: "O que acontece após confirmar a revisão?",
        resposta:
          "Você seguirá para a etapa de senha e aceites. A conta ainda continuará pendente até a aprovação administrativa.",
      },
      {
        pergunta: "Depois de enviar, ainda poderei editar?",
        resposta:
          "Após o envio para auditoria, a edição ficará bloqueada. Ela só será liberada novamente se o Admin devolver o cadastro para correção.",
      },
      {
        pergunta: "Esses dados serão auditados?",
        resposta:
          "Sim. As informações passam por validação administrativa e alterações relevantes ficam registradas para rastreabilidade.",
      },
    ],
    importante:
      "Confira tudo com atenção. Depois do envio para auditoria, alterações podem depender de liberação administrativa.",
  },

  7: {
    icon: LockKeyhole,
    titulo: "Proteção do seu acesso",
    texto:
      "Crie uma senha forte e confirme os aceites legais necessários para continuidade do cadastro.",
    chips: ["Senha forte", "Aceites", "LGPD"],
    blocoTitulo: "Antes de finalizar",
    itens: [
      "Use uma senha exclusiva e difícil de adivinhar.",
      "Leia os termos antes de aceitar.",
      "O acesso só será liberado após aprovação administrativa.",
    ],
    faq: [
      {
        pergunta: "A conta já fica ativa após criar a senha?",
        resposta:
          "Não. A senha fica preparada, mas a conta permanece pendente até a aprovação administrativa do condomínio.",
      },
      {
        pergunta: "Posso trocar a senha depois?",
        resposta:
          "Sim. Após a ativação da conta, você poderá alterar a senha na área de segurança do perfil.",
      },
      {
        pergunta: "Preciso aceitar os termos novamente no Módulo Morador?",
        resposta:
          "Não, salvo se houver nova versão dos termos, política de privacidade ou mudança jurídica relevante.",
      },
      {
        pergunta: "O aceite fica registrado?",
        resposta:
          "Sim. O aceite registra versão dos termos, data, hora, dispositivo e informações técnicas necessárias para auditoria.",
      },
    ],
    importante:
      "Criar a senha não ativa a conta. O acesso real será liberado apenas após aprovação administrativa.",
  },

  8: {
    icon: LockKeyhole,
    titulo: "Pesquisa de satisfação",
    texto:
      "Sua opinião ajuda a melhorar continuamente o Sistema Chegou! e a experiência dos moradores.",
    chips: ["NPS", "Feedback", "Melhoria contínua"],
    blocoTitulo: "Por que responder?",
    itens: [
      "A pesquisa leva menos de um minuto.",
      "Seu feedback ajuda a melhorar futuras versões.",
      "A resposta é opcional.",
    ],
    faq: [
      {
        pergunta: "Sou obrigado a responder a pesquisa?",
        resposta:
          "Não. A pesquisa é opcional e você pode seguir para a próxima etapa sem responder.",
      },
      {
        pergunta: "Minha resposta será identificada?",
        resposta:
          "O feedback poderá ser associado ao protocolo do cadastro para análise interna e melhoria do sistema.",
      },
      {
        pergunta: "O condomínio verá minha nota?",
        resposta:
          "As respostas poderão ser analisadas pela equipe responsável pela evolução do sistema e por relatórios autorizados.",
      },
      {
        pergunta: "O que acontece após a pesquisa?",
        resposta:
          "Você será direcionado para a tela final de acompanhamento da auditoria administrativa.",
      },
    ],
    importante:
      "Respostas realizadas em ambiente de testes ou validação não entram nas métricas oficiais de NPS.",
  },

  9: {
    icon: ShieldCheck,
    titulo: "Acompanhamento da auditoria",
    texto:
      "Seu cadastro foi enviado para análise administrativa. Acompanhe o status até a liberação do acesso.",
    chips: ["Auditoria", "Status", "Acompanhamento"],
    blocoTitulo: "O que acontece agora?",
    itens: [
      "A administração do condomínio irá validar os dados enviados.",
      "Enquanto a conta não for aprovada, você poderá consultar o andamento pelo token.",
      "A edição só será liberada se o Admin devolver o cadastro para correção.",
    ],
    faq: [
      {
        pergunta: "Posso acessar o sistema agora?",
        resposta:
          "Ainda não. A conta só será liberada após a aprovação administrativa do cadastro.",
      },
      {
        pergunta: "Como acompanho a aprovação?",
        resposta:
          "Use esta tela, o protocolo e o token de acompanhamento para consultar o andamento enquanto sua conta ainda não estiver ativa.",
      },
      {
        pergunta: "Posso editar meu cadastro depois de enviar?",
        resposta:
          "Não livremente. Após o envio, a edição fica bloqueada e só será aberta novamente se o Admin devolver o cadastro para correção.",
      },
      {
        pergunta: "O que acontece se houver pendência?",
        resposta:
          "O Admin poderá solicitar correções. Nesse caso, o status será atualizado e a edição será liberada apenas nos campos necessários.",
      },
      {
        pergunta: "Minha senha já está ativa?",
        resposta:
          "Não. A senha ficou preparada, mas a autenticação real só será ativada após aprovação e criação da conta de usuário.",
      },
    ],
    importante:
      "Guarde o protocolo e o token de acompanhamento. Eles permitem consultar o andamento até a aprovação do cadastro.",
  },
};

function MarcaChegou() {
  return (
    <span className="wm-layout-brand-inline">
      Chegou<span>!</span>
    </span>
  );
}

function ModalAjuda({ aberto, onClose, dadosWizard }) {
  if (!aberto) return null;

  const condominio =
    dadosWizard?.condominio?.nome_fantasia ||
    dadosWizard?.condominio?.nome ||
    "seu condomínio";

  const sindicoNome = dadosWizard?.condominio?.sindico_nome;
  const sindicoWhatsApp = dadosWizard?.condominio?.sindico_whatsapp;

  return (
    <div className="wm-help-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-help-modal">
        <button
          type="button"
          className="wm-help-modal-close"
          onClick={onClose}
          aria-label="Fechar ajuda"
        >
          <X size={18} />
        </button>

        <div className="wm-help-modal-icon">
          <HelpCircle size={28} />
        </div>

        <h2>Precisa de ajuda?</h2>

        <p>
          Se tiver dúvidas durante o cadastro, confira as orientações da tela
          atual ou fale com a administração do condomínio.
        </p>

        <div className="wm-help-modal-box">
          <strong>{condominio}</strong>
          {sindicoNome ? <span>Responsável: {sindicoNome}</span> : null}
          {sindicoWhatsApp ? <span>WhatsApp: {sindicoWhatsApp}</span> : null}
        </div>

        <p className="wm-help-modal-footer">
          O suporte <MarcaChegou /> poderá orientar sobre uso do sistema, mas
          validações cadastrais dependem da administração do condomínio.
        </p>

        <button type="button" className="wm-help-modal-primary" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}

export default function WizardMoradorLayout({
  etapaAtual = 1,
  totalEtapas = 9,
  progresso = 0,
  maiorEtapaLiberada = 1,
  dadosWizard,
  etapasDesabilitadas = [],
  children,
}) {
  const [tema, setTema] = useState(() => {
    return localStorage.getItem("wizard_morador_theme") || "system";
  });

  const [ajudaAberta, setAjudaAberta] = useState(false);
  const [faqAberta, setFaqAberta] = useState(null);

  const dadosSidebar = SIDEBAR_POR_ETAPA[etapaAtual] || SIDEBAR_POR_ETAPA[1];
  const IconSidebar = dadosSidebar.icon;

  const nomeCondominio = useMemo(() => {
    return (
      dadosWizard?.condominio?.nome_fantasia ||
      dadosWizard?.condominio?.nome ||
      dadosWizard?.nome_condominio ||
      "Condomínio"
    );
  }, [dadosWizard]);

  useEffect(() => {
    const root = document.documentElement;

    if (tema === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", tema);
    }

    localStorage.setItem("wizard_morador_theme", tema);
  }, [tema]);

  useEffect(() => {
    function abrirAjuda() {
      setAjudaAberta(true);
    }

    window.addEventListener("wizard-morador-ajuda", abrirAjuda);

    return () => {
      window.removeEventListener("wizard-morador-ajuda", abrirAjuda);
    };
  }, []);

  function alternarTema() {
    if (tema === "light") {
      setTema("dark");
      return;
    }

    if (tema === "dark") {
      setTema("system");
      return;
    }

    setTema("light");
  }

  function textoTema() {
    if (tema === "dark") return "Modo escuro";
    if (tema === "light") return "Modo claro";
    return "Modo sistema";
  }

  function irParaEtapa(numero) {
    if (etapasDesabilitadas.includes(Number(numero))) return;
    if (numero > maiorEtapaLiberada) return;

    window.dispatchEvent(
      new CustomEvent("wizard-morador-ir-etapa", {
        detail: { etapa: numero },
      })
    );
  }

  return (
    <div className="wm-shell">
      <header className="wm-topbar">
        <div className="wm-topbar-left">
          <div className="wm-logo">
            <img src={logoBranco} alt="Sistema Chegou!" />
          </div>

          <div className="wm-topbar-title">
            <h1>Cadastro do Morador</h1>
            <p>
              Ativação do acesso ao Sistema <MarcaChegou /> · {nomeCondominio}
            </p>
          </div>
        </div>

        <div className="wm-topbar-actions">
          <button
            type="button"
            className="wm-help-btn"
            onClick={() => setAjudaAberta(true)}
          >
            <HelpCircle size={16} />
            Precisa de ajuda?
          </button>

          <button type="button" className="wm-help-btn" onClick={alternarTema}>
            {tema === "dark" ? <Moon size={16} /> : <Sun size={16} />}
            {textoTema()}
          </button>
        </div>
      </header>

      <section className="wm-stepper-shell">
        <div
          className="wm-stepper"
          aria-label="Indicador de etapas"
          style={{ "--wm-progress": `${progresso}%` }}
        >
          {ETAPAS.slice(0, totalEtapas).map((etapa) => {
            const desabilitada = etapasDesabilitadas.includes(etapa.numero);
            const ativa = etapa.numero === etapaAtual;
            const concluida = etapa.numero < etapaAtual && !desabilitada;
            const liberada = etapa.numero <= maiorEtapaLiberada && !desabilitada;

            return (
              <button
                key={etapa.numero}
                type="button"
                className={`wm-step ${ativa ? "active" : ""} ${
                  concluida ? "done" : ""
                } ${liberada ? "clickable" : "locked"} ${
                  desabilitada ? "disabled-by-profile" : ""
                }`}
                onClick={() => irParaEtapa(etapa.numero)}
                disabled={!liberada}
                aria-current={ativa ? "step" : undefined}
                title={
                  desabilitada
                    ? "Esta etapa não se aplica ao perfil selecionado"
                    : undefined
                }
              >
                <span className="wm-step-circle">{etapa.numero}</span>

                <span className="wm-step-label">
                  <strong>{etapa.titulo}</strong>
                  <small>
                    {desabilitada ? "Não se aplica" : etapa.subtitulo}
                  </small>
                </span>
              </button>
            );
          })}

        </div>
      </section>

      <main className="wm-layout-grid">
        <section className="wm-main">
          <div className="wm-content">{children}</div>
        </section>

        <aside className="wm-sidebar">
          <section className="wm-sidebar-card highlight">
            <div className="wm-side-title">
              <span className="wm-side-title-icon">
                <IconSidebar size={22} />
              </span>

              <div>
                <h3>{dadosSidebar.titulo}</h3>
                <p>{dadosSidebar.texto}</p>
              </div>
            </div>

            <div className="wm-side-chips">
              {dadosSidebar.chips.map((chip) => (
                <span key={chip}>
                  <LockKeyhole size={12} />
                  {chip}
                </span>
              ))}
            </div>
          </section>

          <section className="wm-sidebar-card">
            <h3>{dadosSidebar.blocoTitulo}</h3>

            <ul className="wm-side-checks">
              {dadosSidebar.itens.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="wm-sidebar-card">
            <h3>Dúvidas frequentes</h3>

            <div className="wm-faq-list">
              {dadosSidebar.faq.map((item, index) => {
                const aberta = faqAberta === index;

                return (
                  <div className={`wm-faq-item ${aberta ? "active" : ""}`} key={typeof item === "string" ? item : item.pergunta}>
                    <button
                      type="button"
                      className="wm-faq-row"
                      onClick={() => setFaqAberta(aberta ? null : index)}
                    >
                      <span>{typeof item === "string" ? item : item.pergunta}</span>
                      <ChevronDown size={14} />
                    </button>

                    {aberta ? (
                      <div className="wm-faq-answer">
                        {typeof item === "string" ? dadosSidebar.importante : item.resposta}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="wm-side-important">
              <Info size={16} />
              <p>
                <strong>Importante:</strong> {dadosSidebar.importante}
              </p>
            </div>
          </section>
        </aside>
      </main>

      <footer className="wm-footer">
        <div className="wm-footer-left">
          <span className="wm-footer-icon">
            <ShieldCheck size={18} />
          </span>

          <div>
            <strong>Ambiente seguro</strong>
            <span>Dados protegidos com criptografia de ponta.</span>
          </div>
        </div>

        <div className="wm-footer-brand">
          <img src={logoAzulRoyal} alt="Sistema Chegou!" />
        </div>

        <div className="wm-footer-right">
          <strong>Precisa de ajuda?</strong>
          <span>Fale com o condomínio ou suporte <MarcaChegou /></span>
        </div>
      </footer>

      <ModalAjuda
        aberto={ajudaAberta}
        onClose={() => setAjudaAberta(false)}
        dadosWizard={dadosWizard}
      />
    </div>
  );
}