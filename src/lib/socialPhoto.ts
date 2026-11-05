import { supabase } from '@/integrations/supabase/client';

// Meta's Instagram image publisher accepts JPEG, not PNG or WebP.
export async function uploadSocialPhoto(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.max(0.8, Math.min(1.91, bitmap.width / bitmap.height));
    const cropWidth = Math.min(bitmap.width, bitmap.height * ratio);
    const cropHeight = cropWidth / ratio;
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(1440, Math.round(cropWidth));
    canvas.height = Math.round(canvas.width / ratio);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the photo');
    context.drawImage(bitmap, (bitmap.width - cropWidth) / 2, (bitmap.height - cropHeight) / 2, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not prepare the photo')), 'image/jpeg', 0.92));
    const path = `social/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from('gallery').upload(path, jpeg, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return supabase.storage.from('gallery').getPublicUrl(path).data.publicUrl;
  } finally { bitmap.close(); }
}
/** Uploads an MP4/MOV video as-is for Facebook and Instagram Reels; returns its public URL. */
export async function uploadSocialVideo(file: File): Promise<string> {
  const ext = file.type === 'video/quicktime' ? 'mov' : 'mp4';
  const path = `social/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('gallery').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Video upload failed: ${error.message}`);
  return supabase.storage.from('gallery').getPublicUrl(path).data.publicUrl;
}
