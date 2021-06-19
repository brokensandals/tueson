# tueson

A simple indentation-based data notation that uses the JSON data model.

## Status

Experimental.

## Goals & corresponding design decisions

- Easy for a human to read, write, and manipulate.
    - Indentation makes document hierarchy clear. Each field of an object or item in a list goes on a separate line.
    - Offers a multiline string notation that does not require/use escape characters.
    - All lines of a multiline string are indented past the parent element so that the document's hierarchy is visually clear. The parser will automatically remove the appropriate amount of indentation.
    - Typical field names do not require quotation. Field names with special characters always use the entire line, and the value is indented on the following line.
    - Single-line strings always run to the end of the line - no closing quotes.
    - Numbers and strings are always explicitly distinguished (unlike in YAML) to reduce errors.
- Easy to parse and generate.
  - Two-space indentation is enforced.
  - No intra-document referencing functionality.
  - Not many variant ways of expressing the same data.
- Can convert losslessly to and from JSON.
  - No additional data types such as you'd find in YAML.
  - No comment syntax.

## Example

The following tueson:

```
record
  favoriteColor 'light green
  aFewFavoriteBooks list
    record
      title 'Educated
      author 'Tara Westover
    record
      title 'Jonathan Strange & Mr. Norrell
      author 'Susanna Clarke
    record
      title 'The Dispossessed
      author 'Ursula K. Le Guin
  bio text
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse in ultrices quam. Pellentesque congue purus nec purus vehicula pellentesque.

    Etiam a risus ultricies, tincidunt mauris ut, pharetra erat. Morbi imperdiet ipsum vel mi cursus suscipit. Proin aliquam at tortor eu facilisis.

    Phasellus dignissim lorem volutpat bibendum tempor.
```

Is equivalent to the following json:

```json
{
  "favoriteColor": "light green",
  "aFewFavoriteBooks": [
    {
      "title": "Educated",
      "author": "Tara Westover"
    },
    {
      "title": "Jonathan Strange & Mr. Norrell",
      "author": "Susanna Clarke"
    },
    {
      "title": "The Dispossessed",
      "author": "Ursula K. Le Guin"
    }
  ],
  "bio": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse in ultrices quam. Pellentesque congue purus nec purus vehicula pellentesque.\n\nEtiam a risus ultricies, tincidunt mauris ut, pharetra erat. Morbi imperdiet ipsum vel mi cursus suscipit. Proin aliquam at tortor eu facilisis.\n\nPhasellus dignissim lorem volutpat bibendum tempor."
}
```

See the [test-cases folder](test-cases/) for more examples.

## Non-obvious cases

### Field names with special characters

To use the default syntax, field names must match the regex `/^[a-zA-Z][a-zA-Z0-9_]*$/` (i.e., start with a letter, followed by zero or more alphanumeric characters or underscores).

Fields with other names can be indicated like this:

```
record
  @this field name contains spaces and ends with a newline\n
    42
```

Equivalent JSON:

```json
{
  "this field name contains spaces and ends with a newline\n": 42
}
```

### Multiline text ending with blank lines

When parsing `text` and `esctext` values, any blank lines at the end are ignored, and no trailing newline is included in the string.

If you want one or more trailing newlines, use `esctext` and escape them:

```
esctext
  First line

  Third line.\n\n\n
```

Equivalent JSON:

```json
"First line\n\nThird line.\n\n\n"
```

## Specification

TODO

## Usage

### CLI for converting between json and tueson

```bash
npm i -g tueson
tueson test-cases/a.tueson # prints the corresponding json
tueson test-cases/a.json # prints the corresponding tueson
```

### Library usage

```bash
npm i tueson
```

```javascript
import * as tueson from 'tueson';
const original = { foo: 'bar' };
const serialized = tueson.stringify(sample);
const deserialized = tueson.parse(serialized);
// original and deserialized should be equivalent
```

## Why is it called tueson?

I worked on it on a Tuesday once.

## License

This is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).
