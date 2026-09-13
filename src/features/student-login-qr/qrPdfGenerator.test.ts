import { writeFileSync } from 'node:fs';
import { buildStudentQrPdfHtml, buildStudentQrPdfHtmlFromSvgs, LOGIN_QR_CARDS_PER_PAGE, studentQrPdfFilename } from './qrPdfGenerator';
import type { IssuedLoginQr } from './types';

const credential = (index: number): IssuedLoginQr => ({
  qrPayload: `payload-${index}`,
  credentialId: `credential-${index}`,
  expiresAt: '2027-09-10T00:00:00.000Z',
  created: true,
  student: { id: `student-${index}`, name: `Student ${index} దీర్ఘ పేరు`, admissionNo: String(1000 + index), className: '8', sectionName: 'A' },
});

describe('student login QR A4 layout', () => {
  it.each([[1, 1], [2, 1], [8, 1], [9, 2], [38, 5], [100, 13]])('paginates %i students into %i pages', (count, pages) => {
    const credentials = Array.from({ length: count }, (_, index) => credential(index));
    const html = buildStudentQrPdfHtmlFromSvgs({
      school: { id: 17, name: 'Sanskriti School', logo_url: null }, academicYear: '2026-27', className: '8', sectionName: 'A', credentials,
    }, credentials.map(() => '<svg></svg>'));
    expect((html.match(/<section class="page/g) || []).length).toBe(pages);
    expect(html).toContain('break-inside: avoid');
    expect(html).toContain('page-break-inside: avoid');
    expect(LOGIN_QR_CARDS_PER_PAGE).toBe(8);
  });

  it('keeps long unicode names, missing logos, and large admission numbers on the card', () => {
    const html = buildStudentQrPdfHtmlFromSvgs({
      school: { id: 17, name: 'Sanskriti School', logo_url: null },
      academicYear: '2026-27',
      className: '8',
      sectionName: 'A',
      credentials: [{
        qrPayload: 'payload',
        credentialId: 'credential',
        expiresAt: '2027-09-10T00:00:00.000Z',
        created: true,
        student: {
          id: 'student-long',
          name: 'శ్రీమతి వెంకట నరసింహ రాజు రెడ్డి అన్నపూర్ణ',
          admissionNo: 'ADM-2026-0000001082',
          className: '8',
          sectionName: 'A',
        },
      }],
    }, ['<svg></svg>']);
    expect(html).toContain('logo-fallback');
    expect(html).toContain('overflow-wrap: anywhere');
    expect(html).toContain('ADM-2026-0000001082');
    expect(html).toContain('శ్రీమతి వెంకట నరసింహ రాజు రెడ్డి అన్నపూర్ణ');
    expect(html).not.toContain('password');
    expect(html).toContain('Open SchoolIMS, then scan to sign in');
    expect(html).toContain('Anyone with this card can sign in as this student');
  });

  it('builds a sanitized printable filename', () => {
    expect(studentQrPdfFilename({
      school: { id: 17, name: 'Sanskriti School', logo_url: null },
      academicYear: '2026-27',
      className: '8',
      sectionName: 'A',
      credentials: [credential(1)],
      generatedAt: new Date('2026-09-10T00:00:00.000Z'),
    })).toBe('Sanskriti-School_Class-8-A_Login-QR_2026-09-10.pdf');
  });

  if (process.env.QR_PDF_FIXTURE_PATH) {
    it('writes a real vector-QR fixture for visual PDF verification', async () => {
      const credentials = Array.from({ length: 9 }, (_, index) => credential(index));
      const html = await buildStudentQrPdfHtml({
        school: { id: 17, name: 'Sanskriti International School', logo_url: null },
        academicYear: '2026-27', className: 'VIII', sectionName: 'A', credentials,
      });
      writeFileSync(process.env.QR_PDF_FIXTURE_PATH as string, html, 'utf8');
      expect(html).toContain('<svg');
    });
  }
});
