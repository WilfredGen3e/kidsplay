/** Eigen foto als avatar: vierkante middenuitsnede, 256 × 256, als data-URL. */
export async function photoToAvatar(file: Blob, size = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas
      .getContext('2d')!
      .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const AVATARS = [
  '🦊', '🐳', '🐼', '🦁', '🐯', '🐸', '🐵', '🦄', '🐙', '🐶', '🐱', '🐰',
  '🐻', '🦋', '🐝', '🐢', '🦖', '🚀', '⚽', '🌈', '🍓', '🚒', '🤖', '👑',
];

export const COLORS = ['#e8590c', '#1c7ed6', '#2f9e44', '#ae3ec9', '#e03131', '#f08c00', '#0c8599', '#d6336c'];
