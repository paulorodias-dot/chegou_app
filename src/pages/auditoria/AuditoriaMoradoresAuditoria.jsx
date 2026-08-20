import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Info,
  MoreVertical,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import toast from "react-hot-toast";

import DateRangePickerPremium
  from "../../components/premium/DateRangePickerPremium";

import "./AuditoriaMoradoresAuditoria.css";

import {
  aprovarMoradorAuditoria,
  buscarTorresAuditoriaMoradores,
  formatarStatusAuditoria,
  listarMoradoresParaAuditoria,
  marcarAuditoriaIniciada,
  obterDetalheAuditoriaMorador,
  obterResumoAuditoriaMoradores,
  registrarDecisaoAuditoriaMorador,
} from "../../services/auditoriaMoradoresAuditoriaService";

const STATUS_FILTROS = [
  {
    value: "TODOS",
    label: "Todos",
  },
  {
    value: "AGUARDANDO_AUDITORIA",
    label: "Aguardando Auditoria",
  },
  {
    value: "AUDITORIA_INICIADA",
    label: "Auditoria Iniciada",
  },
  {
    value: "REAUDITORIA_PENDENTE",
    label: "Reauditoria Pendente",
  },
];

function formatarDataHora(valor) {
  if (!valor) {
    return "—";
  }

  try {
    return new Intl
      .DateTimeFormat(
        "pt-BR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      )
      .format(
        new Date(valor)
      );
  } catch {
    return "—";
  }
}

function valor(
  valorCampo
) {
  if (
    valorCampo === null ||
    valorCampo === undefined ||
    String(
      valorCampo
    ).trim() === ""
  ) {
    return "Não informado";
  }

  return valorCampo;
}

function obterIniciais(
  nome = ""
) {
  const partes =
    String(nome)
      .trim()
      .split(" ")
      .filter(Boolean);

  if (!partes.length) {
    return "CH";
  }

  if (
    partes.length === 1
  ) {
    return partes[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${partes[0][0]}${
    partes[
      partes.length - 1
    ][0]
  }`.toUpperCase();
}

function classeStatus(
  status = ""
) {
  const atual =
    String(
      status || ""
    ).toUpperCase();

  if (
    atual ===
    "AGUARDANDO_AUDITORIA"
  ) {
    return "aguardando";
  }

  if (
    atual ===
    "AUDITORIA_INICIADA"
  ) {
    return "iniciada";
  }

  if (
    atual ===
    "REAUDITORIA_PENDENTE"
  ) {
    return "reauditoria";
  }

  if (
    atual ===
    "CORRECAO_SOLICITADA"
  ) {
    return "correcao";
  }

  if (
    atual === "APROVADO"
  ) {
    return "aprovado";
  }

  if (
    atual === "REPROVADO"
  ) {
    return "reprovado";
  }

  return "neutro";
}

function dataHojeInput() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function dataMenosDiasInput(
  dias = 30
) {
  const data =
    new Date();

  data.setDate(
    data.getDate() -
    dias
  );

  return data
    .toISOString()
    .slice(0, 10);
}

function KpiCard({
  icon: Icon,
  titulo,
  valor: numero,
  detalhe,
  variante = "azul",
}) {
  return (
    <div className="ama-kpi-card">
      <div
        className={`ama-kpi-icon ama-kpi-icon-${variante}`}
      >
        <Icon
          size={22}
          strokeWidth={2.1}
        />
      </div>

      <div className="ama-kpi-content">
        <span>
          {titulo}
        </span>

        <strong>
          {numero}
        </strong>

        <div className="ama-kpi-footer">
          <small>
            {detalhe}
          </small>
        </div>
      </div>
    </div>
  );
}

function AcaoLinhaMenu({
  item,
  aberto,
  onToggle,
  onAcao,
}) {
  const [
    posicao,
    setPosicao,
  ] = useState({
    top: 0,
    left: 0,
  });

  const opcoes = [
    "Auditar",
    "Visualizar Resumo",
  ];

  function abrirMenu(
    event
  ) {
    const rect =
      event.currentTarget
        .getBoundingClientRect();

    const largura = 196;

    const altura =
      Math.min(
        180,
        opcoes.length *
          34 +
          14
      );

    let left =
      rect.right -
      largura -
      25;

    let top =
      rect.top -
      altura +
      28;

    if (left < 12) {
      left = 12;
    }

    if (
      left + largura >
      window.innerWidth - 12
    ) {
      left =
        window.innerWidth -
        largura -
        12;
    }

    if (top < 12) {
      top =
        rect.bottom + 8;
    }

    if (
      top + altura >
      window.innerHeight - 12
    ) {
      top =
        window.innerHeight -
        altura -
        12;
    }

    setPosicao({
      top,
      left,
    });

    onToggle(
      aberto
        ? null
        : item.id
    );
  }

  return (
    <div className="ama-row-actions">
      <button
        type="button"
        className="ama-icon-action ama-row-menu-btn"
        onClick={
          abrirMenu
        }
        aria-label="Abrir ações"
      >
        <MoreVertical
          size={18}
        />
      </button>

      {aberto ? (
        <>
          <button
            type="button"
            className="ama-menu-overlay"
            onClick={() =>
              onToggle(null)
            }
            aria-label="Fechar menu"
          />

          <div
            className="ama-row-menu ama-row-menu-fixed"
            style={{
              top:
                `${posicao.top}px`,

              left:
                `${posicao.left}px`,
            }}
          >
            {opcoes.map(
              (opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => {
                    onToggle(
                      null
                    );

                    onAcao(
                      opcao,
                      item
                    );
                  }}
                >
                  {opcao}
                </button>
              )
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function CampoLeitura({
  label,
  value,
}) {
  return (
    <div className="ama-read-field">
      <span>
        {label}
      </span>

      <strong>
        {valor(value)}
      </strong>
    </div>
  );
}

function ListaCampos({
  campos = [],
}) {
  return (
    <div className="ama-fields-grid">
      {campos.map(
        (campo) => (
          <CampoLeitura
            key={
              campo.label
            }
            label={
              campo.label
            }
            value={
              campo.value
            }
          />
        )
      )}
    </div>
  );
}

function AccordionItem({
  id,
  titulo,
  subtitulo,
  status,
  icon: Icon,
  aberto,
  onToggle,
  children,
}) {
  return (
    <section
      className={
        aberto
          ? "ama-accordion-item open"
          : "ama-accordion-item"
      }
    >
      <button
        type="button"
        className="ama-accordion-head"
        onClick={() =>
          onToggle(id)
        }
      >
        <div className="ama-accordion-title">
          <div className="ama-accordion-icon">
            <Icon
              size={18}
            />
          </div>

          <div>
            <strong>
              {titulo}
            </strong>

            <span>
              {subtitulo}
            </span>
          </div>
        </div>

        <div className="ama-accordion-status">
          <span>
            {status}
          </span>

          <ChevronRight
            size={17}
          />
        </div>
      </button>

      {aberto ? (
        <div className="ama-accordion-body">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function ListaDependentes({
  dependentes = [],
}) {
  if (!dependentes.length) {
    return (
      <div className="ama-empty-inline">
        Nenhum dependente informado.
      </div>
    );
  }

  return (
    <div className="ama-list-stack">
      {dependentes.map(
        (
          dependente,
          index
        ) => (
          <div
            className="ama-dependent-card"
            key={
              dependente.id ||
              `${dependente.nome}-${index}`
            }
          >
            <div className="ama-dependent-head">
              <div>
                <strong>
                  {valor(
                    dependente.nome
                  )}
                </strong>

                <span>
                  {valor(
                    dependente.parentesco
                  )}

                  {" • "}

                  {dependente.idade !==
                    null &&
                  dependente.idade !==
                    undefined
                    ? `${dependente.idade} anos`
                    : "Idade não informada"}
                </span>
              </div>

              <em
                className={
                  dependente.login_proprio
                    ? "ama-tag ama-tag-blue"
                    : "ama-tag"
                }
              >
                {dependente.login_proprio
                  ? "Acesso próprio"
                  : "Sem acesso próprio"}
              </em>
            </div>

            <ListaCampos
              campos={[
                {
                  label:
                    "Data de nascimento",
                  value:
                    dependente
                      .data_nascimento,
                },
                {
                  label: "CPF",
                  value:
                    dependente
                      .cpf_mascarado,
                },
                {
                  label:
                    "E-mail",
                  value:
                    dependente
                      .login_proprio
                      ? dependente.email
                      : "Não informado",
                },
                {
                  label:
                    "WhatsApp",
                  value:
                    dependente
                      .login_proprio
                      ? dependente.telefone
                      : "Não informado",
                },
                {
                  label:
                    "Pode retirar encomendas",
                  value:
                    dependente
                      .permite_retirada
                      ? "Sim"
                      : "Não",
                },
                {
                  label:
                    "Autorização necessária",
                  value:
                    dependente
                      .autorizacao_menor_16
                      ? "Informada"
                      : "Não informada",
                },
              ]}
            />
          </div>
        )
      )}
    </div>
  );
}

function ListaFuncionariosPets({
  funcionarios = [],
  pets = [],
}) {
  return (
    <div className="ama-list-stack">
      <div className="ama-subsection">
        <h4>
          Funcionários do lar
        </h4>

        {funcionarios.length ? (
          funcionarios.map(
            (
              funcionario,
              index
            ) => (
              <div
                className="ama-simple-card"
                key={
                  funcionario.id ||
                  `${funcionario.nome}-${index}`
                }
              >
                <ListaCampos
                  campos={[
                    {
                      label:
                        "Nome",
                      value:
                        funcionario.nome,
                    },
                    {
                      label:
                        "Função",
                      value:
                        funcionario.funcao,
                    },
                    {
                      label:
                        "WhatsApp",
                      value:
                        funcionario.telefone,
                    },
                    {
                      label:
                        "Observações",
                      value:
                        funcionario.observacoes,
                    },
                  ]}
                />
              </div>
            )
          )
        ) : (
          <div className="ama-empty-inline">
            Nenhum funcionário informado.
          </div>
        )}
      </div>

      <div className="ama-subsection">
        <h4>
          Pets
        </h4>

        {pets.length ? (
          pets.map(
            (
              pet,
              index
            ) => (
              <div
                className="ama-simple-card"
                key={
                  pet.id ||
                  `${pet.nome}-${index}`
                }
              >
                <ListaCampos
                  campos={[
                    {
                      label:
                        "Nome",
                      value:
                        pet.nome,
                    },
                    {
                      label:
                        "Tipo",
                      value:
                        pet.tipo,
                    },
                    {
                      label:
                        "Raça",
                      value:
                        pet.raca,
                    },
                    {
                      label:
                        "Porte",
                      value:
                        pet.porte,
                    },
                  ]}
                />
              </div>
            )
          )
        ) : (
          <div className="ama-empty-inline">
            Nenhum pet informado.
          </div>
        )}
      </div>
    </div>
  );
}

function ListaVeiculosGaragem({
  item,
}) {
  const veiculos =
    item.veiculos || [];

  const garagem =
    item.garagem || [];

  return (
    <div className="ama-list-stack">
      <div className="ama-subsection">
        <h4>
          Veículos
        </h4>

        {veiculos.length ? (
          veiculos.map(
            (
              veiculo,
              index
            ) => (
              <div
                className="ama-simple-card"
                key={
                  veiculo.id ||
                  `${veiculo.placa}-${index}`
                }
              >
                <ListaCampos
                  campos={[
                    {
                      label:
                        "Tipo",
                      value:
                        veiculo.tipo,
                    },
                    {
                      label:
                        "Marca",
                      value:
                        veiculo.marca,
                    },
                    {
                      label:
                        "Modelo",
                      value:
                        veiculo.modelo,
                    },
                    {
                      label:
                        "Cor",
                      value:
                        veiculo.cor,
                    },
                    {
                      label:
                        "Placa",
                      value:
                        veiculo.placa,
                    },
                  ]}
                />
              </div>
            )
          )
        ) : (
          <div className="ama-empty-inline">
            Nenhum veículo informado.
          </div>
        )}
      </div>

      <div className="ama-subsection">
        <h4>
          Garagem
        </h4>

        {item.resumo
          ?.possuiConflitoGaragem ? (
          <div className="ama-conflict-alert">
            <div>
              <strong>
                Atenção aos dados da garagem
              </strong>

              <p>
                Há informação que precisa ser
                conferida antes da aprovação.
              </p>
            </div>
          </div>
        ) : null}

        {garagem.length ? (
          garagem.map(
            (
              vaga,
              index
            ) => (
              <div
                className={
                  vaga.conflito
                    ? "ama-simple-card danger"
                    : "ama-simple-card"
                }
                key={
                  vaga.id ||
                  `${vaga.numero_vaga}-${index}`
                }
              >
                <ListaCampos
                  campos={[
                    {
                      label:
                        "Tipo de vaga",
                      value:
                        vaga.tipo_vaga,
                    },
                    {
                      label:
                        "Número da vaga",
                      value:
                        vaga.numero_vaga,
                    },
                    {
                      label:
                        "Vínculo",
                      value:
                        vaga.vinculo,
                    },
                    {
                      label:
                        "Unidade vinculada",
                      value:
                        vaga.unidade_vinculada,
                    },
                    {
                      label:
                        "Situação",
                      value:
                        vaga.conflito
                          ? "Requer conferência"
                          : "Sem pendência",
                    },
                  ]}
                />
              </div>
            )
          )
        ) : (
          <div className="ama-empty-inline">
            Nenhuma vaga informada.
          </div>
        )}
      </div>
    </div>
  );
}

function DrawerAuditoria({
  item,
  modo,
  abertoSecao,
  setAbertoSecao,
  onClose,
  onDecisao,
}) {
  if (!item) {
    return null;
  }

  const somenteLeitura =
    modo === "resumo";

  return (
    <>
      <button
        type="button"
        className="ama-drawer-backdrop"
        onClick={onClose}
        aria-label="Fechar"
      />

      <aside className="ama-audit-drawer">
        <header className="ama-audit-head">
          <div>
            <span>
              {somenteLeitura
                ? "Resumo do Cadastro"
                : "Auditoria do Morador"}
            </span>

            <h2>
              {item.nome}
            </h2>

            <p>
              Cadastro finalizado em{" "}
              {formatarDataHora(
                item.wizard_finalizado_em
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X
              size={18}
            />
          </button>
        </header>

        <section className="ama-audit-profile">
          <div className="ama-profile-avatar">
            {obterIniciais(
              item.nome
            )}
          </div>

          <div className="ama-profile-main">
            <div className="ama-profile-title">
              <h3>
                {item.nome}
              </h3>

              <span>
                {item.perfil_morador}
              </span>
            </div>

            <p>
              Unidade {item.unidade}
              {" • "}
              Torre {item.torre}
            </p>

            <div className="ama-profile-grid">
              <CampoLeitura
                label="CPF"
                value={
                  item.cpf
                }
              />

              <CampoLeitura
                label="E-mail"
                value={
                  item.email
                }
              />

              <CampoLeitura
                label="WhatsApp"
                value={
                  item.telefone
                }
              />

              <CampoLeitura
                label="Status"
                value={formatarStatusAuditoria(
                  item.status_auditoria
                )}
              />
            </div>
          </div>

          <div className="ama-profile-summary">
            <span>
              Resumo rápido
            </span>

            <strong>
              Dependentes:{" "}
              {item.resumo
                ?.dependentes || 0}
            </strong>

            <strong>
              Pets:{" "}
              {item.resumo
                ?.pets || 0}
            </strong>

            <strong>
              Veículos:{" "}
              {item.resumo
                ?.veiculos || 0}
            </strong>

            <strong>
              Vagas:{" "}
              {item.resumo
                ?.garagem || 0}
            </strong>
          </div>
        </section>

        <main className="ama-accordion-list">
          <AccordionItem
            id="identificacao"
            titulo="1. Identificação da Unidade"
            subtitulo="Torre, unidade e perfil"
            icon={ClipboardCheck}
            status="Conferir"
            aberto={
              abertoSecao ===
              "identificacao"
            }
            onToggle={
              setAbertoSecao
            }
          >
            <ListaCampos
              campos={[
                {
                  label: "Torre",
                  value:
                    item.torre,
                },
                {
                  label:
                    "Unidade",
                  value:
                    item.unidade,
                },
                {
                  label:
                    "Perfil",
                  value:
                    item.perfil_morador,
                },
                {
                  label:
                    "ID",
                  value:
                    item.business_id,
                },
              ]}
            />
          </AccordionItem>

          <AccordionItem
            id="responsavel"
            titulo="2. Dados do Morador"
            subtitulo="Dados pessoais e contato"
            icon={UserRound}
            status="Conferir"
            aberto={
              abertoSecao ===
              "responsavel"
            }
            onToggle={
              setAbertoSecao
            }
          >
            <ListaCampos
              campos={[
                {
                  label:
                    "Nome completo",
                  value:
                    item.nome,
                },
                {
                  label:
                    "CPF",
                  value:
                    item.cpf,
                },
                {
                  label:
                    "E-mail",
                  value:
                    item.email,
                },
                {
                  label:
                    "WhatsApp",
                  value:
                    item.telefone,
                },
                {
                  label:
                    "Perfil",
                  value:
                    item.perfil_morador,
                },
                {
                  label:
                    "Observações",
                  value:
                    item.observacoes,
                },
              ]}
            />
          </AccordionItem>

          <AccordionItem
            id="dependentes"
            titulo="3. Dependentes"
            subtitulo="Pessoas vinculadas ao cadastro"
            icon={UserRound}
            status={`${
              item.resumo
                ?.dependentes || 0
            } dependentes`}
            aberto={
              abertoSecao ===
              "dependentes"
            }
            onToggle={
              setAbertoSecao
            }
          >
            <ListaDependentes
              dependentes={
                item.dependentes
              }
            />
          </AccordionItem>

          <AccordionItem
            id="funcionarios-pets"
            titulo="4. Funcionários do Lar e Pets"
            subtitulo="Informações adicionais da residência"
            icon={UserRound}
            status={`${
              (item.resumo
                ?.funcionarios || 0) +
              (item.resumo
                ?.pets || 0)
            } registros`}
            aberto={
              abertoSecao ===
              "funcionarios-pets"
            }
            onToggle={
              setAbertoSecao
            }
          >
            <ListaFuncionariosPets
              funcionarios={
                item.funcionarios_lar
              }
              pets={
                item.pets
              }
            />
          </AccordionItem>

          <AccordionItem
            id="veiculos-garagem"
            titulo="5. Veículos e Garagem"
            subtitulo="Veículos e vagas informadas"
            icon={AlertTriangle}
            status={
              item.resumo
                ?.possuiConflitoGaragem
                ? "Requer atenção"
                : "Conferir"
            }
            aberto={
              abertoSecao ===
              "veiculos-garagem"
            }
            onToggle={
              setAbertoSecao
            }
          >
            <ListaVeiculosGaragem
              item={item}
            />
          </AccordionItem>

          <AccordionItem
            id="preferencias"
            titulo="6. Preferências"
            subtitulo="Preferências de comunicação"
            icon={Info}
            status="Conferir"
            aberto={
              abertoSecao ===
              "preferencias"
            }
            onToggle={
              setAbertoSecao
            }
          >
            <ListaCampos
              campos={[
                {
                  label:
                    "Canal preferencial",
                  value:
                    item.preferencias
                      ?.canal_preferencial,
                },
                {
                  label:
                    "Receber avisos",
                  value:
                    item.preferencias
                      ?.notificacoes
                      ? "Sim"
                      : "Não informado",
                },
                {
                  label:
                    "Observações",
                  value:
                    item.preferencias
                      ?.observacoes,
                },
              ]}
            />
          </AccordionItem>

          <AccordionItem
            id="divergencias"
            titulo="7. Pontos de Atenção"
            subtitulo="Informações que precisam ser conferidas"
            icon={AlertTriangle}
            status={`${
              item.divergencias
                ?.length || 0
            } registros`}
            aberto={
              abertoSecao ===
              "divergencias"
            }
            onToggle={
              setAbertoSecao
            }
          >
            {item.divergencias
              ?.length ? (
              <div className="ama-list-stack">
                {item.divergencias.map(
                  (
                    divergencia,
                    index
                  ) => (
                    <div
                      className="ama-simple-card danger"
                      key={
                        divergencia.id ||
                        index
                      }
                    >
                      <ListaCampos
                        campos={[
                          {
                            label:
                              "Tipo",
                            value:
                              divergencia.tipo,
                          },
                          {
                            label:
                              "Campo",
                            value:
                              divergencia.campo,
                          },
                          {
                            label:
                              "Descrição",
                            value:
                              divergencia.descricao,
                          },
                        ]}
                      />
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="ama-empty-inline">
                Nenhum ponto de atenção registrado.
              </div>
            )}
          </AccordionItem>
        </main>

        <div className="ama-audit-warning">
          <Info
            size={17}
          />

          <div>
            <strong>
              {somenteLeitura
                ? "Este resumo é somente para consulta."
                : "Os dados do morador não podem ser alterados nesta tela."}
            </strong>

            <span>
              {somenteLeitura
                ? "Para analisar e tomar uma decisão, utilize a opção Auditar."
                : "Se algum dado estiver incorreto, solicite a correção ao morador."}
            </span>
          </div>
        </div>

        <footer className="ama-audit-footer">
          {!somenteLeitura ? (
            <>
              <button
                type="button"
                className="ama-footer-action approve"
                onClick={() =>
                  onDecisao(
                    "APROVADO",
                    item
                  )
                }
              >
                <CheckCircle2
                  size={17}
                />

                <span>
                  <strong>
                    Aprovar Cadastro
                  </strong>

                  <small>
                    Confirmar cadastro
                  </small>
                </span>
              </button>

              <button
                type="button"
                className="ama-footer-action correction"
                onClick={() =>
                  onDecisao(
                    "CORRECAO_SOLICITADA",
                    item
                  )
                }
              >
                <AlertTriangle
                  size={17}
                />

                <span>
                  <strong>
                    Solicitar Correção
                  </strong>

                  <small>
                    Pedir ajuste ao morador
                  </small>
                </span>
              </button>

              <button
                type="button"
                className="ama-footer-action reject"
                onClick={() =>
                  onDecisao(
                    "REPROVADO",
                    item
                  )
                }
              >
                <XCircle
                  size={17}
                />

                <span>
                  <strong>
                    Reprovar Cadastro
                  </strong>

                  <small>
                    Encerrar esta análise
                  </small>
                </span>
              </button>
            </>
          ) : null}

          <button
            type="button"
            className="ama-footer-action neutral"
            onClick={onClose}
          >
            <span>
              <strong>
                Fechar
              </strong>

              <small>
                Sair desta visualização
              </small>
            </span>
          </button>
        </footer>
      </aside>
    </>
  );
}

export default function AuditoriaMoradoresAuditoria({
  perfil,
  onNavigate,
}) {
  const condominioId =
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio
      ?.condominio_id ||
    null;

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    registros,
    setRegistros,
  ] = useState([]);

  const [
    resumo,
    setResumo,
  ] = useState({
    aguardando: 0,
    iniciada: 0,
    reauditoraPendente: 0,
    aprovadosHoje: 0,
    total: 0,
  });

  const [
    torres,
    setTorres,
  ] = useState([]);

  const [
    busca,
    setBusca,
  ] = useState("");

  const [
    buscaAplicada,
    setBuscaAplicada,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("TODOS");

  const [
    torre,
    setTorre,
  ] = useState("TODAS");

  const [
    unidade,
    setUnidade,
  ] = useState("TODAS");

  const [
    dataInicio,
    setDataInicio,
  ] = useState(
    () =>
      dataMenosDiasInput(
        30
      )
  );

  const [
    dataFim,
    setDataFim,
  ] = useState(
    () =>
      dataHojeInput()
  );

  const [
    pagina,
    setPagina,
  ] = useState(1);

  const [
    linhasPorPagina,
    setLinhasPorPagina,
  ] = useState(10);

  const [
    possuiProxima,
    setPossuiProxima,
  ] = useState(false);

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    menuAberto,
    setMenuAberto,
  ] = useState(null);

  const [
    auditoriaSelecionada,
    setAuditoriaSelecionada,
  ] = useState(null);

  const [
    modoDrawer,
    setModoDrawer,
  ] = useState(null);

  const [
    secaoAberta,
    setSecaoAberta,
  ] = useState(
    "identificacao"
  );

  const [
    decisaoPendente,
    setDecisaoPendente,
  ] = useState(null);

  const [
    observacaoDecisao,
    setObservacaoDecisao,
  ] = useState("");

  const [
    salvandoDecisao,
    setSalvandoDecisao,
  ] = useState(false);

  const [
    carregandoDetalhe,
    setCarregandoDetalhe,
  ] = useState(false);

  const [
    refreshToken,
    setRefreshToken,
  ] = useState(0);

  /*
   * A busca espera o usuário parar de digitar.
   *
   * Existe somente uma carga da tabela.
   */
  useEffect(() => {
    const timeout =
      setTimeout(() => {
        setBuscaAplicada(
          busca.trim()
        );

        setPagina(1);
      }, 450);

    return () =>
      clearTimeout(timeout);
  }, [busca]);

  /*
   * Torres são carregadas separadamente
   * e não repetidas a cada troca de página.
   */
  useEffect(() => {
    if (!condominioId) {
      return;
    }

    let ativo = true;

    async function carregarTorres() {
      try {
        const dados =
          await buscarTorresAuditoriaMoradores({
            condominioId,
          });

        if (ativo) {
          setTorres(
            dados
          );
        }
      } catch (error) {
        console.error(
          "Erro ao carregar torres:",
          error
        );
      }
    }

    carregarTorres();

    return () => {
      ativo = false;
    };
  }, [condominioId]);

  /*
   * Lista e resumo.
   *
   * Sem segunda carga automática.
   */
  useEffect(() => {
    if (!condominioId) {
      setErro(
        "Condomínio não identificado."
      );

      setCarregando(false);

      return;
    }

    let ativo = true;

    async function carregar() {
      try {
        setCarregando(
          true
        );

        setErro("");

        const [
          lista,
          resumoAtual,
        ] =
          await Promise.all([
            listarMoradoresParaAuditoria({
              condominioId,
              busca:
                buscaAplicada,
              status,
              torre,
              unidade,
              dataInicio,
              dataFim,
              pagina,
              limite:
                linhasPorPagina,
            }),

            obterResumoAuditoriaMoradores({
              condominioId,
            }),
          ]);

        if (!ativo) {
          return;
        }

        setRegistros(
          lista.registros ||
            []
        );

        setTotal(
          Number(
            lista.total || 0
          )
        );

        setPossuiProxima(
          Boolean(
            lista.possuiProxima
          )
        );

        setResumo(
          resumoAtual
        );
      } catch (error) {
        if (!ativo) {
          return;
        }

        console.error(error);

        setErro(
          error?.message ||
          "Não foi possível carregar as auditorias."
        );
      } finally {
        if (ativo) {
          setCarregando(
            false
          );
        }
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [
    condominioId,
    buscaAplicada,
    status,
    torre,
    unidade,
    dataInicio,
    dataFim,
    pagina,
    linhasPorPagina,
    refreshToken,
  ]);

  useEffect(() => {
    function handleEsc(
      event
    ) {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      if (
        salvandoDecisao ||
        carregandoDetalhe
      ) {
        return;
      }

      setMenuAberto(null);
      setAuditoriaSelecionada(
        null
      );
      setModoDrawer(null);
      setDecisaoPendente(
        null
      );
      setObservacaoDecisao(
        ""
      );
    }

    window.addEventListener(
      "keydown",
      handleEsc
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleEsc
      );
  }, [
    salvandoDecisao,
    carregandoDetalhe,
  ]);

  const unidades =
    useMemo(() => {
      const lista =
        registros
          .map(
            (item) =>
              item.unidade
          )
          .filter(Boolean)
          .filter(
            (item) =>
              item !==
              "Não informado"
          );

      return [
        ...new Set(lista),
      ].sort(
        (a, b) =>
          String(a)
            .localeCompare(
              String(b)
            )
      );
    }, [registros]);

  const numeroInicial =
    registros.length
      ? (pagina - 1) *
          linhasPorPagina +
        1
      : 0;

  const numeroFinal =
    registros.length
      ? numeroInicial +
        registros.length -
        1
      : 0;

  async function carregarDetalhe(
    item
  ) {
    setCarregandoDetalhe(
      true
    );

    try {
      return await obterDetalheAuditoriaMorador({
        condominioId,
        preCadastroId:
          item.pre_cadastro_id,
      });
    } finally {
      setCarregandoDetalhe(
        false
      );
    }
  }

  async function abrirResumo(
    item
  ) {
    try {
      const detalhe =
        await carregarDetalhe(
          item
        );

      setSecaoAberta(
        "identificacao"
      );

      setModoDrawer(
        "resumo"
      );

      setAuditoriaSelecionada(
        detalhe
      );
    } catch (error) {
      toast.error(
        error?.message ||
        "Não foi possível abrir o resumo."
      );
    }
  }

  async function abrirAuditoria(
    item
  ) {
    try {
      setCarregandoDetalhe(
        true
      );

      if (
        item.status_auditoria ===
        "AGUARDANDO_AUDITORIA"
      ) {
        await marcarAuditoriaIniciada({
          perfil,
          preCadastroId:
            item.pre_cadastro_id,
        });

        /*
         * Atualiza somente esta linha.
         * Não recarrega a lista inteira.
         */
        setRegistros(
          (atuais) =>
            atuais.map(
              (registro) =>
                registro.id ===
                item.id
                  ? {
                      ...registro,
                      status_auditoria:
                        "AUDITORIA_INICIADA",
                    }
                  : registro
            )
        );

        setResumo(
          (atual) => ({
            ...atual,

            aguardando:
              Math.max(
                0,
                Number(
                  atual.aguardando ||
                    0
                ) - 1
              ),

            iniciada:
              Number(
                atual.iniciada ||
                  0
              ) + 1,
          })
        );
      }

      const detalhe =
        await obterDetalheAuditoriaMorador({
          condominioId,
          preCadastroId:
            item.pre_cadastro_id,
        });

      setSecaoAberta(
        "identificacao"
      );

      setModoDrawer(
        "auditoria"
      );

      setAuditoriaSelecionada({
        ...detalhe,

        status_auditoria:
          item.status_auditoria ===
          "AGUARDANDO_AUDITORIA"
            ? "AUDITORIA_INICIADA"
            : detalhe
                .status_auditoria,
      });
    } catch (error) {
      setModoDrawer(null);

      setAuditoriaSelecionada(
        null
      );

      toast.error(
        error?.message ||
        "Não foi possível iniciar a auditoria."
      );
    } finally {
      setCarregandoDetalhe(
        false
      );
    }
  }

  function handleAcaoLinha(
    acao,
    item
  ) {
    if (
      acao === "Auditar"
    ) {
      abrirAuditoria(
        item
      );

      return;
    }

    if (
      acao ===
      "Visualizar Resumo"
    ) {
      abrirResumo(
        item
      );
    }
  }

  function handleDecisao(
    decisao,
    item
  ) {
    if (
      modoDrawer !==
      "auditoria"
    ) {
      toast.error(
        "Abra a auditoria para registrar uma decisão."
      );

      return;
    }

    setDecisaoPendente({
      decisao,
      item,
    });

    setObservacaoDecisao(
      ""
    );
  }

  async function confirmarDecisaoAuditoria() {
    if (
      !decisaoPendente
        ?.item ||
      !decisaoPendente
        ?.decisao
    ) {
      return;
    }

    try {
      setSalvandoDecisao(
        true
      );

      const {
        item,
        decisao,
      } =
        decisaoPendente;

      if (
        decisao ===
        "APROVADO"
      ) {
        await aprovarMoradorAuditoria({
          perfil,
          preCadastroId:
            item.pre_cadastro_id,
        });
      } else {
        await registrarDecisaoAuditoriaMorador({
          perfil,
          preCadastroId:
            item.pre_cadastro_id,
          decisao,
          observacao:
            observacaoDecisao,
        });
      }

      const mensagens = {
        APROVADO:
          "Cadastro aprovado com sucesso.",

        CORRECAO_SOLICITADA:
          "Correção solicitada ao morador.",

        REPROVADO:
          "Cadastro reprovado.",
      };

      toast.success(
        mensagens[decisao] ||
        "Auditoria atualizada."
      );

      /*
       * Remove somente o morador decidido.
       *
       * Não refaz toda a consulta.
       */
      setRegistros(
        (atuais) =>
          atuais.filter(
            (registro) =>
              registro.id !==
              item.id
          )
      );

      setTotal(
        (atual) =>
          Math.max(
            0,
            atual - 1
          )
      );

      setResumo(
        (atual) => {
          const novo = {
            ...atual,
            total:
              Math.max(
                0,
                Number(
                  atual.total || 0
                ) - 1
              ),
          };

          if (
            item.status_auditoria ===
            "AUDITORIA_INICIADA"
          ) {
            novo.iniciada =
              Math.max(
                0,
                Number(
                  atual.iniciada ||
                    0
                ) - 1
              );
          }

          if (
            item.status_auditoria ===
            "REAUDITORIA_PENDENTE"
          ) {
            novo.reauditoraPendente =
              Math.max(
                0,
                Number(
                  atual.reauditoraPendente ||
                    0
                ) - 1
              );
          }

          return novo;
        }
      );

      setDecisaoPendente(
        null
      );

      setObservacaoDecisao(
        ""
      );

      setAuditoriaSelecionada(
        null
      );

      setModoDrawer(
        null
      );

      /*
       * Se a página ficar vazia e não for a primeira,
       * volta uma página.
       */
      if (
        registros.length <=
          1 &&
        pagina > 1
      ) {
        setPagina(
          (atual) =>
            Math.max(
              1,
              atual - 1
            )
        );
      }
    } catch (error) {
      toast.error(
        error?.message ||
        "Não foi possível registrar a decisão."
      );
    } finally {
      setSalvandoDecisao(
        false
      );
    }
  }

  function fecharAuditoria() {
    setAuditoriaSelecionada(
      null
    );

    setModoDrawer(null);

    setSecaoAberta(
      "identificacao"
    );
  }

  function limparFiltros() {
    setBusca("");
    setBuscaAplicada("");
    setStatus("TODOS");
    setTorre("TODAS");
    setUnidade("TODAS");

    setDataInicio(
      dataMenosDiasInput(
        30
      )
    );

    setDataFim(
      dataHojeInput()
    );

    setPagina(1);
  }

  return (
    <div className="ama-page">
      <div className="ama-main">
        <div className="ama-breadcrumb">
          <span>
            Auditoria
          </span>

          <ChevronRight
            size={14}
          />

          <span>
            Moradores
          </span>

          <ChevronRight
            size={14}
          />

          <strong>
            Auditoria
          </strong>
        </div>

        <div className="ama-header">
          <div>
            <h1>
              Auditoria de Moradores

              <Info
                size={17}
              />
            </h1>

            <p>
              Confira os cadastros enviados pelos
              moradores, solicite ajustes quando
              necessário e aprove as informações
              consistentes.
            </p>
          </div>
        </div>

        <div className="ama-tabs">
          <button
            type="button"
            onClick={() =>
              onNavigate?.(
                "admin-auditoria-moradores-pre-cadastro"
              )
            }
          >
            Pré-Cadastro
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate?.(
                "admin-auditoria-moradores-convite"
              )
            }
          >
            Convite
          </button>

          <button
            type="button"
            className="active"
          >
            Auditoria
          </button>

          <button
            type="button"
            onClick={() =>
              onNavigate?.(
                "admin-auditoria-moradores-historico"
              )
            }
          >
            Histórico
          </button>
        </div>

        <section className="ama-kpis">
          <KpiCard
            icon={
              ClipboardCheck
            }
            titulo="Aguardando Auditoria"
            valor={
              resumo.aguardando
            }
            detalhe="Prontos para análise"
            variante="azul"
          />

          <KpiCard
            icon={
              ShieldCheck
            }
            titulo="Auditoria Iniciada"
            valor={
              resumo.iniciada
            }
            detalhe="Em análise"
            variante="roxo"
          />

          <KpiCard
            icon={
              AlertTriangle
            }
            titulo="Reauditoria Pendente"
            valor={
              resumo.reauditoraPendente
            }
            detalhe="Retornaram para nova análise"
            variante="laranja"
          />
        </section>

        <section className="ama-table-card">
          <div className="ama-filters">
            <div className="ama-search">
              <Search
                size={18}
              />

              <input
                value={busca}
                onChange={(
                  event
                ) =>
                  setBusca(
                    event.target
                      .value
                  )
                }
                placeholder="Buscar por nome, unidade, torre ou ID do morador..."
              />
            </div>

            <label>
              <span>
                Status
              </span>

              <select
                value={status}
                onChange={(
                  event
                ) => {
                  setStatus(
                    event.target
                      .value
                  );

                  setPagina(1);
                }}
              >
                {STATUS_FILTROS.map(
                  (opcao) => (
                    <option
                      key={
                        opcao.value
                      }
                      value={
                        opcao.value
                      }
                    >
                      {
                        opcao.label
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Torre
              </span>

              <select
                value={torre}
                onChange={(
                  event
                ) => {
                  setTorre(
                    event.target
                      .value
                  );

                  setPagina(1);
                }}
              >
                <option value="TODAS">
                  Todas
                </option>

                {torres.map(
                  (item) => (
                    <option
                      key={
                        item.id
                      }
                      value={
                        item.nome
                      }
                    >
                      {
                        item.nome
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Unidade
              </span>

              <select
                value={
                  unidade
                }
                onChange={(
                  event
                ) => {
                  setUnidade(
                    event.target
                      .value
                  );

                  setPagina(1);
                }}
              >
                <option value="TODAS">
                  Todas
                </option>

                {unidades.map(
                  (item) => (
                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </label>

            <div className="ama-periodo-premium">
              <DateRangePickerPremium
                dataInicio={
                  dataInicio
                }
                dataFim={
                  dataFim
                }
                persistKey="admin-auditoria-moradores-auditoria-periodo"
                onChange={({
                  inicio,
                  fim,
                }) => {
                  setDataInicio(
                    inicio
                  );

                  setDataFim(
                    fim
                  );

                  setPagina(
                    1
                  );
                }}
              />
            </div>

            <button
              type="button"
              className="ama-filter-extra"
              onClick={
                limparFiltros
              }
            >
              Limpar
            </button>
          </div>

          {erro ? (
            <div className="ama-error">
              {erro}
            </div>
          ) : null}

          <div className="ama-table-wrap">
            <table className="ama-table">
              <thead>
                <tr>
                  <th>
                    Unidade
                  </th>

                  <th>
                    Torre
                  </th>

                  <th>
                    Nome Completo
                  </th>

                  <th>
                    Preenchimento
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {carregando ? (
                  <tr>
                    <td colSpan="6">
                      <div className="ama-loading">
                        <RefreshCw
                          size={18}
                          className="ama-spin"
                        />

                        Carregando auditorias...
                      </div>
                    </td>
                  </tr>
                ) : registros.length ? (
                  registros.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                      >
                        <td>
                          <strong>
                            Apto{" "}
                            {
                              item.unidade
                            }
                          </strong>
                        </td>

                        <td>
                          <strong>
                            {
                              item.torre
                            }
                          </strong>
                        </td>

                        <td>
                          <div className="ama-person">
                            <div className="ama-avatar">
                              {obterIniciais(
                                item.nome
                              )}
                            </div>

                            <div>
                              <strong>
                                {
                                  item.nome
                                }
                              </strong>

                              <span>
                                ID:{" "}
                                {item.business_id ||
                                  "—"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong>
                            {item.percentual_preenchimento ||
                              100}
                            %
                          </strong>

                          <span>
                            Cadastro finalizado
                          </span>
                        </td>

                        <td>
                          <span
                            className={`ama-status ama-status-${classeStatus(
                              item.status_auditoria
                            )}`}
                          >
                            {formatarStatusAuditoria(
                              item.status_auditoria
                            )}
                          </span>
                        </td>

                        <td>
                          <AcaoLinhaMenu
                            item={
                              item
                            }
                            aberto={
                              menuAberto ===
                              item.id
                            }
                            onToggle={
                              setMenuAberto
                            }
                            onAcao={
                              handleAcaoLinha
                            }
                          />
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td colSpan="6">
                      <div className="ama-empty">
                        <strong>
                          Nenhum cadastro aguardando análise
                        </strong>

                        <p>
                          Não há registros compatíveis com os
                          filtros selecionados.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ama-table-footer">
            <span>
              Mostrando{" "}
              {numeroInicial} a{" "}
              {numeroFinal} de{" "}
              {total} registros
            </span>

            <div className="ama-pagination">
              <button
                type="button"
                disabled={
                  pagina === 1 ||
                  carregando
                }
                onClick={() =>
                  setPagina(
                    (atual) =>
                      Math.max(
                        1,
                        atual - 1
                      )
                  )
                }
              >
                <ChevronLeft
                  size={16}
                />
              </button>

              <strong>
                {pagina}
              </strong>

              <button
                type="button"
                disabled={
                  !possuiProxima ||
                  carregando
                }
                onClick={() =>
                  setPagina(
                    (atual) =>
                      atual + 1
                  )
                }
              >
                <ChevronRight
                  size={16}
                />
              </button>
            </div>

            <label className="ama-per-page">
              Linhas por página:

              <select
                value={
                  linhasPorPagina
                }
                onChange={(
                  event
                ) => {
                  setLinhasPorPagina(
                    Number(
                      event.target
                        .value
                    )
                  );

                  setPagina(
                    1
                  );
                }}
              >
                <option value={10}>
                  10
                </option>

                <option value={20}>
                  20
                </option>

                <option value={30}>
                  30
                </option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <aside className="ama-rightbar">
        <section className="ama-side-card">
          <div className="ama-side-title">
            <ClipboardCheck
              size={17}
            />

            <strong>
              Resumo da Auditoria
            </strong>
          </div>

          <div className="ama-side-metrics">
            <div>
              <span>
                Aguardando
              </span>

              <strong>
                {resumo.aguardando}
              </strong>
            </div>

            <div>
              <span>
                Em análise
              </span>

              <strong>
                {resumo.iniciada}
              </strong>
            </div>

            <div>
              <span>
                Para nova análise
              </span>

              <strong>
                {
                  resumo.reauditoraPendente
                }
              </strong>
            </div>
          </div>
        </section>

        <section className="ama-side-card ama-side-card-orange">
          <div className="ama-side-title">
            <Info
              size={17}
            />

            <strong>
              Painel de Comunicados Chegou
              <span className="ama-orange">
                !
              </span>
            </strong>
          </div>

          <div className="ama-communication-placeholder">
            <div>
              <strong>
                Comunicados do Módulo
              </strong>

              <span>
                Espaço reservado para avisos importantes.
              </span>
            </div>
          </div>
        </section>

        <section className="ama-side-card">
          <h3>
            Orientações
          </h3>

          <ul className="ama-orientation-list">
            <li>
              Confira as informações antes de aprovar.
            </li>

            <li>
              Se houver erro, solicite a correção ao morador.
            </li>

            <li>
              Confira dependentes e permissões.
            </li>

            <li>
              Revise as informações de garagem quando necessário.
            </li>

            <li>
              Aprove somente cadastros consistentes.
            </li>
          </ul>
        </section>
      </aside>

      <DrawerAuditoria
        item={
          auditoriaSelecionada
        }
        modo={
          modoDrawer
        }
        abertoSecao={
          secaoAberta
        }
        setAbertoSecao={(
          secao
        ) =>
          setSecaoAberta(
            (atual) =>
              atual === secao
                ? ""
                : secao
          )
        }
        onClose={
          fecharAuditoria
        }
        onDecisao={
          handleDecisao
        }
      />

      {carregandoDetalhe ? (
        <div className="ama-loading">
          <RefreshCw
            size={18}
            className="ama-spin"
          />

          Abrindo cadastro...
        </div>
      ) : null}

      {decisaoPendente ? (
        <>
          <button
            type="button"
            className="ama-drawer-backdrop"
            onClick={() => {
              if (
                !salvandoDecisao
              ) {
                setDecisaoPendente(
                  null
                );

                setObservacaoDecisao(
                  ""
                );
              }
            }}
            aria-label="Fechar"
          />

          <aside className="ama-decision-modal">
            <header className="ama-decision-modal-header">
              <div>
                <span>
                  Decisão da Auditoria
                </span>

                <h2>
                  {formatarStatusAuditoria(
                    decisaoPendente
                      .decisao
                  )}
                </h2>
              </div>

              <button
                type="button"
                disabled={
                  salvandoDecisao
                }
                onClick={() => {
                  setDecisaoPendente(
                    null
                  );

                  setObservacaoDecisao(
                    ""
                  );
                }}
              >
                ×
              </button>
            </header>

            <section className="ama-decision-modal-section">
              <h3>
                Morador
              </h3>

              <p>
                <strong>
                  {
                    decisaoPendente
                      .item.nome
                  }
                </strong>

                <br />

                Unidade{" "}
                {
                  decisaoPendente
                    .item.unidade
                }

                {" • "}

                Torre{" "}
                {
                  decisaoPendente
                    .item.torre
                }
              </p>
            </section>

            {decisaoPendente
              .decisao ===
            "APROVADO" ? (
              <section className="ama-decision-modal-section">
                <h3>
                  Confirmação
                </h3>

                <p>
                  Confirme somente se as informações estiverem corretas.
                </p>
              </section>
            ) : (
              <section className="ama-decision-modal-section">
                <h3>
                  {decisaoPendente
                    .decisao ===
                  "CORRECAO_SOLICITADA"
                    ? "Orientação para correção"
                    : "Motivo da reprovação"}
                </h3>

                <textarea
                  value={
                    observacaoDecisao
                  }
                  onChange={(
                    event
                  ) =>
                    setObservacaoDecisao(
                      event.target
                        .value
                    )
                  }
                  placeholder={
                    decisaoPendente
                      .decisao ===
                    "CORRECAO_SOLICITADA"
                      ? "Explique o que precisa ser corrigido..."
                      : "Informe o motivo da reprovação..."
                  }
                  rows={6}
                  className="ama-decision-modal-textarea"
                />

                <p className="ama-decision-modal-helper">
                  Esta mensagem ficará registrada no acompanhamento do cadastro.
                </p>
              </section>
            )}

            <footer className="ama-decision-modal-actions">
              <button
                type="button"
                className="ama-btn ama-btn-outline"
                disabled={
                  salvandoDecisao
                }
                onClick={() => {
                  setDecisaoPendente(
                    null
                  );

                  setObservacaoDecisao(
                    ""
                  );
                }}
              >
                Voltar
              </button>

              <button
                type="button"
                className="ama-btn ama-btn-primary"
                disabled={
                  salvandoDecisao
                }
                onClick={
                  confirmarDecisaoAuditoria
                }
              >
                {salvandoDecisao
                  ? "Salvando..."
                  : "Confirmar"}
              </button>
            </footer>
          </aside>
        </>
      ) : null}
    </div>
  );
}