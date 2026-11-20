// Tiny element builder. Text is always added as text nodes (never as HTML),
// so question content can't inject markup.
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c);
  }
  return node;
}

// Replaces a container's content, skipping null/false entries
// (Element.replaceChildren would print them as the text "null").
export function mount(container, ...children) {
  container.replaceChildren(...children.flat().filter((c) => c != null && c !== false));
}
