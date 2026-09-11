export type DiaryExtraction = {
  subject?: string;
  title?: string;
  classwork?: string;
  homework?: string;
  chapter?: string;
  exercise?: string;
  questions?: string;
  dueDate?: string | null;
  test?: string | null;
  reminders?: string[];
  materialsRequired?: string[];
  additionalInstructions?: string;
  confidence?: Record<string, number>;
  detectedLanguage?: string;
  originalText?: string;
};

export function renderTemplateContent(content: string, values: Record<string, string> = {}): string {
  return String(content || '')
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(values[key] ?? '').trim())
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
}

export function composeHomeworkLine(fields: DiaryExtraction = {}): string {
  if (fields.homework?.trim()) return fields.homework.trim();
  const exercise = String(fields.exercise || '').replace(/^(exercise|ex)\s*/i, '').trim();
  const questions = String(fields.questions || '').replace(/^q(?:uestions?)?\s*/i, '').replace(/(\d+)\s*[-–to]+\s*(\d+)/i, '$1–$2').trim();
  if (exercise && questions) return `Complete Exercise ${exercise}, Questions ${questions}.`;
  if (exercise) return `Complete Exercise ${exercise}.`;
  if (questions) return `Complete Questions ${questions}.`;
  return '';
}

export function composeDiaryContent(fields: DiaryExtraction = {}, options: { hasPhoto?: boolean } = {}): string {
  const parts: string[] = [];
  if (fields.classwork?.trim()) parts.push(`Classwork: ${fields.classwork.trim()}`);
  const homework = composeHomeworkLine(fields);
  if (homework) parts.push(parts.length ? `Homework: ${homework}` : homework);
  if (fields.test?.trim()) parts.push(`Test: ${fields.test.trim()}`);
  for (const reminder of fields.reminders || []) {
    if (reminder.trim()) parts.push(`Reminder: ${reminder.trim()}`);
  }
  if ((fields.materialsRequired || []).length) {
    parts.push(`Materials: ${(fields.materialsRequired || []).join(', ')}`);
  }
  if (fields.additionalInstructions?.trim()) parts.push(fields.additionalInstructions.trim());
  if (parts.length) return parts.join('\n\n');
  if (options.hasPhoto) return 'Please view the attached diary photo.';
  return (fields.originalText || fields.title || '').trim();
}

export function uncertainFields(extraction?: DiaryExtraction | null, threshold = 0.7): string[] {
  const confidence = extraction?.confidence || {};
  return Object.entries(confidence)
    .filter(([, score]) => Number(score) > 0 && Number(score) < threshold)
    .map(([field]) => field);
}

export const SYSTEM_TEMPLATES = [
  { id: 'sys-homework', name: 'Homework', category: 'homework', content: 'Complete {homework}.', variables: [{ key: 'homework', label: 'Homework' }] },
  { id: 'sys-exercise', name: 'Complete Exercise', category: 'homework', content: 'Complete Exercise {exercise}, Questions {questions}.', variables: [{ key: 'exercise', label: 'Exercise' }, { key: 'questions', label: 'Questions' }] },
  { id: 'sys-test', name: 'Test Tomorrow', category: 'test', content: '{subject} test tomorrow. Prepare {portion}.', variables: [{ key: 'subject', label: 'Subject' }, { key: 'portion', label: 'Portion' }] },
  { id: 'sys-revision', name: 'Revision', category: 'classwork', content: 'Revise {chapter} thoroughly.', variables: [{ key: 'chapter', label: 'Chapter' }] },
  { id: 'sys-textbook', name: 'Bring Textbook', category: 'materials', content: 'Bring the textbook tomorrow.', variables: [] },
  { id: 'sys-notebook', name: 'Bring Notebook', category: 'materials', content: 'Bring your notebook tomorrow.', variables: [] },
  { id: 'sys-geometry', name: 'Bring Geometry Box', category: 'materials', content: 'Bring geometry box tomorrow.', variables: [] },
  { id: 'sys-lab', name: 'Bring Lab Record', category: 'materials', content: 'Bring lab record tomorrow.', variables: [] },
  { id: 'sys-pending', name: 'Complete Pending Work', category: 'homework', content: 'Complete all pending classwork and homework.', variables: [] },
  { id: 'sys-read', name: 'Read Chapter', category: 'homework', content: 'Read {chapter} and come prepared.', variables: [{ key: 'chapter', label: 'Chapter' }] },
  { id: 'sys-qa', name: 'Learn Q&A', category: 'homework', content: 'Learn Questions & Answers from {chapter}.', variables: [{ key: 'chapter', label: 'Chapter' }] },
  { id: 'sys-practice', name: 'Practice Problems', category: 'homework', content: 'Practice problems from {chapter}.', variables: [{ key: 'chapter', label: 'Chapter' }] },
  { id: 'sys-worksheet', name: 'Worksheet Attached', category: 'homework', content: 'Complete the attached worksheet.', variables: [] },
  { id: 'sys-project', name: 'Project Work', category: 'homework', content: 'Work on the {subject} project.', variables: [{ key: 'subject', label: 'Subject' }] },
  { id: 'sys-assignment', name: 'Assignment', category: 'homework', content: 'Complete the {subject} assignment.', variables: [{ key: 'subject', label: 'Subject' }] },
  { id: 'sys-holiday', name: 'Holiday Homework', category: 'homework', content: 'Holiday homework: {details}', variables: [{ key: 'details', label: 'Details' }] },
  { id: 'sys-classwork', name: 'Classwork Completed', category: 'classwork', content: 'Classwork completed.', variables: [] },
  { id: 'sys-none', name: 'No Homework Today', category: 'homework', content: 'No homework today.', variables: [] },
  { id: 'sys-weekly', name: 'Prepare for Weekly Test', category: 'test', content: 'Prepare {portion} for the weekly test.', variables: [{ key: 'portion', label: 'Portion' }] },
  { id: 'sys-drawing', name: 'Bring Drawing Material', category: 'materials', content: 'Bring drawing material tomorrow.', variables: [] },
  { id: 'sys-sports', name: 'Bring Sports Uniform', category: 'materials', content: 'Bring sports uniform tomorrow.', variables: [] },
  { id: 'sys-signature', name: 'Parent Signature Required', category: 'reminder', content: 'Complete classwork corrections and get parent signature.', variables: [] },
] as const;

export function mergeTemplateCatalog<T extends { id: string; name: string; variables?: unknown[] }>(
  local: readonly T[],
  remote?: { mine?: T[]; school?: T[]; system?: T[] } | null,
): T[] {
  const all = [...(remote?.mine || []), ...(remote?.school || []), ...(remote?.system || [])];
  const byName = new Map(all.map((item) => [item.name, item]));
  const merged = local.map((sys) => {
    const server = byName.get(sys.name);
    if (!server) return { ...sys };
    return {
      ...sys,
      ...server,
      variables: server.variables?.length ? server.variables : sys.variables,
    };
  });
  const extras = all.filter((item) => !local.some((sys) => sys.name === item.name));
  return [...merged, ...extras];
}

export const QUICK_TEMPLATE_IDS = [
  'sys-homework',
  'sys-test',
  'sys-revision',
  'sys-textbook',
  'sys-worksheet',
  'sys-pending',
  'sys-exercise',
];
