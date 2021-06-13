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
const NUMBER = /^\-?(0|([1-9]\d*))(\.\d+)?([eE][-+]\d+)?$/;
const CHARCODE = /^[0-9a-fA-F]{4}$/;

export function ParseException(message, ctx) {
  this.message = message;
  this.ctx = ctx;
  this.toString = function() {
    return `${this.ctx.line}:${this.ctx.col} ${this.message}`;
  }
}

const CTX_ROOT = 0;
const CTX_OBJECT = 1;
const CTX_ARRAY = 2;
const CTX_STRING = 3;
const CTX_FIELD = 4;

function advanceChar(ctx) {
  const char = ctx.input[ctx.index];
  if (char === '\n') {
    ctx.line++;
    ctx.col = 1;
  } else {
    ctx.col++;
  }
  ctx.index++;
}

function consumeToNode(ctx) {
  while (ctx.index < ctx.input.length) {
    const char = ctx.input[ctx.index];
    if (char === ' ' || char === '\n') {
      advanceChar(ctx);
    } else {
      return true;
    }
  }
  return false;
}

function consumeEscapedString(ctx) {
  let result = '';
  while (true) {
    if (ctx.index >= ctx.input.length) {
      break;
    }
    let char = ctx.input[ctx.index];
    if (char === '\n') {
      break;
    }
    if (char === '\\') {
      advanceChar();
      if (ctx.index >= ctx.input.length) {
        throw new ParseException('expected "\\", "/", "b", "f", "n", "r", "t", or "uDDDD"', ctx);
      }
      char = ctx.input[ctx.index];
      switch (char) {
        case '\\':
        case '/':
          result += char;
          break;
        case 'b':
          result += '\b';
          break;
        case 'f':
          result += '\f';
          break;
        case 'n':
          result += '\n';
          break;
        case 'r':
          result += '\r';
          break;
        case 't':
          result += '\t';
          break;
        case 'u':
          advanceChar();
          const hex = ctx.input.slice(ctx.input.index, ctx.input.index + 4);
          if (!CHARCODE.test(hex)) {
            throw new ParseException('expected 4 hex digits', ctx);
          }
          result += JSON.parse('"\\u' + hex + '"');
          ctx.index += 4;
          ctx.col += 4;
          break;
        default:
          throw new ParseException('expected "\\", "/", "b", "f", "n", "r", "t", or "uDDDD"', ctx);
      }
    }
  }
  return result;
}

function consumeValue(ctx) {
  const line = ctx.slice(ctx.index).splice('\n', 1);
  if (line.startsWith("'")) {
    advanceChar();
    return consumeEscapedString(ctx);
  }
  if (NUMBER.test(line)) {
    const value = JSON.parse(line);
    ctx.index += line.length;
    ctx.col += line.length;
    return value;
  }
  switch (line) {
    case 'record':
      break;
    case 'list':
      break;
    case 'text':
      break;
    case 'esctext':
      break;
  }
  throw new ParseException('expected "\'", "record", "list", "text", "esctext", or a number', ctx);
}

export function parse(string) {
  let ctx = {
    line: 1,
    col: 1,
    index: 0,
    input: string,
    indent: 0
  };
  if (!consumeToNode(ctx)) {
    throw new ParseException('the input was just whitespace; expected to find a value', ctx);
  }
  const root = consumeValue(ctx);
  if (consumeToNode(ctx)) {
    throw new ParseException('expected the input to end', ctx);
  }
  return root;
}
