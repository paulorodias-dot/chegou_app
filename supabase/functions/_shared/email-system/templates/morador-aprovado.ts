import { renderEmailDocument } from "../components/email-document.ts";
import { renderEmailSenderLabel } from "../components/email-sender-label.ts";
import { createEmailAssetUrl } from "../core/asset-url.ts";

import type {
  EmailRenderResult,
  EmailResidentApprovedData,
} from "../core/email-types.ts";

import {
  escapeHtml,
  escapeHtmlAttribute,
} from "../core/escape-html.ts";

import { normalizeRecipientName } from "../core/formatters.ts";
import { emailColors } from "../tokens/colors.ts";
import { emailThemes } from "../tokens/themes.ts";
import { emailTypography } from "../tokens/typography.ts";

function somenteNumeros(
  value: string | undefined
): string {
  return String(value || "").replace(/\D/g, "");
}

function renderApprovalHero({
  theme,
  logoUrl,
  mascotUrl,
  shieldUrl,
}: {
  theme: "light" | "dark";
  logoUrl: string;
  mascotUrl: string;
  shieldUrl: string;
}): string {
  const selectedTheme = emailThemes[theme];

  const safeLogoUrl =
    escapeHtmlAttribute(logoUrl);

  const safeMascotUrl =
    escapeHtmlAttribute(mascotUrl);

  const safeShieldUrl =
    escapeHtmlAttribute(shieldUrl);

  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      bgcolor="#eef6ff"
      style="
        width:100%;
        margin:0;
        padding:0;
        border-collapse:collapse;
        border-spacing:0;
        background-color:#eef6ff;
      "
    >
      <tr>
        <td
          style="
            height:5px;
            padding:0;
            margin:0;
            background-color:${emailColors.brand.orange};
            line-height:0;
            font-size:0;
          "
        >
          &nbsp;
        </td>
      </tr>

      <tr>
        <td
          align="center"
          style="
            padding:24px 24px 16px;
            text-align:center;
          "
        >
          <img
            src="${safeLogoUrl}"
            width="205"
            alt="Sistema Chegou!"
            border="0"
            style="
              display:block;
              width:205px;
              max-width:100%;
              height:auto;
              margin:0 auto;
              padding:0;
              border:0;
              outline:none;
              text-decoration:none;
              -ms-interpolation-mode:bicubic;
            "
          />
        </td>
      </tr>

      <tr>
        <td
          style="
            padding:6px 30px 28px;
          "
        >
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              width:100%;
              border-collapse:collapse;
              border-spacing:0;
            "
          >
            <tr>
              <td
                width="36%"
                valign="bottom"
                align="center"
                style="
                  width:36%;
                  padding:0 10px 0 0;
                  vertical-align:bottom;
                  text-align:center;
                "
              >
                <img
                  src="${safeMascotUrl}"
                  width="190"
                  alt="Mascote oficial do Sistema Chegou! comemorando a aprovação do cadastro."
                  border="0"
                  style="
                    display:block;
                    width:190px;
                    max-width:100%;
                    height:auto;
                    margin:0 auto;
                    padding:0;
                    border:0;
                    outline:none;
                    text-decoration:none;
                    -ms-interpolation-mode:bicubic;
                  "
                />
              </td>

              <td
                width="14%"
                valign="middle"
                align="center"
                style="
                  width:14%;
                  padding:0 8px;
                  vertical-align:middle;
                  text-align:center;
                "
              >
                <img
                  src="${safeShieldUrl}"
                  width="76"
                  alt=""
                  aria-hidden="true"
                  border="0"
                  style="
                    display:block;
                    width:76px;
                    max-width:100%;
                    height:auto;
                    margin:0 auto;
                    padding:0;
                    border:0;
                    outline:none;
                    text-decoration:none;
                    -ms-interpolation-mode:bicubic;
                  "
                />
              </td>

              <td
                width="50%"
                valign="middle"
                style="
                  width:50%;
                  padding:0 0 0 12px;
                  vertical-align:middle;
                  font-family:${emailTypography.fontFamily};
                "
              >
                <div
                  style="
                    color:${selectedTheme.textPrimary};
                    font-family:${emailTypography.fontFamily};
                    font-size:30px;
                    line-height:35px;
                    font-weight:900;
                    letter-spacing:-0.02em;
                  "
                >
                  Seu cadastro foi

                  <span
                    style="
                      display:block;
                      color:${emailColors.brand.orange};
                    "
                  >
                    aprovado!
                  </span>
                </div>

                <div
                  style="
                    margin-top:12px;
                    color:${emailColors.brand.royalBlue};
                    font-family:${emailTypography.fontFamily};
                    font-size:17px;
                    line-height:25px;
                    font-weight:600;
                  "
                >
                  Seu acesso ao Sistema Chegou<span
                    style="
                      color:${emailColors.brand.orange};
                      font-weight:800;
                    "
                  >!</span>
                  já está liberado.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function renderIntroduction({
  recipientName,
  condominiumName,
  theme,
}: {
  recipientName: string;
  condominiumName: string;
  theme: "light" | "dark";
}): string {
  const selectedTheme = emailThemes[theme];

  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      bgcolor="${selectedTheme.surface}"
      style="
        width:100%;
        border-collapse:collapse;
        background-color:${selectedTheme.surface};
      "
    >
      <tr>
        <td
          class="email-main-content-padding"
          style="
            padding:30px 40px 18px;
            font-family:${emailTypography.fontFamily};
          "
        >
          <h1
            style="
              margin:0 0 18px;
              padding:0;
              color:${selectedTheme.textPrimary};
              font-size:26px;
              line-height:33px;
              font-weight:800;
            "
          >
            Olá,

            <span
              style="
                color:${emailColors.brand.blueAction};
                font-weight:800;
              "
            >
              ${escapeHtml(recipientName)}!
            </span>
          </h1>

          <p
            style="
              margin:0 0 16px;
              padding:0;
              color:${selectedTheme.textSecondary};
              font-size:16px;
              line-height:26px;
              font-weight:400;
            "
          >
            Seu cadastro como morador foi aprovado pelo
            administrativo do

            <strong
              style="
                color:${selectedTheme.textPrimary};
                font-weight:800;
              "
            >
              ${escapeHtml(condominiumName)}
            </strong>.
          </p>

          <p
            style="
              margin:0;
              padding:0;
              color:${selectedTheme.textSecondary};
              font-size:16px;
              line-height:26px;
              font-weight:400;
            "
          >
            Agora você já pode acessar o Sistema Chegou<span
              style="
                color:${emailColors.brand.orange};
                font-weight:800;
              "
            >!</span>,
            acompanhar suas encomendas, consultar informações
            disponíveis para você e utilizar os recursos liberados
            pelo seu condomínio.
          </p>
        </td>
      </tr>
    </table>
  `;
}

function renderDataRow({
  iconUrl,
  label,
  value,
  theme,
}: {
  iconUrl: string;
  label: string;
  value: string;
  theme: "light" | "dark";
}): string {
  const selectedTheme = emailThemes[theme];

  return `
    <tr>
      <td
        width="28"
        valign="middle"
        align="center"
        style="
          width:28px;
          padding:5px 8px 5px 0;
          text-align:center;
          vertical-align:middle;
        "
      >
        <img
          src="${escapeHtmlAttribute(iconUrl)}"
          width="20"
          height="20"
          alt=""
          aria-hidden="true"
          border="0"
          style="
            display:block;
            width:20px;
            height:20px;
            margin:0 auto;
            padding:0;
            border:0;
            outline:none;
            text-decoration:none;
            -ms-interpolation-mode:bicubic;
          "
        />
      </td>

      <td
        width="100"
        valign="middle"
        style="
          width:100px;
          padding:5px 10px 5px 0;
          color:${emailColors.brand.royalBlue};
          font-family:${emailTypography.fontFamily};
          font-size:13px;
          line-height:20px;
          font-weight:800;
          vertical-align:middle;
        "
      >
        ${escapeHtml(label)}
      </td>

      <td
        valign="middle"
        style="
          padding:5px 0;
          color:${selectedTheme.textSecondary};
          font-family:${emailTypography.fontFamily};
          font-size:13px;
          line-height:20px;
          font-weight:500;
          vertical-align:middle;
          word-break:break-word;
        "
      >
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}

function renderAccessCard({
  data,
  condominiumIconUrl,
  emailIconUrl,
  phoneIconUrl,
  verifiedIconUrl,
}: {
  data: EmailResidentApprovedData;
  condominiumIconUrl: string;
  emailIconUrl: string;
  phoneIconUrl: string;
  verifiedIconUrl: string;
}): string {
  const selectedTheme =
    emailThemes[data.theme];

  const phone =
    String(
      data.recipientPhone || ""
    ).trim();

  const accessTitle =
    data.accessMode === "existing"
      ? "Seu perfil foi vinculado com sucesso"
      : "Seu acesso está liberado";

  const accessDescription =
    data.accessMode === "existing"
      ? "Use o mesmo e-mail e senha que você já utiliza para acessar o sistema."
      : "Use o seu e-mail e a senha que você definiu durante o cadastro para acessar o sistema.";

  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      bgcolor="${selectedTheme.surface}"
      style="
        width:100%;
        border-collapse:collapse;
        background-color:${selectedTheme.surface};
      "
    >
      <tr>
        <td
          class="email-section-horizontal-padding"
          style="
            padding:8px 40px 26px;
          "
        >
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            bgcolor="#f7fbff"
            style="
              width:100%;
              border-collapse:separate;
              border-spacing:0;
              background-color:#f7fbff;
              border:1px solid #bfdbfe;
              border-radius:16px;
            "
          >
            <tr>
              <td
                class="approval-card-icon-column"
                width="118"
                valign="top"
                align="center"
                style="
                  width:118px;
                  padding:24px 18px;
                  vertical-align:top;
                  text-align:center;
                "
              >
                <table
                  role="presentation"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  align="center"
                  style="
                    margin:0 auto;
                    border-collapse:collapse;
                  "
                >
                  <tr>
                    <td
                      align="center"
                      valign="middle"
                      width="72"
                      height="72"
                      bgcolor="#e0efff"
                      style="
                        width:72px;
                        height:72px;
                        border-radius:50%;
                        background-color:#e0efff;
                        text-align:center;
                        vertical-align:middle;
                      "
                    >
                      <img
                        src="${escapeHtmlAttribute(
                          condominiumIconUrl
                        )}"
                        width="38"
                        height="38"
                        alt=""
                        aria-hidden="true"
                        border="0"
                        style="
                          display:block;
                          width:38px;
                          height:38px;
                          margin:0 auto;
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

              <td
                width="1"
                bgcolor="#93c5fd"
                style="
                  width:1px;
                  padding:0;
                  background-color:#93c5fd;
                  font-size:0;
                  line-height:0;
                "
              >
                &nbsp;
              </td>

              <td
                class="approval-card-content-column"
                valign="top"
                style="
                  padding:22px 22px 22px 20px;
                  vertical-align:top;
                  font-family:${emailTypography.fontFamily};
                "
              >
                <div
                  style="
                    margin:0 0 10px;
                    color:${emailColors.brand.royalBlue};
                    font-size:19px;
                    line-height:25px;
                    font-weight:800;
                  "
                >
                  Seus dados de acesso
                </div>

                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    width:100%;
                    border-collapse:collapse;
                  "
                >
                  ${renderDataRow({
                    iconUrl:
                      condominiumIconUrl,
                    label:
                      "Condomínio:",
                    value:
                      data.condominiumName,
                    theme:
                      data.theme,
                  })}

                  ${renderDataRow({
                    iconUrl:
                      emailIconUrl,
                    label:
                      "E-mail:",
                    value:
                      data.recipientEmail,
                    theme:
                      data.theme,
                  })}

                  ${
                    phone
                      ? renderDataRow({
                          iconUrl:
                            phoneIconUrl,
                          label:
                            "Telefone:",
                          value:
                            phone,
                          theme:
                            data.theme,
                        })
                      : ""
                  }
                </table>

                <div
                  style="
                    height:1px;
                    margin:13px 0 14px;
                    background-color:#bfdbfe;
                    font-size:0;
                    line-height:0;
                  "
                >
                  &nbsp;
                </div>

                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  bgcolor="#e9f4ff"
                  style="
                    width:100%;
                    border-collapse:separate;
                    border-spacing:0;
                    background-color:#e9f4ff;
                    border-radius:11px;
                  "
                >
                  <tr>
                    <td
                      width="48"
                      valign="middle"
                      align="center"
                      style="
                        width:48px;
                        padding:11px 6px 11px 12px;
                        text-align:center;
                        vertical-align:middle;
                      "
                    >
                      <img
                        src="${escapeHtmlAttribute(
                          verifiedIconUrl
                        )}"
                        width="27"
                        height="27"
                        alt=""
                        aria-hidden="true"
                        border="0"
                        style="
                          display:block;
                          width:27px;
                          height:27px;
                          margin:0 auto;
                          padding:0;
                          border:0;
                          outline:none;
                          text-decoration:none;
                          -ms-interpolation-mode:bicubic;
                        "
                      />
                    </td>

                    <td
                      valign="middle"
                      style="
                        padding:11px 14px 11px 4px;
                        vertical-align:middle;
                        font-family:${emailTypography.fontFamily};
                      "
                    >
                      <div
                        style="
                          margin:0 0 3px;
                          color:${emailColors.brand.blueAction};
                          font-size:13px;
                          line-height:19px;
                          font-weight:800;
                        "
                      >
                        ${escapeHtml(
                          accessTitle
                        )}
                      </div>

                      <div
                        style="
                          margin:0;
                          color:#475569;
                          font-size:12px;
                          line-height:18px;
                          font-weight:500;
                        "
                      >
                        ${escapeHtml(
                          accessDescription
                        )}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function renderLoginAction({
  loginUrl,
  theme,
}: {
  loginUrl: string;
  theme: "light" | "dark";
}): string {
  const selectedTheme =
    emailThemes[theme];

  const safeUrl =
    escapeHtmlAttribute(loginUrl);

  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      bgcolor="${selectedTheme.surface}"
      style="
        width:100%;
        border-collapse:collapse;
        background-color:${selectedTheme.surface};
      "
    >
      <tr>
        <td
          align="center"
          style="
            padding:10px 40px 30px;
            text-align:center;
            font-family:${emailTypography.fontFamily};
          "
        >
          <div
            style="
              color:${emailColors.brand.royalBlue};
              font-size:22px;
              line-height:28px;
              font-weight:800;
            "
          >
            Acesse o Sistema Chegou<span
              style="
                color:${emailColors.brand.orange};
              "
            >!</span>
          </div>

          <div
            style="
              margin-top:6px;
              color:${selectedTheme.textSecondary};
              font-size:14px;
              line-height:22px;
            "
          >
            Seu acesso já está disponível.
          </div>

          <table
            role="presentation"
            cellpadding="0"
            cellspacing="0"
            border="0"
            align="center"
            style="
              margin:22px auto 16px;
            "
          >
            <tr>
              <td
                align="center"
                bgcolor="${emailColors.brand.orange}"
                style="
                  border-radius:12px;
                  background-color:${emailColors.brand.orange};
                "
              >
                <a
                  href="${safeUrl}"
                  target="_blank"
                  style="
                    display:inline-block;
                    padding:15px 30px;
                    color:#ffffff;
                    font-family:${emailTypography.fontFamily};
                    font-size:16px;
                    line-height:20px;
                    font-weight:800;
                    text-decoration:none;
                  "
                >
                  Acessar o Sistema Chegou!
                </a>
              </td>
            </tr>
          </table>

          <div
            style="
              color:${selectedTheme.textSecondary};
              font-size:12px;
              line-height:20px;
            "
          >
            Caso prefira, acesse diretamente:
          </div>

          <div
            style="
              margin-top:5px;
              font-size:13px;
              line-height:20px;
              word-break:break-all;
            "
          >
            <a
              href="${safeUrl}"
              target="_blank"
              style="
                color:${emailColors.brand.blueAction};
                text-decoration:none;
                font-weight:700;
              "
            >
              ${escapeHtml(loginUrl)}
            </a>
          </div>
        </td>
      </tr>
    </table>
  `;
}

function renderCondominiumHelp({
  email,
  whatsapp,
  theme,
}: {
  email?: string;
  whatsapp?: string;
  theme: "light" | "dark";
}): string {
  const helpEmail =
    String(email || "").trim();

  const helpWhatsapp =
    String(whatsapp || "").trim();

  if (!helpEmail && !helpWhatsapp) {
    return "";
  }

  const selectedTheme =
    emailThemes[theme];

  const digits =
    somenteNumeros(helpWhatsapp);

  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      bgcolor="${selectedTheme.surface}"
      style="
        width:100%;
        border-collapse:collapse;
        background-color:${selectedTheme.surface};
      "
    >
      <tr>
        <td
          class="email-section-horizontal-padding"
          style="
            padding:0 40px 28px;
          "
        >
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            bgcolor="#fff9f5"
            style="
              width:100%;
              border-collapse:separate;
              border-spacing:0;
              border:1px solid #fed7aa;
              border-radius:14px;
              background-color:#fff9f5;
            "
          >
            <tr>
              <td
                style="
                  padding:18px 20px;
                  font-family:${emailTypography.fontFamily};
                "
              >
                <div
                  style="
                    color:#0f172a;
                    font-size:17px;
                    line-height:23px;
                    font-weight:800;
                  "
                >
                  Precisa de ajuda?
                </div>

                <div
                  style="
                    margin-top:5px;
                    color:#475569;
                    font-size:13px;
                    line-height:20px;
                  "
                >
                  Entre em contato com o administrativo do seu condomínio.
                </div>

                ${
                  helpEmail
                    ? `
                      <div
                        style="
                          margin-top:10px;
                        "
                      >
                        <a
                          href="${escapeHtmlAttribute(
                            `mailto:${helpEmail}`
                          )}"
                          style="
                            color:${emailColors.brand.royalBlue};
                            font-size:13px;
                            font-weight:700;
                            text-decoration:none;
                          "
                        >
                          ${escapeHtml(
                            helpEmail
                          )}
                        </a>
                      </div>
                    `
                    : ""
                }

                ${
                  helpWhatsapp && digits
                    ? `
                      <div
                        style="
                          margin-top:6px;
                        "
                      >
                        <a
                          href="${escapeHtmlAttribute(
                            `https://wa.me/${digits}`
                          )}"
                          target="_blank"
                          style="
                            color:#15803d;
                            font-size:13px;
                            font-weight:700;
                            text-decoration:none;
                          "
                        >
                          ${escapeHtml(
                            helpWhatsapp
                          )}
                        </a>
                      </div>
                    `
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function renderInstitutionalFooter({
  data,
  instagramIconUrl,
  whatsappIconUrl,
}: {
  data: EmailResidentApprovedData;
  instagramIconUrl: string;
  whatsappIconUrl: string;
}): string {
  const selectedTheme =
    emailThemes[data.theme];

  const instagramUrl =
    data.systemInstagramUrl ||
    "https://instagram.com/sistemachegou";

  const whatsappUrl =
    data.systemWhatsappUrl ||
    "https://wa.me/5511922106522";

  const siteUrl =
    data.systemSiteUrl ||
    "https://sistemachegou.com.br";

  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      bgcolor="${selectedTheme.surfaceSecondary}"
      style="
        width:100%;
        border-collapse:collapse;
        background-color:${selectedTheme.surfaceSecondary};
        border-top:1px solid ${selectedTheme.border};
      "
    >
      <tr>
        <td
          align="center"
          style="
            padding:24px 24px 12px;
            text-align:center;
            font-family:${emailTypography.fontFamily};
          "
        >
          <table
            role="presentation"
            cellpadding="0"
            cellspacing="0"
            border="0"
            align="center"
            style="
              margin:0 auto;
              border-collapse:collapse;
            "
          >
            <tr>
              <td
                align="center"
                style="
                  padding:0 8px;
                "
              >
                <a
                  href="${escapeHtmlAttribute(
                    instagramUrl
                  )}"
                  target="_blank"
                  aria-label="Instagram do Sistema Chegou!"
                  style="
                    display:inline-block;
                    text-decoration:none;
                  "
                >
                  <img
                    src="${escapeHtmlAttribute(
                      instagramIconUrl
                    )}"
                    width="30"
                    height="30"
                    alt="Instagram"
                    border="0"
                    style="
                      display:block;
                      width:30px;
                      height:30px;
                      margin:0;
                      padding:0;
                      border:0;
                      outline:none;
                      text-decoration:none;
                      -ms-interpolation-mode:bicubic;
                    "
                  />
                </a>
              </td>

              <td
                align="center"
                style="
                  padding:0 8px;
                "
              >
                <a
                  href="${escapeHtmlAttribute(
                    whatsappUrl
                  )}"
                  target="_blank"
                  aria-label="WhatsApp do Sistema Chegou!"
                  style="
                    display:inline-block;
                    text-decoration:none;
                  "
                >
                  <img
                    src="${escapeHtmlAttribute(
                      whatsappIconUrl
                    )}"
                    width="30"
                    height="30"
                    alt="WhatsApp"
                    border="0"
                    style="
                      display:block;
                      width:30px;
                      height:30px;
                      margin:0;
                      padding:0;
                      border:0;
                      outline:none;
                      text-decoration:none;
                      -ms-interpolation-mode:bicubic;
                    "
                  />
                </a>
              </td>
            </tr>
          </table>

          <div
            style="
              margin-top:12px;
              font-size:13px;
              line-height:20px;
            "
          >
            <a
              href="${escapeHtmlAttribute(
                siteUrl
              )}"
              target="_blank"
              style="
                color:${emailColors.brand.blueAction};
                text-decoration:none;
                font-weight:700;
              "
            >
              ${escapeHtml(siteUrl)}
            </a>
          </div>
        </td>
      </tr>

      <tr>
        <td
          align="center"
          style="
            padding:8px 28px 24px;
            color:${selectedTheme.textSecondary};
            font-family:${emailTypography.fontFamily};
            font-size:11px;
            line-height:18px;
            text-align:center;
          "
        >
          Este e-mail foi enviado automaticamente pelo
          Sistema Chegou<span
            style="
              color:${emailColors.brand.orange};
              font-weight:800;
            "
          >!</span>.
          Por favor, não responda a esta mensagem.

          <br />

          Esta caixa de e-mail não é monitorada.

          <br /><br />

          © ${data.currentYear} Sistema Chegou<span
            style="
              color:${emailColors.brand.orange};
              font-weight:800;
            "
          >!</span>.
          Todos os direitos reservados.
        </td>
      </tr>
    </table>
  `;
}

export function renderMoradorAprovadoEmail(
  data: EmailResidentApprovedData
): EmailRenderResult {
  const recipientName =
    normalizeRecipientName(
      data.recipientName,
      "Morador"
    );

  const logoUrl =
    createEmailAssetUrl(
      data.assets,
      "brand/logo_azulroyal.png"
    );

  const mascotUrl =
    createEmailAssetUrl(
      data.assets,
      "morador-aprovado/mascot-morador-aprovado.png"
    );

  const shieldUrl =
    createEmailAssetUrl(
      data.assets,
      "morador-aprovado/shield-morador-aprovado.png"
    );

  const condominiumIconUrl =
    createEmailAssetUrl(
      data.assets,
      "icons/condominium.png"
    );

  const emailIconUrl =
    createEmailAssetUrl(
      data.assets,
      "icons/email.png"
    );

  const phoneIconUrl =
    createEmailAssetUrl(
      data.assets,
      "icons/phone.png"
    );

  const verifiedIconUrl =
    createEmailAssetUrl(
      data.assets,
      "icons/verified.png"
    );

  const instagramIconUrl =
    createEmailAssetUrl(
      data.assets,
      "social/instagram.png"
    );

  const whatsappIconUrl =
    createEmailAssetUrl(
      data.assets,
      "social/whatsapp.png"
    );

  const content = `
    ${renderApprovalHero({
      theme: data.theme,
      logoUrl,
      mascotUrl,
      shieldUrl,
    })}

    ${renderIntroduction({
      recipientName,
      condominiumName:
        data.condominiumName,
      theme: data.theme,
    })}

    ${renderAccessCard({
      data: {
        ...data,
        recipientName,
      },
      condominiumIconUrl,
      emailIconUrl,
      phoneIconUrl,
      verifiedIconUrl,
    })}

    ${renderLoginAction({
      loginUrl:
        data.loginUrl,
      theme:
        data.theme,
    })}

    ${renderCondominiumHelp({
      email:
        data.condominiumHelpEmail,
      whatsapp:
        data.condominiumHelpWhatsapp,
      theme:
        data.theme,
    })}

    ${renderInstitutionalFooter({
      data,
      instagramIconUrl,
      whatsappIconUrl,
    })}
  `;

  const subject =
    "Seu cadastro foi aprovado no Sistema Chegou!";

  const preheader =
    `Seu cadastro no ${data.condominiumName} foi aprovado e seu acesso já está liberado.`;

  const html =
    renderEmailDocument({
      title: subject,
      preheader,
      theme: data.theme,

      senderLabel:
        renderEmailSenderLabel({
          theme: data.theme,
        }),

      content,
    });

  const text = [
    `Olá, ${recipientName}!`,
    "",
    `Seu cadastro como morador foi aprovado pelo administrativo do ${data.condominiumName}.`,
    "",
    "Seu acesso ao Sistema Chegou! já está liberado.",
    "",
    `Condomínio: ${data.condominiumName}`,
    `E-mail: ${data.recipientEmail}`,

    data.recipientPhone
      ? `Telefone: ${data.recipientPhone}`
      : "",

    "",

    data.accessMode === "existing"
      ? "Seu cadastro neste condomínio foi aprovado. Use o mesmo e-mail e senha que você já utiliza para acessar o Sistema Chegou!."
      : "Seu acesso está liberado. Use o seu e-mail e a senha definida durante o cadastro para acessar o Sistema Chegou!.",

    "",
    "Acesse o Sistema Chegou!:",
    data.loginUrl,
    "",

    data.condominiumHelpEmail ||
    data.condominiumHelpWhatsapp
      ? "Precisa de ajuda? Entre em contato com o administrativo do seu condomínio."
      : "",

    data.condominiumHelpEmail
      ? `E-mail do condomínio: ${data.condominiumHelpEmail}`
      : "",

    data.condominiumHelpWhatsapp
      ? `WhatsApp do condomínio: ${data.condominiumHelpWhatsapp}`
      : "",

    "",
    "Instagram: https://instagram.com/sistemachegou",
    "WhatsApp Sistema Chegou!: +55 (11) 92210-6522",
    "Site: https://sistemachegou.com.br",
    "",
    "Este e-mail foi enviado automaticamente pelo Sistema Chegou!. Por favor, não responda a esta mensagem.",
    "Esta caixa de e-mail não é monitorada.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    templateId:
      data.templateId,

    subject,
    preheader,
    html,
    text,
  };
}