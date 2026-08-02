import { emailColors } from "./colors";
import { emailShadows } from "./shadows";

export const emailThemes = {
  light: {
    background: emailColors.light.background,
    surface: emailColors.light.surface,
    surfaceSecondary: emailColors.light.surfaceSecondary,
    surfaceInformation: emailColors.light.surfaceInformation,

    textPrimary: emailColors.light.textPrimary,
    textSecondary: emailColors.light.textSecondary,
    textMuted: emailColors.light.textMuted,

    border: emailColors.light.border,
    borderInformation: emailColors.light.borderInformation,
    divider: emailColors.light.divider,

    containerShadow: emailShadows.containerLight,
    cardShadow: emailShadows.cardLight,
    dividerShadow: emailShadows.dividerLight,

    heroCurve: emailColors.light.surface,
  },

  dark: {
    background: emailColors.dark.background,
    surface: emailColors.dark.surface,
    surfaceSecondary: emailColors.dark.surfaceSecondary,
    surfaceInformation: emailColors.dark.surfaceInformation,

    textPrimary: emailColors.dark.textPrimary,
    textSecondary: emailColors.dark.textSecondary,
    textMuted: emailColors.dark.textMuted,

    border: emailColors.dark.border,
    borderInformation: emailColors.dark.borderInformation,
    divider: emailColors.dark.divider,

    containerShadow: emailShadows.containerDark,
    cardShadow: emailShadows.cardDark,
    dividerShadow: emailShadows.dividerDark,

    heroCurve: emailColors.dark.surface,
  },
} as const;