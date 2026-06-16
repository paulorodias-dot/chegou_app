import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Car,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Edit3,
  HelpCircle,
  Home,
  Info,
  Mail,
  PackageCheck,
  PawPrint,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import "../../../styles/wizardMorador/WizardMoradorTela6.css";

const ETAPAS_REVISAO = [
  {
    numero: 1,
    titulo: "Identificação da unidade",
    icone: Building2,
  },
  {
    numero: 2,
    titulo: "Dados pessoais",
    icone: UserRound,
  },
  {
    numero: 3,
    titulo: "Dependentes",
    icone: UsersRound,
  },
  {
    numero: 4,
    titulo: "Funcionários do lar e pets",
    icone: PawPrint,
  },
  {
    numero: 5,
    titulo: "Veículos e garagem",
    icone: Car,
  },
];

function valorOuPadrao(valor, padrao = "Não informado") {
  return valor || padrao;
}

function contar(lista) {
  return Array.isArray(lista) ? lista.length : 0;
}

function simNao(valor) {
  return valor ? "Sim" : "Não";
}

function normalizarTexto(valor = "") {
  return String(valor || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function obterPreCadastro(dadosWizard = {}) {
  return dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};
}

function obterResumoUnidade(dadosWizard, formTela1) {
  const pre = obterPreCadastro(dadosWizard);
  const condominio = dadosWizard?.condominio || {};

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
      "Não informado",
    unidade:
      pre.unidade_nome ||
      pre.unidade ||
      dadosWizard?.unidade ||
      "Não informado",
    perfil: normalizarTexto(
      formTela1?.perfilUnidade ||
        formTela1?.relacaoUnidade ||
        formTela1?.perfil_unidade ||
        formTela1?.relacao_unidade ||
        pre.perfil_unidade ||
        pre.relacao_unidade ||
        dadosWizard?.perfil_unidade ||
        dadosWizard?.relacao_unidade ||
        dadosWizard?.dados_complementares?.tela1?.perfilUnidade ||
        dadosWizard?.dados_complementares?.tela1?.relacaoUnidade ||
        "Não informado"
    ),
    confirmouConvite: Boolean(formTela1?.confirmouDadosConvite),
  };
}

function obterResumoMorador(formMorador = {}) {
  const nomeExibicao =
    formMorador.nomeSocial ||
    formMorador.nome_exibicao ||
    formMorador.nomeCompleto ||
    "";

  return {
    nomeCompleto: formMorador.nomeCompleto || "",
    nomeSocial: formMorador.nomeSocial || "",
    nomeExibicao,
    cpf: formMorador.cpf || "",
    dataNascimento: formMorador.dataNascimento || "",
    email: formMorador.emailPrincipal || "",
    ddi: formMorador.ddi || "+55",
    whatsapp: formMorador.whatsapp || "",
    notificacaoPush: formMorador.notificacaoPush,
    notificacaoWhatsapp: formMorador.notificacaoWhatsapp,
    notificacaoEmail: formMorador.notificacaoEmail,
    foto: formMorador.fotoPerfilBase64 || formMorador.fotoPerfilUrl || "",
  };
}

function obterStatusEtapa({
  etapa,
  formTela1,
  formMorador,
  dependentes,
  funcionarios,
  pets,
  estruturaGaragem,
}) {
  switch (etapa) {
    case 1:
      if (
        formTela1?.perfilUnidade ||
        formTela1?.relacaoUnidade
      ) {
        return "completo";
      }
      return "pendente";

    case 2:
      if (
        formMorador?.nomeCompleto &&
        formMorador?.cpf &&
        formMorador?.emailPrincipal
      ) {
        return "completo";
      }
      return "atencao";

    case 3:
      return "completo";

    case 4:
      return "completo";

    case 5:
      if (
        estruturaGaragem?.garagemSituacao ===
        "possui_vaga"
      ) {
        return contar(estruturaGaragem?.vagas) > 0
          ? "completo"
          : "atencao";
      }

      return "completo";

    default:
      return "completo";
  }
}

function obterCorStatus(status) {
  switch (status) {
    case "completo":
      return {
        texto: "Completo",
        classe: "success",
        icone: CheckCircle2,
      };

    case "atencao":
      return {
        texto: "Atenção",
        classe: "warning",
        icone: AlertTriangle,
      };

    default:
      return {
        texto: "Pendente",
        classe: "danger",
        icone: AlertTriangle,
      };
  }
}

export default function WizardMoradorTela6({
  dadosWizard,
  formTela1,
  formMorador,
  dependentes = [],
  funcionarios = [],
  pets = [],
  estruturaGaragem = {},
  onVoltar,
  onSalvarRascunho,
  onContinuar,
  onIrParaEtapa,
  irParaEtapa,
}) {
  const [abertos, setAbertos] = useState([1]);

  const resumoUnidade = useMemo(
    () => obterResumoUnidade(dadosWizard, formTela1),
    [dadosWizard, formTela1]
  );

  const resumoMorador = useMemo(
    () => obterResumoMorador(formMorador),
    [formMorador]
  );

  function toggleEtapa(numero) {
    setAbertos((anterior) => {
      if (anterior.includes(numero)) {
        return anterior.filter((item) => item !== numero);
      }

      return [...anterior, numero];
    });
  }

  const totalDependentes = contar(dependentes);
  const totalFuncionarios = contar(funcionarios);
  const totalPets = contar(pets);
  const totalVeiculos = contar(
    estruturaGaragem?.veiculos
  );
  const totalVagas = contar(
    estruturaGaragem?.vagas
  );

  return (
    <div className="wm-t6-page">
      <section className="wm-t6-card">
        <header className="wm-t6-header">
          <div className="wm-t6-title">
            <span className="wm-t6-step">6</span>

            <div>
              <h1>Revisão e conferência dos dados</h1>

              <p>
                Revise cuidadosamente todas as
                informações antes de finalizar
                o cadastro.
              </p>
            </div>
          </div>

          <div className="wm-t6-security">
            <ShieldCheck size={34} />

            <div>
              <strong>
                Segurança e Auditoria
              </strong>

              <p>
                Todas as alterações realizadas
                ficam registradas para
                rastreabilidade e segurança.
              </p>
            </div>
          </div>
        </header>
        <div className="wm-t6-divider" />

        <section className="wm-t6-executive-summary">
          <ResumoItem label="Condomínio" value={resumoUnidade.condominio} />
          <ResumoItem label="Torre / Bloco" value={resumoUnidade.torre} />
          <ResumoItem label="Unidade" value={resumoUnidade.unidade} />
          <ResumoItem label="Perfil" value={resumoUnidade.perfil} />
          <ResumoItem label="Responsável" value={resumoMorador.nomeExibicao} />
          <ResumoItem label="Dependentes" value={totalDependentes} />
          <ResumoItem label="Funcionários" value={totalFuncionarios} />
          <ResumoItem label="Pets" value={totalPets} />
          <ResumoItem label="Veículos" value={totalVeiculos} />
          <ResumoItem label="Vagas" value={totalVagas} />
        </section>

        <div className="wm-t6-main-grid">
          <section className="wm-t6-left">
            {ETAPAS_REVISAO.map((etapa) => {
              const status = obterStatusEtapa({
                etapa: etapa.numero,
                formTela1,
                formMorador,
                dependentes,
                funcionarios,
                pets,
                estruturaGaragem,
              });

              const statusInfo = obterCorStatus(status);
              const StatusIcon = statusInfo.icone;
              const Icon = etapa.icone;
              const aberto = abertos.includes(etapa.numero);

              return (
                <article
                  key={etapa.numero}
                  className={`wm-t6-review-card ${aberto ? "open" : ""}`}
                >
                  <button
                    type="button"
                    className="wm-t6-review-head"
                    onClick={() => toggleEtapa(etapa.numero)}
                  >
                    <span className="wm-t6-review-icon">
                      <Icon size={22} />
                    </span>

                    <div>
                      <h2>{etapa.titulo}</h2>
                      <p>{obterSubtituloEtapa(etapa.numero, {
                        resumoUnidade,
                        resumoMorador,
                        dependentes,
                        funcionarios,
                        pets,
                        estruturaGaragem,
                      })}</p>
                    </div>

                    <span className={`wm-t6-status ${statusInfo.classe}`}>
                      <StatusIcon size={14} />
                      {statusInfo.texto}
                    </span>

                    <ChevronDown size={18} className="wm-t6-chevron" />
                  </button>

                  {aberto ? (
                    <div className="wm-t6-review-body">
                      {renderizarConteudoEtapa(etapa.numero, {
                        resumoUnidade,
                        resumoMorador,
                        formTela1,
                        formMorador,
                        dependentes,
                        funcionarios,
                        pets,
                        estruturaGaragem,
                      })}

                      <footer className="wm-t6-review-footer">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof onIrParaEtapa === "function") {
                              onIrParaEtapa(etapa.numero);
                              return;
                            }

                            if (typeof irParaEtapa === "function") {
                              irParaEtapa(etapa.numero);
                            }
                          }}
                        >
                          <Edit3 size={15} />
                          Editar dados
                        </button>
                      </footer>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
          <aside className="wm-t6-right">
            <section className="wm-t6-side-card wm-t6-highlight">
              <span className="wm-t6-side-icon">
                <ClipboardCheck size={22} />
              </span>

              <h3>Conferência Final</h3>

              <ul>
                <li>Identificação da unidade</li>
                <li>Dados pessoais</li>
                <li>Dependentes</li>
                <li>Funcionários e Pets</li>
                <li>Veículos e Garagem</li>
              </ul>
            </section>

            <section className="wm-t6-side-card">
              <span className="wm-t6-side-icon orange">
                <Info size={22} />
              </span>

              <h3>Antes de continuar</h3>

              <p>
                Revise cuidadosamente os dados.
                Após a aprovação do cadastro,
                algumas informações poderão exigir
                auditoria para alteração.
              </p>
            </section>

            <section className="wm-t6-side-card">
              <span className="wm-t6-side-icon">
                <HelpCircle size={22} />
              </span>

              <h3>Dúvidas Frequentes</h3>

              <div className="wm-t6-faq">
                <details>
                  <summary>Posso alterar dados depois?</summary>
                  <p>
                    Sim. Informações poderão ser
                    atualizadas posteriormente através
                    do Portal do Morador.
                  </p>
                </details>

                <details>
                  <summary>Os dados são auditados?</summary>
                  <p>
                    Sim. Alterações relevantes ficam
                    registradas para segurança e
                    rastreabilidade.
                  </p>
                </details>

                <details>
                  <summary>
                    Preciso cadastrar dependentes?
                  </summary>
                  <p>
                    Não. O cadastro de dependentes é
                    opcional e pode ser realizado depois.
                  </p>
                </details>
              </div>
            </section>
          </aside>
        </div>

        <footer className="wm-t6-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (typeof onVoltar === "function") {
                onVoltar();
              }
            }}
          >
            <ArrowLeft size={16} />
            Voltar
          </button>

          <button
            type="button"
            className="outline"
            onClick={() => {
              if (typeof onSalvarRascunho === "function") {
                onSalvarRascunho();
              }
            }}
          >
            <Save size={16} />
            Salvar e continuar depois
          </button>

          <button
            type="button"
            className="primary"
            onClick={() => {
              if (typeof onContinuar === "function") {
                onContinuar();
              }
            }}
          >
            Confirmar revisão e continuar
            <ArrowRight size={16} />
          </button>
        </footer>
      </section>
    </div>
  );
}

function ResumoItem({ label, value }) {
  return (
    <article className="wm-t6-summary-item">
      <span>{label}</span>
      <strong>{valorOuPadrao(value)}</strong>
    </article>
  );
}

function obterSubtituloEtapa(
  numero,
  {
    resumoUnidade,
    resumoMorador,
    dependentes,
    funcionarios,
    pets,
    estruturaGaragem,
  }
) {
  switch (numero) {
    case 1:
      return `${resumoUnidade.torre} • ${resumoUnidade.unidade} • ${resumoUnidade.perfil}`;

    case 2:
      return `${valorOuPadrao(resumoMorador.nomeExibicao)} • ${valorOuPadrao(
        resumoMorador.email
      )}`;

    case 3:
      return `${contar(dependentes)} dependente(s) cadastrado(s)`;

    case 4:
      return `${contar(funcionarios)} funcionário(s) • ${contar(pets)} pet(s)`;

    case 5:
      return `${contar(estruturaGaragem?.veiculos)} veículo(s) • ${contar(
        estruturaGaragem?.vagas
      )} vaga(s)`;

    default:
      return "";
  }
}

function LinhaRevisao({ label, value }) {
  return (
    <div className="wm-t6-line">
      <span>{label}</span>
      <strong>{valorOuPadrao(value)}</strong>
    </div>
  );
}

function BadgeBool({ ativo, textoSim = "Sim", textoNao = "Não" }) {
  return (
    <span className={`wm-t6-badge ${ativo ? "success" : "muted"}`}>
      {ativo ? textoSim : textoNao}
    </span>
  );
}

function EmptyState({ icon: Icon = Info, title, text }) {
  return (
    <div className="wm-t6-empty">
      <Icon size={28} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function renderizarConteudoEtapa(
  numero,
  {
    resumoUnidade,
    resumoMorador,
    formMorador,
    dependentes,
    funcionarios,
    pets,
    estruturaGaragem,
  }
) {
  switch (numero) {
    case 1:
      return (
        <div className="wm-t6-grid">
          <LinhaRevisao
            label="Condomínio"
            value={resumoUnidade.condominio}
          />

          <LinhaRevisao
            label="Torre / Bloco"
            value={resumoUnidade.torre}
          />

          <LinhaRevisao
            label="Unidade"
            value={resumoUnidade.unidade}
          />

          <LinhaRevisao
            label="Perfil"
            value={resumoUnidade.perfil}
          />
        </div>
      );

    case 2:
      return (
        <>
          <div className="wm-t6-grid">
            <LinhaRevisao
              label="Nome Completo"
              value={formMorador?.nomeCompleto}
            />

            <LinhaRevisao
              label="Nome Social"
              value={formMorador?.nomeSocial}
            />

            <LinhaRevisao
              label="CPF"
              value={formMorador?.cpf}
            />

            <LinhaRevisao
              label="Data de nascimento"
              value={formMorador?.dataNascimento}
            />

            <LinhaRevisao
              label="E-mail"
              value={formMorador?.emailPrincipal}
            />

            <LinhaRevisao
              label="WhatsApp"
              value={formMorador?.whatsapp}
            />
          </div>

          <div className="wm-t6-badges-row">
            <BadgeBool
              ativo={formMorador?.notificacaoPush}
              textoSim="Push ativo"
              textoNao="Push inativo"
            />

            <BadgeBool
              ativo={formMorador?.notificacaoWhatsapp}
              textoSim="WhatsApp ativo"
              textoNao="WhatsApp inativo"
            />

            <BadgeBool
              ativo={formMorador?.notificacaoEmail}
              textoSim="E-mail ativo"
              textoNao="E-mail inativo"
            />
          </div>
        </>
      );

    case 3:
      if (!dependentes?.length) {
        return (
          <EmptyState
            icon={UsersRound}
            title="Nenhum dependente cadastrado"
            text="O cadastro de dependentes é opcional e poderá ser realizado posteriormente."
          />
        );
      }

      return (
        <div className="wm-t6-list">
          {dependentes.map((dependente, index) => {
  const parentesco =
    dependente.parentesco ||
    dependente.tipoVinculo ||
    dependente.tipo_vinculo ||
    dependente.relacao ||
    dependente.vinculo ||
    "Parentesco não informado";

  const retiradaAutorizada =
    dependente.retira_portaria ??
    dependente.autorizadoRetirada ??
    dependente.autorizado_retirada ??
    dependente.podeRetirarEncomendas ??
    dependente.pode_retirar_encomendas ??
    dependente.retiraNaPortaria ??
    dependente.retira_na_portaria ??
    false;

  const recebeEncomendas =
    dependente.recebeEncomendas ??
    dependente.recebe_encomendas ??
    dependente.podeReceberEncomendas ??
    dependente.pode_receber_encomendas ??
    false;

  const acessoProprio =
    dependente.acesso_proprio_futuro ??
    dependente.possuiAcesso ??
    dependente.possui_acesso ??
    dependente.acessoProprio ??
    dependente.acesso_proprio ??
    dependente.teraAcessoProprio ??
    dependente.tera_acesso_proprio ??
    false;

  return (
    <article
      key={dependente.id || index}
      className="wm-t6-mini-card"
    >
      <strong>
        {dependente.nomeCompleto ||
          dependente.nome_completo ||
          dependente.nome ||
          "Dependente"}
      </strong>

      <span>{parentesco}</span>

      <div className="wm-t6-mini-badges">
        <BadgeBool
          ativo={recebeEncomendas}
          textoSim="Recebe encomendas"
          textoNao="Não recebe encomendas"
        />

        <BadgeBool
          ativo={retiradaAutorizada}
          textoSim="Retirada autorizada"
          textoNao="Retirada não autorizada"
        />

        <BadgeBool
          ativo={acessoProprio}
          textoSim="Acesso próprio"
          textoNao="Sem acesso próprio"
        />
      </div>
    </article>
  );
})}
        </div>
      );

    case 4:
      return (
        <>
          {funcionarios?.length ? (
            <div className="wm-t6-group">
              <h4>Funcionários do Lar</h4>

              <div className="wm-t6-list">
                {funcionarios.map((item, index) => (
                  <article
                    key={item.id || index}
                    className="wm-t6-mini-card"
                  >
                    <strong>
                      {item.nomeCompleto ||
                        item.nome ||
                        "Funcionário"}
                    </strong>

                    <span>
                      {item.funcao ||
                        item.categoria ||
                        "Função não informada"}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {pets?.length ? (
            <div className="wm-t6-group">
              <h4>Pets</h4>

              <div className="wm-t6-list">
                {pets.map((pet, index) => (
                  <article
                    key={pet.id || index}
                    className="wm-t6-mini-card"
                  >
                    <strong>
                      {pet.nome || "Pet"}
                    </strong>

                    <span>
                      {[
                        pet.especie,
                        pet.raca,
                        pet.porte,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {!funcionarios?.length && !pets?.length ? (
            <EmptyState
              icon={PawPrint}
              title="Nenhum cadastro realizado"
              text="Funcionários do lar e pets poderão ser cadastrados posteriormente."
            />
          ) : null}
        </>
      );

    case 5:
      return (
        <>
          {estruturaGaragem?.veiculos?.length ? (
            <div className="wm-t6-group">
              <h4>Veículos</h4>

              <div className="wm-t6-list">
                {estruturaGaragem.veiculos.map(
                  (veiculo, index) => (
                    <article
                      key={veiculo.id || index}
                      className="wm-t6-mini-card"
                    >
                      <strong>
                        {veiculo.placa}
                      </strong>

                      <span>
                        {[
                          veiculo.marca,
                          veiculo.modelo,
                          veiculo.cor,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    </article>
                  )
                )}
              </div>
            </div>
          ) : null}

          {estruturaGaragem?.vagas?.length ? (
            <div className="wm-t6-group">
              <h4>Vagas</h4>

              <div className="wm-t6-list">
                {estruturaGaragem.vagas.map(
                  (vaga, index) => (
                    <article
                      key={vaga.id || index}
                      className="wm-t6-mini-card"
                    >
                      <strong>
                        {vaga.identificacao}
                      </strong>

                      <span>
                        {[vaga.local, vaga.situacao]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    </article>
                  )
                )}
              </div>
            </div>
          ) : null}

          {!estruturaGaragem?.veiculos?.length &&
          !estruturaGaragem?.vagas?.length ? (
            <EmptyState
              icon={Car}
              title="Nenhum veículo ou vaga cadastrada"
              text="As informações de garagem poderão ser cadastradas posteriormente."
            />
          ) : null}
        </>
      );

    default:
      return null;
  }
}