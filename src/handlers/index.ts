import CodeMirror5Handler from '@/handlers/codemirror5';
import CodeMirror6Handler from '@/handlers/codemirror6';
import AceHandler from '@/handlers/ace';
import ContentEditableHandler from '@/handlers/content-editable';
import TextareaHandler from '@/handlers/textarea';
import handlerFactory from '@/handlers/factory';
import MonacoHandler from '@/handlers/monaco';
import CKEditor4Handler from '@/handlers/ckeditor4';
import CKEditor5Handler from '@/handlers/ckeditor5';

handlerFactory.registerHandler(CodeMirror6Handler);
handlerFactory.registerHandler(CodeMirror5Handler);
handlerFactory.registerHandler(AceHandler);
handlerFactory.registerHandler(MonacoHandler);
handlerFactory.registerHandler(ContentEditableHandler);
handlerFactory.registerHandler(CKEditor4Handler);
handlerFactory.registerHandler(CKEditor5Handler);
handlerFactory.registerHandler(TextareaHandler);

export { handlerFactory as handlerFactory };
