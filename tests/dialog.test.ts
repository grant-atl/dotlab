import assert from "node:assert/strict";
import test from "node:test";
import { closeDialog } from "../src/lib/dialog.ts";

test("dialog exit waits once, skips reduced motion, and ignores cancellation", async () => {
  const { promise: finished, resolve } = Promise.withResolvers<void>();
  let animations = 0;
  let closes = 0;
  const events: string[] = [];
  const onClose = () => { closes++; events.push("callback"); };
  const dialog = {
    dataset: {},
    close: () => { events.push("close"); },
    animate: () => { animations++; return { finished }; },
  } as unknown as HTMLDialogElement;

  closeDialog(null, onClose, false);
  closeDialog(dialog, onClose, false);
  closeDialog(dialog, onClose, false);
  assert.equal(dialog.dataset.closing, "true");
  assert.equal(animations, 1);
  assert.equal(closes, 0);
  assert.deepEqual(events, []);
  resolve();
  await finished;
  assert.equal(closes, 1);
  assert.deepEqual(events, ["close", "callback"]);

  const reducedDialog = {
    dataset: {},
    close: () => { events.push("close"); },
    animate: () => assert.fail("reduced motion must not animate"),
  } as unknown as HTMLDialogElement;
  closeDialog(reducedDialog, onClose, true);
  closeDialog(reducedDialog, onClose, true);
  assert.equal(closes, 2);
  assert.deepEqual(events, ["close", "callback", "close", "callback"]);

  const cancelledDialog = {
    dataset: {},
    close: () => assert.fail("cancelled animation must not close the dialog"),
    animate: () => ({ finished: Promise.reject(new Error("cancelled")) }),
  } as unknown as HTMLDialogElement;
  closeDialog(cancelledDialog, onClose, false);
  await Promise.resolve();
  assert.equal(closes, 2);
});
