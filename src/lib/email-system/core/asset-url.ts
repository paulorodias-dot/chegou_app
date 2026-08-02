import type { EmailAssetConfiguration } from "./email-types";

const EMAIL_ASSETS_DIRECTORY = "email-assets";

function normalizeBaseUrl(baseUrl: string): string {
  return String(baseUrl || "")
    .trim()
    .replace(/\/+$/, "");
}

function normalizeAssetPath(assetPath: string): string {
  return String(assetPath || "")
    .trim()
    .replace(/^\/+/, "");
}

export function createEmailAssetUrl(
  configuration: EmailAssetConfiguration,
  assetPath: string,
): string {
  const baseUrl = normalizeBaseUrl(configuration.baseUrl);
  const normalizedPath = normalizeAssetPath(assetPath);

  if (!baseUrl) {
    throw new Error("A URL-base dos assets de e-mail não foi informada.");
  }

  if (!normalizedPath) {
    throw new Error("O caminho do asset de e-mail não foi informado.");
  }

  return `${baseUrl}/${EMAIL_ASSETS_DIRECTORY}/${normalizedPath}`;
}