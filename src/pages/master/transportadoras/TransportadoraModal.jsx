import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CheckCircle2,
  Image,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import {
  atualizarLogoTransportadoraMaster,
  criarTransportadoraMaster,
  editarTransportadoraMaster,
  enviarLogoTransportadora,
  obterLogoPublicoTransportadora,
  restaurarLogoPadraoTransportadoraMaster,
} from "../../../services/transportadorasService";

import logoPadraoLocal from "../../../assets/logo-padrao-transportadora.png";

import "./TransportadoraModal.css";

const ESTADO_INICIAL = {
  nome_fantasia: "",
  tipo: "TRANSPORTADORA_PRIVADA",
  status: "ATIVA",
  transportadora_oficial: true,
  aceita_rastreio: false,
  possui_integracao_api: false,
  observacoes: "",
};

function TransportadoraModal({
  aberto,
  modo = "criar",
  transportadora = null,
  onClose,
  onConcluido,
}) {
  const [formulario, setFormulario] = useState(ESTADO_INICIAL);
  const [arquivoLogo, setArquivoLogo] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(logoPadraoLocal);

  const nomeFantasiaRef = useRef(null);
  const logoInputRef = useRef(null);
  const modalBodyRef = useRef(null);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [restaurandoLogo, setRestaurandoLogo] =
    useState(false);

  const editando = modo === "editar";

  const titulo = editando
    ? "Editar Transportadora"
    : "Nova Transportadora";

  const logoAtual = useMemo(() => {
    if (transportadora?.logo_url) {
      return transportadora.logo_url;
    }

    if (transportadora?.logo_storage_path) {
      return (
        obterLogoPublicoTransportadora(
          transportadora.logo_storage_path
        ) || logoPadraoLocal
      );
    }

    return logoPadraoLocal;
  }, [transportadora]);

  useEffect(() => {
    if (!aberto) return;

    setErro("");
    setArquivoLogo(null);

    if (editando && transportadora) {
      setFormulario({
        nome_fantasia:
          transportadora.nome_fantasia || "",
        tipo:
          transportadora.tipo ||
          "TRANSPORTADORA_PRIVADA",
        status: transportadora.status || "ATIVA",
        transportadora_oficial:
          transportadora.transportadora_oficial ??
          true,
        aceita_rastreio:
          transportadora.aceita_rastreio ?? false,
        possui_integracao_api:
          transportadora.possui_integracao_api ??
          false,
        observacoes:
          transportadora.observacoes || "",
      });

      setPreviewLogo(logoAtual);
      return;
    }

    setFormulario(ESTADO_INICIAL);
    setPreviewLogo(logoPadraoLocal);
  }, [
    aberto,
    editando,
    transportadora,
    logoAtual,
  ]);

  useEffect(() => {
    if (!aberto) return;

    function fecharComEsc(event) {
      if (event.key === "Escape" && !salvando) {
        onClose();
      }
    }

    window.addEventListener("keydown", fecharComEsc);

    return () => {
      window.removeEventListener("keydown", fecharComEsc);
    };
  }, [aberto, salvando, onClose]);

  useEffect(() => {
    return () => {
      if (
        previewLogo &&
        previewLogo.startsWith("blob:")
      ) {
        URL.revokeObjectURL(previewLogo);
      }
    };
  }, [previewLogo]);

  if (!aberto) return null;

  function atualizarCampo(campo, valor) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  function limparFormularioCriacao() {
    if (
      previewLogo &&
      previewLogo.startsWith("blob:")
    ) {
      URL.revokeObjectURL(previewLogo);
    }

    setFormulario({
      ...ESTADO_INICIAL,
    });

    setArquivoLogo(null);
    setPreviewLogo(logoPadraoLocal);
    setErro("");

    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }

    modalBodyRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    window.requestAnimationFrame(() => {
      nomeFantasiaRef.current?.focus();
    });
  }

  function selecionarLogo(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    const tiposPermitidos = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
      setErro(
        "Selecione uma imagem PNG, JPEG, WebP ou SVG."
      );
      return;
    }

    if (arquivo.size > 2 * 1024 * 1024) {
      setErro(
        "O logotipo deve possuir no máximo 2 MB."
      );
      return;
    }

    setErro("");
    setArquivoLogo(arquivo);
    setPreviewLogo(URL.createObjectURL(arquivo));
  }

  async function restaurarLogoPadrao() {
    if (!editando || !transportadora?.id) {
      setArquivoLogo(null);
      setPreviewLogo(logoPadraoLocal);
      return;
    }

    setRestaurandoLogo(true);
    setErro("");

    try {
      await restaurarLogoPadraoTransportadoraMaster(
        transportadora.id
      );

      setArquivoLogo(null);
      setPreviewLogo(logoPadraoLocal);

      await onConcluido?.({
        tipo: "logo_restaurado",
        mensagem: "Logo padrão restaurado.",
      });
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível restaurar o logotipo."
      );
    } finally {
      setRestaurandoLogo(false);
    }
  }

  async function salvar(event) {
    event.preventDefault();

    if (!formulario.nome_fantasia.trim()) {
      setErro("Informe o nome fantasia.");

      window.requestAnimationFrame(() => {
        nomeFantasiaRef.current?.focus();
      });

      return;
    }

    setSalvando(true);
    setErro("");

    try {
      let resultado;
      let transportadoraId;

      if (editando) {
        resultado = await editarTransportadoraMaster(
          transportadora.id,
          formulario
        );

        transportadoraId = transportadora.id;
      } else {
        resultado = await criarTransportadoraMaster(
          formulario
        );

        transportadoraId =
          resultado?.transportadora?.id;
      }

      if (arquivoLogo && transportadoraId) {
        const storagePath =
          await enviarLogoTransportadora({
            transportadoraId,
            arquivo: arquivoLogo,
          });

        await atualizarLogoTransportadoraMaster({
          transportadoraId,
          storagePath,
          justificativa:
            editando
              ? "Alteração de logotipo durante edição do cadastro."
              : "Inclusão de logotipo durante criação do cadastro.",
        });
      }

      await onConcluido?.({
        tipo: editando ? "editada" : "criada",
        mensagem: editando
          ? "Transportadora atualizada com sucesso."
          : "Transportadora cadastrada com sucesso.",
        resultado,
      });

      if (editando) {
        onClose();
        return;
      }

      limparFormularioCriacao();

      onClose();
    } catch (error) {
      setErro(
        error?.message ||
          "Não foi possível concluir a operação."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="tr-modal-overlay"
      data-modal-open="true"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !salvando
        ) {
          onClose();
        }
      }}
    >
      <section
        className="tr-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tr-modal-title"
      >
        <header className="tr-modal-topbar">
          <div>
            <span>Base Oficial</span>
            <h2 id="tr-modal-title">{titulo}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </header>

        <form
          onSubmit={salvar}
          autoComplete="off"
          data-form-type="other"
        >
          <div
            ref={modalBodyRef}
            className="tr-modal-body"
          >
            {erro ? (
              <div className="tr-modal-error">
                {erro}
              </div>
            ) : null}

            <section className="tr-modal-section">
              <div className="tr-modal-section-title">
                <div>
                  <h3>Dados oficiais</h3>
                  <p>
                    Informações utilizadas por todos os módulos.
                  </p>
                </div>

                <ShieldCheck size={20} />
              </div>

              <div className="tr-modal-grid">
                <label className="tr-modal-field tr-modal-field-full">
                  <span>Nome fantasia *</span>

                  <input
                    ref={nomeFantasiaRef}
                    type="text"
                    name="transportadora_nome_fantasia"
                    value={formulario.nome_fantasia}
                    onChange={(event) =>
                      atualizarCampo(
                        "nome_fantasia",
                        event.target.value
                      )
                    }
                    placeholder="Ex.: Transportadora Exemplo"
                    maxLength={120}
                    autoComplete="off"
                    autoFocus
                  />
                </label>

                <label className="tr-modal-field">
                  <span>Tipo *</span>

                  <select
                    value={formulario.tipo}
                    onChange={(event) =>
                      atualizarCampo(
                        "tipo",
                        event.target.value
                      )
                    }
                  >
                    <option value="CORREIOS">
                      Correios
                    </option>
                    <option value="MARKETPLACE">
                      Marketplace
                    </option>
                    <option value="TRANSPORTADORA_PRIVADA">
                      Transportadora privada
                    </option>
                    <option value="FARMACIA">
                      Farmácia
                    </option>
                    <option value="ENTREGA_SOB_DEMANDA">
                      Entrega sob demanda
                    </option>
                    <option value="MOTOBOY">
                      Motoboy
                    </option>
                    <option value="ENTREGA_DIRETA">
                      Entrega direta
                    </option>
                    <option value="CARGA_EXPRESSA">
                      Carga expressa
                    </option>
                    <option value="OUTROS">
                      Outros
                    </option>
                  </select>
                </label>

                {!editando ? (
                  <label className="tr-modal-field">
                    <span>Status inicial</span>

                    <select
                      value={formulario.status}
                      onChange={(event) =>
                        atualizarCampo(
                          "status",
                          event.target.value
                        )
                      }
                    >
                      <option value="ATIVA">
                        Ativa
                      </option>
                      <option value="EM_OBSERVACAO">
                        Em observação
                      </option>
                      <option value="INSTAVEL">
                        Instável
                      </option>
                      <option value="BLOQUEADA">
                        Bloqueada
                      </option>
                      <option value="INATIVA">
                        Inativa
                      </option>
                    </select>
                  </label>
                ) : null}
              </div>
            </section>

            <section className="tr-modal-section">
              <div className="tr-modal-section-title">
                <div>
                  <h3>Logotipo</h3>
                  <p>
                    Apenas o Módulo Master pode alterar o arquivo.
                  </p>
                </div>

                <Image size={20} />
              </div>

              <div className="tr-logo-editor">
                <img
                  src={previewLogo}
                  alt="Pré-visualização do logotipo"
                  onError={(event) => {
                    event.currentTarget.src =
                      logoPadraoLocal;
                  }}
                />

                <div>
                  <label className="tr-upload-button">
                    <Upload size={17} />
                    Selecionar imagem

                    <input
                      ref={logoInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg"
                      onChange={selecionarLogo}
                    />
                  </label>

                  <button
                    type="button"
                    className="tr-restore-logo-button"
                    onClick={restaurarLogoPadrao}
                    disabled={
                      salvando || restaurandoLogo
                    }
                  >
                    {restaurandoLogo ? (
                      <LoaderCircle
                        size={17}
                        className="tr-spinning"
                      />
                    ) : (
                      <RotateCcw size={17} />
                    )}

                    Restaurar padrão
                  </button>

                  <small>
                    PNG, JPEG, WebP ou SVG. Máximo de 2 MB.
                  </small>
                </div>
              </div>
            </section>

            <section className="tr-modal-section">
              <div className="tr-modal-section-title">
                <div>
                  <h3>Recursos operacionais</h3>
                  <p>
                    Configurações utilizadas pela Central de Encomendas.
                  </p>
                </div>

                <CheckCircle2 size={20} />
              </div>

              <div className="tr-switch-list">
                <label>
                  <input
                    type="checkbox"
                    checked={
                      formulario.transportadora_oficial
                    }
                    onChange={(event) =>
                      atualizarCampo(
                        "transportadora_oficial",
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    <strong>
                      Transportadora oficial
                    </strong>
                    <small>
                      Disponível na Base Oficial da plataforma.
                    </small>
                  </span>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={
                      formulario.aceita_rastreio
                    }
                    onChange={(event) =>
                      atualizarCampo(
                        "aceita_rastreio",
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    <strong>
                      Aceita código de rastreamento
                    </strong>
                    <small>
                      Permite vincular códigos às encomendas.
                    </small>
                  </span>
                </label>
              </div>
            </section>

            <section className="tr-modal-section tr-integration-future">
              <div>
                <strong>
                  Integração de Rastreamento
                </strong>

                <p>
                  A configuração técnica das APIs será implementada
                  futuramente. O mapa será exibido apenas no Módulo
                  Morador quando o provedor permitir localização.
                </p>
              </div>

              <span>Planejada</span>
            </section>

            <label className="tr-modal-field tr-modal-field-full">
              <span>Observações internas</span>

              <textarea
                name="transportadora_observacoes_internas"
                value={formulario.observacoes}
                onChange={(event) =>
                  atualizarCampo(
                    "observacoes",
                    event.target.value
                  )
                }
                placeholder="Informações internas da Equipe Chegou!."
                rows={4}
                maxLength={1000}
                autoComplete="off"
              />
            </label>
          </div>

          <footer className="tr-modal-footer">
            <button
              type="button"
              className="tr-modal-cancel"
              onClick={onClose}
              disabled={salvando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="tr-modal-save"
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="tr-spinning"
                  />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default TransportadoraModal;