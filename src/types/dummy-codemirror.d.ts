import type { ModeInfo } from 'codemirror/mode/meta';

interface DummyCodeMirror {
  modeInfo?: ModeInfo[];
}

declare module 'dummy-codemirror' {
  const value: DummyCodeMirror;
  export = value;
}
