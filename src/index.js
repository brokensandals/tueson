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
      return "esctext\n" + lines.map(line => (line === '' ? '' : nextIndent) + escape(line) + '\n').join('');
    }
    return "text\n" + lines.map(line => (line === '' ? '' : nextIndent) + line + '\n').join('');
  }
  if (Array.isArray(value)) {
    return "list\n" + value.map(item => nextIndent + stringify(item, nextIndent)).join('');
  }
  if (typeof value === 'object') {
    return "record\n" + Object.keys(value).map(key => nextIndent + stringifyKV(key, value[key], nextIndent)).join('');
  }
}

const INDENTED_LINE = /^( *)(.*)/;
const NUMBER = /^\-?(0|([1-9]\d*))(\.\d+)?([eE][-+]\d+)?$/;
const CHARCODE = /^[0-9a-fA-F]{4}$/;

class Position {
  constructor(string, index) {
    this.string = string;
    this.index = index;
  }

  lineNum() {
    let line = 1;
    for (let i = 0; i < this.index; i++) {
      if (this.string[i] == '\n') {
        line++;
      }
    }
    return line;
  }

  colNum() {
    let col = 1;
    for (let i = this.index; i >= 0 && this.string[i] != '\n'; i--) {
      col--;
    }
    return col;
  }
}

export function ParseException(message, pos) {
  this.message = message;
  this.pos = pos;
  this.toString = function() {
    return `${this.pos.lineNum()}:${this.pos.colNum()} ${this.message}`;
  }
}

function parseTree(string) {
  const root = {
    pos: new Position(string, 0),
    indent: -2,
    content: '',
    parent: null,
    children: [],
  };
  let index = 0;
  let parent = root;
  string.split('\n').forEach(line => {
    let [ _, indentStr, content ] = line.match(INDENTED_LINE);
    const pos = new Position(string, index)
    const indent = indentStr.length;
    let blank = true;
    if (content.length !== 0) {
      blank = false;
      while (indent <= parent.indent) {
        parent = parent.parent;
      }
    }
    const node = { pos, indent, content, parent, children: [] };
    parent.children.push(node);
    if (!blank) {
      parent = node;
    }
    index += line.length + 1;
  });
  return root;
}

export function parse(string) {
  const tree = parseTree(string);
  const roots = tree.children.filter(node => !node.blank && node.indent === 0);
  if (roots.length === 0) {
    throw new ParseException('expected a value starting at the leftmost column', new Position(string, 0));
  }
  if (roots.length > 1) {
    throw new ParseException('found multiple values starting at the leftmost column, expected only one', roots[1].pos);
  }
}
