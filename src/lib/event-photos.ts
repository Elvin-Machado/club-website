export const MAX_EVENT_PHOTOS = 20;
export const isEventPhoto = (file: File) => /^(image\/(jpeg|png|webp|avif))$/.test(file.type) || (!file.type && /\.(jpe?g|png|webp|avif)$/i.test(file.name));

/** Decode one photo at a time and upload bounded, metadata-free gallery images. */
export async function prepareEventPhotos(files: File[], progress: (message: string) => void) {
  if (files.length > MAX_EVENT_PHOTOS) throw new Error('Choose up to 20 photos.');
  if (files.reduce((total, file) => total + file.size, 0) > 80_000_000) throw new Error('Choose a folder smaller than 80 MB.');
  const photos: { name: string; mime: string; data: string }[] = [];
  let totalBytes = 0;
  for (const [index, file] of files.entries()) {
    if (!isEventPhoto(file) || file.size > 12_000_000) throw new Error(`${file.name}: choose a JPG, PNG, WebP or AVIF image under 12 MB.`);
    progress(`Preparing photo ${index + 1} of ${files.length}…`);
    const bitmap = await createImageBitmap(file).catch(() => { throw new Error(`${file.name} could not be read. Remove it or choose another photo.`); });
    try {
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Photo processing is unavailable in this browser.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let encoded = '';
      for (const quality of [.8, .65, .45]) {
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not process this photo.')), 'image/webp', quality));
        if (blob.size > 500_000) continue;
        totalBytes += blob.size;
        encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
        break;
      }
      if (!encoded) throw new Error(`${file.name} is too detailed. Choose a smaller version.`);
      if (totalBytes > 6_000_000) throw new Error('The album is too large. Choose fewer photos (6 MB after compression).');
      photos.push({ name: file.name.slice(0, 180), mime: encoded.slice(5, encoded.indexOf(';')), data: encoded.slice(encoded.indexOf(',') + 1) });
      canvas.width = canvas.height = 1;
    } finally { bitmap.close(); }
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return photos;
}
