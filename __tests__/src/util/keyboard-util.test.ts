import {
  splitKeySequence,
  splitPreservingConsecutiveSeparators,
  parseKeySequence,
  formatKeyboardEvents,
} from '@/util/keyboard-util';

describe('splitKeySequence', () => {
  test.each([
    ['Ctrl-x f r', ['Ctrl', 'x', 'f', 'r']],
    ['Ctrl-x   r', ['Ctrl', 'x', ' ', 'r']],
    ['Ctrl-x  ', ['Ctrl', 'x', ' ']],
    ['Ctrl--   r', ['Ctrl', '-', ' ', 'r']],
    ['Ctrl-Alt--   r', ['Ctrl', 'Alt', '-', ' ', 'r']],
    ['', []],
    ['q', ['q']],
    ['Ctrl-g', ['Ctrl', 'g']],
    ['Escape', ['Escape']],
    ['Q', ['Q']],
    ['Ctrl-x Space', ['Ctrl', 'x', ' ']],
    ['Ctrl-Space', ['Ctrl', ' ']],
    ['space', [' ']],
    ['spc', [' ']],
    ['SPC', [' ']],
    ['Space', [' ']],
    [' ', [' ']],
    ['Space Space', [' ', ' ']],
  ])('splitKeySequence("%s") => %s', (str, expected) => {
    expect(splitKeySequence(str)).toEqual(expected);
  });
});

describe('splitPreservingConsecutiveSeparators', () => {
  test.each([
    ['Ctrl-x f r', ['Ctrl', 'x', 'f', 'r']],
    ['Ctrl-x   r', ['Ctrl', 'x', ' ', 'r']],
    ['Ctrl-x  ', ['Ctrl', 'x', ' ']],
    ['Ctrl--   r', ['Ctrl', '-', ' ', 'r']],
    ['Ctrl-Alt--   r', ['Ctrl', 'Alt', '-', ' ', 'r']],
    ['', []],
    ['q', ['q']],
    ['Ctrl-g', ['Ctrl', 'g']],
    ['Escape', ['Escape']],
    ['Q', ['Q']],
    ['Ctrl-x  ', ['Ctrl', 'x', ' ']],
    ['Ctrl-x ', ['Ctrl', 'x']],
    [' ', [' ']],
  ])('splitPreservingConsecutiveSeparators("%s") => %s', (str, expected) => {
    expect(splitPreservingConsecutiveSeparators(str, ['-', ' '])).toEqual(
      expected,
    );
  });
});

describe('parseKeySequence', () => {
  test.each([
    [
      'Ctrl-x f r',
      [
        {
          key: 'x',
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
        {
          key: 'f',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
        {
          key: 'r',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'Ctrl-x   r',
      [
        {
          key: 'x',
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
        {
          key: 'r',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'Ctrl-x  ',
      [
        {
          key: 'x',
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'Ctrl--   r',
      [
        {
          key: '-',
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
        {
          key: 'r',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'Ctrl-Alt--   r',
      [
        {
          key: '-',
          ctrlKey: true,
          metaKey: false,
          altKey: true,
          shiftKey: false,
        },
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
        {
          key: 'r',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    ['', []],
    [
      'q',
      [
        {
          key: 'q',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'Ctrl-g',
      [
        {
          key: 'g',
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'Escape',
      [
        {
          key: 'Escape',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'Q',
      [
        {
          key: 'Q',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: true,
        },
      ],
    ],
    [
      'Ctrl-x Space',
      [
        {
          key: 'x',
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'Ctrl-Space',
      [
        {
          key: ' ',
          ctrlKey: true,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'space',
      [
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'spc',
      [
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'SPC',
      [
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'Space',
      [
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      ' ',
      [
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
    [
      'Space Space',
      [
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
        {
          key: ' ',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          shiftKey: false,
        },
      ],
    ],
  ])('parseKeySequence("%s") => %S', (str, expected) => {
    expect(parseKeySequence(str)).toEqual(expected);
  });
});

describe('parseKeySequence and formatKeyboardEvents', () => {
  test.each([
    'Ctrl-x f r',
    'Ctrl-x Space r',
    'Ctrl-x Space r',
    'Ctrl-Alt-Shift-Space',
    'Ctrl-Alt-Space r',
    '',
    'q',
    'Ctrl-g',
    'Escape',
    'Q',
    'Ctrl-x Space Space Space',
    'Space Space Space',
    'Space Space',
    'Space',
  ])('formatKeyboardEvents(parseKeySequence("%s"))', (str) => {
    expect(formatKeyboardEvents(parseKeySequence(str))).toEqual(str);
  });
});
