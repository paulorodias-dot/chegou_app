import type { EmailTheme } from "../core/email-types";
import { emailColors } from "../tokens/colors";
import { emailTypography } from "../tokens/typography";

export interface EmailBrandProps {
  theme?: EmailTheme;
}

/**
 * A marca usa sempre o Azul Royal institucional no tema claro.
 * No tema escuro, utiliza branco para preservar contraste e leitura.
 */
function resolveBrandTextColor(theme: EmailTheme): string {
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

  return `<strong style="color:${brandTextColor};font-family:${emailTypography.fontFamily};font-weight:800;white-space:nowrap;">${content}</strong>`;
}

/**
 * Sistema Chegou!
 *
 * Uso exclusivamente explícito.
 * Nunca substitui automaticamente a palavra "chegou" em textos.
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
 * Chegou!
 *
 * Usar somente quando houver intenção clara de marca, por exemplo:
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
 * plataforma Sistema Chegou!
 */
export function renderBrandPlatform({
  theme = "light",
}: EmailBrandProps = {}): string {
  return `plataforma ${renderBrandName({ theme })}`;
}