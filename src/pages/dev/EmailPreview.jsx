import { useMemo, useState } from "react";

import {
  renderConviteMoradorEmail,
  renderMoradorAprovadoEmail,
  renderRecuperacaoSenhaEmail,
  renderReenvioConviteMoradorEmail,
} from "../../lib/email-system";

const DEVICES = {
  desktop: {
    label: "Desktop",
    width: 720,
  },

  tabletHorizontal: {
    label: "Tablet horizontal",
    width: 680,
  },

  tabletVertical: {
    label: "Tablet vertical",
    width: 560,
  },

  mobile: {
    label: "Mobile",
    width: 390,
  },
};

function EmailPreview() {
  const [theme, setTheme] = useState("light");

  const [template, setTemplate] =
    useState("convite");

  const [device, setDevice] =
    useState("desktop");

  const [
    recipientName,
    setRecipientName,
  ] = useState("João da Silva");

  const [
    condominiumName,
    setCondominiumName,
  ] = useState("Residencial La Plaça");

  const [
    residentEmail,
    setResidentEmail,
  ] = useState("");

  const [
    residentPhone,
    setResidentPhone,
  ] = useState("");

  const [
    condominiumHelpEmail,
    setCondominiumHelpEmail,
  ] = useState("");

  const [
    condominiumHelpWhatsapp,
    setCondominiumHelpWhatsapp,
  ] = useState("");

  const [
    approvalAccessMode,
    setApprovalAccessMode,
  ] = useState("new");

  const selectedDevice =
    DEVICES[device] || DEVICES.desktop;

  const baseUrl = window.location.origin;

  const invitationUrl = useMemo(() => {
    const previewUrl = new URL(
      "/wizard-morador",
      window.location.origin
    );

    previewUrl.searchParams.set(
      "token",
      "convite-preview-seguro"
    );

    return previewUrl.toString();
  }, []);

  const recoveryUrl = useMemo(() => {
    const previewUrl = new URL(
      "/redefinir-senha",
      window.location.origin
    );

    previewUrl.searchParams.set(
      "token",
      "recuperacao-preview-segura"
    );

    return previewUrl.toString();
  }, []);

  const approvalLoginUrl =
    "https://sistemachegou.com.br/login";

  const renderedEmail = useMemo(() => {
    const commonData = {
      theme,

      language: "pt-BR",

      currentYear:
        new Date().getFullYear(),

      sender: {
        name: "Sistema Chegou!",

        origin:
          "sistema_chegou",

        condominiumName:
          template === "recuperacao"
            ? undefined
            : condominiumName,
      },

      assets: {
        baseUrl,
      },

      recipientName,
    };

    /*
     * ======================================================
     * RECUPERAÇÃO DE SENHA
     * ======================================================
     */
    if (template === "recuperacao") {
      return renderRecuperacaoSenhaEmail({
        ...commonData,

        templateId:
          "recuperacao_senha_premium_v1",

        recoveryUrl,

        validityMinutes: 30,
      });
    }

    /*
     * ======================================================
     * MORADOR APROVADO
     * ======================================================
     */
    if (template === "aprovacao") {
      return renderMoradorAprovadoEmail({
        ...commonData,

        templateId:
          "morador_aprovado_premium_v1",

        sender: {
          name: "Sistema Chegou!",

          origin: "condominio",

          condominiumName,
        },

        condominiumName,

        recipientEmail:
          residentEmail,

        recipientPhone:
          residentPhone.trim()
            ? residentPhone
            : undefined,

        condominiumHelpEmail:
          condominiumHelpEmail.trim()
            ? condominiumHelpEmail
            : undefined,

        condominiumHelpWhatsapp:
          condominiumHelpWhatsapp.trim()
            ? condominiumHelpWhatsapp
            : undefined,

        loginUrl:
          approvalLoginUrl,

        accessMode:
          approvalAccessMode,

        systemInstagramUrl:
          "https://instagram.com/sistemachegou",

        systemWhatsappUrl:
          "https://wa.me/5511922106522",

        systemWhatsappLabel:
          "+55 (11) 92210-6522",

        systemSiteUrl:
          "https://sistemachegou.com.br",
      });
    }

    /*
     * ======================================================
     * CONVITE / REENVIO
     * ======================================================
     */
    const invitationData = {
      ...commonData,

      templateId:
        template === "convite"
          ? "convite_morador_premium_v1"
          : "reenvio_convite_morador_premium_v1",

      condominiumName,

      invitationUrl,

      validityDays: 7,
    };

    return template === "convite"
      ? renderConviteMoradorEmail(
          invitationData
        )
      : renderReenvioConviteMoradorEmail(
          invitationData
        );
  }, [
    approvalAccessMode,
    approvalLoginUrl,
    baseUrl,
    condominiumHelpEmail,
    condominiumHelpWhatsapp,
    condominiumName,
    invitationUrl,
    recipientName,
    recoveryUrl,
    residentEmail,
    residentPhone,
    template,
    theme,
  ]);

  const emailHtml =
    renderedEmail.html;

  const templateConfiguration = {
    convite: {
      pageTitle:
        "Convite Inicial para Morador",

      fileBase:
        "convite-morador",

      frameTitle:
        "Convite Inicial",
    },

    reenvio: {
      pageTitle:
        "Reenvio de Convite para Morador",

      fileBase:
        "reenvio-convite-morador",

      frameTitle:
        "Reenvio de Convite",
    },

    recuperacao: {
      pageTitle:
        "Recuperação de Senha",

      fileBase:
        "recuperacao-senha",

      frameTitle:
        "Recuperação de Senha",
    },

    aprovacao: {
      pageTitle:
        "Cadastro de Morador Aprovado",

      fileBase:
        "morador-aprovado",

      frameTitle:
        "Morador Aprovado",
    },
  }[template];

  function openPreviewInNewTab() {
    const blob = new Blob(
      [emailHtml],
      {
        type:
          "text/html;charset=utf-8",
      }
    );

    const objectUrl =
      URL.createObjectURL(blob);

    const previewWindow =
      window.open(
        objectUrl,
        "_blank",
        "noopener,noreferrer"
      );

    if (!previewWindow) {
      URL.revokeObjectURL(
        objectUrl
      );

      window.alert(
        "Não foi possível abrir a pré-visualização. Verifique se o navegador bloqueou a nova janela."
      );

      return;
    }

    window.setTimeout(() => {
      URL.revokeObjectURL(
        objectUrl
      );
    }, 60_000);
  }

  function downloadHtml() {
    const blob = new Blob(
      [emailHtml],
      {
        type:
          "text/html;charset=utf-8",
      }
    );

    const objectUrl =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href =
      objectUrl;

    anchor.download =
      `${templateConfiguration.fileBase}-${theme}.html`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      objectUrl
    );
  }

  function downloadTextVersion() {
    const blob = new Blob(
      [renderedEmail.text],
      {
        type:
          "text/plain;charset=utf-8",
      }
    );

    const objectUrl =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href =
      objectUrl;

    anchor.download =
      `${templateConfiguration.fileBase}-texto.txt`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      objectUrl
    );
  }

  return (
    <main style={styles.page}>
      {/* ==================================================
          CABEÇALHO
          ================================================== */}

      <section style={styles.header}>
        <div>
          <span
            style={styles.eyebrow}
          >
            Design System Premium
          </span>

          <h1
            style={styles.title}
          >
            {
              templateConfiguration
                .pageTitle
            }
          </h1>

          <p
            style={styles.description}
          >
            Pré-visualização isolada
            do template completo.
            Nenhum e-mail será enviado.
          </p>
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            onClick={
              downloadTextVersion
            }
            style={
              styles.secondaryButton
            }
          >
            Baixar versão texto
          </button>

          <button
            type="button"
            onClick={
              openPreviewInNewTab
            }
            style={
              styles.secondaryButton
            }
          >
            Abrir em nova aba
          </button>

          <button
            type="button"
            onClick={
              downloadHtml
            }
            style={
              styles.primaryButton
            }
          >
            Baixar HTML
          </button>
        </div>
      </section>

      {/* ==================================================
          METADADOS
          ================================================== */}

      <section
        style={
          styles.metadataCard
        }
      >
        <div
          style={
            styles.metadataItem
          }
        >
          <span
            style={
              styles.metadataLabel
            }
          >
            Assunto
          </span>

          <strong
            style={
              styles.metadataValue
            }
          >
            {
              renderedEmail.subject
            }
          </strong>
        </div>

        <div
          style={
            styles.metadataItem
          }
        >
          <span
            style={
              styles.metadataLabel
            }
          >
            Preheader
          </span>

          <span
            style={
              styles.metadataValue
            }
          >
            {
              renderedEmail.preheader
            }
          </span>
        </div>

        <div
          style={
            styles.metadataItem
          }
        >
          <span
            style={
              styles.metadataLabel
            }
          >
            Template
          </span>

          <span
            style={
              styles.templateCode
            }
          >
            {
              renderedEmail.templateId
            }
          </span>
        </div>
      </section>

      {/* ==================================================
          CONTROLES
          ================================================== */}

      <section
        style={styles.toolbar}
      >
        {/* ==================================================
            CONTEÚDO DE TESTE
            ================================================== */}

        <fieldset
          style={styles.fieldset}
        >
          <legend
            style={styles.legend}
          >
            Conteúdo de teste
          </legend>

          <div
            style={styles.inputGrid}
          >
            <label
              style={styles.label}
            >
              Nome do morador

              <input
                type="text"
                value={
                  recipientName
                }
                onChange={(
                  event
                ) =>
                  setRecipientName(
                    event.target
                      .value
                  )
                }
                style={
                  styles.input
                }
              />
            </label>

            {template !==
              "recuperacao" && (
              <label
                style={
                  styles.label
                }
              >
                Condomínio

                <input
                  type="text"
                  value={
                    condominiumName
                  }
                  onChange={(
                    event
                  ) =>
                    setCondominiumName(
                      event.target
                        .value
                    )
                  }
                  style={
                    styles.input
                  }
                />
              </label>
            )}

            {/* ==========================================
                CAMPOS ESPECÍFICOS — MORADOR APROVADO
                ========================================== */}

            {template ===
              "aprovacao" && (
              <>
                <label
                  style={
                    styles.label
                  }
                >
                  E-mail do morador

                  <input
                    type="email"
                    value={
                      residentEmail
                    }
                    onChange={(
                      event
                    ) =>
                      setResidentEmail(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Digite o e-mail"
                    style={
                      styles.input
                    }
                  />
                </label>

                <label
                  style={
                    styles.label
                  }
                >
                  Telefone do morador

                  <input
                    type="text"
                    value={
                      residentPhone
                    }
                    onChange={(
                      event
                    ) =>
                      setResidentPhone(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Opcional"
                    style={
                      styles.input
                    }
                  />
                </label>

                <label
                  style={
                    styles.label
                  }
                >
                  E-mail do condomínio

                  <input
                    type="email"
                    value={
                      condominiumHelpEmail
                    }
                    onChange={(
                      event
                    ) =>
                      setCondominiumHelpEmail(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Deixe vazio para ocultar"
                    style={
                      styles.input
                    }
                  />
                </label>

                <label
                  style={
                    styles.label
                  }
                >
                  WhatsApp do condomínio

                  <input
                    type="text"
                    value={
                      condominiumHelpWhatsapp
                    }
                    onChange={(
                      event
                    ) =>
                      setCondominiumHelpWhatsapp(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Deixe vazio para ocultar"
                    style={
                      styles.input
                    }
                  />
                </label>

                <label
                  style={
                    styles.label
                  }
                >
                  Situação do acesso

                  <select
                    value={
                      approvalAccessMode
                    }
                    onChange={(
                      event
                    ) =>
                      setApprovalAccessMode(
                        event
                          .target
                          .value
                      )
                    }
                    style={
                      styles.input
                    }
                  >
                    <option
                      value="new"
                    >
                      Novo acesso
                    </option>

                    <option
                      value="existing"
                    >
                      Acesso já existente
                    </option>
                  </select>
                </label>
              </>
            )}
          </div>
        </fieldset>

        {/* ==================================================
            TEMPLATE
            ================================================== */}

        <fieldset
          style={styles.fieldset}
        >
          <legend
            style={styles.legend}
          >
            Template
          </legend>

          <select
            value={template}
            onChange={(event) =>
              setTemplate(
                event.target.value
              )
            }
            style={styles.select}
            aria-label="Selecionar template de e-mail"
          >
            <option
              value="convite"
            >
              Convite Inicial
            </option>

            <option
              value="reenvio"
            >
              Reenvio de Convite
            </option>

            <option
              value="recuperacao"
            >
              Recuperação de Senha
            </option>

            <option
              value="aprovacao"
            >
              Morador Aprovado
            </option>
          </select>
        </fieldset>

        {/* ==================================================
            TEMA
            ================================================== */}

        <fieldset
          style={styles.fieldset}
        >
          <legend
            style={styles.legend}
          >
            Tema
          </legend>

          <div
            style={
              styles.buttonGroup
            }
          >
            <button
              type="button"
              onClick={() =>
                setTheme("light")
              }
              style={{
                ...styles.optionButton,

                ...(theme ===
                "light"
                  ? styles.optionButtonActive
                  : {}),
              }}
              aria-pressed={
                theme === "light"
              }
            >
              Claro
            </button>

            <button
              type="button"
              onClick={() =>
                setTheme("dark")
              }
              style={{
                ...styles.optionButton,

                ...(theme ===
                "dark"
                  ? styles.optionButtonActive
                  : {}),
              }}
              aria-pressed={
                theme === "dark"
              }
            >
              Escuro
            </button>
          </div>
        </fieldset>

        {/* ==================================================
            DISPOSITIVOS
            ================================================== */}

        <fieldset
          style={styles.fieldset}
        >
          <legend
            style={styles.legend}
          >
            Visualização
          </legend>

          <div
            style={
              styles.buttonGroup
            }
          >
            {Object.entries(
              DEVICES
            ).map(
              ([
                deviceId,
                configuration,
              ]) => (
                <button
                  key={
                    deviceId
                  }
                  type="button"
                  onClick={() =>
                    setDevice(
                      deviceId
                    )
                  }
                  style={{
                    ...styles.optionButton,

                    ...(device ===
                    deviceId
                      ? styles.optionButtonActive
                      : {}),
                  }}
                  aria-pressed={
                    device ===
                    deviceId
                  }
                >
                  {
                    configuration.label
                  }
                </button>
              )
            )}
          </div>
        </fieldset>
      </section>

      {/* ==================================================
          PREVIEW
          ================================================== */}

      <section
        style={
          styles.previewSection
        }
      >
        <div
          style={
            styles.previewInformation
          }
        >
          <strong>
            {
              selectedDevice.label
            }
          </strong>

          <span>
            Área de visualização:{" "}
            {
              selectedDevice.width
            }
            px
          </span>

          <span>
            Tema:{" "}
            {theme === "dark"
              ? "Escuro"
              : "Claro"}
          </span>

          <span>
            Assets: {baseUrl}
          </span>
        </div>

        <div
          style={
            styles.viewportArea
          }
        >
          <div
            style={{
              ...styles.deviceFrame,

              width:
                selectedDevice.width,
            }}
          >
            <iframe
              key={[
                template,
                theme,
                device,
                recipientName,
                condominiumName,
                residentEmail,
                residentPhone,
                condominiumHelpEmail,
                condominiumHelpWhatsapp,
                approvalAccessMode,
              ].join("-")}
              title={`${templateConfiguration.frameTitle} — ${selectedDevice.label}`}
              srcDoc={emailHtml}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              style={
                styles.iframe
              }
            />
          </div>
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",

    padding: "32px",

    background:
      "#f1f5f9",

    color:
      "#0f172a",

    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
  },

  header: {
    width: "100%",

    maxWidth:
      "1440px",

    margin:
      "0 auto 24px",

    display:
      "flex",

    alignItems:
      "flex-start",

    justifyContent:
      "space-between",

    gap:
      "24px",

    flexWrap:
      "wrap",
  },

  eyebrow: {
    display:
      "block",

    marginBottom:
      "6px",

    color:
      "#2563eb",

    fontSize:
      "13px",

    fontWeight:
      700,

    letterSpacing:
      "0.04em",

    textTransform:
      "uppercase",
  },

  title: {
    margin:
      0,

    color:
      "#0f172a",

    fontSize:
      "30px",

    lineHeight:
      1.2,
  },

  description: {
    maxWidth:
      "660px",

    margin:
      "10px 0 0",

    color:
      "#475569",

    fontSize:
      "15px",

    lineHeight:
      1.6,
  },

  actions: {
    display:
      "flex",

    gap:
      "12px",

    flexWrap:
      "wrap",
  },

  primaryButton: {
    minHeight:
      "42px",

    padding:
      "0 18px",

    border:
      0,

    borderRadius:
      "10px",

    background:
      "#f97316",

    color:
      "#ffffff",

    fontSize:
      "14px",

    fontWeight:
      700,

    cursor:
      "pointer",
  },

  secondaryButton: {
    minHeight:
      "42px",

    padding:
      "0 18px",

    border:
      "1px solid #cbd5e1",

    borderRadius:
      "10px",

    background:
      "#ffffff",

    color:
      "#0f172a",

    fontSize:
      "14px",

    fontWeight:
      700,

    cursor:
      "pointer",
  },

  metadataCard: {
    width:
      "100%",

    maxWidth:
      "1440px",

    margin:
      "0 auto 20px",

    padding:
      "18px",

    display:
      "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",

    gap:
      "18px",

    background:
      "#ffffff",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      "16px",
  },

  metadataItem: {
    minWidth:
      0,

    display:
      "flex",

    flexDirection:
      "column",

    gap:
      "5px",
  },

  metadataLabel: {
    color:
      "#64748b",

    fontSize:
      "12px",

    fontWeight:
      700,
  },

  metadataValue: {
    color:
      "#0f172a",

    fontSize:
      "14px",

    lineHeight:
      1.5,

    overflowWrap:
      "anywhere",
  },

  templateCode: {
    width:
      "fit-content",

    maxWidth:
      "100%",

    padding:
      "5px 8px",

    color:
      "#1d4ed8",

    background:
      "#eff6ff",

    borderRadius:
      "7px",

    fontFamily:
      "Consolas, Monaco, monospace",

    fontSize:
      "12px",

    overflowWrap:
      "anywhere",
  },

  toolbar: {
    width:
      "100%",

    maxWidth:
      "1440px",

    margin:
      "0 auto 24px",

    padding:
      "18px",

    display:
      "flex",

    alignItems:
      "flex-start",

    gap:
      "24px",

    flexWrap:
      "wrap",

    background:
      "#ffffff",

    border:
      "1px solid #e2e8f0",

    borderRadius:
      "16px",

    boxShadow:
      "0 8px 24px rgba(15, 23, 42, 0.05)",
  },

  fieldset: {
    minWidth:
      0,

    margin:
      0,

    padding:
      0,

    border:
      0,
  },

  legend: {
    marginBottom:
      "8px",

    color:
      "#475569",

    fontSize:
      "12px",

    fontWeight:
      700,
  },

  inputGrid: {
    display:
      "flex",

    gap:
      "12px",

    flexWrap:
      "wrap",
  },

  label: {
    minWidth:
      "220px",

    display:
      "flex",

    flexDirection:
      "column",

    gap:
      "6px",

    color:
      "#334155",

    fontSize:
      "12px",

    fontWeight:
      700,
  },

  input: {
    minHeight:
      "40px",

    padding:
      "0 12px",

    border:
      "1px solid #cbd5e1",

    borderRadius:
      "9px",

    background:
      "#ffffff",

    color:
      "#0f172a",

    fontSize:
      "14px",

    outline:
      "none",
  },

  select: {
    minWidth:
      "240px",

    minHeight:
      "40px",

    padding:
      "0 38px 0 12px",

    border:
      "1px solid #cbd5e1",

    borderRadius:
      "9px",

    background:
      "#ffffff",

    color:
      "#0f172a",

    fontSize:
      "14px",

    fontWeight:
      600,

    outline:
      "none",

    cursor:
      "pointer",
  },

  buttonGroup: {
    display:
      "flex",

    gap:
      "8px",

    flexWrap:
      "wrap",
  },

  optionButton: {
    minHeight:
      "38px",

    padding:
      "0 14px",

    border:
      "1px solid #cbd5e1",

    borderRadius:
      "9px",

    background:
      "#ffffff",

    color:
      "#334155",

    fontSize:
      "13px",

    fontWeight:
      600,

    cursor:
      "pointer",
  },

  optionButtonActive: {
    borderColor:
      "#2563eb",

    background:
      "#eff6ff",

    color:
      "#1d4ed8",

    boxShadow:
      "0 0 0 2px rgba(37, 99, 235, 0.10)",
  },

  previewSection: {
    width:
      "100%",

    maxWidth:
      "1440px",

    margin:
      "0 auto",
  },

  previewInformation: {
    marginBottom:
      "12px",

    display:
      "flex",

    alignItems:
      "center",

    gap:
      "16px",

    flexWrap:
      "wrap",

    color:
      "#64748b",

    fontSize:
      "13px",
  },

  viewportArea: {
    minHeight:
      "900px",

    padding:
      "28px",

    display:
      "flex",

    alignItems:
      "flex-start",

    justifyContent:
      "center",

    overflow:
      "auto",

    background:
      "repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 10px, #f1f5f9 10px, #f1f5f9 20px)",

    border:
      "1px solid #cbd5e1",

    borderRadius:
      "18px",
  },

  deviceFrame: {
    maxWidth:
      "100%",

    height:
      "1100px",

    overflow:
      "hidden",

    background:
      "#ffffff",

    border:
      "1px solid #94a3b8",

    borderRadius:
      "14px",

    boxShadow:
      "0 22px 55px rgba(15, 23, 42, 0.20)",

    transition:
      "width 180ms ease",
  },

  iframe: {
    display:
      "block",

    width:
      "100%",

    height:
      "100%",

    border:
      0,

    background:
      "#ffffff",
  },
};

export default EmailPreview;