import type {
  EmailTheme,
} from "../core/email-types.ts";

import { emailThemes } from "../tokens/themes.ts";
import { emailTypography } from "../tokens/typography.ts";

import {
  renderBrandName,
} from "./email-brand.ts";

export interface EmailSenderLabelProps {
  theme?: EmailTheme;
}

export function renderEmailSenderLabel({
  theme = "light",
}: EmailSenderLabelProps = {}): string {
  const selectedTheme =
    emailThemes[theme];

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
      "
    >
      <tr>
        <td
          align="center"
          style="
            padding:14px 16px;
            font-family:${emailTypography.fontFamily};
            font-size:13px;
            line-height:20px;
            font-weight:400;
            color:${selectedTheme.textMuted};
          "
        >
          Este e-mail foi enviado pelo
          ${renderBrandName({ theme })}
        </td>
      </tr>
    </table>
  `;
}