import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleSubmit } from '../src/submit.mjs';

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

const send = async (body) => {
  const res = await handleSubmit({ rawBody: typeof body === 'string' ? body : JSON.stringify(body) });
  return { status: res.statusCode, body: JSON.parse(res.body) };
};

test('a valid submission gets 202 pending_verification', async () => {
  const { status, body } = await send(good());
  assert.equal(status, 202);
  assert.equal(body.status, 'pending_verification');
  assert.match(body.id, /^[0-9a-f-]{36}$/);
});

test('broken JSON gets 400 invalid_json', async () => {
  const { status, body } = await send('{not json');
  assert.equal(status, 400);
  assert.deepEqual(body, { error: 'invalid_json' });
});

test('JSON that is not an object gets 400 invalid_json', async () => {
  assert.deepEqual((await send('[1,2,3]')).body, { error: 'invalid_json' });
  assert.deepEqual((await send('null')).body, { error: 'invalid_json' });
});

test('an oversized body gets 413', async () => {
  const { status, body } = await send('x'.repeat(20_001));
  assert.equal(status, 413);
  assert.deepEqual(body, { error: 'payload_too_large' });
});

test('honeypot filled: bot sees a fake success', async () => {
  const { status, body } = await send(good({ website: 'http://spam.example' }));
  assert.equal(status, 202);
  assert.equal(body.status, 'pending_verification');
});

test('unknown field gets 400 with the contract error shape', async () => {
  const { status, body } = await send(good({ isAdmin: true }));
  assert.equal(status, 400);
  assert.deepEqual(body, { error: 'validation_failed', fields: { isAdmin: 'Unknown field' } });
});

test('field messages are human readable', async () => {
  const { body } = await send(good({ title: 'x'.repeat(121), participants: 4 }));
  assert.equal(body.fields.title, 'Too long (max 120)');
  assert.equal(body.fields.participants, 'Must be at least 5');
});

test('credits requested without a credits section names the missing field', async () => {
  const { body } = await send(good({ creditsRequested: true }));
  assert.equal(body.fields.credits, 'Required');
});

test('code of conduct unchecked gets a clear message', async () => {
  const { body } = await send(good({ codeOfConduct: false }));
  assert.equal(body.fields.codeOfConduct, 'You must agree to continue');
});