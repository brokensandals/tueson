const NO_ESCAPE_KEY = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const ESCAPE_CHARS = /[\r\n\\]/g;

function escape(raw) {
  return raw.replace(ESCAPE_CHARS, '\\$&');
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
    const lines = value.split('\n');
    if (lines.length === 1) {
      return "'" + escape(value) + "\n";
    }
    if (lines.some(line => ESCAPE_CHARS.test(line))) {
      return "text\n" + lines.map(line => (line === '' ? '' : nextIndent) + escape(line) + '\n').join('');
    }
    return "text exact\n" + lines.map(line => (line === '' ? '' : nextIndent) + line + '\n').join('');
  }
  if (Array.isArray(value)) {
    return "list\n" + value.map(item => nextIndent + stringify(item, nextIndent)).join('');
  }
  if (typeof value === 'object') {
    return "map\n" + Object.keys(value).map(key => nextIndent + stringifyKV(key, value[key], nextIndent)).join('');
  }
}
