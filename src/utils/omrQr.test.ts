import { decodeOmrQrPayload, encodeOmrQrPayload } from './omrQr';

describe('omrQr payload', () => {
  it('round-trips exam/sheet/template ids without personal names', () => {
    const raw = encodeOmrQrPayload({
      examId: 'exam-99',
      sheetId: 'SHT-1',
      templateId: 'tpl-4',
    });
    expect(raw.includes('exam-99')).toBe(true);
    expect(raw.toLowerCase().includes('name')).toBe(false);
    const decoded = decodeOmrQrPayload(raw);
    expect(decoded?.examId).toBe('exam-99');
    expect(decoded?.sheetId).toBe('SHT-1');
  });

  it('returns null for invalid QR text', () => {
    expect(decodeOmrQrPayload('hello')).toBeNull();
    expect(decodeOmrQrPayload('{"foo":1}')).toBeNull();
  });
});
