import { extractScannedLoginQrText, parseSchoolIMSLoginQr, QrPayloadError } from './qrPayload';

const valid = JSON.stringify({
  type: 'SCHOOLIMS_LOGIN',
  version: 1,
  schoolId: 17,
  payload: `123e4567-e89b-42d3-a456-426614174000.${'A'.repeat(43)}`,
});

describe('SchoolIMS login QR parsing', () => {
  it('accepts the supported version', () => expect(parseSchoolIMSLoginQr(valid).schoolId).toBe(17));
  it('accepts schoolId as a numeric string and trims BOM/whitespace', () => {
    const padded = `\uFEFF  ${JSON.stringify({
      type: 'SCHOOLIMS_LOGIN',
      version: 1,
      schoolId: '17',
      payload: `123e4567-e89b-42d3-a456-426614174000.${'A'.repeat(43)}`,
    })}  `;
    expect(parseSchoolIMSLoginQr(padded).schoolId).toBe(17);
  });
  it('accepts compatible extra fields from older printers', () => {
    expect(parseSchoolIMSLoginQr(valid.replace('}', ',"issuedAt":"2026-09-10T00:00:00.000Z"}')).schoolId).toBe(17);
  });
  it.each(['plain QR', '{bad', JSON.stringify({ type: 'OTHER', version: 1 })])(
    'rejects non-SchoolIMS payload %s',
    (raw) => expect(() => parseSchoolIMSLoginQr(raw)).toThrow(QrPayloadError),
  );
  it('rejects unsupported versions', () => {
    expect(() => parseSchoolIMSLoginQr(valid.replace('"version":1', '"version":2'))).toThrow('UNSUPPORTED_VERSION');
  });
  it('rejects missing payload and truncated secrets', () => {
    expect(() => parseSchoolIMSLoginQr(JSON.stringify({ type: 'SCHOOLIMS_LOGIN', version: 1, schoolId: 17 }))).toThrow('INVALID');
    expect(() => parseSchoolIMSLoginQr(valid.replace('A'.repeat(43), 'B'.repeat(42)))).toThrow('INVALID');
  });
  it('reads camera scan envelopes and already-parsed objects', () => {
    expect(extractScannedLoginQrText({ data: valid, raw: valid })).toBe(valid);
    expect(extractScannedLoginQrText({ nativeEvent: { data: ` ${valid} ` } })).toBe(valid);
    expect(extractScannedLoginQrText({
      type: 'SCHOOLIMS_LOGIN',
      version: 1,
      schoolId: 17,
      payload: `123e4567-e89b-42d3-a456-426614174000.${'A'.repeat(43)}`,
    })).toContain('SCHOOLIMS_LOGIN');
  });
});
