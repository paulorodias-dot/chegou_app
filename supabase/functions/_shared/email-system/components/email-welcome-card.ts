import {
  escapeHtml,
  escapeHtmlAttribute,
} from "../core/escape-html.ts";

import type {
  EmailTheme,
} from "../core/email-types.ts";

import { emailThemes } from "../tokens/themes.ts";
import { emailTypography } from "../tokens/typography.ts";

import {
  renderBrandName,
  renderBrandTeam,
} from "./email-brand.ts";

export interface EmailWelcomeCardProps {
  mascotUrl: string;
  theme?: EmailTheme;
  title?: string;
  description?: string;
  helpText?: string;
  signature?: string;
  mascotAlt?: string;
}

export function renderEmailWelcomeCard({
  mascotUrl,
  theme = "light",
  title,
  description =
    "Estamos felizes por ter você com a gente.",
  helpText =
    "Em caso de dúvidas, fale com o administrativo do seu condomínio.",
  signature,
  mascotAlt =
    "Mascote do Sistema Chegou! segurando uma encomenda.",
}: EmailWelcomeCardProps): string {
  const selectedTheme =
    emailThemes[theme];

  const safeMascotUrl =
    escapeHtmlAttribute(mascotUrl);

  const safeMascotAlt =
    escapeHtmlAttribute(mascotAlt);

  const renderedTitle = title
    ? escapeHtml(title)
    : `Bem-vindo ao ${renderBrandName({ theme })}`;

  const renderedSignature = signature
    ? escapeHtml(signature)
    : renderBrandTeam({ theme });

  const safeDescription =
    escapeHtml(description);

  const safeHelpText =
    escapeHtml(helpText);

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
            padding:10px 40px 28px;
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
              background-color:${selectedTheme.surface};
              border:1px solid ${selectedTheme.border};
              border-radius:16px;
            "
            bgcolor="${selectedTheme.surface}"
          >
            <tr class="email-welcome-card-row">
              <td
                class="email-welcome-card-mascot-cell"
                width="31%"
                valign="bottom"
                align="center"
                style="
                  width:31%;
                  padding:10px 10px 0 18px;
                  vertical-align:bottom;
                  text-align:center;
                  line-height:0;
                  font-size:0;
                  overflow:hidden;
                "
              >
                <img
                  class="email-welcome-card-mascot"
                  src="${safeMascotUrl}"
                  width="155"
                  alt="${safeMascotAlt}"
                  border="0"
                  style="
                    display:block;
                    width:155px;
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
                class="email-welcome-card-content-cell"
                width="69%"
                valign="middle"
                style="
                  width:69%;
                  padding:24px 24px 24px 12px;
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
                  ${renderedTitle}
                </h2>

                <p
                  style="
                    margin:0 0 3px;
                    padding:0;
                    color:${selectedTheme.textSecondary};
                    font-family:${emailTypography.fontFamily};
                    font-size:14px;
                    line-height:21px;
                    font-weight:400;
                  "
                >
                  ${safeDescription}
                </p>

                <p
                  style="
                    margin:0 0 14px;
                    padding:0;
                    color:${selectedTheme.textSecondary};
                    font-family:${emailTypography.fontFamily};
                    font-size:14px;
                    line-height:21px;
                    font-weight:400;
                  "
                >
                  ${safeHelpText}
                </p>

                <p
                  style="
                    margin:0;
                    padding:0;
                    color:${selectedTheme.textPrimary};
                    font-family:${emailTypography.fontFamily};
                    font-size:14px;
                    line-height:21px;
                    font-weight:800;
                  "
                >
                  ${renderedSignature}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}