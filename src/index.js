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

function ParseCtx(type, container, target, indent) {
  this.type = type;
  this.container = container;
  this.target = target;
  this.indent = indent;
}

export function parse(string) {
  const contexts = [new ParseCtx(CTX_ROOT, [], null, 0)];
  let numBlankTextLines = 0;

  string.split('\n').forEach((line, index) => {
    const [ _, indentStr, content ] = INDENTED_LINE.match(line);
    const indent = indentStr.length;
    
    if ((indent % 2) != 0) {
      throw new ParseException('lines should start with an even number of spaces', index + 1);
    }

    const ctx = contexts[contexts.length - 1];
    if (content.length > 0) {
      if (ctx.type === CTX_STRING) {
        ctx.container.push(''.repeat(numBlankTextLines));
        numBlankTextLines = 0;
      }
    }

    if (content.length > 0) {
      while (indent < contexts[contexts.length - 1].indent) {
        const child = contexts.pop();
        const parent = contexts[contexts.length - 1];
        switch (parent.type) {
          case CTX_ARRAY:
            parent.container.push(child.container);
            break;
          case CTX_OBJECT:
            parent.container[child.target] = child.container;
            break;
          default:
            throw "this should be unreachable!";
        }
      }
    }

    if (content.length === 0) {
      if (ctx.type === CTX_STRING) {
        numBlankTextLines++;
      }
      continue;
    }

    if (ctx.type === CTX_STRING) {
      ctx.container += content; // TODO unescape
      continue;
    }

    // ...
  });
}
