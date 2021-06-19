#!/usr/bin/env node

import * as tueson from '.';
import * as fs from 'fs';

const args = process.argv.slice(2);

const flags = args.filter(a => a.startsWith('-')).map(a => a.replace(/-+/, ''));
let mode = null;
flags.forEach(flag => {
  switch (flag) {
    case 'h':
    case 'help':
      process.stdout.write("Convert between tueson and json, writing to stdout.\n")
      process.stdout.write("Use `tueson -d FILENAME` to parse a tueson file and print json.\n")
      process.stdout.write("Use `tueson -s FILENAME` to parse a json file and print tueson.\n")
      process.exit(0);
    case 'd':
      mode = 'deser';
      break;
    case 's':
      mode = 'ser';
      break;
    default:
      throw 'Unrecognized flag: ' + flag;
  }
});

function doConversion(input) {
  switch (mode) {
    case 'deser':
      const parsedTueson = tueson.parse(input);
      process.stdout.write(JSON.stringify(parsedTueson, null, 2));
      break;
    case 'ser':
      const parsedJson = JSON.parse(input);
      process.stdout.write(tueson.stringify(parsedJson));
      break;
  }
}

const paths = args.filter(a => !a.startsWith('-'));
if (paths.length > 0) {
  const inpath = paths[0];
  if (!mode) {
    if (inpath.endsWith('.json')) {
      mode = 'ser';
    } else if (inpath.endsWith('.tueson')) {
      mode = 'deser';
    } else {
      throw 'Cannot determine mode from filename, please supply the -s or -d parameter';
    }
  }
  let input = fs.readFileSync(inpath, { encoding: 'utf-8' });
  doConversion(input);
} else {
  if (!mode) {
    throw 'You must supply a filename, or else supply the -s or -d parameter to use stdin';
  }
  let input = '';
  process.stdin.on('data', data => {
    input += data;
  });
  process.stdin.on('end', () => {
    doConversion(input);
  });
}
