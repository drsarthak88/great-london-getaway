/**
 * Share a score using the device's share sheet where available (phones, tablets),
 * falling back to copying the message. No accounts or servers needed.
 */
export type ShareResult = 'shared' | 'copied' | 'failed';

export function shareMessage(score: number, distance: number): string {
  return `I scored ${score.toLocaleString('en-GB')} and ran ${distance.toLocaleString('en-GB')} m across London with Marmalade Jack in The Great London Getaway! Can you beat me?`;
}

export async function shareScore(score: number, distance: number): Promise<ShareResult> {
  const text = shareMessage(score, distance);
  const url = location.origin + location.pathname;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'The Great London Getaway', text, url });
      return 'shared';
    }
  } catch (e) {
    // The user closing the share sheet isn't a failure worth falling back from.
    if ((e as Error).name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}
