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
