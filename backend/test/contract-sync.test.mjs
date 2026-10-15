import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const jsonSchema = JSON.parse(read('../../shared/talk-submission.schema.json'));
const openapi = parse(read('../../api/openapi.yaml'));
const apiSchema = openapi.components.schemas.TalkSubmission;

// The numeric and format limits that both files must agree on.
const LIMITS = ['minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems', 'uniqueItems', 'format'];

const sorted = (list) => [...list].sort();

function compareProperties(a, b, where) {
  for (const name of Object.keys(a)) {
    for (const limit of LIMITS) {
      assert.equal(
        a[name][limit],
        b[name][limit],
        `${where}.${name}: "${limit}" differs (JSON schema: ${a[name][limit]}, OpenAPI: ${b[name][limit]})`
      );
    }
  }
}

test('both files describe the same fields', () => {
  assert.deepEqual(sorted(Object.keys(jsonSchema.properties)), sorted(Object.keys(apiSchema.properties)));
});

test('both files require the same fields (credits is handled by if/then in JSON schema)', () => {
  assert.deepEqual(sorted(jsonSchema.required), sorted(apiSchema.required));
});

test('every field has the same limits in both files', () => {
  compareProperties(jsonSchema.properties, apiSchema.properties, 'TalkSubmission');
});

test('credits sub-fields match', () => {
  assert.deepEqual(sorted(jsonSchema.properties.credits.required), sorted(apiSchema.properties.credits.required));
  compareProperties(jsonSchema.properties.credits.properties, apiSchema.properties.credits.properties, 'credits');
});

test('code of conduct only accepts true in both files', () => {
  assert.equal(jsonSchema.properties.codeOfConduct.const, true);
  assert.deepEqual(apiSchema.properties.codeOfConduct.enum, [true]);
});

test('both files reject unknown fields', () => {
  assert.equal(jsonSchema.additionalProperties, false);
  assert.equal(apiSchema.additionalProperties, false);
});