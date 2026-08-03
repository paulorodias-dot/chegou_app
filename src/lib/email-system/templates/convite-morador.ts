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

import { renderEmailActionCard } from "../components/email-action-card";
import { renderEmailDivider } from "../components/email-divider";
import { renderEmailDocument } from "../components/email-document";
import { renderEmailFooter } from "../components/email-footer";
import { renderEmailGreeting } from "../components/email-greeting";
import { renderEmailHero } from "../components/email-hero";
import { renderEmailLinkFallback } from "../components/email-link-fallback";
import { renderEmailSecurityCard } from "../components/email-security-card";
import { renderEmailSenderLabel } from "../components/email-sender-label";
import { renderEmailValidity } from "../components/email-validity";
import { renderEmailWelcomeCard } from "../components/email-welcome-card";

export function renderConviteMoradorEmail(
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

    ${renderEmailGreeting({
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
        "Completar meu cadastro",
      description:
        "Use o botão abaixo para finalizar seu cadastro e ativar seu acesso.",
      buttonLabel:
        "Completar meu cadastro",
    })}

    ${renderEmailSecurityCard({
      theme,
      title:
        "Este link é pessoal, seguro e de uso único.",
      description:
        "Não compartilhe este convite com outras pessoas.",
    })}

    ${renderEmailLinkFallback({
      theme,
      url: data.invitationUrl,
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
      description:
        "Estamos felizes por ter você com a gente.",
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
    "Complete seu cadastro no Sistema Chegou!";

  const preheader =
    `Olá, ${recipientName}. ` +
    `Complete seu cadastro para acessar ` +
    `o Sistema Chegou! ${condominiumReference}.`;

  const html =
    renderEmailDocument({
      title: subject,
      preheader,
      theme,
      senderLabel:
        renderEmailSenderLabel({ theme }),
      content,
    });

  const text = [
    `Olá, ${recipientName}!`,
    "",
    `Você recebeu um convite para acessar o Sistema Chegou! ${condominiumReference}.`,
    "",
    "Complete seu cadastro para acompanhar suas encomendas, receber avisos importantes e aproveitar os recursos disponíveis para você.",
    "",
    "O cadastro pode ser realizado em qualquer aparelho com acesso à internet. Para preencher as informações com mais conforto, recomendamos utilizar um computador ou notebook.",
    "",
    "Completar meu cadastro:",
    data.invitationUrl,
    "",
    "Este link é pessoal, seguro e de uso único.",
    "Não compartilhe este convite com outras pessoas.",
    "",
    data.validityDays === 1
      ? "Este convite é válido por 1 dia."
      : `Este convite é válido por ${data.validityDays} dias.`,
    "",
    "Bem-vindo ao Sistema Chegou!",
    "Estamos felizes por ter você com a gente.",
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