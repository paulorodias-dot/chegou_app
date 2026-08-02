import { useMemo, useState } from "react";

import { renderConviteMoradorEmail } from "../../lib/email-system";

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
  const [device, setDevice] = useState("desktop");

  const [recipientName, setRecipientName] =
    useState("João da Silva");

  const [condominiumName, setCondominiumName] =
    useState("Residencial La Plaça");

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

  const renderedEmail = useMemo(() => {
    return renderConviteMoradorEmail({
      templateId:
        "convite_morador_premium_v1",

      theme,

      language: "pt-BR",

      currentYear: new Date().getFullYear(),

      sender: {
        name: "Sistema Chegou!",
        origin: "sistema_chegou",
        condominiumName,
      },

      assets: {
        baseUrl,
      },

      recipientName,

      condominiumName,

      invitationUrl,

      validityDays: 7,
    });
  }, [
    baseUrl,
    condominiumName,
    invitationUrl,
    recipientName,
    theme,
  ]);

  const emailHtml = renderedEmail.html;

  function openPreviewInNewTab() {
    const blob = new Blob([emailHtml], {
      type: "text/html;charset=utf-8",
    });

    const objectUrl = URL.createObjectURL(blob);

    const previewWindow = window.open(
      objectUrl,
      "_blank",
      "noopener,noreferrer"
    );

    if (!previewWindow) {
      URL.revokeObjectURL(objectUrl);

      window.alert(
        "Não foi possível abrir a pré-visualização. Verifique se o navegador bloqueou a nova janela."
      );

      return;
    }

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 60_000);
  }

  function downloadHtml() {
    const blob = new Blob([emailHtml], {
      type: "text/html;charset=utf-8",
    });

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download =
      `convite-morador-${theme}.html`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(objectUrl);
  }

  function downloadTextVersion() {
    const blob = new Blob(
      [renderedEmail.text],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download =
      "convite-morador-texto.txt";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(objectUrl);
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <span style={styles.eyebrow}>
            Design System Premium
          </span>

          <h1 style={styles.title}>
            Convite Inicial para Morador
          </h1>

          <p style={styles.description}>
            Pré-visualização isolada do template
            completo. Nenhum e-mail será enviado.
          </p>
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            onClick={downloadTextVersion}
            style={styles.secondaryButton}
          >
            Baixar versão texto
          </button>

          <button
            type="button"
            onClick={openPreviewInNewTab}
            style={styles.secondaryButton}
          >
            Abrir em nova aba
          </button>

          <button
            type="button"
            onClick={downloadHtml}
            style={styles.primaryButton}
          >
            Baixar HTML
          </button>
        </div>
      </section>

      <section style={styles.metadataCard}>
        <div style={styles.metadataItem}>
          <span style={styles.metadataLabel}>
            Assunto
          </span>

          <strong style={styles.metadataValue}>
            {renderedEmail.subject}
          </strong>
        </div>

        <div style={styles.metadataItem}>
          <span style={styles.metadataLabel}>
            Preheader
          </span>

          <span style={styles.metadataValue}>
            {renderedEmail.preheader}
          </span>
        </div>

        <div style={styles.metadataItem}>
          <span style={styles.metadataLabel}>
            Template
          </span>

          <span style={styles.templateCode}>
            {renderedEmail.templateId}
          </span>
        </div>
      </section>

      <section style={styles.toolbar}>
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>
            Conteúdo de teste
          </legend>

          <div style={styles.inputGrid}>
            <label style={styles.label}>
              Nome do morador

              <input
                type="text"
                value={recipientName}
                onChange={(event) =>
                  setRecipientName(
                    event.target.value
                  )
                }
                style={styles.input}
              />
            </label>

            <label style={styles.label}>
              Condomínio

              <input
                type="text"
                value={condominiumName}
                onChange={(event) =>
                  setCondominiumName(
                    event.target.value
                  )
                }
                style={styles.input}
              />
            </label>
          </div>
        </fieldset>

        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>
            Tema
          </legend>

          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={() =>
                setTheme("light")
              }
              style={{
                ...styles.optionButton,
                ...(theme === "light"
                  ? styles.optionButtonActive
                  : {}),
              }}
              aria-pressed={theme === "light"}
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
                ...(theme === "dark"
                  ? styles.optionButtonActive
                  : {}),
              }}
              aria-pressed={theme === "dark"}
            >
              Escuro
            </button>
          </div>
        </fieldset>

        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>
            Visualização
          </legend>

          <div style={styles.buttonGroup}>
            {Object.entries(DEVICES).map(
              ([deviceId, configuration]) => (
                <button
                  key={deviceId}
                  type="button"
                  onClick={() =>
                    setDevice(deviceId)
                  }
                  style={{
                    ...styles.optionButton,
                    ...(device === deviceId
                      ? styles.optionButtonActive
                      : {}),
                  }}
                  aria-pressed={
                    device === deviceId
                  }
                >
                  {configuration.label}
                </button>
              )
            )}
          </div>
        </fieldset>
      </section>

      <section style={styles.previewSection}>
        <div style={styles.previewInformation}>
          <strong>
            {selectedDevice.label}
          </strong>

          <span>
            Área de visualização:{" "}
            {selectedDevice.width}px
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

        <div style={styles.viewportArea}>
          <div
            style={{
              ...styles.deviceFrame,
              width: selectedDevice.width,
            }}
          >
            <iframe
              key={`${theme}-${device}-${recipientName}-${condominiumName}`}
              title={`Convite para Morador — ${selectedDevice.label}`}
              srcDoc={emailHtml}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              style={styles.iframe}
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
    background: "#f1f5f9",
    color: "#0f172a",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
  },

  header: {
    width: "100%",
    maxWidth: "1440px",
    margin: "0 auto 24px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "24px",
    flexWrap: "wrap",
  },

  eyebrow: {
    display: "block",
    marginBottom: "6px",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },

  title: {
    margin: 0,
    color: "#0f172a",
    fontSize: "30px",
    lineHeight: 1.2,
  },

  description: {
    maxWidth: "660px",
    margin: "10px 0 0",
    color: "#475569",
    fontSize: "15px",
    lineHeight: 1.6,
  },

  actions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  primaryButton: {
    minHeight: "42px",
    padding: "0 18px",
    border: 0,
    borderRadius: "10px",
    background: "#f97316",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryButton: {
    minHeight: "42px",
    padding: "0 18px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  metadataCard: {
    width: "100%",
    maxWidth: "1440px",
    margin: "0 auto 20px",
    padding: "18px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
  },

  metadataItem: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  metadataLabel: {
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 700,
  },

  metadataValue: {
    color: "#0f172a",
    fontSize: "14px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
  },

  templateCode: {
    width: "fit-content",
    maxWidth: "100%",
    padding: "5px 8px",
    color: "#1d4ed8",
    background: "#eff6ff",
    borderRadius: "7px",
    fontFamily:
      "Consolas, Monaco, monospace",
    fontSize: "12px",
    overflowWrap: "anywhere",
  },

  toolbar: {
    width: "100%",
    maxWidth: "1440px",
    margin: "0 auto 24px",
    padding: "18px",
    display: "flex",
    alignItems: "flex-start",
    gap: "24px",
    flexWrap: "wrap",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow:
      "0 8px 24px rgba(15, 23, 42, 0.05)",
  },

  fieldset: {
    minWidth: 0,
    margin: 0,
    padding: 0,
    border: 0,
  },

  legend: {
    marginBottom: "8px",
    color: "#475569",
    fontSize: "12px",
    fontWeight: 700,
  },

  inputGrid: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  label: {
    minWidth: "220px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    color: "#334155",
    fontSize: "12px",
    fontWeight: 700,
  },

  input: {
    minHeight: "40px",
    padding: "0 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "14px",
    outline: "none",
  },

  buttonGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  optionButton: {
    minHeight: "38px",
    padding: "0 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },

  optionButtonActive: {
    borderColor: "#2563eb",
    background: "#eff6ff",
    color: "#1d4ed8",
    boxShadow:
      "0 0 0 2px rgba(37, 99, 235, 0.10)",
  },

  previewSection: {
    width: "100%",
    maxWidth: "1440px",
    margin: "0 auto",
  },

  previewInformation: {
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    color: "#64748b",
    fontSize: "13px",
  },

  viewportArea: {
    minHeight: "900px",
    padding: "28px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    overflow: "auto",
    background:
      "repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 10px, #f1f5f9 10px, #f1f5f9 20px)",
    border: "1px solid #cbd5e1",
    borderRadius: "18px",
  },

  deviceFrame: {
    maxWidth: "100%",
    height: "1100px",
    overflow: "hidden",
    background: "#ffffff",
    border: "1px solid #94a3b8",
    borderRadius: "14px",
    boxShadow:
      "0 22px 55px rgba(15, 23, 42, 0.20)",
    transition: "width 180ms ease",
  },

  iframe: {
    display: "block",
    width: "100%",
    height: "100%",
    border: 0,
    background: "#ffffff",
  },
};

export default EmailPreview;