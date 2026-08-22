export type EmailTheme = "light" | "dark";

export type EmailTemplateId =
  | "convite_morador_premium_v1"
  | "reenvio_convite_morador_premium_v1"
  | "recuperacao_senha_premium_v1"
  | "senha_alterada_premium_v1"
  | "morador_aprovado_premium_v1";

export type EmailCommunicationOrigin =
  | "sistema_chegou"
  | "condominio"
  | "parceiro"
  | "fornecedor";

export type EmailResidentApprovedAccessMode =
  | "new"
  | "existing";

export interface EmailAssetConfiguration {
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

export interface EmailInvitationData
  extends EmailBaseData {
  recipientName: string;
  condominiumName: string;
  invitationUrl: string;
  validityDays: number;
  companyAddress?: string;
}

export interface EmailPasswordRecoveryData
  extends EmailBaseData {
  recipientName: string;
  recoveryUrl: string;
  validityMinutes: number;
  companyAddress?: string;
}

export interface EmailPasswordChangedData
  extends EmailBaseData {
  recipientName: string;
  changedAt: string;
  deviceDescription?: string;
  companyAddress?: string;
}

export interface EmailResidentApprovedData
  extends EmailBaseData {
  recipientName: string;
  recipientEmail: string;
  recipientPhone?: string;

  condominiumName: string;

  condominiumHelpEmail?: string;
  condominiumHelpWhatsapp?: string;

  loginUrl: string;

  accessMode: EmailResidentApprovedAccessMode;

  companyAddress?: string;

  systemInstagramUrl?: string;
  systemWhatsappUrl?: string;
  systemWhatsappLabel?: string;
  systemSiteUrl?: string;
}

export interface EmailRenderResult {
  templateId: EmailTemplateId;
  subject: string;
  preheader: string;
  html: string;
  text: string;
}