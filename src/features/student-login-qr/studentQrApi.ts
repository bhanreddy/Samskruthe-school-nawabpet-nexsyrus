import { api } from '../../services/apiClient';
import type {
  IssuedLoginQr,
  LoginQrMetadata,
  LoginQrStudent,
  LoginQrStudentPage,
} from './types';

export interface LoginQrStudentFilters {
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  search?: string;
  status?: 'active';
  page?: number;
  limit?: number;
}

export async function fetchAllLoginQrStudents(
  filters: Omit<LoginQrStudentFilters, 'page' | 'limit'>,
): Promise<LoginQrStudent[]> {
  const rows: LoginQrStudent[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await StudentLoginQrApi.students({ ...filters, page, limit: 200 });
    rows.push(...result.rows);
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages && page <= 20);
  return rows;
}

export const StudentLoginQrApi = {
  metadata: () => api.get<LoginQrMetadata>('/student-login-qr/metadata', undefined, { silent: true }),
  students: (filters: LoginQrStudentFilters) =>
    api.get<LoginQrStudentPage>('/student-login-qr/students', filters, { silent: true }),
  generate: (studentId: string) =>
    api.post<IssuedLoginQr>(`/student-login-qr/${studentId}/generate`, {}, { silent: true }),
  regenerate: (studentId: string) =>
    api.post<IssuedLoginQr>(`/student-login-qr/${studentId}/regenerate`, { confirm: true }, { silent: true }),
  bulk: (studentIds: string[]) =>
    api.post<{ credentials: IssuedLoginQr[]; failures: { studentId: string; code: string }[] }>(
      '/student-login-qr/bulk',
      { studentIds },
      { silent: true, timeoutMs: 60000 },
    ),
  auditExport: (payload: {
    exportType: 'png' | 'single_card_pdf' | 'a4_pdf' | 'print';
    studentIds: string[];
    classId?: string;
    sectionId?: string;
  }) => api.post('/student-login-qr/export-audit', payload, { silent: true }),
};
