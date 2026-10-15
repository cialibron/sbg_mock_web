import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';

const schema = JSON.parse(
  readFileSync(new URL('../../shared/talk-submission.schema.json', import.meta.url), 'utf8')
);
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const check = ajv.compile(schema);

// Turns Ajv's technical errors into the { fieldName: "message" } shape from the contract.
const MESSAGES = {
  maxLength: (p) => `Too long (max ${p.limit})`,
  minLength: (p) => `Too short (min ${p.limit})`,
  maximum: (p) => `Must be at most ${p.limit}`,
  minimum: (p) => `Must be at least ${p.limit}`,
  maxItems: (p) => `Too many items (max ${p.limit})`,
  minItems: (p) => `Pick at least ${p.limit}`,
  uniqueItems: () => 'Duplicate values are not allowed',
  format: (p) => `Invalid ${p.format}`,
  pattern: () => 'Contains characters that are not allowed',
  type: (p) => `Must be of type ${p.type}`,
  const: () => 'You must agree to continue',
};

// Returns null when the data is valid, otherwise an object like { title: "Too long (max 120)" }.
export function validateSubmission(data) {
  if (check(data)) return null;
  const fields = {};
  for (const e of check.errors) {
    if (e.keyword === 'if') continue; // internal bookkeeping error from if/then
    let path = e.instancePath.replace(/^\//, '').replace(/\//g, '.');
    let message;
    if (e.keyword === 'additionalProperties') {
      path = [path, e.params.additionalProperty].filter(Boolean).join('.');
      message = 'Unknown field';
    } else if (e.keyword === 'required') {
      path = [path, e.params.missingProperty].filter(Boolean).join('.');
      message = 'Required';
    } else {
      message = MESSAGES[e.keyword]?.(e.params) ?? 'Invalid value';
    }
    fields[path || '_'] ??= message; // keep the first message per field
  }
  return fields;
}