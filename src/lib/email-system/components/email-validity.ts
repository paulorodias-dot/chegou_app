import {
  escapeHtml,
  escapeHtmlAttribute,
} from "../core/escape-html";
import type { EmailTheme } from "../core/email-types";
import { emailColors } from "../tokens/colors";
import { emailThemes } from "../tokens/themes";
import { emailTypography } from "../tokens/typography";

export interface EmailValidityProps {
  validityDays: number;
  theme?: EmailTheme;
  iconUrl?: string;
}

export function renderEmailValidity({
  validityDays,
  theme = "light",
  iconUrl,
}: EmailValidityProps): string {
  const selectedTheme = emailThemes[theme];

  const normalizedDays = Number.isFinite(validityDays)
    ? Math.max(1, Math.trunc(validityDays))
    : 1;

  const validityText =
    normalizedDays === 1
      ? "1 dia"
      : `${normalizedDays} dias`;

  const safeValidityText =
    escapeHtml(validityText);

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
            padding:16px 40px 12px;
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
              border-top:1px solid ${selectedTheme.border};
            "
          >
            <tr>
              <td
                class="email-inline-icon-cell"
                width="54"
                valign="middle"
                align="center"
                style="
                  width:54px;
                  padding:18px 14px 8px 0;
                  vertical-align:middle;
                  text-align:center;
                "
              >
                ${
                  safeIconUrl
                    ? `
                      <img
                        src="${safeIconUrl}"
                        width="32"
                        alt=""
                        aria-hidden="true"
                        border="0"
                        style="
                          display:block;
                          width:32px;
                          height:auto;
                          margin:0 auto;
                          border:0;
                          outline:none;
                          text-decoration:none;
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
                              color:${emailColors.brand.royalBlue};
                              font-family:${emailTypography.fontFamily};
                              font-size:16px;
                              line-height:34px;
                              font-weight:800;
                            "
                          >
                            7d
                          </td>
                        </tr>
                      </table>
                    `
                }
              </td>

              <td
                valign="middle"
                style="
                  padding:18px 0 8px;
                  vertical-align:middle;
                  color:${selectedTheme.textSecondary};
                  font-family:${emailTypography.fontFamily};
                  font-size:14px;
                  line-height:21px;
                  font-weight:400;
                "
              >
                Este convite é válido por
                <strong
                  style="
                    color:${emailColors.brand.orange};
                    font-weight:800;
                  "
                >
                  ${safeValidityText}.
                </strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}