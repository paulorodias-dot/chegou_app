import { escapeHtml } from "../core/escape-html";

export function renderEmailPreheader(text: string): string {
  const safeText = escapeHtml(text);

  return `
    <div
      style="
        display:none;
        max-height:0;
        max-width:0;
        overflow:hidden;
        opacity:0;
        color:transparent;
        line-height:1px;
        font-size:1px;
        mso-hide:all;
      "
      aria-hidden="true"
    >
      ${safeText}
      &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
      &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
    </div>
  `;
}