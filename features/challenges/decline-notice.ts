// "No problem, we'll keep looking for someone else who fits." — shown once, at
// the top of Searching, right after a decline (handover §2.3/§2.4). Not its own
// confirmation screen, and not persisted: it belongs to the moment, so a module
// flag that the next Searching render consumes is exactly the right lifetime.
let pending = false;

export const DECLINE_NOTICE = "No problem, we'll keep looking for someone else who fits.";

export function raiseDeclineNotice() {
  pending = true;
}

export function consumeDeclineNotice(): boolean {
  const was = pending;
  pending = false;
  return was;
}
