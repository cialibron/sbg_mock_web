import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const schema = JSON.parse(
  readFileSync(new URL('../../shared/talk-submission.schema.json', import.meta.url), 'utf8')
);
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

// A submission that should pass. Each test below changes one thing.
const good = (changes = {}) => ({
  speakerName: 'Ana Reyes',
  email: 'ana@example.com',
  title: 'Serverless 101',
  services: ['AWS Lambda', 'Amazon DynamoDB'],
  shortDescription: 'A beginner friendly intro.',
  details: 'We will build a tiny API with Lambda and DynamoDB step by step.',
  proposedStart: '2026-11-20T10:00:00+08:00',
  timezone: 'Asia/Manila',
  participants: 40,
  creditsRequested: false,
  codeOfConduct: true,
  captchaToken: 'token',
  formStartedAt: 1800000000000,
  ...changes,
});

test('a normal submission is accepted', () => {
  assert.equal(validate(good()), true);
});

test('unknown fields are rejected', () => {
  assert.equal(validate(good({ isAdmin: true })), false);
});

test('title over 120 characters is rejected', () => {
  assert.equal(validate(good({ title: 'x'.repeat(121) })), false);
});

test('participants below 5 is rejected', () => {
  assert.equal(validate(good({ participants: 4 })), false);
});

test('code of conduct must be true', () => {
  assert.equal(validate(good({ codeOfConduct: false })), false);
});

test('a service name with HTML is rejected', () => {
  assert.equal(validate(good({ services: ['<script>alert(1)</script>'] })), false);
});

test('credits requested without a credits section is rejected', () => {
  assert.equal(validate(good({ creditsRequested: true })), false);
});

test('credits requested with a complete credits section is accepted', () => {
  const credits = { costEstimateUsd: 20, durationHours: 2, justification: 'Needs GPU labs for the demo.' };
  assert.equal(validate(good({ creditsRequested: true, credits })), true);
});