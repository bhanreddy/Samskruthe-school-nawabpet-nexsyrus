import { apiClient } from './apiClient';

export interface EventItem {
  id: string;
  school_id: number;
  title: string;
  description?: string;
  event_type: string;
  category?: string;
  start_date: string;
  end_date: string;
  location?: string;
  is_all_day?: boolean;
  target_audience?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'AWAITING_APPROVAL' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'REGISTRATION_OPEN' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'CLOSED';
  readiness_score?: number;
  config?: {
    modules?: {
      registration?: boolean;
      consent?: boolean;
      ticketing?: boolean;
      qr_passes?: boolean;
      transport?: boolean;
      competition?: boolean;
      budget?: boolean;
      expenses?: boolean;
      payments?: boolean;
      feedback?: boolean;
      certificates?: boolean;
      gallery?: boolean;
      volunteers?: boolean;
    };
    constraints?: {
      max_capacity?: number;
      min_staff_required?: number;
      fee_amount?: number;
      requires_consent?: boolean;
      consent_deadline?: string;
      registration_deadline?: string;
    };
    target_classes?: string[];
    target_houses?: string[];
  };
  created_at?: string;
  updated_at?: string;
  registration_count?: number;
  consented_count?: number;
}

export interface EventReadinessBreakdown {
  score: number;
  approvals: boolean;
  staffAssigned: boolean;
  transportReady: boolean;
  budgetAllocated: boolean;
  parentConsentPercentage: number;
  incidentsPending: number;
}

export interface EventRegistrationItem {
  id: string;
  event_id: string;
  student_id: string;
  participant_type: string;
  registration_status: 'REGISTERED' | 'WAITLISTED' | 'CONFIRMED' | 'CANCELLED';
  waitlist_position?: number;
  created_at: string;
  student_name?: string;
  admission_no?: string;
  class_name?: string;
  section_name?: string;
  consent_status?: string;
  payment_status?: string;
  pass_code?: string;
  pass_status?: string;
}

export interface EventConsentSummary {
  total_registered: number;
  consented_count: number;
  declined_count: number;
  pending_count: number;
  consent_percentage: number;
}

export interface EventConsentRosterItem {
  registration_id: string;
  student_id: string;
  student_name: string;
  admission_no: string;
  class_name: string;
  section_name: string;
  parent_name: string;
  parent_phone: string;
  consent_status: 'CONSENTED' | 'DECLINED' | 'PENDING';
  responded_at?: string;
  medical_declaration_ack?: boolean;
  emergency_treatment_auth?: boolean;
  transportation_consent?: boolean;
  photography_media_consent?: boolean;
  parent_remarks?: string;
}

export interface EventPassValidation {
  isValid: boolean;
  reason?: string;
  message?: string;
  pass?: {
    id: string;
    event_id: string;
    pass_code: string;
    attendee_type: string;
    student_id?: string;
    attendee_name?: string;
    admission_no?: string;
    class_name?: string;
    event_title?: string;
    event_date?: string;
    location?: string;
    status: string;
    entry_count: number;
    max_entries: number;
    consent_status?: string;
    payment_status?: string;
  };
}

export interface EventAttendanceDashboard {
  summary: {
    total_eligible: number;
    present_count: number;
    absent_count: number;
    turnout_percentage: number;
  };
  roster: Array<{
    registration_id: string;
    student_id: string;
    student_name: string;
    admission_no: string;
    class_name: string;
    attendance_status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
    check_in_time?: string;
    gate_id?: string;
  }>;
}

export interface EventTransportData {
  assignments: Array<{
    id: string;
    bus_id: string;
    bus_no: string;
    registration_no: string;
    capacity: number;
    assigned_students: number;
    pickup_point: string;
    departure_time: string;
    return_time: string;
    route_description?: string;
  }>;
  manifests: Array<{
    id: string;
    bus_assignment_id: string;
    student_id: string;
    student_name: string;
    admission_no: string;
    class_name: string;
    pickup_stop?: string;
    boarding_status: 'NOT_BOARDED' | 'ON_BUS' | 'DROPPED' | 'ABSENT';
  }>;
}

export interface EventTaskItem {
  id: string;
  event_id: string;
  team_id?: string;
  team_name?: string;
  title: string;
  description?: string;
  assigned_to_user_id?: string;
  assigned_name?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  due_date?: string;
}

export interface EventBudgetExpenseData {
  totals: {
    total_estimated: number;
    total_approved: number;
    total_actual_spent: number;
    net_variance: number;
    budget_utilization_pct: number;
  };
  categories: Array<{
    category: string;
    allocated: number;
    spent: number;
    remaining: number;
  }>;
  budget_items: Array<{
    id: string;
    category: string;
    item_name: string;
    estimated_cost: number;
    approved_cost: number;
    status: string;
  }>;
  expenses: Array<{
    id: string;
    category: string;
    payee_name: string;
    amount: number;
    invoice_no?: string;
    receipt_url?: string;
    is_settled: boolean;
    paid_at?: string;
  }>;
}

export interface HouseLeaderboardItem {
  house_id: string;
  house_name: string;
  color_code?: string;
  total_points: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  rank: number;
}

export interface EventIncidentItem {
  id: string;
  event_id: string;
  incident_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  action_taken?: string;
  is_resolved: boolean;
  reported_by_name?: string;
  created_at: string;
}

export interface EventReportData {
  id: string;
  report_title: string;
  generated_at: string;
  report_data: {
    event: any;
    participation: {
      total_registered: number;
      actual_attended: number;
      turnout_percentage: number;
      consented_count: number;
    };
    finances: {
      total_approved_budget: number;
      total_actual_spent: number;
      net_variance: number;
      budget_utilization_pct: number;
    };
    competitions?: {
      house_leaderboard: HouseLeaderboardItem[];
    };
    safety?: {
      total_incidents: number;
      resolved_count: number;
    };
    feedback?: {
      total_responses: number;
      average_rating: number;
    };
  };
}

function unwrapEvent(payload: any): EventItem {
  const row = payload?.event || payload;
  if (row && !row.config && row.configuration) {
    row.config = row.configuration;
  }
  return row;
}

export const eventService = {
  // 1. Core Event Operations
  async listEvents(params?: { status?: string; type?: string; search?: string }): Promise<{ success: boolean; data: EventItem[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.type) query.append('type', params.type);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    const res = await apiClient.get<{ success: boolean; data: any }>(`/events${qs ? `?${qs}` : ''}`);
    const payload = res.data;
    const events = Array.isArray(payload) ? payload : payload?.events || [];
    return { ...res, data: events.map((row: any) => unwrapEvent(row)) };
  },

  async listEligibleEvents(): Promise<{ success: boolean; data: EventItem[] }> {
    return await apiClient.get<{ success: boolean; data: EventItem[] }>('/events/eligible');
  },

  async getEventById(id: string): Promise<{ success: boolean; data: EventItem }> {
    const res = await apiClient.get<{ success: boolean; data: EventItem }>(`/events/${id}`);
    return { ...res, data: unwrapEvent(res.data) };
  },

  async getEventDashboard(id: string): Promise<{ success: boolean; data: any }> {
    return await apiClient.get<{ success: boolean; data: any }>(`/events/${id}/dashboard`);
  },

  async createEvent(payload: Partial<EventItem> & { configuration?: any; targets?: any[] }): Promise<{ success: boolean; data: EventItem }> {
    const body = {
      ...payload,
      configuration: payload.configuration || payload.config,
    };
    const res = await apiClient.post<{ success: boolean; data: any }>('/events', body);
    return { ...res, data: unwrapEvent(res.data) };
  },

  async updateEvent(id: string, payload: Partial<EventItem>): Promise<{ success: boolean; data: EventItem }> {
    return await apiClient.put<{ success: boolean; data: EventItem }>(`/events/${id}`, payload);
  },

  async deleteEvent(id: string): Promise<{ success: boolean; message: string }> {
    return await apiClient.delete<{ success: boolean; message: string }>(`/events/${id}`);
  },

  async publishEvent(id: string): Promise<{ success: boolean; data: EventItem }> {
    const res = await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/publish`, {});
    return { ...res, data: unwrapEvent(res.data?.event || res.data) };
  },

  async updateEventStatus(id: string, status: string): Promise<{ success: boolean; data: EventItem }> {
    return await apiClient.put<{ success: boolean; data: EventItem }>(`/events/${id}`, { status });
  },

  // 2. Multi-tier Approvals
  async submitForApproval(id: string, payload?: { remarks?: string }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/approvals/submit`, {
      comments: payload?.remarks,
    });
  },

  async getApprovalTimeline(id: string): Promise<{ success: boolean; data: any[] }> {
    return await apiClient.get<{ success: boolean; data: any[] }>(`/events/${id}/approvals/history`);
  },

  async recordApprovalDecision(
    id: string,
    decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
    remarks?: string
  ): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/approvals/decide`, {
      decision,
      comments: remarks,
    });
  },

  // 3. Registrations & Waitlist
  async getRegistrations(id: string, params?: { status?: string; search?: string }): Promise<{ success: boolean; data: EventRegistrationItem[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    const res = await apiClient.get<{ success: boolean; data: any }>(`/events/${id}/registrations${qs ? `?${qs}` : ''}`);
    const rows = Array.isArray(res.data) ? res.data : res.data?.registrations || [];
    return { ...res, data: rows };
  },

  async registerStudent(id: string, payload: { studentId: string; participantType?: string; selectedActivities?: string[] }): Promise<{ success: boolean; data: EventRegistrationItem }> {
    const res = await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/register`, {
      student_id: payload.studentId,
      participant_type: payload.participantType || 'STUDENT',
      selected_activities: payload.selectedActivities || [],
    });
    return { ...res, data: res.data?.registration || res.data };
  },

  async promoteWaitlist(id: string, studentId: string): Promise<{ success: boolean; data: EventRegistrationItem }> {
    return await apiClient.post<{ success: boolean; data: EventRegistrationItem }>(`/events/${id}/registrations/promote`, { studentId });
  },

  async cancelRegistration(id: string, regId: string): Promise<{ success: boolean; message: string }> {
    return await apiClient.post<{ success: boolean; message: string }>(`/events/${id}/registrations/${regId}/cancel`, {});
  },

  // 4. Parent Digital Consent
  async getConsentSummary(id: string): Promise<{ success: boolean; data: EventConsentSummary }> {
    return await apiClient.get<{ success: boolean; data: EventConsentSummary }>(`/events/${id}/consent`);
  },

  async getConsentRoster(id: string, filter?: string): Promise<{ success: boolean; data: EventConsentRosterItem[] }> {
    const qs = filter ? `?filter=${filter}` : '';
    return await apiClient.get<{ success: boolean; data: EventConsentRosterItem[] }>(`/events/${id}/consent/roster${qs}`);
  },

  async submitParentConsent(
    id: string,
    payload: {
      studentId: string;
      status: 'CONSENTED' | 'DECLINED';
      acknowledgements: {
        medical_declaration_ack?: boolean;
        emergency_treatment_auth?: boolean;
        transportation_consent?: boolean;
        photography_media_consent?: boolean;
        rules_instructions_ack?: boolean;
      };
      remarks?: string;
    }
  ): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/consent`, {
      student_id: payload.studentId,
      status: payload.status,
      acknowledgements: payload.acknowledgements,
      remarks: payload.remarks,
    });
  },

  // 5. Passes & Gatekeeper Entry
  async issuePass(id: string, payload: { studentId?: string; attendeeType?: string; guestName?: string }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/passes/issue`, payload);
  },

  async bulkIssuePasses(id: string): Promise<{ success: boolean; data: { issued_count: number } }> {
    return await apiClient.post<{ success: boolean; data: { issued_count: number } }>(`/events/${id}/passes/bulk-issue`, {});
  },

  async listPasses(id: string): Promise<{ success: boolean; data: any[] }> {
    return await apiClient.get<{ success: boolean; data: any[] }>(`/events/${id}/passes`);
  },

  async validatePassToken(token: string, gateId?: string): Promise<{ success: boolean; data: EventPassValidation }> {
    return await apiClient.post<{ success: boolean; data: EventPassValidation }>('/events/passes/validate', { token, gate_id: gateId });
  },

  async checkInPass(payload: {
    token: string;
    eventId?: string;
    gateId?: string;
    scanType?: 'GATE_ENTRY' | 'SESSION_CHECKIN' | 'BUS_BOARDING';
    verificationMethod?: 'QR_SCAN' | 'MANUAL_OVERRIDE' | 'NFC';
  }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>('/events/passes/checkin', {
      pass_token: payload.token,
      event_id: payload.eventId,
      gate_id: payload.gateId,
      verification_method: payload.verificationMethod || 'QR_SCAN',
      force_override: payload.verificationMethod === 'MANUAL_OVERRIDE',
    });
  },

  async getMyPasses(studentId?: string): Promise<{ success: boolean; data: any[] }> {
    const qs = studentId ? `?student_id=${studentId}` : '';
    return await apiClient.get<{ success: boolean; data: any[] }>(`/events/passes/mine${qs}`);
  },

  async getMyPass(eventId: string, studentId?: string): Promise<{ success: boolean; data: any }> {
    const qs = studentId ? `?student_id=${studentId}` : '';
    return await apiClient.get<{ success: boolean; data: any }>(`/events/${eventId}/passes/my-pass${qs}`);
  },

  // 6. Live Attendance
  async getAttendanceDashboard(id: string): Promise<{ success: boolean; data: EventAttendanceDashboard }> {
    return await apiClient.get<{ success: boolean; data: EventAttendanceDashboard }>(`/events/${id}/attendance`);
  },

  async markAttendanceManual(
    id: string,
    payload: { studentId: string; status: 'PRESENT' | 'ABSENT'; notes?: string }
  ): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/attendance`, payload);
  },

  // 7. Transport Management
  async getTransportData(id: string): Promise<{ success: boolean; data: EventTransportData }> {
    return await apiClient.get<{ success: boolean; data: EventTransportData }>(`/events/${id}/transport`);
  },

  async assignBusToEvent(id: string, payload: { busId: string; vehicleCapacity?: number; pickupPoint?: string; departureTime?: string; returnTime?: string; routeDescription?: string }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/transport/assign-bus`, payload);
  },

  async addStudentToBus(id: string, payload: { assignmentId: string; studentId: string; pickupStop?: string }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/transport/manifest`, payload);
  },

  async updateBoardingStatus(id: string, manifestId: string, status: 'NOT_BOARDED' | 'ON_BUS' | 'DROPPED' | 'ABSENT'): Promise<{ success: boolean; data: any }> {
    return await apiClient.patch<{ success: boolean; data: any }>(`/events/${id}/transport/manifest/${manifestId}`, { boardingStatus: status });
  },

  // 8. Staff Committees & Tasks Kanban
  async getTeams(id: string): Promise<{ success: boolean; data: any[] }> {
    return await apiClient.get<{ success: boolean; data: any[] }>(`/events/${id}/teams`);
  },

  async createTeam(id: string, payload: { name: string; leadStaffId?: string; responsibilities?: string }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/teams`, payload);
  },

  async getTasks(id: string, teamId?: string): Promise<{ success: boolean; data: EventTaskItem[] }> {
    const qs = teamId ? `?team_id=${teamId}` : '';
    return await apiClient.get<{ success: boolean; data: EventTaskItem[] }>(`/events/${id}/tasks${qs}`);
  },

  async createTask(id: string, payload: Partial<EventTaskItem>): Promise<{ success: boolean; data: EventTaskItem }> {
    return await apiClient.post<{ success: boolean; data: EventTaskItem }>(`/events/${id}/tasks`, payload);
  },

  async updateTaskStatus(id: string, taskId: string, status: string): Promise<{ success: boolean; data: EventTaskItem }> {
    return await apiClient.patch<{ success: boolean; data: EventTaskItem }>(`/events/${id}/tasks/${taskId}/status`, { status });
  },

  // 9. Budget & Expenses
  async getBudgetSummary(id: string): Promise<{ success: boolean; data: EventBudgetExpenseData }> {
    return await apiClient.get<{ success: boolean; data: EventBudgetExpenseData }>(`/events/${id}/budget`);
  },

  async addBudgetItem(id: string, payload: { category: string; itemName: string; estimatedCost: number; approvedCost?: number }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/budget`, payload);
  },

  async recordExpense(id: string, payload: { category: string; payeeName: string; amount: number; invoiceNo?: string; paymentMode?: string }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/expenses`, payload);
  },

  // 10. Competitions & House Leaderboard
  async getCompetitions(id: string): Promise<{ success: boolean; data: any[] }> {
    return await apiClient.get<{ success: boolean; data: any[] }>(`/events/${id}/competitions`);
  },

  async createCompetition(id: string, payload: { title: string; category?: string; maxParticipants?: number; goldPoints?: number; silverPoints?: number; bronzePoints?: number }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/competitions`, payload);
  },

  async recordCompetitionScore(id: string, compId: string, payload: { participantId: string; rank?: number; scoreValue?: number; medal?: string; houseId?: string; isHousePointsAwarded?: boolean }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/competitions/${compId}/scores`, payload);
  },

  async getHouseLeaderboard(id: string): Promise<{ success: boolean; data: HouseLeaderboardItem[] }> {
    return await apiClient.get<{ success: boolean; data: HouseLeaderboardItem[] }>(`/events/${id}/house-leaderboard`);
  },

  // 11. Certificates
  async issueCertificate(id: string, payload: { recipientType?: string; studentId?: string; recipientName: string; templateCode?: string; certificateTitle?: string }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/certificates/issue`, payload);
  },

  async getCertificates(id: string): Promise<{ success: boolean; data: any[] }> {
    return await apiClient.get<{ success: boolean; data: any[] }>(`/events/${id}/certificates`);
  },

  async verifyCertificate(certNo: string): Promise<{ success: boolean; data: any }> {
    return await apiClient.get<{ success: boolean; data: any }>(`/events/certificates/verify/${certNo}`, { omitAuth: true });
  },

  // 12. Safety Incidents
  async getIncidents(id: string): Promise<{ success: boolean; data: EventIncidentItem[] }> {
    return await apiClient.get<{ success: boolean; data: EventIncidentItem[] }>(`/events/${id}/incidents`);
  },

  async reportIncident(id: string, payload: { incidentType: string; severity: string; description: string; actionTaken?: string }): Promise<{ success: boolean; data: EventIncidentItem }> {
    return await apiClient.post<{ success: boolean; data: EventIncidentItem }>(`/events/${id}/incidents`, payload);
  },

  async resolveIncident(id: string, incidentId: string, resolutionNotes?: string): Promise<{ success: boolean; data: EventIncidentItem }> {
    return await apiClient.patch<{ success: boolean; data: EventIncidentItem }>(`/events/${id}/incidents/${incidentId}/resolve`, { resolutionNotes });
  },

  // 13. Dynamic Feedback & Surveys
  async getFeedbackAnalytics(id: string): Promise<{ success: boolean; data: any }> {
    return await apiClient.get<{ success: boolean; data: any }>(`/events/${id}/feedback/analytics`);
  },

  async submitFeedback(id: string, payload: { overallRating: number; responses: Record<string, any>; comments?: string }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/feedback`, payload);
  },

  // 14. Event Closure & Executive Final Report
  async closeEvent(id: string, checklist?: Record<string, boolean>): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/close`, { checklist });
  },

  async generateExecutiveReport(id: string): Promise<{ success: boolean; data: EventReportData }> {
    return await apiClient.post<{ success: boolean; data: EventReportData }>(`/events/${id}/report`, {});
  },

  async getExecutiveReport(id: string): Promise<{ success: boolean; data: EventReportData }> {
    return await apiClient.get<{ success: boolean; data: EventReportData }>(`/events/${id}/report`);
  },

  // 15. Templates
  async getTemplates(): Promise<{ success: boolean; data: any[] }> {
    return await apiClient.get<{ success: boolean; data: any[] }>('/events/templates');
  },

  async recordPayment(id: string, payload: { studentId?: string; amount: number; paymentMethod?: string; registrationId?: string }): Promise<{ success: boolean; data: any }> {
    return await apiClient.post<{ success: boolean; data: any }>(`/events/${id}/payments`, {
      student_id: payload.studentId,
      registration_id: payload.registrationId,
      amount: payload.amount,
      payment_method: payload.paymentMethod || 'UPI',
    });
  },
};
