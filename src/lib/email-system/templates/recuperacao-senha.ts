import { renderEmailActionCard } from "../components/email-action-card";
import { renderBrandName } from "../components/email-brand";
import { renderEmailDivider } from "../components/email-divider";
import { renderEmailDocument } from "../components/email-document";
import { renderEmailFooter } from "../components/email-footer";
import { renderEmailHero } from "../components/email-hero";
import { renderEmailLinkFallback } from "../components/email-link-fallback";
import { renderEmailSecurityCard } from "../components/email-security-card";
import { renderEmailSenderLabel } from "../components/email-sender-label";
import { createEmailAssetUrl } from "../core/asset-url";
import type {
  EmailPasswordRecoveryData,
  EmailRenderResult,
} from "../core/email-types";
import { escapeHtml } from "../core/escape-html";
import { normalizeRecipientName } from "../core/formatters";
import { emailColors } from "../tokens/colors";
import { emailThemes } from "../tokens/themes";
import { emailTypography } from "../tokens/typography";

function renderRecoveryIntroduction({
  recipientName,
  theme,
}: {
  recipientName: string;
  theme: "light" | "dark";
}): string {
  const selectedTheme = emailThemes[theme];
  const safeRecipientName =
    escapeHtml(recipientName) || "Usuário";

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
            Recebemos uma solicitação para redefinir a senha da sua
            conta no ${renderBrandName({ theme })}.
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
            Use o botão abaixo para criar uma nova senha com segurança.
            Caso você não tenha solicitado esta alteração, ignore este
            e-mail e mantenha sua senha atual.
          </p>
        </td>
      </tr>
    </table>
  `;
}

function renderRecoveryValidity({
  validityMinutes,
  theme,
}: {
  validityMinutes: number;
  theme: "light" | "dark";
}): string {
  const selectedTheme = emailThemes[theme];
  const safeMinutes = Number.isFinite(validityMinutes)
    ? Math.max(1, Math.trunc(validityMinutes))
    : 30;

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
            padding:4px 40px 26px;
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
              border-collapse:separate;
              border-spacing:0;
              background-color:${selectedTheme.surfaceSecondary};
              border:1px solid ${selectedTheme.border};
              border-radius:14px;
            "
            bgcolor="${selectedTheme.surfaceSecondary}"
          >
            <tr>
              <td
                style="
                  padding:16px 18px;
                  color:${selectedTheme.textSecondary};
                  font-family:${emailTypography.fontFamily};
                  font-size:14px;
                  line-height:22px;
                "
              >
                <strong
                  style="
                    color:${emailColors.brand.royalBlue};
                    font-weight:800;
                  "
                >
                  Validade do link:
                </strong>
                este link poderá ser utilizado por
                <strong
                  style="
                    color:${selectedTheme.textPrimary};
                    font-weight:800;
                  "
                >
                  ${safeMinutes} minutos
                </strong>.
                Depois desse período, solicite uma nova recuperação
                pela tela de login.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function renderRecuperacaoSenhaEmail(
  data: EmailPasswordRecoveryData,
): EmailRenderResult {
  const recipientName = normalizeRecipientName(
    data.recipientName,
    "Usuário",
  );

  const theme = data.theme;

  const logoHeroUrl = createEmailAssetUrl(
    data.assets,
    "brand/logo_branco.png",
  );

  const logoFooterUrl = createEmailAssetUrl(
    data.assets,
    theme === "dark"
      ? "brand/logo_branco.png"
      : "brand/logo_azulroyal.png",
  );

  const heroMascotUrl = createEmailAssetUrl(
    data.assets,
    "recuperacao-senha/mascot-recuperacao-senha-email-hero.png",
  );

  const heroCurveUrl = createEmailAssetUrl(
    data.assets,
    theme === "dark"
      ? "hero/email-hero-curve-dark.png"
      : "hero/email-hero-curve-light.png",
  );

  const recoveryIllustrationUrl = createEmailAssetUrl(
    data.assets,
    "recuperacao-senha/illustration-recuperacao-senha.png",
  );

  const content = `
    ${renderEmailHero({
      logoUrl: logoHeroUrl,
      mascotUrl: heroMascotUrl,
      curveUrl: heroCurveUrl,
      variant: "password-recovery",
      mascotAlt:
        "Mascote oficial do Sistema Chegou! apresentando a recuperação segura de acesso.",
    })}

    ${renderRecoveryIntroduction({
      recipientName,
      theme,
    })}

    ${renderEmailActionCard({
      theme,
      actionUrl: data.recoveryUrl,
      illustrationUrl: recoveryIllustrationUrl,
      title: "Crie uma nova senha",
      description:
        "Acesse a página segura para definir uma nova senha para sua conta.",
      buttonLabel: "Criar nova senha",
    })}

    ${renderEmailSecurityCard({
      theme,
      title:
        "Este link é pessoal, temporário e de uso único.",
      description:
        "Não encaminhe este e-mail nem compartilhe o endereço de recuperação com outras pessoas.",
    })}

    ${renderEmailLinkFallback({
      theme,
      url: data.recoveryUrl,
      description:
        "Caso o botão acima não funcione, copie e cole o endereço seguro abaixo no navegador:",
    })}

    ${renderRecoveryValidity({
      validityMinutes: data.validityMinutes,
      theme,
    })}

    ${renderEmailDivider({ theme })}

    ${renderEmailFooter({
      theme,
      logoUrl: logoFooterUrl,
      currentYear: data.currentYear,
      helpText:
        "Caso não reconheça esta solicitação, ignore o e-mail e mantenha sua senha atual.",
      companyAddress: data.companyAddress,
    })}
  `;

  const subject =
    "Redefina sua senha do Sistema Chegou!";

  const preheader =
    "Use o link seguro e temporário para criar uma nova senha.";

  const html = renderEmailDocument({
    title: subject,
    preheader,
    theme,
    senderLabel: renderEmailSenderLabel({
      theme,
    }),
    content,
  });

  const safeMinutes = Number.isFinite(
    data.validityMinutes,
  )
    ? Math.max(
        1,
        Math.trunc(data.validityMinutes),
      )
    : 30;

  const text = [
    `Olá, ${recipientName}!`,
    "",
    "Recebemos uma solicitação para redefinir a senha da sua conta no Sistema Chegou!",
    "",
    "Use o endereço abaixo para criar uma nova senha:",
    data.recoveryUrl,
    "",
    `Este link é pessoal, temporário, de uso único e válido por ${safeMinutes} minutos.`,
    "",
    "Caso você não tenha solicitado esta alteração, ignore este e-mail e mantenha sua senha atual.",
    "",
    "Não compartilhe este endereço com outras pessoas.",
    "",
    "Equipe Sistema Chegou!",
  ].join("\\n");

  return {
    templateId: data.templateId,
    subject,
    preheader,
    html,
    text,
  };
}