import injectedHandlerFactory from './factory';

import InjectedAceHandler from './ace';
import InjectedCodeMirrorHandler from './codemirror';
import InjectedMonacoHandler from './monaco';

injectedHandlerFactory.registerHandler('ace', InjectedAceHandler);
injectedHandlerFactory.registerHandler('monaco', InjectedMonacoHandler);
injectedHandlerFactory.registerHandler('codemirror', InjectedCodeMirrorHandler);

export { injectedHandlerFactory as injectedHandlerFactory };
