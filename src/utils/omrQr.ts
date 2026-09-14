/**
 * SchoolIMS OMR QR payload — safe metadata only.
 */

export interface OmrQrPayload {
  version: number;
  examId: string;
  sheetId: string;
  templateId: string | null;
  templateVersion: number;
  studentId: string | null;
}

export function encodeOmrQrPayload(input: {
  examId: string;
  sheetId: string;
  templateId: string;
  templateVersion?: number;
  studentId?: string | null;
}): string {
  const payload: Record<string, string | number> = {
    v: 1,
    eid: String(input.examId),
    sid: String(input.sheetId),
    tid: String(input.templateId),
    tv: input.templateVersion || 1,
  };
  if (input.studentId) payload.st = String(input.studentId);
  return JSON.stringify(payload);
}

export function decodeOmrQrPayload(raw: string | null | undefined): OmrQrPayload | null {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(text);
    const examId = parsed.eid || parsed.exam_id || parsed.examId;
    const sheetId = parsed.sid || parsed.sheet_id || parsed.sheetId;
    if (!examId || !sheetId) return null;
    return {
      version: Number(parsed.v || 1),
      examId: String(examId),
      sheetId: String(sheetId),
      templateId: parsed.tid || parsed.template_id || null,
      templateVersion: Number(parsed.tv || 1),
      studentId: parsed.st || parsed.student_id || null,
    };
  } catch {
    return null;
  }
}
