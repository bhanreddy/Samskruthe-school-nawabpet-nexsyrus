/**
 * Client-side counterpart of the backend `services/marksTotalsService.js`.
 *
 * The two packages ship separately, so the canonical rules are stated once here
 * and verified against the same fixed expectations the backend suite asserts
 * (see marksTotals.test.ts and the backend marksTotalsService.test.js). Any
 * progress report total rendered on a device must come through this module —
 * screens and printable reports must not roll their own sums.
 *
 * Rules, applied per subject:
 *  1. Only subjects with a saved marks row count. A missing row is excluded
 *     from both the numerator and the denominator, never treated as zero.
 *  2. An absence contributes 0 obtained and its full configured maximum.
 *  3. A subject with no positive maximum cannot be scored and is excluded.
 *  4. A saved row with no numeric score is incomplete data, not a zero.
 *
 * Percentage = Total Obtained / Total Maximum * 100, rounded once at the end.
 */

/** Marks are stored as DECIMAL(5,2); summing hundredths keeps sums exact. */
const SCALE = 100;

export type MarkEntryStatus = 'graded' | 'absent' | 'missing';

export type MarkExclusionReason =
  | 'no_marks_entered'
  | 'score_missing'
  | 'no_maximum_configured';

export interface MarksSubjectInput {
  maxMarks?: number | string | null;
  obtained?: number | string | null;
  hasMarks?: boolean;
  isAbsent?: boolean;
}

export interface MarksSubjectContribution {
  status: MarkEntryStatus;
  counted: boolean;
  obtained: number | null;
  maximum: number | null;
  exclusionReason: MarkExclusionReason | null;
}

export interface MarksTotals {
  totalObtained: number | null;
  totalMax: number;
  percentage: number | null;
  examTotalMax: number;
  subjectCount: number;
  enteredSubjects: number;
  countedSubjects: number;
  gradedSubjects: number;
  absentSubjects: number;
  missingSubjects: number;
  unassessableSubjects: number;
  isComplete: boolean;
  exceedsMaximum: boolean;
}

function finiteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const toHundredths = (value: number) => Math.round(value * SCALE);
const fromHundredths = (value: number) => value / SCALE;
const round2 = (value: number) => Math.round(value * 100) / 100;

export function markEntryStatus(subject: MarksSubjectInput): MarkEntryStatus {
  if (subject?.hasMarks !== true) return 'missing';
  return subject?.isAbsent === true ? 'absent' : 'graded';
}

export function subjectContribution(subject: MarksSubjectInput): MarksSubjectContribution {
  const status = markEntryStatus(subject);
  const excluded = (
    reason: MarkExclusionReason,
    resolvedStatus: MarkEntryStatus = status,
  ): MarksSubjectContribution => ({
    status: resolvedStatus, counted: false, obtained: null, maximum: null, exclusionReason: reason,
  });

  if (status === 'missing') return excluded('no_marks_entered');

  const maximum = finiteNumber(subject?.maxMarks);
  if (maximum === null || maximum <= 0) return excluded('no_maximum_configured');

  if (status === 'absent') {
    return { status, counted: true, obtained: 0, maximum, exclusionReason: null };
  }

  const obtained = finiteNumber(subject?.obtained);
  if (obtained === null) return excluded('score_missing', 'missing');
  return { status, counted: true, obtained, maximum, exclusionReason: null };
}

/** Percentage for a single subject, or null when it cannot be scored. */
export function subjectPercentage(
  obtained: number | string | null | undefined,
  maximum: number | string | null | undefined,
): number | null {
  const score = finiteNumber(obtained);
  const total = finiteNumber(maximum);
  if (score === null || total === null || total <= 0) return null;
  return round2((score / total) * 100);
}

/** Full configured maximum across the supplied subjects. */
export function examTotalMaximum(subjects: MarksSubjectInput[]): number {
  return fromHundredths(subjects.reduce((total, subject) => {
    const maximum = finiteNumber(subject?.maxMarks);
    return maximum !== null && maximum > 0 ? total + toHundredths(maximum) : total;
  }, 0));
}

/** Grand total, maximum and percentage for one student in one examination. */
export function summarizeStudentMarks(subjects: MarksSubjectInput[]): MarksTotals {
  const rows = Array.isArray(subjects) ? subjects : [];
  const contributions = rows.map(subjectContribution);
  const counted = contributions.filter((contribution) => contribution.counted);

  const obtainedHundredths = counted.reduce(
    (total, contribution) => total + toHundredths(contribution.obtained as number),
    0,
  );
  const maximumHundredths = counted.reduce(
    (total, contribution) => total + toHundredths(contribution.maximum as number),
    0,
  );
  const totalObtained = counted.length > 0 ? fromHundredths(obtainedHundredths) : null;
  const totalMax = fromHundredths(maximumHundredths);
  const enteredSubjects = rows.filter((subject) => subject?.hasMarks === true).length;
  const unassessableSubjects = contributions.filter(
    (contribution) => contribution.exclusionReason === 'no_maximum_configured',
  ).length;

  return {
    totalObtained,
    totalMax,
    percentage: totalObtained === null ? null : subjectPercentage(totalObtained, totalMax),
    examTotalMax: examTotalMaximum(rows),
    subjectCount: rows.length,
    enteredSubjects,
    countedSubjects: counted.length,
    gradedSubjects: counted.filter((contribution) => contribution.status === 'graded').length,
    absentSubjects: counted.filter((contribution) => contribution.status === 'absent').length,
    missingSubjects: Math.max(0, rows.length - enteredSubjects),
    unassessableSubjects,
    isComplete: rows.length > 0
      && enteredSubjects === rows.length
      && counted.length === rows.length,
    exceedsMaximum: counted.some(
      (contribution) => (contribution.obtained as number) > (contribution.maximum as number),
    ),
  };
}
