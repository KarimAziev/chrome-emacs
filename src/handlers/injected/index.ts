import injectedHandlerFactory from '@/handlers/injected/factory';
import InjectedAceHandler from '@/handlers/injected/ace';
import InjectedCodeMirror5Handler from '@/handlers/injected/codemirror5';
import InjectedCodeMirror6Handler from '@/handlers/injected/codemirror6';
import MonacoSwitcher from '@/handlers/injected/monaco-switcher';
import InjectedCKEditor4Handler from '@/handlers/injected/ckeditor4';
import InjectedCKEditor5Handler from '@/handlers/injected/ckeditor5';

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
injectedHandlerFactory.registerHandler('ckeditor4', InjectedCKEditor4Handler);
injectedHandlerFactory.registerHandler('ckeditor5', InjectedCKEditor5Handler);

export { injectedHandlerFactory as injectedHandlerFactory };
