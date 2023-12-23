import CodeMirrorHandler from './codemirror';
import AceHandler from './ace';
import ContentEditableHandler from './content-editable';
import TextareaHandler from './textarea';

import handlerFactory from './factory';
import MonacoHandler from './monaco';

handlerFactory.registerHandler(CodeMirrorHandler);
handlerFactory.registerHandler(AceHandler);
handlerFactory.registerHandler(MonacoHandler);
handlerFactory.registerHandler(ContentEditableHandler);
handlerFactory.registerHandler(TextareaHandler);

export { handlerFactory as handlerFactory };
