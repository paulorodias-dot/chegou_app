import { emailColors } from "./colors.ts";

export const emailThemes = {
  light: {
    background:
      emailColors.light.background,

    surface:
      emailColors.light.surface,

    surfaceSecondary:
      emailColors.light.surfaceSecondary,

    surfaceInformation:
      emailColors.light.surfaceInformation,

    textPrimary:
      emailColors.light.textPrimary,

    textSecondary:
      emailColors.light.textSecondary,

    textMuted:
      emailColors.light.textMuted,

    border:
      emailColors.light.border,

    borderInformation:
      emailColors.light.borderInformation,

    divider:
      emailColors.light.divider,

    containerShadow:
      "0 12px 32px rgba(15, 23, 42, 0.08)",

    cardShadow:
      "0 8px 24px rgba(15, 23, 42, 0.06)",

    dividerShadow:
      "0 -8px 20px rgba(15, 23, 42, 0.05)",

    heroCurve:
      emailColors.light.surface,
  },

  dark: {
    background:
      emailColors.dark.background,

    surface:
      emailColors.dark.surface,

    surfaceSecondary:
      emailColors.dark.surfaceSecondary,

    surfaceInformation:
      emailColors.dark.surfaceInformation,

    textPrimary:
      emailColors.dark.textPrimary,

    textSecondary:
      emailColors.dark.textSecondary,

    textMuted:
      emailColors.dark.textMuted,

    border:
      emailColors.dark.border,

    borderInformation:
      emailColors.dark.borderInformation,

    divider:
      emailColors.dark.divider,

    containerShadow:
      "0 18px 50px rgba(0, 0, 0, 0.30)",

    cardShadow:
      "0 8px 24px rgba(0, 0, 0, 0.22)",

    dividerShadow:
      "0 -8px 20px rgba(0, 0, 0, 0.20)",

    heroCurve:
      emailColors.dark.surface,
  },
} as const;