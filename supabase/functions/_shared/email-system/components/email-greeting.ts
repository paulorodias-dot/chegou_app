import { escapeHtml } from "../core/escape-html.ts";
import type { EmailTheme } from "../core/email-types.ts";

import {
  condominiumNameAlreadyContainsType,
} from "../core/formatters.ts";

import { emailColors } from "../tokens/colors.ts";
import { emailThemes } from "../tokens/themes.ts";
import { emailTypography } from "../tokens/typography.ts";

import {
  renderBrandName,
} from "./email-brand.ts";

export interface EmailGreetingProps {
  recipientName: string;
  condominiumName: string;
  theme?: EmailTheme;
}

function resolveCondominiumReference(
  condominiumName: string,
): {
  prefix: string;
  name: string;
} {
  const normalizedName = String(
    condominiumName || "",
  )
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedName) {
    return {
      prefix: "do",
      name: "seu condomínio",
    };
  }

  if (
    condominiumNameAlreadyContainsType(
      normalizedName,
    )
  ) {
    return {
      prefix: "do",
      name: normalizedName,
    };
  }

  return {
    prefix: "do condomínio",
    name: normalizedName,
  };
}

export function renderEmailGreeting({
  recipientName,
  condominiumName,
  theme = "light",
}: EmailGreetingProps): string {
  const selectedTheme =
    emailThemes[theme];

  const safeRecipientName =
    escapeHtml(recipientName) || "Morador";

  const condominiumReference =
    resolveCondominiumReference(
      condominiumName,
    );

  const safeCondominiumPrefix =
    escapeHtml(
      condominiumReference.prefix,
    );

  const safeCondominiumName =
    escapeHtml(
      condominiumReference.name,
    );

  const brandName =
    renderBrandName({ theme });

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
            ${brandName}
            ${safeCondominiumPrefix}
            <strong
              style="
                color:${selectedTheme.textPrimary};
                font-weight:800;
              "
            >
              ${safeCondominiumName}
            </strong>.
          </p>

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
            Complete seu cadastro para acompanhar suas encomendas,
            receber avisos importantes e aproveitar os recursos
            disponíveis para você.
          </p>

          <p
            class="email-body-text"
            style="
              margin:0;
              padding:0;
              color:${selectedTheme.textSecondary};
              font-family:${emailTypography.fontFamily};
              font-size:15px;
              line-height:24px;
              font-weight:400;
            "
          >
            O cadastro pode ser realizado em qualquer aparelho com
            acesso à internet. Para preencher as informações com mais
            conforto, recomendamos utilizar um
            <strong
              style="
                color:${selectedTheme.textPrimary};
                font-weight:700;
              "
            >
              computador ou notebook.
            </strong>
          </p>
        </td>
      </tr>
    </table>
  `;
}