import { el, textButton } from '../../ui/dom';
import { ASPECTS, clampView, coverScale, cropFromView, zoomAround, type AspectName, type View } from './crop';
import { cropAndScale, loadImage } from './image';

/** Afbeelding van het klembord via de plakknop; gooit als er geen toestemming of geen afbeelding is. */
export async function readClipboardImage(): Promise<Blob | undefined> {
  for (const item of await navigator.clipboard.read()) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (type) return item.getType(type);
  }
  return undefined;
}

export const NO_IMAGE_ON_CLIPBOARD =
  'Er zit geen foto op het klembord. Kopieer eerst een foto (houd je vinger op de foto of klik met de rechtermuisknop → Kopieer).';

export interface Cropper {
  element: HTMLElement;
  /** Gebruik deze foto (bijvoorbeeld van het klembord) alsof hij gekozen was. */
  load(image: Blob): Promise<void>;
  /** Toon een melding boven de uitsnede. */
  notice(text: string): void;
  hasImage(): boolean;
  /** De gekozen uitsnede, verkleind (volwassenen: hogere resolutie); alleen na `hasImage()`. */
  result(adult?: boolean): HTMLCanvasElement;
}

/** Foto kiezen (klik of slepen) en uitsnijden met slepen en zoomen; gedeeld door de app en de beheerconsole. */
export function createCropper(onFile?: (fileName: string) => void): Cropper {
  let img: HTMLImageElement | undefined;
  let aspect: AspectName = 'liggend';
  let view: View = { scale: 1, x: 0, y: 0 };
  let frame = { width: 560, height: 420 };
  const root = el('div', 'cropper');
  const cropArea = el('div', 'crop-area');
  const message = el('p', 'muted');
  const imageUrls = new WeakMap<HTMLImageElement, string>();

  const drop = el('label', 'dropzone');
  drop.append(el('span', 'dropzone-icon', '📷'), el('span', '', 'Sleep een foto hierheen of klik om te kiezen (JPG, PNG, HEIC)'));
  const input = el('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png';
  input.hidden = true;
  drop.append(input);
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('over');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('over');
    const file = e.dataTransfer?.files[0];
    if (file) void useFile(file);
  });
  input.addEventListener('change', () => {
    if (input.files?.[0]) void useFile(input.files[0]);
  });

  // Plakken: een contenteditable vak geeft de browser een "Plakken" in het rechtermuismenu;
  // Ctrl/⌘+V werkt overal op de pagina (behalve in tekstvelden, daar blijft tekst plakken gewoon).
  const pasteBox = el('div', 'paste-box');
  pasteBox.contentEditable = 'true';
  pasteBox.spellcheck = false;
  pasteBox.setAttribute('role', 'textbox');
  pasteBox.setAttribute('aria-label', 'Plak hier een gekopieerde foto');
  const pasteHint = 'Of klik hier en kies rechtermuisknop → Plakken (of Ctrl/⌘+V, of op de iPad: vinger ingedrukt houden → Plakken).';
  pasteBox.dataset.hint = pasteHint;
  pasteBox.addEventListener('beforeinput', (e) => {
    if (e.inputType !== 'insertFromPaste') e.preventDefault();
  });
  pasteBox.addEventListener('paste', (e) => {
    e.preventDefault();
    if (!pasteImage(e)) message.textContent = NO_IMAGE_ON_CLIPBOARD;
  });
  // Een plak die toch als tekst of HTML binnenkomt mag het vak niet vullen.
  pasteBox.addEventListener('input', () => pasteBox.replaceChildren());

  const onDocumentPaste = (e: ClipboardEvent) => {
    if (!root.isConnected) return document.removeEventListener('paste', onDocumentPaste);
    const target = e.target;
    const inTextField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    if (!inTextField && target !== pasteBox && pasteImage(e)) e.preventDefault();
  };
  document.addEventListener('paste', onDocumentPaste);

  /** Pakt de eerste afbeelding van het klembord; geeft false als er geen is. */
  function pasteImage(e: ClipboardEvent): boolean {
    const files = [...(e.clipboardData?.files ?? [])];
    const image = files.find((f) => f.type.startsWith('image/'));
    if (!image) return false;
    void useFile(image, '');
    return true;
  }

  // Eén tik: leest het klembord (iPad/Safari toont daarbij zelf een "Plakken"-balkje).
  const pasteButton = textButton('📋 Foto plakken', 'btn btn-primary btn-big', async () => {
    message.textContent = '';
    try {
      const image = await readClipboardImage();
      if (image) return void (await useFile(image, ''));
      message.textContent = NO_IMAGE_ON_CLIPBOARD;
    } catch {
      // Geen toestemming of geen ondersteuning: het plakvak eronder werkt altijd.
      pasteBox.focus();
      message.textContent = 'Plakken met de knop lukt hier niet. Houd je vinger (of rechtermuisknop) in het vak hieronder en kies Plakken.';
    }
  });

  root.append(pasteButton, drop, pasteBox, message, cropArea);

  async function useFile(file: Blob, fileName = (file as File).name ?? '') {
    message.textContent = '';
    try {
      img = await loadImage(file);
    } catch {
      img = undefined;
      message.textContent = 'Deze foto kan niet worden gelezen. Probeer een JPG of PNG.';
      cropArea.replaceChildren();
      return;
    }
    if (fileName) onFile?.(fileName.replace(/\.[^.]+$/, ''));
    resetView();
    renderCrop();
  }

  function frameFor(a: AspectName) {
    const ratio = ASPECTS[a].ratio;
    return ratio >= 1 ? { width: 560, height: Math.round(560 / ratio) } : { width: Math.round(420 * ratio), height: 420 };
  }

  function resetView() {
    if (!img) return;
    frame = frameFor(aspect);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = coverScale(w, h, frame);
    view = clampView({ scale, x: (frame.width - w * scale) / 2, y: (frame.height - h * scale) / 2 }, w, h, frame);
  }

  function renderCrop() {
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const box = el('div', 'crop-frame');
    box.style.width = `${frame.width}px`;
    box.style.height = `${frame.height}px`;
    const pic = el('img', 'crop-img');
    pic.draggable = false;
    const apply = () => {
      pic.style.width = `${w * view.scale}px`;
      pic.style.height = `${h * view.scale}px`;
      pic.style.transform = `translate(${view.x}px, ${view.y}px)`;
    };
    pic.src = urlOfImage(img);
    apply();
    box.append(pic);

    let drag: { x: number; y: number; vx: number; vy: number } | undefined;
    box.addEventListener('pointerdown', (e) => {
      box.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    });
    box.addEventListener('pointermove', (e) => {
      if (!drag) return;
      view = clampView({ ...view, x: drag.vx + e.clientX - drag.x, y: drag.vy + e.clientY - drag.y }, w, h, frame);
      apply();
    });
    box.addEventListener('pointerup', () => (drag = undefined));

    const min = coverScale(w, h, frame);
    const zoom = el('input', 'zoom');
    zoom.type = 'range';
    zoom.min = String(min);
    zoom.max = String(min * 4);
    zoom.step = String(min / 100);
    zoom.value = String(view.scale);
    const setZoom = (scale: number) => {
      view = zoomAround(view, Math.min(min * 4, Math.max(min, scale)), { x: frame.width / 2, y: frame.height / 2 }, w, h, frame);
      zoom.value = String(view.scale);
      apply();
    };
    zoom.addEventListener('input', () => setZoom(Number(zoom.value)));
    box.addEventListener('wheel', (e) => {
      e.preventDefault();
      setZoom(view.scale * Math.exp(-e.deltaY * 0.01));
    }, { passive: false });

    const aspects = el('div', 'segmented');
    for (const key of Object.keys(ASPECTS) as AspectName[]) {
      aspects.append(
        textButton(`${ASPECTS[key].icon} ${key[0].toUpperCase()}${key.slice(1)}`, `seg${key === aspect ? ' active' : ''}`, () => {
          aspect = key;
          resetView();
          renderCrop();
        }),
      );
    }
    const controls = el('div', 'row');
    controls.append(el('span', 'row-label', '🔍 Zoom'), zoom);
    cropArea.replaceChildren(aspects, box, controls, el('p', 'muted', 'Sleep de foto en zoom tot het belangrijke deel in beeld is.'));
  }

  // De weergave gebruikt een verkleinde kopie; het origineel blijft voor de uitsnede in het geheugen.
  function urlOfImage(image: HTMLImageElement): string {
    let u = imageUrls.get(image);
    if (!u) {
      const canvas = document.createElement('canvas');
      const k = Math.min(1, 1600 / image.naturalWidth);
      canvas.width = Math.round(image.naturalWidth * k);
      canvas.height = Math.round(image.naturalHeight * k);
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
      u = canvas.toDataURL('image/jpeg', 0.85);
      imageUrls.set(image, u);
    }
    return u;
  }

  return {
    element: root,
    load: (image) => useFile(image, ''),
    notice: (text) => void (message.textContent = text),
    hasImage: () => !!img,
    result: (adult = false) => cropAndScale(img!, cropFromView(view, img!.naturalWidth, img!.naturalHeight, frame), adult),
  };
}
