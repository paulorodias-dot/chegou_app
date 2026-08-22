export const ENTRADA_UI_CONFIG = Object.freeze({
  module: "encomendas",
  page: "entrada",

  layout: Object.freeze({
    queueExpandable: true,
    drawerEnabled: true,
    mobileCardQueue: true,
  }),

  accessibility: Object.freeze({
    escapeClosesDrawer: true,
    keyboardNavigation: true,
    visibleFocus: true,
  }),

  responsive: Object.freeze({
    desktop: 1360,
    notebook: 1120,
    tablet: 900,
    mobile: 680,
    compactMobile: 430,
  }),
});

export default ENTRADA_UI_CONFIG;