import injectedHandlerFactory from '@/handlers/injected/factory';

import InjectedAceHandler from '@/handlers/injected/ace';
import InjectedCodeMirrorHandler from '@/handlers/injected/codemirror';
import InjectedMonacoHandler from '@/handlers/injected/monaco';

injectedHandlerFactory.registerHandler('ace', InjectedAceHandler);
injectedHandlerFactory.registerHandler('monaco', InjectedMonacoHandler);
injectedHandlerFactory.registerHandler('codemirror', InjectedCodeMirrorHandler);

export { injectedHandlerFactory as injectedHandlerFactory };
