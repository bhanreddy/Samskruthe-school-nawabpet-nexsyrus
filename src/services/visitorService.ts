import { api } from './apiClient';

export interface SchoolGate {
  id: string;
  name: string;
  code: string;
  description?: string;
  gate_type: string;
  is_active: boolean;
  allow_visitors: boolean;
  allow_students: boolean;
  allow_deliveries: boolean;
  allow_vehicles: boolean;
}

export interface VisitorProfile {
  id: string;
  full_name: string;
  mobile_number: string;
  email?: string;
  visitor_type: string;
  relationship?: string;
  profile_photo_url?: string;
  id_type?: string;
  id_reference_masked?: string;
  is_watchlisted: boolean;
}

export interface VisitorPass {
  id: string;
  pass_code: string;
  valid_from: string;
  valid_until: string;
  max_entries: number;
  entry_count: number;
  pass_type: string;
  status: string;
}

export interface VisitorRequest {
  id: string;
  school_id: number;
  visitor_profile_id: string;
  visitor_name: string;
  visitor_mobile: string;
  visitor_type: string;
  profile_photo_url?: string;
  destination_department?: string;
  student_id?: string;
  student_name?: string;
  student_admission_no?: string;
  class_name?: string;
  section_name?: string;
  host_user_id?: string;
  host_name?: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  visitor_count: number;
  vehicle_number?: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'CHECKED_IN' | 'CHECKED_OUT';
  pass_code?: string;
  pass_status?: string;
  valid_from?: string;
  valid_until?: string;
  qrToken?: string;
  notes?: string;
}

export interface InsideVisitor {
  checkin_id: string;
  checked_in_at: string;
  expected_checkout_at: string;
  verification_method: string;
  photo_url?: string;
  vehicle_number?: string;
  items_carried?: string;
  visitor_name: string;
  visitor_mobile: string;
  visitor_type: string;
  purpose: string;
  destination_department?: string;
  gate_name?: string;
  host_name?: string;
  student_name?: string;
  elapsedMinutes: number;
  isOverstayed: boolean;
  overstayMinutes: number;
  statusLabel: string;
}

export interface AuthorizedGuardian {
  id: string;
  student_id: string;
  name: string;
  relationship: string;
  mobile: string;
  photo_url?: string;
  id_reference_masked?: string;
  status: 'ACTIVE' | 'DISABLED' | 'REVOKED';
  valid_from: string;
  valid_until?: string;
  notes?: string;
}

export interface PickupAuthorization {
  id: string;
  student_id: string;
  student_name?: string;
  admission_no?: string;
  pickup_name: string;
  pickup_relationship: string;
  pickup_mobile: string;
  pickup_photo_url?: string;
  pass_code: string;
  pickup_date: string;
  valid_start_time: string;
  valid_end_time: string;
  vehicle_number?: string;
  status: string;
  released_at?: string;
}

export interface VisitorAnalytics {
  summary: {
    visitsToday: number;
    currentlyInside: number;
    expectedToday: number;
    pendingApprovals: number;
    rejectedToday: number;
    overstayedNow: number;
    deliveriesToday: number;
    incidentsToday: number;
  };
  categories: { category: string; count: number }[];
  gates: { gate_name: string; entries: number }[];
}

export const visitorService = {
  // Gates
  async getGates() {
    const res = await api.get<{ gates: SchoolGate[] }>('/visitor-management/gates');
    return res.gates || [];
  },

  async getMyGate() {
    const res = await api.get<{ currentGate: SchoolGate | null; assignedGates: SchoolGate[] }>(
      '/visitor-management/gatekeeper/my-gate'
    );
    return res;
  },

  async createGate(body: Partial<SchoolGate>) {
    return api.post<{ gate: SchoolGate }>('/visitor-management/gates', body);
  },

  // Settings
  async getSettings() {
    return api.get<{ settings: any; policies: any[] }>('/visitor-management/settings');
  },

  async updateSettings(body: any) {
    return api.patch<{ settings: any }>('/visitor-management/settings', body);
  },

  // Requests
  async createVisitorRequest(body: any) {
    return api.post<{ request: VisitorRequest; pass?: VisitorPass; qrToken?: string }>(
      '/visitor-management/requests',
      body
    );
  },

  async getVisitorRequests(params?: { status?: string; date?: string; studentId?: string; search?: string; page?: number }) {
    const res = await api.get<{ requests: VisitorRequest[] }>('/visitor-management/requests', params);
    return res.requests || [];
  },

  async getVisitorRequest(id: string) {
    const res = await api.get<{ request: VisitorRequest }>(`/visitor-management/requests/${id}`);
    return res.request;
  },

  async approveVisitorRequest(id: string, notes?: string) {
    return api.post(`/visitor-management/requests/${id}/approve`, { notes });
  },

  async rejectVisitorRequest(id: string, reason?: string) {
    return api.post(`/visitor-management/requests/${id}/reject`, { reason });
  },

  // Scanner & Passes
  async validateVisitorPass(token: string, gateId?: string) {
    return api.post<{
      isValid: boolean;
      reason: string;
      message: string;
      pass?: any;
      watchlistAlert?: { level: string; reason: string } | null;
    }>('/visitor-management/passes/validate', { token, gateId });
  },

  async checkInVisitor(body: {
    passToken?: string;
    requestId?: string;
    gateId: string;
    photoUrl?: string;
    vehicleNumber?: string;
    itemsCarried?: string;
    verificationMethod?: string;
    notes?: string;
  }) {
    return api.post<{ checkin: any }>('/visitor-management/check-in', body);
  },

  async checkOutVisitor(body: { checkinId?: string; passToken?: string; exitGateId?: string; notes?: string }) {
    return api.post<{ checkout: any }>('/visitor-management/check-out', body);
  },

  async registerWalkIn(body: any) {
    return api.post<{ request: VisitorRequest; checkin: any }>('/visitor-management/walk-in', body);
  },

  // Live Register & Expected
  async getCurrentlyInside(params?: { gateId?: string; category?: string }) {
    const res = await api.get<{ visitors: InsideVisitor[]; count: number }>(
      '/visitor-management/currently-inside',
      params
    );
    return res.visitors || [];
  },

  async getExpectedVisitors() {
    const res = await api.get<{ expected: VisitorRequest[] }>('/visitor-management/expected');
    return res.expected || [];
  },

  async getAnalytics(): Promise<VisitorAnalytics> {
    return api.get<VisitorAnalytics>('/visitor-management/analytics');
  },

  // Student Pickups
  async getGuardians(studentId: string) {
    const res = await api.get<{ guardians: AuthorizedGuardian[] }>('/visitor-management/guardians', { studentId });
    return res.guardians || [];
  },

  async addGuardian(body: any) {
    return api.post<{ guardian: AuthorizedGuardian }>('/visitor-management/guardians', body);
  },

  async createPickup(body: any) {
    return api.post<{ authorization: PickupAuthorization; qrToken: string; otp?: string }>(
      '/visitor-management/pickups',
      body
    );
  },

  async validatePickup(token: string, otp?: string) {
    return api.post<{ isValid: boolean; reason: string; message: string; record?: any }>(
      '/visitor-management/pickups/validate',
      { token, otp }
    );
  },

  async releaseStudent(authorizationId: string, gateId: string, notes?: string) {
    return api.post<{ authorization: any }>('/visitor-management/pickups/release', {
      authorizationId,
      gateId,
      notes,
    });
  },

  // Deliveries
  async logDelivery(body: any) {
    return api.post<{ delivery: any }>('/visitor-management/deliveries', body);
  },

  async getDeliveries(status?: string) {
    const res = await api.get<{ deliveries: any[] }>('/visitor-management/deliveries', { status });
    return res.deliveries || [];
  },

  async collectDelivery(id: string, collectedByName?: string) {
    return api.patch(`/visitor-management/deliveries/${id}/collect`, { collectedByName });
  },

  // Materials
  async logMaterialPass(body: any) {
    return api.post<{ pass: any }>('/visitor-management/materials', body);
  },

  async getMaterialPasses() {
    const res = await api.get<{ passes: any[] }>('/visitor-management/materials');
    return res.passes || [];
  },

  // Security & Incidents
  async reportIncident(body: any) {
    return api.post<{ incident: any }>('/visitor-management/incidents', body);
  },

  async getIncidents() {
    const res = await api.get<{ incidents: any[] }>('/visitor-management/incidents');
    return res.incidents || [];
  },

  async getWatchlist() {
    const res = await api.get<{ watchlist: any[] }>('/visitor-management/watchlist');
    return res.watchlist || [];
  },

  async addToWatchlist(body: any) {
    return api.post<{ entry: any }>('/visitor-management/watchlist', body);
  },

  // Emergency
  async getEmergencyStatus() {
    return api.get<{ isActive: boolean; emergency: any; muster: any[] }>('/visitor-management/emergency');
  },

  async activateEmergency(body: { incidentType?: string; notes?: string }) {
    return api.post<{ emergency: any }>('/visitor-management/emergency/activate', body);
  },

  async resolveEmergency(emergencyId: string, notes?: string) {
    return api.post<{ emergency: any }>('/visitor-management/emergency/resolve', { emergencyId, notes });
  },

  async markEmergencyEntry(entryId: string, status: string, remarks?: string) {
    return api.post('/visitor-management/emergency/mark-entry', { entryId, status, remarks });
  },

  async cancelVisitorRequest(id: string, reason?: string) {
    return api.post(`/visitor-management/requests/${id}/cancel`, { reason });
  },

  async searchVisitors(q: string) {
    const res = await api.get<{ visitors: any[] }>('/visitor-management/search', { q });
    return res.visitors || [];
  },

  async getHistory() {
    const res = await api.get<{ history: VisitorRequest[] }>('/visitor-management/history');
    return res.history || [];
  },

  async getVehicles(insideOnly = false) {
    const res = await api.get<{ vehicles: any[] }>('/visitor-management/vehicles', { insideOnly: String(insideOnly) });
    return res.vehicles || [];
  },

  async recordVehicle(body: any) {
    return api.post('/visitor-management/vehicles', body);
  },

  async getContractors() {
    const res = await api.get<{ contractors: any[] }>('/visitor-management/contractors');
    return res.contractors || [];
  },

  async createContractor(body: any) {
    return api.post('/visitor-management/contractors', body);
  },

  async getPickups() {
    const res = await api.get<{ pickups: PickupAuthorization[] }>('/visitor-management/pickups');
    return res.pickups || [];
  },

  async updateGuardian(id: string, body: any) {
    return api.patch(`/visitor-management/guardians/${id}`, body);
  },

  async updatePolicy(category: string, body: { policyType?: string; isActive?: boolean }) {
    return api.patch(`/visitor-management/policies/${category}`, body);
  },

  async syncOfflineEvent(body: { clientEventId: string; eventType: string; payload: any }) {
    return api.post('/visitor-management/offline/sync', body);
  },

  async getOfflineCache() {
    const res = await api.get<{ passes: any[] }>('/visitor-management/offline/cache');
    return res.passes || [];
  },
};
