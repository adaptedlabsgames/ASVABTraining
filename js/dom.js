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
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c);
  }
  return node;
}

// Replaces a container's content, skipping null/false entries
// (Element.replaceChildren would print them as the text "null").
export function mount(container, ...children) {
  container.replaceChildren(...children.flat(Infinity).filter((c) => c != null && c !== false));
}

// A question's diagram, if it has one. The image sits on a white panel
// so its dark lines read the same in light and dark mode.
export function figure(q) {
  if (!q.figure) return null;
  return el('figure', { class: 'q-figure' },
    el('img', { src: q.figure, alt: q.figureAlt || 'Diagram for this question', loading: 'lazy', decoding: 'async' }));
}

// Answer choices can be text or pictures (q.choiceImages, with q.choices
// holding each picture's text description).
export function choiceBody(q, i) {
  if (q.choiceImages) {
    return el('img', { class: 'choice-img', src: q.choiceImages[i], alt: q.choices[i], loading: 'lazy', decoding: 'async' });
  }
  return el('span', { class: 'text' }, q.choices[i]);
}

export function choiceListClass(q) {
  return q.choiceImages ? 'choices image-choices' : 'choices';
}

// A choice as shown in review lists: a small picture, or the text.
export function answerBody(q, i, color) {
  if (q.choiceImages) {
    return el('img', { class: 'answer-img', src: q.choiceImages[i], alt: q.choices[i], style: `border-color:${color}` });
  }
  return el('span', { style: `color:${color}` }, q.choices[i]);
}
