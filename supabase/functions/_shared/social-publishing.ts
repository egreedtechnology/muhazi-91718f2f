export async function waitForInstagram(check: () => Promise<string>, pause = () => new Promise<void>(resolve => setTimeout(resolve, 2000)), attempts = 15) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const status = await check();
    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error('Instagram could not process the media. Use a JPG photo or an MP4 video and try again.');
    if (attempt < attempts - 1) await pause();
  }
  throw new Error('Instagram is still processing the media. Nothing was published to Instagram.');
}

export function publishingInput(body: any) {
  const caption = typeof body?.caption === 'string' ? body.caption.trim() : '';
  const platforms = [...new Set<string>(Array.isArray(body?.platforms) ? body.platforms.filter((p: unknown) => p === 'facebook' || p === 'instagram') : [])];
  if (!caption || caption.length > 2200) throw new Error('Caption must be 1–2200 characters');
  if (!platforms.length) throw new Error('Choose Facebook and/or Instagram');
  return { caption, platforms };
}
