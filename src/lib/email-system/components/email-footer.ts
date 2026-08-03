import type { EmailTheme } from "../core/email-types";
import {
  escapeHtml,
  escapeHtmlAttribute,
} from "../core/escape-html";
import { emailThemes } from "../tokens/themes";
import { emailTypography } from "../tokens/typography";
import { renderBrandName } from "./email-brand";

export interface EmailFooterProps {
  theme?: EmailTheme;
  logoUrl: string;
  currentYear: number;
  condominiumName?: string;
  helpText?: string;
  companyAddress?: string;
}

export function renderEmailFooter({
  theme = "light",
  logoUrl,
  currentYear,
  condominiumName,
  helpText =
    "Fale com o administrativo do seu condomínio.",
  companyAddress,
}: EmailFooterProps): string {
  const selectedTheme = emailThemes[theme];

  const safeLogoUrl =
    escapeHtmlAttribute(logoUrl);

  const safeCondominiumName =
    condominiumName
      ? escapeHtml(condominiumName)
      : null;

  const safeHelpText =
    escapeHtml(helpText);

  const safeCurrentYear =
    escapeHtml(currentYear);

  const safeCompanyAddress =
    companyAddress
      ? escapeHtml(companyAddress)
      : null;

  const brandName =
    renderBrandName({ theme });

  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        margin:0;
        padding:0;
        border-collapse:collapse;
        border-spacing:0;
        background-color:${selectedTheme.surfaceSecondary};
      "
      bgcolor="${selectedTheme.surfaceSecondary}"
    >
      <tr>
        <td
          class="email-footer-padding"
          style="
            padding:30px 34px 24px;
            font-family:${emailTypography.fontFamily};
          "
        >
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width:100%;
              margin:0;
              padding:0;
              border-collapse:collapse;
              border-spacing:0;
            "
          >
            <tr class="email-footer-row">
              <td
                class="email-footer-column email-footer-brand"
                width="34%"
                valign="top"
                style="
                  width:34%;
                  padding:0 20px 20px 0;
                  vertical-align:top;
                "
              >
                <img
                  src="${safeLogoUrl}"
                  width="185"
                  alt="Sistema Chegou!"
                  border="0"
                  style="
                    display:block;
                    width:185px;
                    max-width:100%;
                    height:auto;
                    border:0;
                    outline:none;
                    text-decoration:none;
                    -ms-interpolation-mode:bicubic;
                  "
                />
              </td>

              <td
                class="email-footer-column"
                width="22%"
                valign="top"
                style="
                  width:22%;
                  padding:0 18px 20px 0;
                  vertical-align:top;
                  color:${selectedTheme.textSecondary};
                  font-size:12px;
                  line-height:19px;
                "
              >
                <strong
                  style="
                    display:block;
                    margin-bottom:5px;
                    color:${selectedTheme.textPrimary};
                    font-size:13px;
                    line-height:18px;
                  "
                >
                  E-mail automático
                </strong>

                Não responda esta mensagem.
              </td>

              <td
                class="email-footer-column"
                width="22%"
                valign="top"
                style="
                  width:22%;
                  padding:0 18px 20px 0;
                  vertical-align:top;
                  color:${selectedTheme.textSecondary};
                  font-size:12px;
                  line-height:19px;
                "
              >
                <strong
                  style="
                    display:block;
                    margin-bottom:5px;
                    color:${selectedTheme.textPrimary};
                    font-size:13px;
                    line-height:18px;
                  "
                >
                  Origem
                </strong>

                ${
                  safeCondominiumName
                    ? `
                      <strong
                        style="
                          color:${selectedTheme.textPrimary};
                          font-weight:700;
                        "
                      >
                        ${safeCondominiumName}
                      </strong>
                      <br />

                      Enviado através do
                      ${brandName}
                    `
                    : brandName
                }
              </td>

              <td
                class="email-footer-column"
                width="22%"
                valign="top"
                style="
                  width:22%;
                  padding:0 0 20px;
                  vertical-align:top;
                  color:${selectedTheme.textSecondary};
                  font-size:12px;
                  line-height:19px;
                "
              >
                <strong
                  style="
                    display:block;
                    margin-bottom:5px;
                    color:${selectedTheme.textPrimary};
                    font-size:13px;
                    line-height:18px;
                  "
                >
                  Precisa de ajuda?
                </strong>

                ${safeHelpText}
              </td>
            </tr>
          </table>

          ${
            safeCompanyAddress
              ? `
                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    width:100%;
                    border-collapse:collapse;
                    border-spacing:0;
                  "
                >
                  <tr>
                    <td
                      align="center"
                      style="
                        padding:2px 0 6px;
                        color:${selectedTheme.textMuted};
                        font-family:${emailTypography.fontFamily};
                        font-size:11px;
                        line-height:17px;
                      "
                    >
                      ${safeCompanyAddress}
                    </td>
                  </tr>
                </table>
              `
              : ""
          }

          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width:100%;
              border-collapse:collapse;
              border-spacing:0;
            "
          >
            <tr>
              <td
                align="center"
                style="
                  padding:10px 0 0;
                  color:${selectedTheme.textMuted};
                  font-family:${emailTypography.fontFamily};
                  font-size:12px;
                  line-height:18px;
                "
              >
                © ${safeCurrentYear} Sistema Chegou!.
                Todos os direitos reservados.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}