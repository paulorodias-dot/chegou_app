import { emailColors } from "../tokens/colors";
import { emailTypography } from "../tokens/typography";
import { renderBrandName } from "./email-brand";

export interface EmailSenderLabelProps {
  theme?: "light" | "dark";
}

export function renderEmailSenderLabel({
  theme = "light",
}: EmailSenderLabelProps = {}): string {
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
            color:${emailColors.light.textMuted};
          "
        >
          Este e-mail foi enviado pelo
          ${renderBrandName({ theme })}
        </td>
      </tr>
    </table>
  `;
}