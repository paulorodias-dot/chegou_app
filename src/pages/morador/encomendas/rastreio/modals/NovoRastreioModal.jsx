import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  Info,
  PackageSearch,
  ShoppingBag,
  Truck,
} from "lucide-react";

import RastreioModalShell from "./RastreioModalShell";

const TABS = [
  {
    id: "rastreio",
    label: "Rastreio",
    icon: PackageSearch,
  },
  {
    id: "compra",
    label: "Compra",
    icon: ShoppingBag,
  },
  {
    id: "acompanhamento",
    label: "Acompanhamento",
    icon: Truck,
  },
];

function normalizarTexto(value) {
  return String(
    value ?? "",
  ).trim();
}

function obterNomeUnidade(
  unidade,
) {
  if (!unidade) {
    return "Unidade";
  }

  const partes = [];

  if (unidade.torre) {
    partes.push(
      `Torre ${unidade.torre}`,
    );
  }

  /*
   * Bloco e unidade são apenas atributos de
   * identificação/apresentação conforme o condomínio.
   *
   * A autoridade é sempre unidade_id.
   */
  if (unidade.bloco) {
    partes.push(
      `Bloco ${unidade.bloco}`,
    );
  }

  if (unidade.unidade) {
    partes.push(
      `Unidade ${unidade.unidade}`,
    );
  }

  return (
    partes.join(" • ") ||
    unidade.nome ||
    "Unidade"
  );
}

export default function NovoRastreioModal({
  open,
  onClose,

  unidades = [],
  loadingUnidades = false,

  transportadoras = [],
  loadingTransportadoras = false,

  saving = false,

  onLoadUnidades,
  onLoadTransportadoras,

  onSave,
}) {
  const [
    activeTab,
    setActiveTab,
  ] = useState("rastreio");

  const [
    codigo,
    setCodigo,
  ] = useState("");

  const [
    descricao,
    setDescricao,
  ] = useState("");

  const [
    unidadeId,
    setUnidadeId,
  ] = useState("");

  const [
    transportadoraId,
    setTransportadoraId,
  ] = useState("");

  const [
    erro,
    setErro,
  ] = useState(null);

  /* ============================================================
     ABERTURA DO MODAL

     Atualiza somente as opções autorizadas do contexto atual.
     ============================================================ */

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    async function carregarOpcoes() {
      setErro(null);

      try {
        await Promise.all([
          onLoadUnidades?.(),
          onLoadTransportadoras?.({
            busca: null,
          }),
        ]);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setErro(
          loadError?.message ||
          "Não foi possível carregar as opções para o rastreio.",
        );
      }
    }

    carregarOpcoes();

    return () => {
      active = false;
    };
  }, [
    open,
    onLoadUnidades,
    onLoadTransportadoras,
  ]);

  /* ============================================================
     UNIDADE

     Uma unidade:
       seleciona automaticamente.

     Várias unidades:
       Morador escolhe.

     Nenhuma:
       criação permanece bloqueada.
     ============================================================ */

  useEffect(() => {
    if (!open) {
      return;
    }

    if (
      Array.isArray(unidades) &&
      unidades.length === 1
    ) {
      const unicaUnidadeId =
        unidades[0]?.unidade_id ||
        unidades[0]?.id ||
        "";

      setUnidadeId(
        unicaUnidadeId,
      );

      return;
    }

    /*
     * Se existirem várias unidades e a seleção anterior
     * não fizer parte do novo conjunto autorizado,
     * descartamos a seleção.
     */
    if (
      Array.isArray(unidades) &&
      unidades.length > 1 &&
      unidadeId
    ) {
      const aindaAutorizada =
        unidades.some(
          (unidade) =>
            (
              unidade?.unidade_id ||
              unidade?.id
            ) === unidadeId,
        );

      if (!aindaAutorizada) {
        setUnidadeId("");
      }
    }
  }, [
    open,
    unidades,
    unidadeId,
  ]);

  /* ============================================================
     VALIDAÇÃO LOCAL DE UX
     ============================================================ */

  const codigoNormalizado =
    normalizarTexto(
      codigo,
    );

  const codigoValido =
    codigoNormalizado.length >= 5;

  const possuiUnidade =
    Boolean(
      unidadeId,
    );

  const possuiTransportadora =
    Boolean(
      transportadoraId,
    );

  const carregandoOpcoes =
    loadingUnidades ||
    loadingTransportadoras;

  const podeSalvar =
    codigoValido &&
    possuiUnidade &&
    possuiTransportadora &&
    !carregandoOpcoes &&
    !saving;

  /* ============================================================
     TRANSPORTADORAS
     ============================================================ */

  const transportadorasOrdenadas =
    useMemo(() => {
      if (
        !Array.isArray(
          transportadoras,
        )
      ) {
        return [];
      }

      return [
        ...transportadoras,
      ].sort(
        (a, b) =>
          String(
            a?.nome_fantasia ??
            "",
          ).localeCompare(
            String(
              b?.nome_fantasia ??
              "",
            ),
            "pt-BR",
          ),
      );
    }, [
      transportadoras,
    ]);

  /* ============================================================
     RESET / CLOSE
     ============================================================ */

  function resetForm() {
    setActiveTab(
      "rastreio",
    );

    setCodigo("");

    setDescricao("");

    setUnidadeId("");

    setTransportadoraId("");

    setErro(null);
  }

  function handleClose() {
    if (saving) {
      return;
    }

    resetForm();

    onClose?.();
  }

  /* ============================================================
     SALVAR
     ============================================================ */

  async function handleSalvar() {
    if (!podeSalvar) {
      return;
    }

    setErro(null);

    try {
      await onSave?.({
        unidadeId,

        transportadoraId,

        codigoRastreio:
          codigoNormalizado,

        descricaoCompra:
          normalizarTexto(
            descricao,
          ) ||
          null,

        previstoPara:
          null,

        metadata: {},
      });

      resetForm();

      onClose?.();
    } catch (saveError) {
      setErro(
        saveError?.message ||
        "Não foi possível salvar este rastreio.",
      );
    }
  }

  return (
    <RastreioModalShell
      open={open}
      onClose={
        handleClose
      }
      size="large"
      title="Novo Rastreio"
      description="Informe uma compra que você está aguardando."
      footer={
        <>
          <button
            type="button"
            className="rastreio-secondary-button"
            onClick={
              handleClose
            }
            disabled={
              saving
            }
          >
            Cancelar
          </button>

          <button
            type="button"
            className="rastreio-primary-button"
            disabled={
              !podeSalvar
            }
            onClick={
              handleSalvar
            }
          >
            {saving
              ? "Salvando..."
              : "Salvar rastreio"}
          </button>
        </>
      }
    >
      <nav
        className="rastreio-modal-tabs"
        aria-label="Etapas do novo rastreio"
      >
        {TABS.map(
          (tab) => {
            const Icon =
              tab.icon;

            const active =
              activeTab ===
              tab.id;

            return (
              <button
                key={
                  tab.id
                }
                type="button"
                className={`rastreio-modal-tab ${
                  active
                    ? "rastreio-modal-tab--active"
                    : ""
                }`}
                aria-current={
                  active
                    ? "step"
                    : undefined
                }
                onClick={() =>
                  setActiveTab(
                    tab.id,
                  )
                }
              >
                <Icon
                  size={17}
                  aria-hidden="true"
                />

                <span>
                  {
                    tab.label
                  }
                </span>
              </button>
            );
          },
        )}
      </nav>

      {erro && (
        <div
          className="rastreio-form-error"
          role="alert"
        >
          {erro}
        </div>
      )}

      {activeTab ===
        "rastreio" && (
        <div className="rastreio-modal-panel">
          <div className="rastreio-form-section">
            <div className="rastreio-form-section__heading">
              <h3>
                Identifique sua entrega
              </h3>

              <p>
                Informe o código exatamente como aparece
                no acompanhamento da sua compra.
              </p>
            </div>

            {/* ==================================================
                UNIDADE
               ================================================== */}

            {loadingUnidades ? (
              <div className="rastreio-field">
                <span>
                  Unidade
                </span>

                <div className="rastreio-readonly-field">
                  Carregando suas unidades...
                </div>
              </div>
            ) : unidades.length >
              0 ? (
              <label className="rastreio-field">
                <span>
                  Unidade
                </span>

                <select
                  value={
                    unidadeId
                  }
                  onChange={(
                    event,
                  ) =>
                    setUnidadeId(
                      event
                        .target
                        .value,
                    )
                  }
                  disabled={
                    saving ||
                    unidades.length === 1
                  }
                >
                  {unidades.length >
                    1 && (
                    <option value="">
                      Selecione a unidade
                    </option>
                  )}

                  {unidades.map(
                    (
                      unidade,
                    ) => {
                      const id =
                        unidade
                          ?.unidade_id ||
                        unidade?.id;

                      return (
                        <option
                          key={
                            id
                          }
                          value={
                            id
                          }
                        >
                          {obterNomeUnidade(
                            unidade,
                          )}
                        </option>
                      );
                    },
                  )}
                </select>

                {unidades.length ===
                1 ? (
                  <small>
                    Esta é a unidade
                    vinculada ao seu
                    acesso neste
                    condomínio.
                  </small>
                ) : (
                  <small>
                    Selecione a unidade
                    para a qual esta
                    encomenda está sendo
                    enviada.
                  </small>
                )}
              </label>
            ) : (
              <aside className="rastreio-good-practice">
                <Info
                  size={18}
                  aria-hidden="true"
                />

                <div>
                  <strong>
                    Unidade não encontrada
                  </strong>

                  <p>
                    Não encontramos uma
                    unidade disponível
                    para este acesso
                    neste condomínio.
                  </p>
                </div>
              </aside>
            )}

            {/* ==================================================
                CÓDIGO
               ================================================== */}

            <label className="rastreio-field">
              <span>
                Código de rastreio
              </span>

              <input
                type="text"
                value={
                  codigo
                }
                onChange={(
                  event,
                ) =>
                  setCodigo(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="Digite o código de rastreio"
                autoComplete="off"
                disabled={
                  saving
                }
              />
            </label>

            {/* ==================================================
                TRANSPORTADORA
               ================================================== */}

            <label className="rastreio-field">
              <span>
                Transportadora
              </span>

              <select
                value={
                  transportadoraId
                }
                onChange={(
                  event,
                ) =>
                  setTransportadoraId(
                    event
                      .target
                      .value,
                  )
                }
                disabled={
                  loadingTransportadoras ||
                  saving
                }
              >
                <option value="">
                  {loadingTransportadoras
                    ? "Carregando transportadoras..."
                    : "Selecione a transportadora"}
                </option>

                {transportadorasOrdenadas.map(
                  (
                    transportadora,
                  ) => (
                    <option
                      key={
                        transportadora.id
                      }
                      value={
                        transportadora.id
                      }
                    >
                      {
                        transportadora
                          .nome_fantasia
                      }
                    </option>
                  ),
                )}
              </select>

              {!loadingTransportadoras &&
                transportadorasOrdenadas.length ===
                  0 && (
                  <small>
                    Nenhuma transportadora
                    está disponível para
                    novos rastreios neste
                    momento.
                  </small>
                )}
            </label>

            <aside className="rastreio-good-practice">
              <Info
                size={18}
                aria-hidden="true"
              />

              <div>
                <strong>
                  Transportadora
                </strong>

                <p>
                  Quando possível, o
                  Sistema Chegou! poderá
                  identificar a
                  transportadora pelo
                  código de rastreio.
                  Enquanto essa
                  identificação não
                  estiver disponível,
                  selecione a opção
                  correspondente.
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}

      {activeTab ===
        "compra" && (
        <div className="rastreio-modal-panel">
          <div className="rastreio-form-section">
            <div className="rastreio-form-section__heading">
              <h3>
                Identifique sua compra
              </h3>

              <p>
                Esta informação é
                opcional e serve apenas
                para facilitar sua
                própria organização.
              </p>
            </div>

            <label className="rastreio-field">
              <span>
                Nome ou apelido da compra
              </span>

              <input
                type="text"
                value={
                  descricao
                }
                onChange={(
                  event,
                ) =>
                  setDescricao(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="Ex.: Presente, tênis, livro"
                autoComplete="off"
                disabled={
                  saving
                }
              />

              <small>
                Evite incluir
                informações pessoais
                ou detalhes
                desnecessários sobre
                o conteúdo da compra.
              </small>
            </label>

            <aside className="rastreio-good-practice">
              <Info
                size={18}
                aria-hidden="true"
              />

              <div>
                <strong>
                  Privacidade
                </strong>

                <p>
                  Use apenas uma
                  identificação simples
                  que ajude você a
                  reconhecer a entrega.
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}

      {activeTab ===
        "acompanhamento" && (
        <div className="rastreio-modal-panel">
          <div className="rastreio-integration-preview">
            <div className="rastreio-integration-preview__icon">
              <Truck
                size={26}
                aria-hidden="true"
              />
            </div>

            <div>
              <h3>
                Acompanhamento da entrega
              </h3>

              <p>
                Quando o acompanhamento
                estiver disponível para
                este rastreio, as
                informações da
                transportadora
                aparecerão aqui.
              </p>
            </div>
          </div>

          <div className="rastreio-capability-placeholder">
            <CheckCircle2
              size={18}
              aria-hidden="true"
            />

            <div>
              <strong>
                Preparado para acompanhamento integrado
              </strong>

              <p>
                A disponibilidade poderá
                variar conforme a
                transportadora
                responsável pela entrega.
              </p>
            </div>
          </div>

          <aside className="rastreio-good-practice">
            <Info
              size={18}
              aria-hidden="true"
            />

            <div>
              <strong>
                Importante
              </strong>

              <p>
                A informação de chegada
                da transportadora não
                significa que a
                encomenda já esteja
                disponível para retirada
                na Portaria.
              </p>
            </div>
          </aside>

          <p className="rastreio-integration-note">
            O acompanhamento externo
            será disponibilizado
            conforme a integração da
            transportadora.
          </p>
        </div>
      )}
    </RastreioModalShell>
  );
}