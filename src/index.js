const NO_ESCAPE_KEY = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const ESCAPE_CHARS = /[\r\n\\]/g;
const TRAILING_NEWLINES = /\n*$/;

function escape(raw) {
  return raw.replace(/\\/g, '\\\\').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

function stringifyKV(key, value, indent) {
  if (NO_ESCAPE_KEY.test(key)) {
    return key + " " + stringify(value, indent);
  }
  const nextIndent = indent + '  ';
  return "@" + escape(key) + "\n" + nextIndent + stringify(value, nextIndent);
}

export function stringify(value, indent = '') {
  if (value === null) {
    return "null\n";
  }
  if (value === true) {
    return "yes\n";
  }
  if (value === false) {
    return "no\n";
  }
  if (typeof value === 'number' && isFinite(value)) {
    return value.toString() + "\n";
  }
  const nextIndent = indent + '  ';
  if (typeof value === 'string') {
    const trailing = value.match(TRAILING_NEWLINES)[0];
    const lines = value.replace(TRAILING_NEWLINES, '').split('\n');
    lines[lines.length - 1] += trailing;

    if (lines.length === 1) {
      return "'" + escape(lines[0]) + "\n";
    }
    if (lines.some(line => ESCAPE_CHARS.test(line))) {
      return "text escaped\n" + lines.map(line => (line === '' ? '' : nextIndent) + escape(line) + '\n').join('');
    }
    return "text\n" + lines.map(line => (line === '' ? '' : nextIndent) + line + '\n').join('');
  }
  if (Array.isArray(value)) {
    return "list\n" + value.map(item => nextIndent + stringify(item, nextIndent)).join('');
  }
  if (typeof value === 'object') {
    return "map\n" + Object.keys(value).map(key => nextIndent + stringifyKV(key, value[key], nextIndent)).join('');
  }
}

const INDENTED_LINE = /^( )*(.*)/;

export function ParseException(message, lineNum, input) {
  this.message = message;
  this.lineNum = lineNum;
  this.input = input;
  this.toString = function() {
    return `Line ${this.lineNum}: ${this.message}`;
  }
}

const CTX_ROOT = 0;
const CTX_OBJECT = 1;
const CTX_ARRAY = 2;
const CTX_STRING = 3;
const CTX_FIELD = 4;

function ParseCtx(type, container, target, indent) {
  this.type = type;
  this.container = container;
  this.target = target;
  this.indent = indent;
}

export function parse(string) {
  const contexts = [new ParseCtx(CTX_ROOT, undefined, null, 0)];
  const lines = string.split('\n');
  let lineIdx;
  let result;
  let blankLines = 0;

  lineLoop:
  for (lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const [_, indentStr, content] = INDENTED_LINE.match(lines[lineIdx]);
    if (content.length === 0) {
      blankLines++;
    }

    let indent = indentStr.length;
    let ctx = contexts[contexts.length - 1];
    if (content.length > 0) {
      while (indent < ctx.indent) {
        let child = contexts.pop();
        ctx = contexts[contexts.length - 1];
        switch (ctx.type) {
          case CTX_ROOT:
            result = child.container;
            break lineLoop;
          case CTX_OBJECT:
            ctx.container[child.target] = child.container;
            break;
          case CTX_ARRAY:
            ctx.container.push(child.container);
            break;
          case CTX_FIELD:
            const parent = contexts.pop();
            ctx = contexts[contexts.length - 1];
            
            break;
        }
      }
    }
  };

  if (result === undefined) {
    throw new ParseException('no value found', 1, string);
  }
  for (; lineIdx < lines.length && lines[lineIdx].replace(/ /g, '').length === 0; lineIdx++);
  if (lineIdx !== lines.length) {
    throw new ParseException('expected end of input', lineIdx, string);
  }
  return result;
}
