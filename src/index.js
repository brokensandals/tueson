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
    for (let i = this.index; i > 0 && this.string[i] != '\n'; i--) {
      col++;
    }
    return col;
  }

  plus(index) {
    return new Position(this.string, this.index + index);
  }
}

export function ParseException(message, pos) {
  this.pos = pos;
  this.message = `${this.pos.lineNum()}:${this.pos.colNum()} ${message}`;
}

function parseTree(string) {
  const root = {
    pos: new Position(string, 0),
    indent: -2,
    content: '',
    parent: null,
    children: [],
    nonBlankChildren: []
  };
  let index = 0;
  let parent = root;
  string.split('\n').forEach(line => {
    let [ _, indentStr, content ] = line.match(INDENTED_LINE);
    const pos = new Position(string, index)
    const indent = indentStr.length;
    let blank = true;
    if (content.length > 0) {
      blank = false;
      while (indent <= parent.indent) {
        parent = parent.parent;
      }
    }
    const node = { pos, indent, content, parent, children: [], nonBlankChildren: [], blank };
    parent.children.push(node);
    if (!blank) {
      parent.nonBlankChildren.push(node);
      parent = node;
    }
    index += line.length + 1;
  });
  return root;
}

function flattenDescendants(node) {
  const result = [];
  function recur(node) {
    node.children.forEach(child => {
      result.push(child);
      recur(child);
    });
  }
  recur(node);
  return result;
}

function removeTrailingBlankNodesDestructive(nodeList) {
  for (let i = nodeList.length - 1; i >= 0 && nodeList[i].blank; i--) {
    nodeList.pop();
  }
  return nodeList;
}

function unescape(escaped, pos) {
  let result = '';
  for (let i = 0; i < escaped.length; i++) {
    if (escaped[i] === '\\') {
      i++;
      if (i >= escaped.length) {
        throw new ParseException('expected escape character', pos.plus(i));
      }
      switch (escaped[i]) {
        case 't':
          escaped += '\t';
          break;
        case 'n':
          escaped += '\n';
          break;
        case 'f':
          escaped += '\f';
          break;
        case 'r':
          escaped += '\r';
          break;
        case '\\':
          escaped += '\\';
          break;
        case 'u':
          i++;
          const charcode = escaped.slice(i, i + 4);
          if (!CHARCODE.test(charcode)) {
            throw new ParseException('expected 4 hexadecimal digits', pos.plus(i));
          }
          escaped += JSON.parse('"\\u' + charcode) + '"';
          i += 3;
          break;
        default:
          throw new ParseException('unrecognized escape character: ' + escaped[i], pos.plus(i));
      }
    } else {
      result += escaped[i];
    }
  }
  return result;
}

function parseValue(node, index) {
  const value = node.content.slice(index);
  const indent = node.indent + 2;
  switch (value) {
    case 'yes':
      return true;
    case 'no':
      return false;
    case 'null':
      return null;
    case 'record':
      const record = {};
      node.nonBlankChildren.forEach(child => {
        if (child.indent !== indent) {
          throw new ParseException('record fields should be indented exactly two spaces', child.pos.plus(child.indent));
        }
        if (child.content[0] === '@') {
          const key = unescape(child.content.slice(1), child.pos.plus(1));
          if (child.nonBlankChildren.length < 1) {
            throw new ParseException('after an escaped record key, the value should be on the next line, indented exactly two spaces further', child.pos.plus(child.indent + child.content.length));
          }
          if (child.nonBlankChildren.length > 1) {
            throw new ParseException('an escaped record key should not have multiple children', child.nonBlankChildren[1].pos);
          }
          const grandchild = child.nonBlankChildren[0];
          if (grandchild.indent !== indent + 2) {
            throw new ParseException('after an escaped record key, the value should indented exactly two spaces further', grandchild.pos.plus(grandchild.indent));
          }
          record[key] = parseValue(grandchild, 0);
        } else {
          const kv = child.content.split(' ', 2);
          if (kv.length < 2) {
            throw new ParseException('record key-value pairs should contain a space after the field name', child.pos.plus(child.indent + child.content.length));
          }
          if (!NO_ESCAPE_KEY.test(kv[0])) {
            throw new ParseException('this record key must go on its own line beginning with "@": ' + kv[0], child.pos.plus(child.indent));
          }
          record[kv[0]] = parseValue(child, kv[0].length + 1);
        }
      });
      return record;
    case 'list':
      const list = [];
      node.nonBlankChildren.forEach(child => {
        if (child.indent !== indent) {
          throw new ParseException('list elements should be indented exactly two spaces', child.pos.plus(child.indent));
        }
        list.push(parseValue(child, 0));
      });
      return list;
    case 'text':
      const textlines = [];
      removeTrailingBlankNodesDestructive(flattenDescendants(node)).forEach(child => {
        if (child.indent >= indent) {
          const extraIndent = child.indent - indent;
          textlines.push(' '.repeat(extraIndent) + child.content);
        } else if (!child.blank) {
          throw new ParseException('text should be indented at least two spaces past the parent node', child.pos.plus(child.indent));
        } else {
          textlines.push(child.content);
        }
      });
      return textlines.join('\n');
    case 'esctext':
      const esctextlines = [];
      removeTrailingBlankNodesDestructive(flattenDescendants(node)).forEach(child => {
        if (child.indent >= indent) {
          const extraIndent = child.indent - indent;
          esctextlines.push(' '.repeat(extraIndent) + unescape(child.content));
        } else if (!child.blank) {
          throw new ParseException('text should be indented at least two spaces past the parent node', child.pos.plus(child.indent));
        } else {
          esctextlines.push(child.content);
        }
      });
      return esctextlines.join('\n');
    default:
      if (NUMBER.test(value)) {
        if (node.nonBlankChildren.length > 0) {
          throw new ParseException('numbers should not have any children', node.nonBlankChildren[0].pos);
        }
        return JSON.parse(value);
      }
      if (value[0] === "'") {
        return unescape(value.slice(1), node.pos.plus(1));
      }
      throw new ParseException('expected "record", "list", "text", "esctext", "yes", "no", "null", number, or string', node.pos.plus(index));
  }
}

export function parse(string) {
  const tree = parseTree(string);
  const roots = tree.nonBlankChildren.filter(node => node.indent === 0);
  if (roots.length === 0) {
    throw new ParseException('expected a value starting at the leftmost column', new Position(string, 0));
  }
  if (roots.length > 1) {
    throw new ParseException('found multiple values starting at the leftmost column, expected only one', roots[1].pos);
  }
  return parseValue(roots[0], 0);
}
