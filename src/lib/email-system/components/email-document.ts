import type { EmailTheme } from "../core/email-types";
import { escapeHtmlAttribute } from "../core/escape-html";
import { emailColors } from "../tokens/colors";
import { emailThemes } from "../tokens/themes";
import { emailTypography } from "../tokens/typography";
import { renderEmailPreheader } from "./email-preheader";

export interface EmailDocumentProps {
  title: string;
  preheader: string;
  theme?: EmailTheme;
  senderLabel?: string;
  content: string;
}

export function renderEmailDocument({
  title,
  preheader,
  theme = "light",
  senderLabel = "",
  content,
}: EmailDocumentProps): string {
  const selectedTheme = emailThemes[theme];
  const safeTitle = escapeHtmlAttribute(title);

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />

  <title>${safeTitle}</title>

  <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
  <![endif]-->

  <style>
    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: ${selectedTheme.background};
      font-family: ${emailTypography.fontFamily};
    }

    table,
    td {
      border-collapse: collapse !important;
      mso-table-lspace: 0 !important;
      mso-table-rspace: 0 !important;
    }

    img {
      display: block;
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }

    a {
      text-decoration: none;
    }

    .email-page-background {
      width: 100%;
      background-color: ${selectedTheme.background};
    }

    .email-container {
      width: 640px;
      max-width: 640px;
    }

    .email-container-inner {
      border-radius: 18px;
      overflow: hidden;
    }

    .email-content-padding {
      padding: 36px 40px !important;
    }

    .email-preview-title {
      margin: 0 0 14px !important;
      font-size: 26px !important;
      line-height: 33px !important;
      font-weight: 800 !important;
    }

    .email-hero-content {
      height: 220px;
    }

    .email-hero-logo-cell,
    .email-hero-mascot-cell {
      height: 220px;
    }

    .email-footer-column {
      vertical-align: top;
    }

    @media screen and (max-width: 640px) {
      .email-outer-padding {
        padding-top: 12px !important;
        padding-right: 12px !important;
        padding-bottom: 24px !important;
        padding-left: 12px !important;
      }

      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 16px !important;
      }

      .email-container-inner {
        border-radius: 16px !important;
      }

      .email-hero-content {
        height: auto !important;
        padding: 24px 18px 0 !important;
      }

      .email-hero-logo-cell,
      .email-hero-mascot-cell {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        padding: 0 !important;
        text-align: center !important;
        overflow: hidden !important;
      }

      .email-hero-logo {
        width: 185px !important;
        max-width: 185px !important;
        height: auto !important;
        margin: 0 auto 10px !important;
      }

      .email-hero-mascot-cell {
        height: 250px !important;
      }

      .email-hero-mascot {
        width: 230px !important;
        max-width: none !important;
        height: auto !important;
        margin: 0 auto -125px !important;
      }

      .email-content-padding {
        padding: 28px 24px !important;
      }

      .email-preview-title {
        font-size: 22px !important;
        line-height: 28px !important;
      }

      .email-footer-padding {
        padding: 24px 20px !important;
      }

      .email-footer-row,
      .email-footer-column {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      .email-footer-column {
        padding: 0 0 22px !important;
        text-align: center !important;
      }

      .email-footer-brand img {
        width: 160px !important;
        max-width: 160px !important;
        height: auto !important;
        margin: 0 auto !important;
      }

      .email-main-content-padding {
        padding: 26px 22px 22px !important;
      }

      .email-section-horizontal-padding {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }

      .email-greeting-title {
        font-size: 22px !important;
        line-height: 28px !important;
      }

      .email-body-text {
        font-size: 15px !important;
        line-height: 24px !important;
      }

      .email-action-card-illustration-cell,
      .email-action-card-content-cell {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }

      .email-action-card-illustration-cell {
        padding: 22px 20px 8px !important;
      }

      .email-action-card-content-cell {
        padding: 10px 20px 22px !important;
      }

      .email-action-card-illustration {
        width: 104px !important;
        max-width: 104px !important;
        margin: 0 auto !important;
      }

      .email-card-title {
        font-size: 18px !important;
        line-height: 24px !important;
      }

      .email-card-description {
        font-size: 14px !important;
        line-height: 22px !important;
      }

      .email-action-button-table {
        width: 100% !important;
      }

      .email-primary-button {
        display: block !important;
        width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }

      .email-security-icon-cell {
        width: 54px !important;
        padding-left: 14px !important;
      }

      .email-inline-icon-cell {
        width: 44px !important;
        padding-right: 10px !important;
      }

      .email-welcome-card-mascot-cell,
      .email-welcome-card-content-cell {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        text-align: center !important;
        box-sizing: border-box !important;
      }

      .email-welcome-card-mascot-cell {
        padding: 18px 20px 0 !important;
      }

      .email-welcome-card-content-cell {
        padding: 14px 20px 22px !important;
      }

      .email-welcome-card-mascot {
        width: 125px !important;
        max-width: 125px !important;
        margin: 0 auto !important;
      }
    }

    @media screen and (max-width: 420px) {
      .email-outer-padding {
        padding-right: 8px !important;
        padding-left: 8px !important;
      }

      .email-hero-content {
        padding-right: 14px !important;
        padding-left: 14px !important;
      }

      .email-hero-logo {
        width: 175px !important;
        max-width: 175px !important;
      }

      .email-hero-mascot-cell {
        height: 230px !important;
      }

      .email-hero-mascot {
        width: 215px !important;
        margin-bottom: -118px !important;
      }

      .email-content-padding {
        padding: 24px 20px !important;
      }

      .email-preview-title {
        font-size: 21px !important;
        line-height: 27px !important;
      }
    }

    @media (prefers-color-scheme: dark) {
      body,
      .email-page-background {
        background-color: ${emailColors.dark.background} !important;
      }
    }
  </style>
</head>

<body
  style="
    margin:0;
    padding:0;
    width:100%;
    min-width:100%;
    background-color:${selectedTheme.background};
    font-family:${emailTypography.fontFamily};
    -webkit-text-size-adjust:100%;
    -ms-text-size-adjust:100%;
  "
>
  ${renderEmailPreheader(preheader)}

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    class="email-page-background"
    style="
      width:100%;
      background-color:${selectedTheme.background};
      border-collapse:collapse;
    "
    bgcolor="${selectedTheme.background}"
  >
    <tr>
      <td
        class="email-outer-padding"
        align="center"
        style="
          padding:24px 12px 32px;
          background-color:${selectedTheme.background};
        "
        bgcolor="${selectedTheme.background}"
      >
        ${senderLabel}

        <!--[if mso]>
          <table
            role="presentation"
            align="center"
            width="640"
            cellpadding="0"
            cellspacing="0"
            border="0"
          >
            <tr>
              <td>
        <![endif]-->

        <table
          role="presentation"
          align="center"
          width="640"
          cellpadding="0"
          cellspacing="0"
          border="0"
          class="email-container"
          style="
            width:640px;
            max-width:640px;
            border-collapse:separate !important;
            border-spacing:0;
            background-color:${selectedTheme.surface};
            border:1px solid ${selectedTheme.border};
            border-radius:18px;
            overflow:hidden;
            box-shadow:${selectedTheme.containerShadow};
          "
          bgcolor="${selectedTheme.surface}"
        >
          <tr>
            <td
              class="email-container-inner"
              style="
                padding:0;
                background-color:${selectedTheme.surface};
                border-radius:18px;
                overflow:hidden;
              "
              bgcolor="${selectedTheme.surface}"
            >
              ${content}
            </td>
          </tr>
        </table>

        <!--[if mso]>
              </td>
            </tr>
          </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}