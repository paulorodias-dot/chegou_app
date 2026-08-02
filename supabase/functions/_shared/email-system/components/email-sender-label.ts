import { escapeHtml } from "../core/escape-html.ts";
import { emailColors } from "../tokens/colors.ts";
import { emailTypography } from "../tokens/typography.ts";

export interface EmailSenderLabelProps {
  senderName?: string;
}

export function renderEmailSenderLabel({
  senderName = "Sistema Chegou!",
}: EmailSenderLabelProps = {}): string {
  const safeSenderName = escapeHtml(
    senderName,
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
          <strong
            style="
              color:${emailColors.brand.orange};
              font-weight:700;
            "
          >
            ${safeSenderName}
          </strong>
        </td>
      </tr>
    </table>
  `;
}