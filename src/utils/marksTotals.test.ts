import {
  examTotalMaximum,
  subjectContribution,
  subjectPercentage,
  summarizeStudentMarks,
} from './marksTotals';

const graded = (maxMarks: number, obtained: number) => ({
  maxMarks, obtained, hasMarks: true, isAbsent: false,
});
const absent = (maxMarks: number) => ({
  maxMarks, obtained: null, hasMarks: true, isAbsent: true,
});
const notEntered = (maxMarks: number) => ({
  maxMarks, obtained: null, hasMarks: false, isAbsent: false,
});

// These expectations are duplicated verbatim in the backend suite
// (services/marksTotalsService.test.js) so the two ports cannot drift.
describe('marks totals', () => {
  it('totals equal-maximum subjects and divides the grand total once', () => {
    const totals = summarizeStudentMarks([graded(100, 85), graded(100, 90), graded(100, 80)]);
    expect(totals.totalObtained).toBe(255);
    expect(totals.totalMax).toBe(300);
    expect(totals.percentage).toBe(85);
    expect(totals.isComplete).toBe(true);
  });

  it('totals subjects whose maximum is not 100', () => {
    const totals = summarizeStudentMarks([graded(50, 45), graded(50, 40), graded(50, 35)]);
    expect(totals.totalObtained).toBe(120);
    expect(totals.totalMax).toBe(150);
    expect(totals.percentage).toBe(80);
  });

  it('mixes different maximums per subject without averaging subject percentages', () => {
    const totals = summarizeStudentMarks([graded(100, 40), graded(50, 45), graded(25, 25)]);
    expect(totals.totalObtained).toBe(110);
    expect(totals.totalMax).toBe(175);
    expect(totals.percentage).toBe(62.86);
  });

  it('sums decimal marks exactly and rounds only the percentage', () => {
    const totals = summarizeStudentMarks([
      graded(33.33, 30.15), graded(33.33, 28.7), graded(33.34, 31.05),
    ]);
    expect(totals.totalObtained).toBe(89.9);
    expect(totals.totalMax).toBe(100);
    expect(totals.percentage).toBeCloseTo(89.9, 10);
  });

  it('scores an absence as zero obtained while keeping its maximum', () => {
    const totals = summarizeStudentMarks([graded(100, 80), absent(100)]);
    expect(totals.totalObtained).toBe(80);
    expect(totals.totalMax).toBe(200);
    expect(totals.percentage).toBe(40);
    expect(totals.absentSubjects).toBe(1);
    expect(totals.isComplete).toBe(true);
  });

  it('excludes subjects with no marks row from both sides of the percentage', () => {
    const totals = summarizeStudentMarks([graded(100, 85), graded(100, 90), notEntered(100)]);
    expect(totals.totalObtained).toBe(175);
    expect(totals.totalMax).toBe(200);
    expect(totals.percentage).toBe(87.5);
    expect(totals.examTotalMax).toBe(300);
    expect(totals.missingSubjects).toBe(1);
    expect(totals.isComplete).toBe(false);
  });

  it('never turns a saved row with no score into a zero', () => {
    const contribution = subjectContribution({ maxMarks: 100, obtained: null, hasMarks: true });
    expect(contribution.counted).toBe(false);
    expect(contribution.exclusionReason).toBe('score_missing');
  });

  it('excludes a subject configured with zero maximum marks', () => {
    const totals = summarizeStudentMarks([graded(100, 90), graded(0, 5)]);
    expect(totals.totalObtained).toBe(90);
    expect(totals.totalMax).toBe(100);
    expect(totals.percentage).toBe(90);
    expect(totals.unassessableSubjects).toBe(1);
    expect(totals.isComplete).toBe(false);
  });

  it('reports no total for a student with no marks at all', () => {
    const totals = summarizeStudentMarks([notEntered(100), notEntered(100)]);
    expect(totals.totalObtained).toBeNull();
    expect(totals.totalMax).toBe(0);
    expect(totals.percentage).toBeNull();
    expect(totals.missingSubjects).toBe(2);
  });

  it('coerces numeric strings arriving from the API', () => {
    const totals = summarizeStudentMarks([
      { maxMarks: '100.00', obtained: '85.00', hasMarks: true },
      { maxMarks: '100.00', obtained: '90.50', hasMarks: true },
    ]);
    expect(totals.totalObtained).toBe(175.5);
    expect(totals.percentage).toBe(87.75);
  });

  it('flags marks above the configured maximum without clamping them', () => {
    const totals = summarizeStudentMarks([graded(50, 55)]);
    expect(totals.exceedsMaximum).toBe(true);
    expect(totals.totalObtained).toBe(55);
    expect(totals.totalMax).toBe(50);
  });

  it('computes subject percentages and exam maximums consistently', () => {
    expect(subjectPercentage(45, 50)).toBe(90);
    expect(subjectPercentage(1, 3)).toBe(33.33);
    expect(subjectPercentage(10, 0)).toBeNull();
    expect(subjectPercentage(null, 50)).toBeNull();
    expect(examTotalMaximum([graded(100, 1), graded(0, 0), graded(50, 1)])).toBe(150);
    expect(examTotalMaximum([])).toBe(0);
  });
});
