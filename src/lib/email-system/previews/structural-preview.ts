import { createEmailAssetUrl } from "../core/asset-url";
import { renderEmailDivider } from "../components/email-divider";
import { renderEmailDocument } from "../components/email-document";
import { renderEmailFooter } from "../components/email-footer";
import { renderEmailHero } from "../components/email-hero";
import { renderEmailSenderLabel } from "../components/email-sender-label";
import { emailThemes } from "../tokens/themes";
import { emailTypography } from "../tokens/typography";

export interface StructuralPreviewOptions {
  baseUrl: string;
  theme?: "light" | "dark";
}

export function renderStructuralEmailPreview({
  baseUrl,
  theme = "light",
}: StructuralPreviewOptions): string {
  const selectedTheme = emailThemes[theme];

  const logoHeroUrl = createEmailAssetUrl(
    { baseUrl },
    "brand/logo_branco.png",
  );

  const logoFooterUrl = createEmailAssetUrl(
    { baseUrl },
    theme === "dark"
      ? "brand/logo_branco.png"
      : "brand/logo_azulroyal.png",
  );

  const heroMascotUrl = createEmailAssetUrl(
    { baseUrl },
    "convite-morador/mascot-convite-morador-hero.png",
  );

  const heroCurveUrl = createEmailAssetUrl(
    { baseUrl },
    theme === "dark"
      ? "hero/email-hero-curve-dark.png"
      : "hero/email-hero-curve-light.png",
  );

  const content = `
    ${renderEmailHero({
      logoUrl: logoHeroUrl,
      mascotUrl: heroMascotUrl,
      curveUrl: heroCurveUrl,
      mascotAlt: "Mascote do Sistema Chegou! dando boas-vindas.",
    })}

    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        border-collapse:collapse;
        background-color:${selectedTheme.surface};
      "
      bgcolor="${selectedTheme.surface}"
    >
      <tr>
        <td
          class="email-content-padding"
          style="
            padding:36px 40px;
            color:${selectedTheme.textSecondary};
            font-family:${emailTypography.fontFamily};
            font-size:16px;
            line-height:26px;
          "
        >
          <h1
            class="email-preview-title"
            style="
              margin:0 0 14px;
              color:${selectedTheme.textPrimary};
              font-family:${emailTypography.fontFamily};
              font-size:26px;
              line-height:33px;
              font-weight:800;
            "
          >
            Pré-visualização estrutural
          </h1>

          <p
            style="
              margin:0;
              color:${selectedTheme.textSecondary};
              font-family:${emailTypography.fontFamily};
              font-size:16px;
              line-height:26px;
            "
          >
            Este espaço será substituído pelos componentes de conteúdo
            do Convite Inicial para Morador na próxima etapa.
          </p>
        </td>
      </tr>
    </table>

    ${renderEmailDivider({ theme })}

    ${renderEmailFooter({
      theme,
      logoUrl: logoFooterUrl,
      currentYear: new Date().getFullYear(),
      condominiumName: "Condomínio de demonstração",
    })}
  `;

  return renderEmailDocument({
    title: "Pré-visualização do Sistema Chegou!",
    preheader:
      "Pré-visualização estrutural do e-mail oficial do Sistema Chegou!",
    theme,
    senderLabel: renderEmailSenderLabel(),
    content,
  });
}