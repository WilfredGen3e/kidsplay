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

/** Avatar: een emoji of (bij een eigen foto) een afbeelding als data-URL. */
export function avatarNode(avatar: string, className = 'avatar'): HTMLElement {
  if (avatar.startsWith('data:')) {
    const img = el('img', `${className} avatar-photo`);
    img.src = avatar;
    img.alt = '';
    img.draggable = false;
    return img;
  }
  return el('span', className, avatar);
}

export function textButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const button = el('button', className, label);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

/** Bevestigingsvenster; geeft true bij bevestigen. */
export function confirmDialog(
  parent: HTMLElement,
  opts: { icon: string; message: string; confirmLabel: string },
): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = el('div', 'dialog-overlay');
    const box = el('div', 'dialog');
    const finish = (value: boolean) => {
      overlay.remove();
      resolve(value);
    };
    box.append(
      el('div', 'dialog-icon', opts.icon),
      el('p', 'dialog-message', opts.message),
      textButton('Annuleren', 'btn', () => finish(false)),
      textButton(opts.confirmLabel, 'btn btn-danger', () => finish(true)),
    );
    overlay.append(box);
    parent.append(overlay);
  });
}
