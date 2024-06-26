import injectedHandlerFactory from '@/handlers/injected/factory';
import InjectedAceHandler from '@/handlers/injected/ace';
import InjectedCodeMirror5Handler from '@/handlers/injected/codemirror5';
import InjectedCodeMirror6Handler from '@/handlers/injected/codemirror6';
import MonacoSwitcher from '@/handlers/injected/monaco-switcher';

injectedHandlerFactory.registerHandler('ace', InjectedAceHandler);
injectedHandlerFactory.registerHandler('monaco', MonacoSwitcher);

injectedHandlerFactory.registerHandler(
  'codemirror6',
  InjectedCodeMirror6Handler,
);

injectedHandlerFactory.registerHandler(
  'codemirror5',
  InjectedCodeMirror5Handler,
);

export { injectedHandlerFactory as injectedHandlerFactory };
