import {
  escapeHtml,
  escapeHtmlAttribute,
} from "../core/escape-html.ts";
import type { EmailTheme } from "../core/email-types.ts";
import { emailColors } from "../tokens/colors.ts";
import { emailThemes } from "../tokens/themes.ts";
import { emailTypography } from "../tokens/typography.ts";

export interface EmailLinkFallbackProps {
  url: string;
  theme?: EmailTheme;
  iconUrl?: string;
  description?: string;
}

export function renderEmailLinkFallback({
  url,
  theme = "light",
  iconUrl,
  description =
    "Caso o botão acima não funcione, copie e cole o endereço abaixo no navegador:",
}: EmailLinkFallbackProps): string {
  const selectedTheme = emailThemes[theme];

  const safeUrlText = escapeHtml(url);

  const safeUrlAttribute =
    escapeHtmlAttribute(url);

  const safeDescription =
    escapeHtml(description);

  const safeIconUrl = iconUrl
    ? escapeHtmlAttribute(iconUrl)
    : null;

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
            padding:16px 40px 6px;
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
            <tr>
              <td
                class="email-inline-icon-cell"
                width="54"
                valign="top"
                align="center"
                style="
                  width:54px;
                  padding:0 14px 0 0;
                  vertical-align:top;
                  text-align:center;
                "
              >
                ${
                  safeIconUrl
                    ? `
                      <img
                        src="${safeIconUrl}"
                        width="34"
                        alt=""
                        aria-hidden="true"
                        border="0"
                        style="
                          display:block;
                          width:34px;
                          height:auto;
                          margin:0 auto;
                          border:0;
                          outline:none;
                          text-decoration:none;
                          -ms-interpolation-mode:bicubic;
                        "
                      />
                    `
                    : `
                      <table
                        role="presentation"
                        width="34"
                        height="34"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        style="
                          width:34px;
                          height:34px;
                          border-collapse:separate;
                          border-spacing:0;
                          background-color:${selectedTheme.surfaceInformation};
                          border-radius:17px;
                        "
                        bgcolor="${selectedTheme.surfaceInformation}"
                      >
                        <tr>
                          <td
                            align="center"
                            valign="middle"
                            style="
                              color:${emailColors.brand.blueAction};
                              font-family:${emailTypography.fontFamily};
                              font-size:18px;
                              line-height:34px;
                              font-weight:800;
                            "
                          >
                            ↗
                          </td>
                        </tr>
                      </table>
                    `
                }
              </td>

              <td
                valign="top"
                style="
                  padding:0;
                  vertical-align:top;
                  color:${selectedTheme.textSecondary};
                  font-family:${emailTypography.fontFamily};
                "
              >
                <p
                  style="
                    margin:0 0 7px;
                    padding:0;
                    color:${selectedTheme.textMuted};
                    font-family:${emailTypography.fontFamily};
                    font-size:13px;
                    line-height:20px;
                    font-weight:400;
                  "
                >
                  ${safeDescription}
                </p>

                <p
                  style="
                    margin:0;
                    padding:0;
                    font-family:${emailTypography.fontFamily};
                    font-size:12px;
                    line-height:19px;
                    font-weight:500;
                    word-break:break-all;
                    overflow-wrap:anywhere;
                  "
                >
                  <a
                    href="${safeUrlAttribute}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                      color:${emailColors.brand.blueAction};
                      text-decoration:none;
                      word-break:break-all;
                      overflow-wrap:anywhere;
                    "
                  >
                    ${safeUrlText}
                  </a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}