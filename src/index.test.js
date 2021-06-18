import * as tueson from '.';
import * as fs from 'fs';
import { expect, test } from '@jest/globals';

const testCasesDir = __dirname + '/../test-cases' + '/';
fs.readdirSync(testCasesDir).forEach(filename => {
  const inPath = testCasesDir + filename;
  if (filename.endsWith('.json')) {
    test(filename, () => {
      const outPath = inPath.replace('.json', '.tueson');
      const jsonStr = fs.readFileSync(inPath, { encoding: 'utf8' });
      const jsonParsed = JSON.parse(jsonStr);
      const tuesonStr = tueson.stringify(jsonParsed);
      const expectedStr = fs.readFileSync(outPath, { encoding: 'utf8' });
      expect(tuesonStr).toEqual(expectedStr);
    });
  } else if (filename.endsWith('.tueson')) {
    test(filename, () => {
      const outPath = inPath.replace('.tueson', '.json');
      const jsonStr = fs.readFileSync(outPath, { encoding: 'utf8' });
      const jsonParsed = JSON.parse(jsonStr);
      const tuesonStr = fs.readFileSync(inPath, { encoding: 'utf8' });
      const tuesonParsed = tueson.parse(tuesonStr);
      expect(tuesonParsed).toEqual(jsonParsed);
    });
  }
});
