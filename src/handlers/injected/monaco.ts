import BaseInjectedHandler from './base';
import { findAncestorWithClass } from '../../util/dom';
import { editor } from 'monaco-editor';

declare global {
  const monaco: typeof import('monaco-editor');
}

const langsMappings: Record<string, string[] | null> = {
  YAML: ['.yaml', '.yml'],
  yaml: ['.yaml', '.yml'],
  YML: ['.yaml', '.yml'],
  yml: ['.yaml', '.yml'],
  XML: [
    '.xml',
    '.xsd',
    '.dtd',
    '.ascx',
    '.csproj',
    '.config',
    '.props',
    '.targets',
    '.wxi',
    '.wxl',
    '.wxs',
    '.xaml',
    '.svg',
    '.svgz',
    '.opf',
    '.xslt',
    '.xsl',
  ],
  xml: [
    '.xml',
    '.xsd',
    '.dtd',
    '.ascx',
    '.csproj',
    '.config',
    '.props',
    '.targets',
    '.wxi',
    '.wxl',
    '.wxs',
    '.xaml',
    '.svg',
    '.svgz',
    '.opf',
    '.xslt',
    '.xsl',
  ],
  'WebGPU Shading Language': ['.wgsl'],
  WGSL: ['.wgsl'],
  wgsl: ['.wgsl'],
  'Visual Basic': ['.vb'],
  vb: ['.vb'],
  Twig: ['.twig'],
  twig: ['.twig'],
  tcl: ['.tcl'],
  Tcl: ['.tcl'],
  tcltk: ['.tcl'],
  TclTk: ['.tcl'],
  'tcl/tk': ['.tcl'],
  'Tcl/Tk': ['.tcl'],
  SV: ['.sv', '.svh'],
  sv: ['.sv', '.svh'],
  SystemVerilog: ['.sv', '.svh'],
  systemverilog: ['.sv', '.svh'],
  Swift: ['.swift'],
  swift: ['.swift'],
  st: [
    '.st',
    '.iecst',
    '.iecplc',
    '.lc3lib',
    '.TcPOU',
    '.TcDUT',
    '.TcGVL',
    '.TcIO',
  ],
  StructuredText: [
    '.st',
    '.iecst',
    '.iecplc',
    '.lc3lib',
    '.TcPOU',
    '.TcDUT',
    '.TcGVL',
    '.TcIO',
  ],
  scl: [
    '.st',
    '.iecst',
    '.iecplc',
    '.lc3lib',
    '.TcPOU',
    '.TcDUT',
    '.TcGVL',
    '.TcIO',
  ],
  stl: [
    '.st',
    '.iecst',
    '.iecplc',
    '.lc3lib',
    '.TcPOU',
    '.TcDUT',
    '.TcGVL',
    '.TcIO',
  ],
  sql: ['.sql'],
  SQL: ['.sql'],
  sparql: ['.rq'],
  SPARQL: ['.rq'],
  aes: ['.aes'],
  sophia: ['.aes'],
  Sophia: ['.aes'],
  sol: ['.sol'],
  solidity: ['.sol'],
  Solidity: ['.sol'],
  shell: ['.sh', '.bash'],
  Shell: ['.sh', '.bash'],
  sh: ['.sh', '.bash'],
  Sass: ['.scss'],
  sass: ['.scss'],
  scss: ['.scss'],
  scheme: ['.scm', '.ss', '.sch', '.rkt'],
  Scheme: ['.scm', '.ss', '.sch', '.rkt'],
  Scala: ['.scala', '.sc', '.sbt'],
  scala: ['.scala', '.sc', '.sbt'],
  SBT: ['.scala', '.sc', '.sbt'],
  Sbt: ['.scala', '.sc', '.sbt'],
  sbt: ['.scala', '.sc', '.sbt'],
  Dotty: ['.scala', '.sc', '.sbt'],
  dotty: ['.scala', '.sc', '.sbt'],
  'Small Basic': ['.sb'],
  sb: ['.sb'],
  Rust: ['.rs', '.rlib'],
  rust: ['.rs', '.rlib'],
  ruby: ['.rb', '.rbx', '.rjs', '.gemspec', '.pp'],
  Ruby: ['.rb', '.rbx', '.rjs', '.gemspec', '.pp'],
  rb: ['.rb', '.rbx', '.rjs', '.gemspec', '.pp'],
  reStructuredText: ['.rst'],
  restructuredtext: ['.rst'],
  Redshift: null,
  redshift: null,
  redis: ['.redis'],
  Razor: ['.cshtml'],
  razor: ['.cshtml'],
  R: ['.r', '.rhistory', '.rmd', '.rprofile', '.rt'],
  r: ['.r', '.rhistory', '.rmd', '.rprofile', '.rt'],
  'Q#': ['.qs'],
  qsharp: ['.qs'],
  python: ['.py', '.rpy', '.pyw', '.cpy', '.gyp', '.gypi'],
  Python: ['.py', '.rpy', '.pyw', '.cpy', '.gyp', '.gypi'],
  py: ['.py', '.rpy', '.pyw', '.cpy', '.gyp', '.gypi'],
  pug: ['.jade', '.pug'],
  Pug: ['.jade', '.pug'],
  Jade: ['.jade', '.pug'],
  jade: ['.jade', '.pug'],
  proto: ['.proto'],
  protobuf: ['.proto'],
  'Protocol Buffers': ['.proto'],
  PowerShell: ['.ps1', '.psm1', '.psd1'],
  powershell: ['.ps1', '.psm1', '.psd1'],
  ps: ['.ps1', '.psm1', '.psd1'],
  ps1: ['.ps1', '.psm1', '.psd1'],
  powerquery: ['.pq', '.pqm'],
  PQ: ['.pq', '.pqm'],
  M: ['.pq', '.pqm'],
  'Power Query': ['.pq', '.pqm'],
  'Power Query M': ['.pq', '.pqm'],
  postiats: ['.dats', '.sats', '.hats'],
  ATS: ['.dats', '.sats', '.hats'],
  'ATS/Postiats': ['.dats', '.sats', '.hats'],
  pla: ['.pla'],
  PHP: ['.php', '.php4', '.php5', '.phtml', '.ctp'],
  php: ['.php', '.php4', '.php5', '.phtml', '.ctp'],
  pgsql: null,
  PostgreSQL: null,
  postgres: null,
  pg: null,
  postgre: null,
  perl: ['.pl', '.pm'],
  Perl: ['.pl', '.pm'],
  pl: ['.pl', '.pm'],
  pascaligo: ['.ligo'],
  Pascaligo: ['.ligo'],
  ligo: ['.ligo'],
  pascal: ['.pas', '.p', '.pp'],
  Pascal: ['.pas', '.p', '.pp'],
  pas: ['.pas', '.p', '.pp'],
  'objective-c': ['.m'],
  'Objective-C': ['.m'],
  MySQL: null,
  mysql: null,
  msdax: ['.dax', '.msdax'],
  DAX: ['.dax', '.msdax'],
  MSDAX: ['.dax', '.msdax'],
  mips: ['.s'],
  MIPS: ['.s'],
  'MIPS-V': ['.s'],
  MDX: ['.mdx'],
  mdx: ['.mdx'],
  Markdown: [
    '.md',
    '.markdown',
    '.mdown',
    '.mkdn',
    '.mkd',
    '.mdwn',
    '.mdtxt',
    '.mdtext',
  ],
  markdown: [
    '.md',
    '.markdown',
    '.mdown',
    '.mkdn',
    '.mkd',
    '.mdwn',
    '.mdtxt',
    '.mdtext',
  ],
  'Modula-3': ['.m3', '.i3', '.mg', '.ig'],
  Modula3: ['.m3', '.i3', '.mg', '.ig'],
  modula3: ['.m3', '.i3', '.mg', '.ig'],
  m3: ['.m3', '.i3', '.mg', '.ig'],
  Lua: ['.lua'],
  lua: ['.lua'],
  Liquid: ['.liquid', '.html.liquid'],
  liquid: ['.liquid', '.html.liquid'],
  lexon: ['.lex'],
  Lexon: ['.lex'],
  Less: ['.less'],
  less: ['.less'],
  Kotlin: ['.kt', '.kts'],
  kotlin: ['.kt', '.kts'],
  julia: ['.jl'],
  Julia: ['.jl'],
  JavaScript: ['.js', '.es6', '.jsx', '.mjs', '.cjs'],
  javascript: ['.js', '.es6', '.jsx', '.mjs', '.cjs'],
  js: ['.js', '.es6', '.jsx', '.mjs', '.cjs'],
  Java: ['.java', '.jav'],
  java: ['.java', '.jav'],
  Ini: ['.ini', '.properties', '.gitconfig'],
  ini: ['.ini', '.properties', '.gitconfig'],
  HTML: [
    '.html',
    '.htm',
    '.shtml',
    '.xhtml',
    '.mdoc',
    '.jsp',
    '.asp',
    '.aspx',
    '.jshtm',
  ],
  htm: [
    '.html',
    '.htm',
    '.shtml',
    '.xhtml',
    '.mdoc',
    '.jsp',
    '.asp',
    '.aspx',
    '.jshtm',
  ],
  html: [
    '.html',
    '.htm',
    '.shtml',
    '.xhtml',
    '.mdoc',
    '.jsp',
    '.asp',
    '.aspx',
    '.jshtm',
  ],
  xhtml: [
    '.html',
    '.htm',
    '.shtml',
    '.xhtml',
    '.mdoc',
    '.jsp',
    '.asp',
    '.aspx',
    '.jshtm',
  ],
  Terraform: ['.tf', '.tfvars', '.hcl'],
  typescript: ['.ts'],
  tf: ['.tf', '.tfvars', '.hcl'],
  HCL: ['.tf', '.tfvars', '.hcl'],
  hcl: ['.tf', '.tfvars', '.hcl'],
  Handlebars: ['.handlebars', '.hbs'],
  handlebars: ['.handlebars', '.hbs'],
  hbs: ['.handlebars', '.hbs'],
  GraphQL: ['.graphql', '.gql'],
  graphql: ['.graphql', '.gql'],
  gql: ['.graphql', '.gql'],
  go: ['.go'],
  Go: ['.go'],
  'F#': ['.fs', '.fsi', '.ml', '.mli', '.fsx', '.fsscript'],
  FSharp: ['.fs', '.fsi', '.ml', '.mli', '.fsx', '.fsscript'],
  fsharp: ['.fs', '.fsi', '.ml', '.mli', '.fsx', '.fsscript'],
  freemarker2: ['.ftl', '.ftlh', '.ftlx'],
  FreeMarker2: ['.ftl', '.ftlh', '.ftlx'],
  'Apache FreeMarker2': ['.ftl', '.ftlh', '.ftlx'],
  Flow9: ['.flow'],
  Flow: ['.flow'],
  flow9: ['.flow'],
  flow: ['.flow'],
  Elixir: ['.ex', '.exs'],
  elixir: ['.ex', '.exs'],
  ex: ['.ex', '.exs'],
  ECL: ['.ecl'],
  Ecl: ['.ecl'],
  ecl: ['.ecl'],
  dockerfile: ['.dockerfile'],
  Dockerfile: ['.dockerfile'],
  Dart: ['.dart'],
  dart: ['.dart'],
  cypher: ['.cypher', '.cyp'],
  Cypher: ['.cypher', '.cyp'],
  OpenCypher: ['.cypher', '.cyp'],
  CSS: ['.css'],
  css: ['.css'],
  CSP: null,
  csp: null,
  'C#': ['.cs', '.csx', '.cake'],
  csharp: ['.cs', '.csx', '.cake'],
  C: ['.c', '.h'],
  c: ['.c', '.h'],
  CoffeeScript: ['.coffee'],
  coffeescript: ['.coffee'],
  coffee: ['.coffee'],
  clojure: ['.clj', '.cljs', '.cljc', '.edn'],
  Clojure: ['.clj', '.cljs', '.cljc', '.edn'],
  cameligo: ['.mligo'],
  Cameligo: ['.mligo'],
  bicep: ['.bicep'],
  Bicep: ['.bicep'],
  Batch: ['.bat', '.cmd'],
  bat: ['.bat', '.cmd'],
  'Azure CLI': ['.azcli'],
  azcli: ['.azcli'],
  Apex: ['.cls'],
  apex: ['.cls'],
  abap: ['.abap'],
  ABAP: ['.abap'],
};

interface ExtendedModel extends editor.ITextModel {
  getLanguageIdentifier: () => { language: string };
}

class InjectedMonacoHandler extends BaseInjectedHandler<HTMLTextAreaElement> {
  constructor(elem: HTMLTextAreaElement, uuid: string) {
    super(elem, uuid);
    this.silenced = false;
  }

  editor?: typeof monaco.editor;

  getModel() {
    const models = this.editor?.getModels();
    if (!models) {
      return;
    }
    const model =
      (models && models?.find((m) => (m.getValue() || '').length > 0)) ||
      models[0];
    return model as unknown as ExtendedModel;
  }

  load() {
    return new Promise<void>((resolve) => {
      try {
        if (typeof monaco !== 'undefined' && monaco.editor) {
          this.editor = monaco.editor;
        }
      } catch (error) {
        throw new Error('Monaco editor is not available.');
      } finally {
        return resolve();
      }
    });
  }

  setValue(value: string) {
    const editor = this.getModel();
    if (editor) {
      editor.setValue(value);
    } else if (this.elem) {
      this.elem.value = value;
    }

    if (this.elem) {
      this.elem.scrollIntoView();
    }
  }

  getValue() {
    const editor = this.getModel();

    if (editor) {
      const value = editor.getValue();
      return value;
    } else {
      const parent =
        (this.elem && findAncestorWithClass(this.elem, 'editor-instance')) ||
        findAncestorWithClass(this.elem, 'monaco-editor');
      if (parent) {
        return parent.textContent || '';
      } else {
        // Fallback logic if monaco is not available
        return this.elem ? (this.elem as HTMLTextAreaElement).value : '';
      }
    }
  }

  getExtension() {
    const model = this.getModel();
    if (model) {
      const language =
        (model.getLanguageId && model.getLanguageId()) ||
        (model.getLanguageIdentifier && model.getLanguageIdentifier());
      const extension =
        language &&
        langsMappings[
          typeof language === 'string' ? language : language.language
        ];
      console.log(
        '%c<getExtension monaco.ts 437>         language: %o :\n',
        'background-color: #ffdab9; color: black',
        language,
        'extension',
        extension,
        'document',
        document.baseURI,
      );
      return extension;
    } else {
      return null;
    }
  }

  bindChange() {}
}

export default InjectedMonacoHandler;
