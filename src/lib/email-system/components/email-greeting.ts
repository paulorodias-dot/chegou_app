import { escapeHtml } from "../core/escape-html";
import type { EmailTheme } from "../core/email-types";
import { emailColors } from "../tokens/colors";
import { emailThemes } from "../tokens/themes";
import { emailTypography } from "../tokens/typography";

export interface EmailGreetingProps {
  recipientName: string;
  condominiumName: string;
  theme?: EmailTheme;
}

function normalizeTextForComparison(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function condominiumNameAlreadyContainsType(
  condominiumName: string,
): boolean {
  const normalizedName =
    normalizeTextForComparison(condominiumName);

  return /^(condominio|cond\.?)\b/.test(
    normalizedName,
  );
}

function formatCondominiumReference(
  condominiumName: string,
): string {
  const normalizedName = String(
    condominiumName || "",
  )
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedName) {
    return "do seu condomínio";
  }

  if (
    condominiumNameAlreadyContainsType(
      normalizedName,
    )
  ) {
    return `do ${normalizedName}`;
  }

  return `do condomínio ${normalizedName}`;
}

export function renderEmailGreeting({
  recipientName,
  condominiumName,
  theme = "light",
}: EmailGreetingProps): string {
  const selectedTheme = emailThemes[theme];

  const safeRecipientName =
    escapeHtml(recipientName) || "Morador";

  const condominiumReference =
    formatCondominiumReference(
      condominiumName,
    );

  const safeCondominiumReference =
    escapeHtml(condominiumReference);

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
          class="email-main-content-padding"
          style="
            padding:28px 40px 24px;
            color:${selectedTheme.textSecondary};
            font-family:${emailTypography.fontFamily};
          "
        >
          <h1
            class="email-greeting-title"
            style="
              margin:0 0 18px;
              padding:0;
              color:${selectedTheme.textPrimary};
              font-family:${emailTypography.fontFamily};
              font-size:26px;
              line-height:33px;
              font-weight:800;
              letter-spacing:-0.01em;
            "
          >
            Olá,
            <span
              style="
                color:${emailColors.brand.blueAction};
                font-weight:800;
              "
            >
              ${safeRecipientName}!
            </span>
          </h1>

          <p
            class="email-body-text"
            style="
              margin:0 0 18px;
              padding:0;
              color:${selectedTheme.textSecondary};
              font-family:${emailTypography.fontFamily};
              font-size:16px;
              line-height:26px;
              font-weight:400;
            "
          >
            Você recebeu um convite para acessar o
            <strong
              style="
                color:${emailColors.brand.orange};
                font-weight:700;
              "
            >
              Sistema Chegou!
            </strong>
            ${safeCondominiumReference}.
          </p>

          <p
            class="email-body-text"
            style="
              margin:0;
              padding:0;
              color:${selectedTheme.textSecondary};
              font-family:${emailTypography.fontFamily};
              font-size:16px;
              line-height:26px;
              font-weight:400;
            "
          >
            Complete seu cadastro para acompanhar suas encomendas,
            receber avisos importantes e aproveitar os recursos
            disponíveis para você.
          </p>
        </td>
      </tr>
    </table>
  `;
}