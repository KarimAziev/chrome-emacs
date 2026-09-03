import {
  DIFF_DELETE,
  DIFF_INSERT,
  DIFF_EQUAL,
  diff,
  Diff,
  DiffMatchPathOptions,
} from 'diff-match-patch-es';

export type ChangeChunk = { from: number; to: number; insert: string };
export type PendingDiff = {
  from: number;
  deletedLen: number;
  insertTexts: string[];
};
export type GetTextChangeChunksOptions = {
  initialDiffTimeout?: number;
  retryDiffTimeout?: number;
  maxRetryDocLength?: number;
  smallRetryChangeRatio?: number;
} & DiffMatchPathOptions;

/**
 * Compute the fraction of characters that changed between two texts according to
 * a diff-match-patch Diff array.
 *
 * The fraction is calculated as changed / total where:
 * - changed is the sum of lengths of non-equal diff chunks (insertions + deletions)
 * - total is the sum of lengths of all chunks (equal + non-equal)
 *
 * If the diff array is empty or the total length is zero, returns 0.
 *
 * @param diffsArray - Array of diffs as returned by diff-match-patch (tuples of [operation, text]).
 * @returns A number in [0, 1] representing the proportion of characters that changed.
 */
export const computeChangedFraction = (diffsArray: Diff[]) => {
  let equal = 0,
    changed = 0;
  for (const [op, chunk] of diffsArray) {
    if (op === DIFF_EQUAL) {
      equal += chunk.length;
    } else {
      changed += chunk.length;
    }
  }
  const total = equal + changed;
  return total === 0 ? 0 : changed / total;
};

/**
 * Heuristically determines whether a diff is "coarse" (i.e. represents a large,
 * non-local change) based on character-level changed fraction and a couple of
 * additional heuristics.
 *
 * A diff is considered coarse if:
 * - The proportion of changed characters (insertions + deletions) is >= coarseChangeRatio.
 * - OR if the diff contains exactly two chunks (one delete and one insert),
 *   and the changed fraction is >= 0.9 (this catches replace-all style diffs).
 *
 * The function returns false for empty diffs.
 *
 * @param diffsArray - Array of diffs as returned by diff-match-patch (tuples of [operation, text]).
 * @param coarseChangeRatio - Threshold for the changed-character ratio to consider the diff coarse (default 0.6).
 * @returns True when the diff should be treated as coarse; false otherwise.
 */
export const isCoarseDiff = (
  diffsArray: Diff[],
  coarseChangeRatio = 0.6,
): boolean => {
  let equal = 0;
  let changed = 0;
  for (const [op, chunk] of diffsArray) {
    if (op === DIFF_EQUAL) {
      equal += chunk.length;
    } else {
      changed += chunk.length;
    }
  }
  const total = equal + changed;
  if (total === 0) {
    return false;
  }
  if (changed / total >= coarseChangeRatio) {
    return true;
  }

  if (diffsArray.length === 2) {
    const ops = diffsArray.map((d) => d[0]);
    if (
      ops.includes(DIFF_DELETE) &&
      ops.includes(DIFF_INSERT) &&
      changed / total >= 0.9
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Convert a diff-match-patch diff array into an array of ChangeChunk objects
 * suitable for applying as CodeMirror-style changes.
 *
 * Each ChangeChunk has the form { from, to, insert } where:
 * - `from` and `to` are 0-based indices into the original (old) text that should be replaced,
 * - `insert` is the text to insert in place of the range [from, to).
 *
 * Behavior notes:
 * - Equal chunks advance the original position and flush any pending change.
 * - Delete chunks extend a pending deletion (and advance the original position).
 * - Insert chunks are collected on the pending change's insertTexts array; inserts do not advance the original position.
 * - When a pending change is flushed it becomes a single ChangeChunk that may represent:
 *     - a pure insertion (from == to, insert non-empty),
 *     - a pure deletion (from < to, insert == ''),
 *     - or a replacement (from < to, insert non-empty).
 * - No-op chunks where from === to and insert is empty are omitted.
 *
 * The function assumes the diffs describe transforming the original text into the new text,
 * and computes `from`/`to` offsets relative to the original text by tracking originalPos.
 *
 * @param diffs - Array of diffs as returned by diff-match-patch (tuples of [operation, text]).
 * @returns Array of ChangeChunk describing the minimal set of replacement ranges and inserts.
 */
export const diffsToChanges = (diffs: [number, string][]): ChangeChunk[] => {
  const changes: ChangeChunk[] = [];
  let originalPos = 0;
  let pending: PendingDiff | null = null;

  const flushPending = () => {
    if (!pending) {
      return;
    }
    const insert = pending.insertTexts.join('');
    const from = pending.from;
    const to = pending.from + pending.deletedLen;
    if (from !== to || insert.length > 0) {
      changes.push({ from, to, insert });
    }
    pending = null;
  };

  for (const [op, chunk] of diffs as Array<[number, string]>) {
    const len = chunk.length;
    switch (op) {
      case DIFF_EQUAL:
        flushPending();
        originalPos += len;
        break;

      case DIFF_DELETE:
        if (!pending) {
          pending = {
            from: originalPos,
            deletedLen: 0,
            insertTexts: [],
          };
        }
        pending.deletedLen += len;
        originalPos += len;
        break;

      case DIFF_INSERT:
        if (!pending) {
          pending = {
            from: originalPos,
            deletedLen: 0,
            insertTexts: [],
          };
        }
        pending.insertTexts.push(chunk);
        break;

      default:
        break;
    }
  }

  flushPending();

  return changes;
};

/**
 * Run a diff between two strings and return the diffs plus diagnostic info.
 *
 * This is a small wrapper around diff-match-patch's diff() that records
 * the time taken and whether the resulting diff is "coarse" (i.e. indicates
 * a large or noisy change).
 *
 * @param oldText - Original text.
 * @param newText - New/target text.
 * @param options - Optional diff-match-patch options (e.g., diffTimeout).
 * @returns A tuple [diffs, coarse, tookMs]:
 *   - diffs: the array returned by diff-match-patch.
 *   - coarse: boolean indicating if the diff is considered coarse.
 *   - tookMs: number of milliseconds the diff took to compute.
 */
export const runDiff = (
  oldText: string,
  newText: string,
  options?: DiffMatchPathOptions,
): [Diff[], boolean, number] => {
  const startMs = performance.now();
  const diffs = diff(oldText, newText, options);
  const tookMs = performance.now() - startMs;
  const coarse = isCoarseDiff(diffs);
  return [diffs, coarse, tookMs];
};

/**
 * Compute text changes that can be applied incrementally by editors that
 * support range-based edits while falling back to a single full-document
 * replacement when diffing is too noisy or yields no usable chunks.
 *
 * @param oldText - Original text.
 * @param newText - New/target text.
 * @param options - Diff heuristics and timeout settings.
 * @returns Array of change chunks, or null when the texts are already equal.
 */
export const getTextChangeChunks = (
  oldText: string,
  newText: string,
  options?: GetTextChangeChunksOptions,
): ChangeChunk[] | null => {
  if (oldText === newText) {
    return null;
  }

  if (!oldText || !newText) {
    return [
      {
        from: 0,
        to: oldText.length,
        insert: newText,
      },
    ];
  }

  const {
    initialDiffTimeout = 1.0,
    retryDiffTimeout = 3.0,
    maxRetryDocLength = 200_000,
    smallRetryChangeRatio = 0.02,
    ...diffOptions
  } = options || {};

  const oldTextLen = oldText.length;

  let [diffs, coarse, tookMs] = runDiff(oldText, newText, {
    ...diffOptions,
    diffTimeout: initialDiffTimeout,
  });

  const timedOut = tookMs >= initialDiffTimeout * 1000;
  const changedFraction = computeChangedFraction(diffs);
  const shouldRetry =
    retryDiffTimeout > initialDiffTimeout &&
    oldTextLen <= maxRetryDocLength &&
    (coarse || (timedOut && changedFraction >= smallRetryChangeRatio));

  if (shouldRetry) {
    [diffs, coarse, tookMs] = runDiff(oldText, newText, {
      ...diffOptions,
      diffTimeout: retryDiffTimeout,
    });

    console.log(
      'Chrome Emacs: diff retry took',
      tookMs,
      'ms',
      'coarse',
      coarse,
    );
  }

  if (coarse && oldTextLen > maxRetryDocLength) {
    return [
      {
        from: 0,
        to: oldTextLen,
        insert: newText,
      },
    ];
  }

  const changes = diffsToChanges(diffs);

  if (changes.length === 0) {
    console.warn(
      'Chrome-Emacs: No change chunks produced; falling back to full replace',
    );

    return [
      {
        from: 0,
        to: oldTextLen,
        insert: newText,
      },
    ];
  }

  return changes;
};
