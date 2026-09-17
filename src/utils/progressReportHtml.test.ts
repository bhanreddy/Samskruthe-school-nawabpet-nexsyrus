import {
  buildProgressReportHtml,
  buildTwoUpProgressReportHtml,
  ProgressReportBrand,
  ProgressReportStudent,
  progressReportSummary,
} from './progressReportHtml';

const brand: ProgressReportBrand = {
  name: 'Tenant School',
  address: 'School address',
  contact: '1234567890',
  email: 'school@example.com',
  affiliation: 'State recognised',
  tagline: 'Learn and grow.',
  logoUrl: '',
  primary: '#173f7a',
  secondary: '#ed6b21',
};

const student: ProgressReportStudent = {
  id: 'student-1',
  admissionNo: 'ADM-1',
  name: 'Test Student',
  parentName: 'Test Parent',
  classLabel: '5 - A',
  rollNo: '1',
  academicYear: '2026-2027',
  attendance: '90 / 100',
  examName: 'FA-1',
  examDate: '20 Aug 2026',
  subjects: [
    {
      subject: 'English',
      assessmentSchema: 'consolidated',
      maxMarks: 25,
      passingMarks: 9,
      obtained: 21,
      consolidatedMaxMarks: 25,
      consolidatedMarksObtained: 21,
      componentMaximums: { participation: 10, writtenWork: 10, projectWork: 10, slipTest: 20 },
      participationMarks: null,
      writtenWorkMarks: null,
      projectWorkMarks: null,
      slipTestMarks: null,
      grade: 'A1',
      remarks: 'Well done',
      isAbsent: false,
      hasMarks: true,
    },
    {
      subject: 'Mathematics',
      assessmentSchema: 'component',
      maxMarks: 50,
      passingMarks: 18,
      obtained: 44,
      consolidatedMaxMarks: 25,
      consolidatedMarksObtained: null,
      componentMaximums: { participation: 10, writtenWork: 10, projectWork: 10, slipTest: 20 },
      participationMarks: 9,
      writtenWorkMarks: 9,
      projectWorkMarks: 8,
      slipTestMarks: 18,
      grade: 'A1',
      remarks: '',
      isAbsent: false,
      hasMarks: true,
    },
  ],
};

const directSubject = (
  overrides: Partial<ProgressReportStudent['subjects'][number]>,
): ProgressReportStudent['subjects'][number] => ({
  ...student.subjects[0],
  ...overrides,
});

const directStudent = (
  subjects: ProgressReportStudent['subjects'],
): ProgressReportStudent => ({ ...student, subjects });

describe('progress report HTML', () => {
  it('uses only subjects matching the chosen assessment format', () => {
    expect(progressReportSummary(student, 'direct').subjects.map((item) => item.subject)).toEqual(['English']);
    expect(progressReportSummary(student, 'component').subjects.map((item) => item.subject)).toEqual(['Mathematics']);
  });

  it('divides the grand total by the maximum of the subjects that were actually marked', () => {
    const summary = progressReportSummary(directStudent([
      directSubject({ subject: 'English', consolidatedMaxMarks: 100, consolidatedMarksObtained: 85 }),
      directSubject({ subject: 'Mathematics', consolidatedMaxMarks: 100, consolidatedMarksObtained: 90 }),
      directSubject({ subject: 'Science', consolidatedMaxMarks: 100, consolidatedMarksObtained: 80 }),
    ]), 'direct');
    expect(summary.totalObtained).toBe(255);
    expect(summary.totalMax).toBe(300);
    expect(summary.percentage).toBe(85);
    expect(summary.result).toBe('PROMOTED');
  });

  it('leaves an unmarked subject out of the maximum instead of deflating the percentage', () => {
    const summary = progressReportSummary(directStudent([
      directSubject({ subject: 'English', consolidatedMaxMarks: 100, consolidatedMarksObtained: 85 }),
      directSubject({ subject: 'Mathematics', consolidatedMaxMarks: 100, consolidatedMarksObtained: 85 }),
      directSubject({
        subject: 'Science',
        consolidatedMaxMarks: 100,
        consolidatedMarksObtained: null,
        obtained: null,
        hasMarks: false,
      }),
    ]), 'direct');
    expect(summary.totalObtained).toBe(170);
    expect(summary.totalMax).toBe(200);
    expect(summary.percentage).toBe(85);
    expect(summary.pending).toBe(1);
    expect(summary.result).toBe('PENDING');
  });

  it('keeps an absent subject in the maximum with a zero score', () => {
    const summary = progressReportSummary(directStudent([
      directSubject({ subject: 'English', consolidatedMaxMarks: 100, consolidatedMarksObtained: 80 }),
      directSubject({
        subject: 'Mathematics',
        consolidatedMaxMarks: 100,
        consolidatedMarksObtained: null,
        obtained: null,
        isAbsent: true,
      }),
    ]), 'direct');
    expect(summary.totalObtained).toBe(80);
    expect(summary.totalMax).toBe(200);
    expect(summary.percentage).toBe(40);
    expect(summary.result).toBe('NEEDS SUPPORT');
  });

  it('duplicates a single student into two labelled copies on one A4 page', () => {
    const output = buildTwoUpProgressReportHtml([student], 'direct', brand, { duplicateSingle: true });
    expect(output.match(/class="report-card direct/g)).toHaveLength(2);
    expect(output).toContain('School copy');
    expect(output).toContain('Parent copy');
    expect(output).toContain('Tenant School');
    expect(output).toContain('@page { size: A4 portrait');
    expect(output).toContain('class="tear-strip"');
    expect(output).toContain('Tear here');
  });

  it('renders the ultra premium design with one report per page and larger typography', () => {
    const output = buildProgressReportHtml(
      [student, { ...student, id: 'student-2' }],
      'direct',
      brand,
      'ultra-premium',
    );
    expect(output).toContain('body class="layout-ultra-premium"');
    expect(output.match(/class="page"/g)).toHaveLength(2);
    expect(output.match(/class="report-card direct"/g)).toHaveLength(2);
    expect(output).not.toContain('class="tear-strip"');
    expect(output).toContain('.layout-ultra-premium td { height: 8.4mm;');
  });

  it('puts school and parent copies on separate ultra premium pages', () => {
    const output = buildProgressReportHtml(
      [student],
      'direct',
      brand,
      'ultra-premium',
      { duplicateSingle: true },
    );
    expect(output.match(/class="page"/g)).toHaveLength(2);
    expect(output).toContain('School copy');
    expect(output).toContain('Parent copy');
  });

  it('renders the stored component columns', () => {
    const output = buildTwoUpProgressReportHtml([student, { ...student, id: 'student-2' }], 'component', brand);
    expect(output).toContain('Component-Based Assessment');
    expect(output).toContain('Participation');
    expect(output).toContain('Written');
    expect(output).toContain('Project');
    expect(output).toContain('Slip test');
  });

  it('renders an absent component result once as Absent', () => {
    const absentStudent: ProgressReportStudent = {
      ...student,
      subjects: [{
        ...student.subjects[1],
        obtained: 0,
        participationMarks: null,
        writtenWorkMarks: null,
        projectWorkMarks: null,
        slipTestMarks: null,
        isAbsent: true,
      }],
    };
    const output = buildTwoUpProgressReportHtml([absentStudent], 'component', brand);
    expect(output).toContain('colspan="6" class="absent-mark">Absent</td>');
    expect(output).not.toContain('>AB<');
  });

  it('embeds a provided school logo instead of initials', () => {
    const output = buildTwoUpProgressReportHtml(
      [student],
      'direct',
      { ...brand, logoUrl: 'data:image/png;base64,abc' },
    );
    expect(output).toContain('src="data:image/png;base64,abc"');
    expect(output).toContain('alt="School logo"');
    expect(output).not.toContain('class="logo-fallback"');
  });
});
