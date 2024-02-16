import CodeMirrorHandler from '@/handlers/codemirror';
import AceHandler from '@/handlers/ace';
import ContentEditableHandler from '@/handlers/content-editable';
import TextareaHandler from '@/handlers/textarea';
import handlerFactory from '@/handlers/factory';
import MonacoHandler from '@/handlers/monaco';

handlerFactory.registerHandler(CodeMirrorHandler);
handlerFactory.registerHandler(AceHandler);
handlerFactory.registerHandler(MonacoHandler);
handlerFactory.registerHandler(ContentEditableHandler);
handlerFactory.registerHandler(TextareaHandler);

export { handlerFactory as handlerFactory };
