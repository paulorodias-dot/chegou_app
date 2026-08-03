import type { EmailTheme } from "../core/email-types.ts";
import { emailColors } from "../tokens/colors.ts";
import { emailTypography } from "../tokens/typography.ts";

export interface EmailBrandProps {
  theme?: EmailTheme;
}

function resolveBrandTextColor(
  theme: EmailTheme,
): string {
  return theme === "dark"
    ? emailColors.brand.white
    : emailColors.brand.royalBlue;
}

function renderBrandText(
  content: string,
  theme: EmailTheme,
): string {
  const brandTextColor =
    resolveBrandTextColor(theme);

  return `
    <strong
      style="
        color:${brandTextColor};
        font-family:${emailTypography.fontFamily};
        font-weight:800;
        white-space:nowrap;
      "
    >
      ${content}
    </strong>
  `;
}

/**
 * Renderiza explicitamente:
 *
 * Sistema Chegou!
 *
 * Nunca realiza substituição automática da palavra "chegou".
 */
export function renderBrandName({
  theme = "light",
}: EmailBrandProps = {}): string {
  return renderBrandText(
    `Sistema Chegou<span style="color:${emailColors.brand.orange};">!</span>`,
    theme,
  );
}

/**
 * Renderiza explicitamente:
 *
 * Chegou!
 *
 * Deve ser utilizado somente quando houver sentido intencional
 * de produto ou marca, como:
 *
 * Sua encomenda Chegou!
 */
export function renderBrandChegou({
  theme = "light",
}: EmailBrandProps = {}): string {
  return renderBrandText(
    `Chegou<span style="color:${emailColors.brand.orange};">!</span>`,
    theme,
  );
}

/**
 * Renderiza explicitamente:
 *
 * Equipe Sistema Chegou!
 */
export function renderBrandTeam({
  theme = "light",
}: EmailBrandProps = {}): string {
  return renderBrandText(
    `Equipe Sistema Chegou<span style="color:${emailColors.brand.orange};">!</span>`,
    theme,
  );
}

/**
 * Renderiza:
 *
 * plataforma Sistema Chegou!
 *
 * A palavra "plataforma" permanece como texto comum.
 */
export function renderBrandPlatform({
  theme = "light",
}: EmailBrandProps = {}): string {
  return `plataforma ${renderBrandName({ theme })}`;
}