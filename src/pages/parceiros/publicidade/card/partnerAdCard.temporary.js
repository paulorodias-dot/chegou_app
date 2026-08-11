import partnerSejaParceiro from "../partner-chegou-seja-parceiro.png";
import partnerNovosClientes from "../partner-chegou-novos-clientes.png";
import partnerDivulgueNegocio from "../partner-chegou-divulgue-negocio.png";

/**
 * SISTEMA CHEGOU!
 * PUBLICIDADE INSTITUCIONAL TEMPORÁRIA
 *
 * Uso:
 * - preview visual enquanto o backend de Parceiros/Publicidade
 *   ainda não estiver disponível;
 * - reutilização exclusiva pelo PartnerAdCard oficial.
 *
 * NÃO representa campanhas reais de produção.
 *
 * Quando o resolvedor real de campanhas estiver disponível,
 * este arquivo deverá deixar de ser utilizado.
 */

export const TEMPORARY_PARTNER_AD_SLIDES = Object.freeze([
  Object.freeze({
    id: "partner-preview-seja-parceiro",
    campaignId: "partner-preview-seja-parceiro",

    imageSrc: partnerSejaParceiro,
    imageAlt: "Seja um Parceiro Chegou!",

    label: "Parceiro",

    title: "",
    description: "",

    href: "",
    ctaLabel: "",

    validFrom: null,
    validUntil: null,
  }),

  Object.freeze({
    id: "partner-preview-novos-clientes",
    campaignId: "partner-preview-novos-clientes",

    imageSrc: partnerNovosClientes,
    imageAlt:
      "Sistema Chegou! Parceiros — conecte-se a novos clientes",

    label: "Parceiro",

    title: "",
    description: "",

    href: "",
    ctaLabel: "",

    validFrom: null,
    validUntil: null,
  }),

  Object.freeze({
    id: "partner-preview-divulgue-negocio",
    campaignId: "partner-preview-divulgue-negocio",

    imageSrc: partnerDivulgueNegocio,
    imageAlt:
      "Sistema Chegou! Parceiros — divulgue seu negócio",

    label: "Parceiro",

    title: "",
    description: "",

    href: "",
    ctaLabel: "",

    validFrom: null,
    validUntil: null,
  }),
]);

export default TEMPORARY_PARTNER_AD_SLIDES;