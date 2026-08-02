import type { EmailTheme } from "../core/email-types";
import { emailThemes } from "../tokens/themes";

interface EmailDividerProps {
  theme?: EmailTheme;
}

export function renderEmailDivider({
  theme = "light",
}: EmailDividerProps = {}): string {
  const selectedTheme = emailThemes[theme];

  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        border-collapse:collapse;
        background-color:${selectedTheme.surfaceSecondary};
      "
      bgcolor="${selectedTheme.surfaceSecondary}"
    >
      <tr>
        <td
          height="26"
          style="
            height:26px;
            padding:0;
            border-top:1px solid ${selectedTheme.divider};
            box-shadow:${selectedTheme.dividerShadow};
            font-size:0;
            line-height:0;
          "
        >
          &nbsp;
        </td>
      </tr>
    </table>
  `;
}