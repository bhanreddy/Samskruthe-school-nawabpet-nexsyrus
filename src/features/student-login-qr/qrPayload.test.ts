import { parseSchoolIMSLoginQr, QrPayloadError } from './qrPayload';

const valid = JSON.stringify({
  type: 'SCHOOLIMS_LOGIN',
  version: 1,
  schoolId: 17,
  payload: `123e4567-e89b-42d3-a456-426614174000.${'A'.repeat(43)}`,
});

describe('SchoolIMS login QR parsing', () => {
  it('accepts the supported version', () => expect(parseSchoolIMSLoginQr(valid).schoolId).toBe(17));
  it.each(['plain QR', '{bad', JSON.stringify({ type: 'OTHER', version: 1 })])(
    'rejects non-SchoolIMS payload %s',
    (raw) => expect(() => parseSchoolIMSLoginQr(raw)).toThrow(QrPayloadError),
  );
  it('rejects unsupported versions', () => {
    expect(() => parseSchoolIMSLoginQr(valid.replace('"version":1', '"version":2'))).toThrow('UNSUPPORTED_VERSION');
  });
  it('rejects extra fields, missing payload, and truncated secrets', () => {
    expect(() => parseSchoolIMSLoginQr(valid.replace('}', ',"extra":true}'))).toThrow(QrPayloadError);
    expect(() => parseSchoolIMSLoginQr(JSON.stringify({ type: 'SCHOOLIMS_LOGIN', version: 1, schoolId: 17 }))).toThrow('INVALID');
    expect(() => parseSchoolIMSLoginQr(valid.replace('A'.repeat(43), 'B'.repeat(42)))).toThrow('INVALID');
  });
});
