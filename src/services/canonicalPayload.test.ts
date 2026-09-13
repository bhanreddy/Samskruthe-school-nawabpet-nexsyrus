import { canonicalJsonStringify, canonicalizePayload } from './canonicalPayload';

describe('canonicalPayload frontend serializer', () => {
  it('orders keys lexicographically matching backend RFC 8785 canonicalization', () => {
    const payload = {
      action: 'check_in',
      school_id: 1,
      challenge_id: 'ch-1234',
      location: {
        longitude: 78.486671,
        latitude: 17.385044,
        accuracy: 10,
      },
      policy_version: 1,
    };

    const str = canonicalJsonStringify(payload);
    expect(str).toBe(
      '{"action":"check_in","challenge_id":"ch-1234","location":{"accuracy":10,"latitude":17.385044,"longitude":78.486671},"policy_version":1,"school_id":1}'
    );
  });

  it('omits undefined properties', () => {
    const payload = {
      a: 'yes',
      b: undefined,
    };

    const str = canonicalJsonStringify(payload);
    expect(str).toBe('{"a":"yes"}');
  });

  it('canonicalizePayload converts to valid UTF-8 string', () => {
    const payload = { test: 'value' };
    const bytes = canonicalizePayload(payload);
    expect(typeof bytes).toBe('string');
    expect(bytes).toBe('{"test":"value"}');
  });
});
