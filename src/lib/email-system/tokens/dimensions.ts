export const emailDimensions = {
  container: {
    master: 640,
    externalMaximum: 680,
    tabletHorizontal: 600,
    tabletVertical: 560,
  },

  hero: {
    desktopHeight: 220,
    tabletHorizontalHeight: 210,
    tabletVerticalHeight: 200,
    mobileMinimumHeight: 230,
    mobileMaximumHeight: 260,

    desktopLogoWidth: 240,
    tabletLogoWidth: 220,
    mobileLogoWidth: 185,

    desktopMascotWidth: 300,
    tabletHorizontalMascotWidth: 260,
    tabletVerticalMascotWidth: 230,
    mobileMascotWidth: 195,
  },

  button: {
    minimumHeight: 52,
    recommendedHeight: 54,
    desktopMinimumWidth: 220,
  },

  mainIllustration: {
    desktopWidth: 124,
    tabletWidth: 108,
    mobileWidth: 96,
  },

  welcomeMascot: {
    desktopWidth: 155,
    tabletWidth: 138,
    mobileWidth: 122,
  },

  footerLogo: {
    desktopWidth: 185,
    tabletWidth: 175,
    mobileWidth: 160,
  },

  interaction: {
    minimumTouchTarget: 44,
  },
} as const;