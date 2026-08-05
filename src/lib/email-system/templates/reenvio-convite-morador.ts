import { createEmailAssetUrl } from "../core/asset-url";

import type {
  EmailInvitationData,
  EmailRenderResult,
} from "../core/email-types";

import {
  formatCondominiumReference,
  normalizeCondominiumName,
  normalizeRecipientName,
} from "../core/formatters";

import { renderBrandName } from "../components/email-brand";
import { renderEmailActionCard } from "../components/email-action-card";
import { renderEmailDivider } from "../components/email-divider";
import { renderEmailDocument } from "../components/email-document";
import { renderEmailFooter } from "../components/email-footer";
import { renderEmailHero } from "../components/email-hero";
import { renderEmailLinkFallback } from "../components/email-link-fallback";
import { renderEmailSecurityCard } from "../components/email-security-card";
import { renderEmailSenderLabel } from "../components/email-sender-label";
import { renderEmailValidity } from "../components/email-validity";
import { renderEmailWelcomeCard } from "../components/email-welcome-card";
import { emailColors } from "../tokens/colors";
import { emailThemes } from "../tokens/themes";
import { emailTypography } from "../tokens/typography";

function renderReenvioGreeting({
  recipientName,
  condominiumName,
  theme,
}: {
  recipientName: string;
  condominiumName: string;
  theme: "light" | "dark";
}): string {
  const selectedTheme = emailThemes[theme];

  const condominiumReference =
    formatCondominiumReference(
      condominiumName,
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
              ${recipientName}!
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
            Estamos reenviando seu convite para acessar o
            ${renderBrandName({ theme })},
            solicitado ${condominiumReference}.
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
            O link enviado anteriormente foi substituído por um novo.
            Utilize este e-mail para concluir seu cadastro com segurança.
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

export function renderReenvioConviteMoradorEmail(
  data: EmailInvitationData,
): EmailRenderResult {
  const recipientName =
    normalizeRecipientName(
      data.recipientName,
    );

  const condominiumName =
    normalizeCondominiumName(
      data.condominiumName,
    );

  const condominiumReference =
    formatCondominiumReference(
      condominiumName,
    );

  const theme = data.theme;

  const logoHeroUrl =
    createEmailAssetUrl(
      data.assets,
      "brand/logo_branco.png",
    );

  const logoFooterUrl =
    createEmailAssetUrl(
      data.assets,
      theme === "dark"
        ? "brand/logo_branco.png"
        : "brand/logo_azulroyal.png",
    );

  const heroMascotUrl =
    createEmailAssetUrl(
      data.assets,
      "convite-morador/mascot-convite-morador-hero.png",
    );

  const heroCurveUrl =
    createEmailAssetUrl(
      data.assets,
      theme === "dark"
        ? "hero/email-hero-curve-dark.png"
        : "hero/email-hero-curve-light.png",
    );

  const registrationIllustrationUrl =
    createEmailAssetUrl(
      data.assets,
      "convite-morador/illustration-iniciar-cadastro.png",
    );

  const welcomeMascotUrl =
    createEmailAssetUrl(
      data.assets,
      "convite-morador/mascot-convite-morador-welcome.png",
    );

  const content = `
    ${renderEmailHero({
      logoUrl: logoHeroUrl,
      mascotUrl: heroMascotUrl,
      curveUrl: heroCurveUrl,
      mascotAlt:
        "Mascote do Sistema Chegou! dando boas-vindas.",
    })}

    ${renderReenvioGreeting({
      recipientName,
      condominiumName,
      theme,
    })}

    ${renderEmailActionCard({
      theme,
      actionUrl: data.invitationUrl,
      illustrationUrl:
        registrationIllustrationUrl,
      title:
        "Continuar meu cadastro",
      description:
        "Use o novo botão abaixo para concluir seu cadastro e ativar seu acesso.",
      buttonLabel:
        "Continuar meu cadastro",
    })}

    ${renderEmailSecurityCard({
      theme,
      title:
        "Este novo link é pessoal, seguro e de uso único.",
      description:
        "O link anterior não deve mais ser utilizado. Não compartilhe este convite com outras pessoas.",
    })}

    ${renderEmailLinkFallback({
      theme,
      url: data.invitationUrl,
      description:
        "Caso o botão acima não funcione, copie e cole o novo endereço abaixo no navegador:",
    })}

    ${renderEmailValidity({
      theme,
      validityDays:
        data.validityDays,
    })}

    ${renderEmailWelcomeCard({
      theme,
      mascotUrl:
        welcomeMascotUrl,
      title:
        "Ainda estamos aguardando você",
      description:
        "Assim que concluir seu cadastro, você poderá acompanhar suas encomendas e acessar os recursos disponíveis para moradores do seu condomínio.",
      helpText:
        "Em caso de dúvidas, fale com o administrativo do seu condomínio.",
    })}

    ${renderEmailDivider({
      theme,
    })}

    ${renderEmailFooter({
      theme,
      logoUrl:
        logoFooterUrl,
      currentYear:
        data.currentYear,
      condominiumName,
      helpText:
        "Fale com o administrativo do seu condomínio.",
      companyAddress:
        data.companyAddress,
    })}
  `;

  const subject =
    "Seu convite para o Sistema Chegou! foi renovado";

  const preheader =
    "Enviamos um novo link para você concluir seu cadastro com segurança.";

  const html =
    renderEmailDocument({
      title:
        subject,
      preheader,
      theme,
      senderLabel:
        renderEmailSenderLabel({
          theme,
        }),
      content,
    });

  const text = [
    `Olá, ${recipientName}!`,
    "",
    `Estamos reenviando seu convite para acessar o Sistema Chegou!, solicitado ${condominiumReference}.`,
    "",
    "O link enviado anteriormente foi substituído por um novo. Utilize este e-mail para concluir seu cadastro com segurança.",
    "",
    "O cadastro pode ser realizado em qualquer aparelho com acesso à internet. Para preencher as informações com mais conforto, recomendamos utilizar um computador ou notebook.",
    "",
    "Continuar meu cadastro:",
    data.invitationUrl,
    "",
    "Este novo link é pessoal, seguro e de uso único.",
    "O link anterior não deve mais ser utilizado.",
    "Não compartilhe este convite com outras pessoas.",
    "",
    data.validityDays === 1
      ? "Este convite é válido por 1 dia."
      : `Este convite é válido por ${data.validityDays} dias.`,
    "",
    "Ainda estamos aguardando você.",
    "Assim que concluir seu cadastro, você poderá acompanhar suas encomendas e acessar os recursos disponíveis para moradores do seu condomínio.",
    "",
    "Equipe Sistema Chegou!",
  ].join("\n");

  return {
    templateId:
      data.templateId,
    subject,
    preheader,
    html,
    text,
  };
}