import { randomUUID } from 'node:crypto';
import { validateSubmission } from './validate.mjs';

const MAX_BODY_BYTES = 20_000;

const reply = (statusCode, body) => ({ statusCode, body: JSON.stringify(body) });

export async function handleSubmit({ rawBody }) {
  // 1. Size limit: refuse huge bodies before doing any work on them.
  if (typeof rawBody !== 'string' || Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
    return reply(413, { error: 'payload_too_large' });
  }

  // 2. Must be a JSON object.
  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return reply(400, { error: 'invalid_json' });
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return reply(400, { error: 'invalid_json' });
  }

  // 3. Honeypot: a filled hidden field means a bot. Pretend it worked so bots learn nothing.
  if (typeof data.website === 'string' && data.website.length > 0) {
    return reply(202, { status: 'pending_verification', id: randomUUID() });
  }

  // 4. Schema validation (also rejects unknown fields).
  const fields = validateSubmission(data);
  if (fields) return reply(400, { error: 'validation_failed', fields });

  // Placeholder: later steps add fill-time, CAPTCHA, rate limits, storage and the email.
  return reply(202, { status: 'pending_verification', id: randomUUID() });
}