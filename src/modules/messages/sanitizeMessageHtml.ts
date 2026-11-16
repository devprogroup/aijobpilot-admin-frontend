// Copy of client-frontend/src/modules/messages/sanitizeMessageHtml.ts (minus the preview helper, plus messageHasText), so the
// inbox renders replies the way the user sees them.
const ALLOWED_TAGS = new Set([
  "A", "B", "BLOCKQUOTE", "BR", "CODE", "DIV", "EM", "H1", "H2", "H3", "H4", "H5", "H6",
  "HR", "I", "LI", "OL", "P", "PRE", "S", "SPAN", "STRONG", "U", "UL",
]);

/** Keeps basic message formatting while stripping scripts, embeds, and unsafe links. */
export function sanitizeMessageHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.querySelectorAll("script,style,iframe,object,embed,form,svg,math,template").forEach((element) => element.remove());

  parsed.body.querySelectorAll("*").forEach((element) => {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    for (const attribute of [...element.attributes]) {
      if (element.tagName === "A" && ["href", "title", "target"].includes(attribute.name.toLowerCase())) {
        if (attribute.name.toLowerCase() === "href") {
          try {
            const protocol = new URL(attribute.value, window.location.origin).protocol;
            if (!["http:", "https:", "mailto:"].includes(protocol)) element.removeAttribute(attribute.name);
          } catch {
            element.removeAttribute(attribute.name);
          }
        }
        continue;
      }
      element.removeAttribute(attribute.name);
    }

    if (element.tagName === "A" && element.getAttribute("target") === "_blank") {
      element.setAttribute("rel", "noopener noreferrer");
    }
  });

  preserveLineBreaks(parsed.body);
  return parsed.body.innerHTML;
}

/**
 * Messages are often plain text typed with Enter (support replies), which HTML would run together
 * on one line: each newline inside text becomes a <br>. Whitespace-only text between HTML blocks
 * ("<p>a</p>\n<p>b</p>") is left alone, so formatted messages get no extra gaps, and <pre> keeps
 * its own newlines.
 */
function preserveLineBreaks(root: HTMLElement) {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) textNodes.push(node as Text);

  for (const node of textNodes) {
    const text = node.data.replace(/\r\n?/g, "\n");
    if (!text.includes("\n") || !text.trim() || node.parentElement?.closest("pre")) continue;
    const parts = text.split("\n");
    const replacement = parts.flatMap((part, index) => [
      ...(index > 0 ? [root.ownerDocument.createElement("br")] : []),
      ...(part ? [root.ownerDocument.createTextNode(part)] : []),
    ]);
    node.replaceWith(...replacement);
  }
}


/** False for an emptied rich text editor, which still leaves markup such as "<br>" or "<p></p>" behind. */
export function messageHasText(html: string): boolean {
  return (new DOMParser().parseFromString(html, "text/html").body.textContent ?? "").trim().length > 0;
}

/** admin-backend's limit on message and reply content (the HTML, not just the visible text). */
export const MAX_CONTENT_LENGTH = 10000;
