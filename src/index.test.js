import * as tueson from '.';
import * as fs from 'fs';
import { expect, test } from '@jest/globals';

const testCasesDir = __dirname + '/../test-cases' + '/';
fs.readdirSync(testCasesDir).forEach(filename => {
  const inPath = testCasesDir + filename;
  if (filename.endsWith('.json')) {
    test(filename, () => {
      const outPath = inPath.replace('.json', '.tueson');
      const json = fs.readFileSync(inPath, { encoding: 'utf8' });
      const parsed = JSON.parse(json);
      const stringified = tueson.stringify(parsed);
      const expected = fs.readFileSync(outPath, { encoding: 'utf8' });
      expect(stringified).toEqual(expected);
    });
  }
});
