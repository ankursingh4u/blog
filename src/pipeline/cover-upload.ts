import { prisma } from '@/lib/db';
import { setSetting } from '@/lib/settings';
import { storage, UploadError } from '@/lib/storage';
import { toJson } from '@/lib/json';
import { log } from '@/pipeline/log';
import { fetchTelegramFile } from '@/lib/telegram';

/**
 * Letting the reviewer put their own photograph on a draft, from the chat.
 *
 * "Change image" already walks through stock photographs, but it is a keyword
 * search and sometimes none of them is the picture. The only other way to set a
 * specific cover was /admin on a desktop, which defeats the point of reviewing
 * from a phone.
 *
 * The awkward part is that a Telegram photo message carries no reference to the
 * article. So the button records an intent, and the next picture to arrive in
 * the chat is read as the answer to it. That is a small piece of conversational
 * state, and it is deliberately short-lived: a photo posted an hour later is
 * somebody talking, not a cover, and must not quietly overwrite one.
 */

/** How long the bot waits for the picture after the button is pressed. */
const WAIT_MINUTES = 15;

interface AwaitingPhoto {
  postId: string;
  since: string;
}

/**
 * Read straight from the table, past `getSettings`.
 *
 * `getSettings` is wrapped in React's `cache` and dedupes for the life of a
 * request. The webhook writes the intent on one update and reads it back on the
 * next, and through the cache a handler could read a copy from before its own
 * write. Same reasoning as `readCycle`.
 */
async function readAwaiting(): Promise<AwaitingPhoto | null> {
  const row = await prisma.setting.findUnique({ where: { key: 'AWAITING_PHOTO' } });
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value) as Partial<AwaitingPhoto>;
    if (!parsed.postId || !parsed.since) return null;
    const age = (Date.now() - new Date(parsed.since).getTime()) / 60_000;
    if (!Number.isFinite(age) || age > WAIT_MINUTES) return null;
    return { postId: parsed.postId, since: parsed.since };
  } catch {
    return null;
  }
}

/**
 * Records that the next photograph belongs to this draft.
 *
 * Returns the message to show the reviewer, including the title, because the
 * button is pressed on a card that may have scrolled away and "send it now"
 * with no subject is a good way to put a picture on the wrong article.
 */
export async function requestCoverUpload(
  postId: string,
): Promise<{ ok: boolean; message: string }> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { title: true, status: true },
  });
  if (!post) return { ok: false, message: 'That post no longer exists.' };
  if (post.status !== 'REVIEW') {
    return { ok: false, message: 'That draft has already been decided.' };
  }

  await setSetting('AWAITING_PHOTO', JSON.stringify({ postId, since: new Date().toISOString() }));
  return {
    ok: true,
    message: `Send the photo now, within ${WAIT_MINUTES} minutes. It will go on "${post.title.slice(0, 60)}".`,
  };
}

export async function cancelCoverUpload(): Promise<void> {
  await setSetting('AWAITING_PHOTO', '');
}

/** True when a picture arriving now would be treated as a cover. */
export async function isAwaitingCover(): Promise<boolean> {
  return (await readAwaiting()) !== null;
}

export interface UploadedCoverResult {
  ok: boolean;
  message: string;
  postId?: string;
  title?: string;
  imageUrl?: string;
}

/**
 * Puts a picture the reviewer sent onto the draft that was waiting for one.
 *
 * Deliberately does NOT approve or publish anything. Replacing a cover and
 * deciding an article are different acts, and the whole reason "Change image"
 * sits away from Approve is that conflating them publishes work nobody meant to
 * publish. The card is re-sent with its buttons intact, so approving is still
 * one tap, taken knowingly.
 *
 * `width` comes from Telegram rather than from the bytes. It is only used to
 * warn: a cover under 1200px wide is ineligible for Google Discover, which is
 * worth saying at the moment of choosing rather than discovering later, but it
 * is the reviewer's picture and their call.
 */
export async function applyUploadedCover(input: {
  fileId: string;
  /** Telegram's declared mime, when the picture came as a file. */
  mimeType?: string;
  width?: number;
}): Promise<UploadedCoverResult> {
  const awaiting = await readAwaiting();
  if (!awaiting) {
    return {
      ok: false,
      message:
        'Nothing is waiting for a photo. Press "Send my own" on a draft first, then send the picture.',
    };
  }

  const post = await prisma.post.findUnique({
    where: { id: awaiting.postId },
    select: { id: true, title: true, status: true },
  });
  if (!post) {
    await cancelCoverUpload();
    return { ok: false, message: 'That post no longer exists.' };
  }
  if (post.status !== 'REVIEW') {
    await cancelCoverUpload();
    return { ok: false, message: `"${post.title.slice(0, 50)}" has already been decided.` };
  }

  const file = await fetchTelegramFile(input.fileId);
  if (!file) {
    // The intent is kept: a failed download is worth retrying by sending again,
    // and clearing it here would make the reviewer press the button twice.
    return { ok: false, message: 'Could not fetch that file from Telegram. Try sending it again.' };
  }

  /*
   * A photo message is always JPEG; a document carries its own mime. Prefer
   * Telegram's declaration for documents because the file host sometimes
   * answers `application/octet-stream`, which storage would reject outright.
   */
  const contentType = input.mimeType?.startsWith('image/') ? input.mimeType : file.contentType;

  let stored;
  try {
    stored = await storage.put({
      body: file.body,
      filename: `telegram-cover-${post.id}`,
      contentType,
      prefix: 'covers',
    });
  } catch (error) {
    const message =
      error instanceof UploadError
        ? error.message
        : 'That file could not be saved. Send a JPEG, PNG or WebP.';
    return { ok: false, message };
  }

  await prisma.post.update({
    where: { id: post.id },
    data: {
      featuredImage: stored.url,
      /*
       * Credited to the editor, not blanked. An empty credit reads on the page
       * as a photograph whose licence nobody recorded, which is the state the
       * editorial policy exists to avoid; "supplied by the editor" is at least
       * true and traceable to a person.
       */
      imageCredit: toJson({
        creator: '',
        creatorUrl: '',
        license: 'Supplied by the editor',
        licenseUrl: '',
        sourceUrl: '',
        sourceName: 'Supplied by the editor',
        title: '',
      }),
    },
  });

  await cancelCoverUpload();
  log.info(`cover-upload: ${stored.url} (${Math.round(stored.size / 1024)} kB) set on ${post.id}`);

  const narrow =
    input.width !== undefined && input.width < 1200
      ? ` Note: ${input.width}px wide, under the 1200px Google Discover needs.`
      : '';

  return {
    ok: true,
    message: `Cover updated.${narrow}`,
    postId: post.id,
    title: post.title,
    imageUrl: stored.url,
  };
}
