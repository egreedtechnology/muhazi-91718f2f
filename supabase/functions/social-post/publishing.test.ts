import { publishingInput, waitForInstagram } from '../_shared/social-publishing.ts';

function assert(condition: boolean, message: string) { if (!condition) throw new Error(message); }

Deno.test('Facebook and Instagram selections are independent and deduplicated', () => {
  const result = publishingInput({ caption: 'Clinic article', platforms: ['facebook', 'instagram', 'facebook'] });
  assert(JSON.stringify(result.platforms) === JSON.stringify(['facebook', 'instagram']), 'Each feed must publish once');
});

Deno.test('Instagram cannot publish before its photo finishes processing', async () => {
  let calls = 0;
  let failed = false;
  try { await waitForInstagram(async () => { calls++; return 'IN_PROGRESS'; }, async () => {}); }
  catch { failed = true; }
  assert(failed && calls === 15, 'Pending photo must time out without publishing');
});

Deno.test('Instagram accepts only finished containers', async () => {
  let calls = 0;
  await waitForInstagram(async () => ++calls === 2 ? 'FINISHED' : 'IN_PROGRESS', async () => {});
  assert(calls === 2, 'Must stop at FINISHED');
});

Deno.test('Instagram processing errors prevent publishing', async () => {
  let failed = false;
  try { await waitForInstagram(async () => 'ERROR', async () => {}); } catch { failed = true; }
  assert(failed, 'An invalid photo must not publish');
});