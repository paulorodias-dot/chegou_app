import {
  escapeHtml,
  escapeHtmlAttribute,
} from "../core/escape-html.ts";
import type { EmailTheme } from "../core/email-types.ts";
import { emailColors } from "../tokens/colors.ts";
import { emailThemes } from "../tokens/themes.ts";
import { emailTypography } from "../tokens/typography.ts";

export interface EmailActionCardProps {
  actionUrl: string;
  illustrationUrl: string;
  theme?: EmailTheme;
  title?: string;
  description?: string;
  buttonLabel?: string;
  illustrationAlt?: string;
}

export function renderEmailActionCard({
  actionUrl,
  illustrationUrl,
  theme = "light",
  title = "Completar meu cadastro",
  description =
    "Use o botão abaixo para finalizar seu cadastro e ativar seu acesso.",
  buttonLabel = "Completar meu cadastro",
  illustrationAlt =
    "Ilustração de convite e início de cadastro.",
}: EmailActionCardProps): string {
  const selectedTheme = emailThemes[theme];

  const safeActionUrl =
    escapeHtmlAttribute(actionUrl);

  const safeIllustrationUrl =
    escapeHtmlAttribute(
      illustrationUrl,
    );

  const safeTitle = escapeHtml(title);

  const safeDescription =
    escapeHtml(description);

  const safeButtonLabel =
    escapeHtml(buttonLabel);

  const safeButtonAriaLabel =
    escapeHtmlAttribute(buttonLabel);

  const safeIllustrationAlt =
    escapeHtmlAttribute(
      illustrationAlt,
    );

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
        background-color:${selectedTheme.surface};
      "
      bgcolor="${selectedTheme.surface}"
    >
      <tr>
        <td
          class="email-section-horizontal-padding"
          style="
            padding:8px 40px 14px;
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
              border-collapse:separate;
              border-spacing:0;
              background-color:${selectedTheme.surfaceSecondary};
              border:1px solid ${selectedTheme.border};
              border-radius:18px;
              box-shadow:${selectedTheme.cardShadow};
            "
            bgcolor="${selectedTheme.surfaceSecondary}"
          >
            <tr class="email-action-card-row">
              <td
                class="email-action-card-illustration-cell"
                width="32%"
                valign="middle"
                align="center"
                style="
                  width:32%;
                  padding:24px 12px 24px 24px;
                  vertical-align:middle;
                  text-align:center;
                "
              >
                <img
                  class="email-action-card-illustration"
                  src="${safeIllustrationUrl}"
                  width="130"
                  alt="${safeIllustrationAlt}"
                  border="0"
                  style="
                    display:block;
                    width:130px;
                    max-width:100%;
                    height:auto;
                    margin:0 auto;
                    padding:0;
                    border:0;
                    outline:none;
                    text-decoration:none;
                    -ms-interpolation-mode:bicubic;
                  "
                />
              </td>

              <td
                class="email-action-card-content-cell"
                width="68%"
                valign="middle"
                style="
                  width:68%;
                  padding:26px 26px 26px 12px;
                  vertical-align:middle;
                  color:${selectedTheme.textSecondary};
                  font-family:${emailTypography.fontFamily};
                "
              >
                <h2
                  class="email-card-title"
                  style="
                    margin:0 0 8px;
                    padding:0;
                    color:${selectedTheme.textPrimary};
                    font-family:${emailTypography.fontFamily};
                    font-size:19px;
                    line-height:25px;
                    font-weight:800;
                  "
                >
                  ${safeTitle}
                </h2>

                <p
                  class="email-card-description"
                  style="
                    margin:0 0 20px;
                    padding:0;
                    color:${selectedTheme.textSecondary};
                    font-family:${emailTypography.fontFamily};
                    font-size:15px;
                    line-height:23px;
                    font-weight:400;
                  "
                >
                  ${safeDescription}
                </p>

                <table
                  role="presentation"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  class="email-action-button-table"
                  style="
                    border-collapse:separate;
                    border-spacing:0;
                  "
                >
                  <tr>
                    <td
                      align="center"
                      valign="middle"
                      bgcolor="${emailColors.brand.orange}"
                      style="
                        min-width:220px;
                        height:54px;
                        background-color:${emailColors.brand.orange};
                        border-radius:12px;
                        text-align:center;
                        vertical-align:middle;
                      "
                    >
                      <a
                        class="email-primary-button"
                        href="${safeActionUrl}"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="${safeButtonAriaLabel}"
                        style="
                          display:inline-block;
                          min-width:220px;
                          padding:17px 24px;
                          color:${emailColors.brand.white};
                          font-family:${emailTypography.fontFamily};
                          font-size:16px;
                          line-height:20px;
                          font-weight:800;
                          text-align:center;
                          text-decoration:none;
                          background-color:${emailColors.brand.orange};
                          border:1px solid ${emailColors.brand.orange};
                          border-radius:12px;
                          box-sizing:border-box;
                        "
                      >
                        ${safeButtonLabel}

                        <span
                          aria-hidden="true"
                          style="
                            display:inline-block;
                            padding-left:8px;
                            font-size:20px;
                            line-height:16px;
                            vertical-align:-1px;
                          "
                        >
                          →
                        </span>
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}