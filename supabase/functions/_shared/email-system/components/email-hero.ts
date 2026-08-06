import { escapeHtmlAttribute } from "../core/escape-html.ts";
import { emailColors } from "../tokens/colors.ts";
import { emailTypography } from "../tokens/typography.ts";

export type EmailHeroVariant =
  | "default"
  | "password-recovery";

export interface EmailHeroProps {
  logoUrl: string;
  mascotUrl: string;
  curveUrl?: string;
  logoAlt?: string;
  mascotAlt?: string;
  variant?: EmailHeroVariant;
}

export function renderEmailHero({
  logoUrl,
  mascotUrl,
  curveUrl,
  logoAlt = "Sistema Chegou! — Gestão Inteligente da sua Encomenda",
  mascotAlt = "",
  variant = "default",
}: EmailHeroProps): string {
  const safeLogoUrl = escapeHtmlAttribute(logoUrl);
  const safeMascotUrl = escapeHtmlAttribute(mascotUrl);

  const safeCurveUrl = curveUrl
    ? escapeHtmlAttribute(curveUrl)
    : null;

  const safeLogoAlt = escapeHtmlAttribute(logoAlt);
  const safeMascotAlt = escapeHtmlAttribute(mascotAlt);

  const variantClass =
    variant === "password-recovery"
      ? "email-hero--password-recovery"
      : "email-hero--default";

  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      class="email-hero ${variantClass}"
      style="
        width:100%;
        margin:0;
        padding:0;
        border-collapse:collapse;
        border-spacing:0;
        background-color:${emailColors.brand.royalBlue};
      "
      bgcolor="${emailColors.brand.royalBlue}"
    >
      <tr>
        <td
          class="email-hero-content"
          height="220"
          valign="middle"
          style="
            height:220px;
            padding:0 28px 0 40px;
            overflow:hidden;
            vertical-align:middle;
            background-color:${emailColors.brand.royalBlue};
            background-image:linear-gradient(
              135deg,
              ${emailColors.brand.royalBlue} 0%,
              ${emailColors.brand.royalBlueDark} 100%
            );
          "
          bgcolor="${emailColors.brand.royalBlue}"
        >
          <table
            role="presentation"
            width="100%"
            height="220"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width:100%;
              height:220px;
              margin:0;
              padding:0;
              border-collapse:collapse;
              border-spacing:0;
            "
          >
            <tr class="email-hero-row">
              <td
                class="email-hero-logo-cell"
                width="52%"
                height="220"
                valign="middle"
                align="left"
                style="
                  width:52%;
                  height:220px;
                  padding:0 20px 0 0;
                  vertical-align:middle;
                  text-align:left;
                "
              >
                <img
                  class="email-hero-logo"
                  src="${safeLogoUrl}"
                  width="220"
                  alt="${safeLogoAlt}"
                  border="0"
                  style="
                    display:block;
                    width:220px;
                    max-width:100%;
                    height:auto;
                    margin:0;
                    padding:0;
                    border:0;
                    outline:none;
                    text-decoration:none;
                    font-family:${emailTypography.fontFamily};
                    font-size:16px;
                    line-height:20px;
                    color:${emailColors.brand.white};
                    -ms-interpolation-mode:bicubic;
                  "
                />
              </td>

              <td
                class="email-hero-mascot-cell"
                width="48%"
                height="220"
                valign="bottom"
                align="right"
                style="
                  width:48%;
                  height:220px;
                  padding:0;
                  overflow:hidden;
                  vertical-align:bottom;
                  text-align:right;
                  line-height:0;
                  font-size:0;
                "
              >
                <img
                  class="email-hero-mascot"
                  src="${safeMascotUrl}"
                  width="270"
                  alt="${safeMascotAlt}"
                  border="0"
                  style="
                    display:block;
                    width:270px;
                    max-width:none;
                    height:auto;
                    margin:0 -4px -155px auto;
                    padding:0;
                    border:0;
                    outline:none;
                    text-decoration:none;
                    -ms-interpolation-mode:bicubic;
                  "
                />
              </td>
            </tr>
          </table>
        </td>
      </tr>

      ${
        safeCurveUrl
          ? `
            <tr>
              <td
                class="email-hero-curve-cell"
                valign="top"
                style="
                  padding:0;
                  margin:0;
                  vertical-align:top;
                  line-height:0;
                  font-size:0;
                  background-color:${emailColors.brand.royalBlue};
                "
                bgcolor="${emailColors.brand.royalBlue}"
              >
                <img
                  class="email-hero-curve"
                  src="${safeCurveUrl}"
                  width="640"
                  alt=""
                  border="0"
                  aria-hidden="true"
                  style="
                    display:block;
                    width:100%;
                    max-width:640px;
                    height:auto;
                    margin:0;
                    padding:0;
                    border:0;
                    outline:none;
                    text-decoration:none;
                    -ms-interpolation-mode:bicubic;
                  "
                />
              </td>
            </tr>
          `
          : ""
      }
    </table>
  `;
}