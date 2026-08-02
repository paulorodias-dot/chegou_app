export type EmailTheme = "light" | "dark";

export type EmailTemplateId =
  | "convite_morador_premium_v1"
  | "reenvio_convite_morador_premium_v1";

export type EmailCommunicationOrigin =
  | "sistema_chegou"
  | "condominio"
  | "parceiro"
  | "fornecedor";

export interface EmailAssetConfiguration {
  /**
   * Origem pública sem /email-assets no final.
   *
   * Exemplo:
   * https://sistemachegou.com.br
   */
  baseUrl: string;
}

export interface EmailSenderIdentification {
  name: string;
  origin: EmailCommunicationOrigin;
  condominiumName?: string;
}

export interface EmailBaseData {
  templateId: EmailTemplateId;
  theme: EmailTheme;
  language: "pt-BR";
  currentYear: number;
  sender: EmailSenderIdentification;
  assets: EmailAssetConfiguration;
}

export interface EmailInvitationData extends EmailBaseData {
  recipientName: string;
  condominiumName: string;
  invitationUrl: string;
  validityDays: number;
  companyAddress?: string;
}

export interface EmailRenderResult {
  templateId: EmailTemplateId;
  subject: string;
  preheader: string;
  html: string;
  text: string;
}