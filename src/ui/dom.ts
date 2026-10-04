export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Ronde of vierkante knop met een icoon; tekst is alleen een aanvulling (aria-label). */
export function iconButton(icon: string, label: string, className: string, onClick: () => void) {
  const button = el('button', className, icon);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onClick);
  return button;
}
