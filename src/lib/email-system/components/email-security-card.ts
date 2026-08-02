import {
  escapeHtml,
  escapeHtmlAttribute,
} from "../core/escape-html";
import type { EmailTheme } from "../core/email-types";
import { emailColors } from "../tokens/colors";
import { emailThemes } from "../tokens/themes";
import { emailTypography } from "../tokens/typography";

export interface EmailSecurityCardProps {
  theme?: EmailTheme;
  iconUrl?: string;
  title?: string;
  description?: string;
}

export function renderEmailSecurityCard({
  theme = "light",
  iconUrl,
  title = "Este link é pessoal, seguro e de uso único.",
  description = "Não compartilhe este convite com outras pessoas.",
}: EmailSecurityCardProps = {}): string {
  const selectedTheme = emailThemes[theme];

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);

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
            padding:14px 40px 10px;
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
              background-color:${selectedTheme.surfaceInformation};
              border:1px solid ${selectedTheme.borderInformation};
              border-radius:14px;
            "
            bgcolor="${selectedTheme.surfaceInformation}"
          >
            <tr>
              ${
                safeIconUrl
                  ? `
                    <td
                      class="email-security-icon-cell"
                      width="64"
                      valign="middle"
                      align="center"
                      style="
                        width:64px;
                        padding:16px 0 16px 18px;
                        vertical-align:middle;
                        text-align:center;
                      "
                    >
                      <img
                        src="${safeIconUrl}"
                        width="38"
                        alt=""
                        aria-hidden="true"
                        border="0"
                        style="
                          display:block;
                          width:38px;
                          height:auto;
                          margin:0 auto;
                          border:0;
                          outline:none;
                          text-decoration:none;
                          -ms-interpolation-mode:bicubic;
                        "
                      />
                    </td>
                  `
                  : `
                    <td
                      class="email-security-icon-cell"
                      width="64"
                      valign="middle"
                      align="center"
                      style="
                        width:64px;
                        padding:16px 0 16px 18px;
                        vertical-align:middle;
                        text-align:center;
                      "
                    >
                      <table
                        role="presentation"
                        width="38"
                        height="38"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                        style="
                          width:38px;
                          height:38px;
                          border-collapse:separate;
                          border-spacing:0;
                          border:2px solid ${emailColors.brand.blueAction};
                          border-radius:19px;
                        "
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
                            ✓
                          </td>
                        </tr>
                      </table>
                    </td>
                  `
              }

              <td
                valign="middle"
                style="
                  padding:16px 18px;
                  vertical-align:middle;
                  color:${selectedTheme.textSecondary};
                  font-family:${emailTypography.fontFamily};
                "
              >
                <p
                  style="
                    margin:0 0 2px;
                    padding:0;
                    color:${selectedTheme.textPrimary};
                    font-family:${emailTypography.fontFamily};
                    font-size:14px;
                    line-height:20px;
                    font-weight:800;
                  "
                >
                  ${safeTitle}
                </p>

                <p
                  style="
                    margin:0;
                    padding:0;
                    color:${selectedTheme.textSecondary};
                    font-family:${emailTypography.fontFamily};
                    font-size:13px;
                    line-height:20px;
                    font-weight:400;
                  "
                >
                  ${safeDescription}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}