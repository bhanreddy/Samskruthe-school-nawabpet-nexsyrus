import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AdminHeader from '../../../src/components/AdminHeader';
import {
  admissionService,
  type ApplicationDetailResponse,
} from '../../../src/services/admissionService';
import { showAlert } from '../../../src/components/CustomAlert';

type DetailTab = 'overview' | 'documents' | 'interview' | 'decision' | 'conversion' | 'notes' | 'comms';

export default function AdminApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApplicationDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  // Stage Transition Modal
  const [transitionModalVisible, setTransitionModalVisible] = useState(false);
  const [targetStageStatus, setTargetStageStatus] = useState('');
  const [transitionRemarks, setTransitionRemarks] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  // Document Verification / Rejection Modal
  const [rejectDocModalVisible, setRejectDocModalVisible] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [verifyingDoc, setVerifyingDoc] = useState(false);

  // Interview Schedule Modal
  const [interviewModalVisible, setInterviewModalVisible] = useState(false);
  const [interviewType, setInterviewType] = useState('STUDENT_INTERACTION');
  const [interviewTitle, setInterviewTitle] = useState('Principal & Student Interaction');
  const [interviewDate, setInterviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [interviewStartTime, setInterviewStartTime] = useState('10:00');
  const [interviewEndTime, setInterviewEndTime] = useState('10:30');
  const [interviewLocation, setInterviewLocation] = useState('Principal Office, Room 101');
  const [schedulingInterview, setSchedulingInterview] = useState(false);

  // Interview Evaluation Rubric Modal
  const [evalModalVisible, setEvalModalVisible] = useState(false);
  const [evalInterviewId, setEvalInterviewId] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({
    communication: 4,
    confidence: 4,
    academic_readiness: 4,
    behaviour: 5,
  });
  const [evalRecommendation, setEvalRecommendation] = useState('RECOMMENDED');
  const [evalFeedback, setEvalFeedback] = useState('');
  const [submittingEval, setSubmittingEval] = useState(false);

  // Decision Modal
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<'APPROVED' | 'CONDITIONALLY_APPROVED' | 'WAITLISTED' | 'REJECTED'>('APPROVED');
  const [decisionReason, setDecisionReason] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Conversion State
  const [customAdmissionNo, setCustomAdmissionNo] = useState('');
  const [customRollNo, setCustomRollNo] = useState('');
  const [converting, setConverting] = useState(false);
  const [conversionSuccess, setConversionSuccess] = useState<{
    admissionNumber: string;
    studentId: string;
  } | null>(null);

  // Staff Note State
  const [newNote, setNewNote] = useState('');
  const [notePriority, setNotePriority] = useState('NORMAL');
  const [addingNote, setAddingNote] = useState(false);
  const [staffMessageSubject, setStaffMessageSubject] = useState('');
  const [staffMessageBody, setStaffMessageBody] = useState('');
  const [sendingStaffMessage, setSendingStaffMessage] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await admissionService.getApplicationDetail(id);
      setData(res);
      if (res.application?.status === 'CONVERTED_TO_STUDENT') {
        setConversionSuccess({
        admissionNumber: res.application.converted_admission_no || res.application.application_no || '',
          studentId: res.application.converted_student_id || '',
        });
      }
    } catch (err: any) {
      showAlert({
        title: 'Error Loading Application',
        message: err?.response?.data?.error || err?.message || 'Could not fetch application dossier',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleTransitionStage = async () => {
    if (!id || !targetStageStatus) return;
    setTransitioning(true);
    try {
      await admissionService.transitionStage(id, targetStageStatus, transitionRemarks, true);
      showAlert({
        title: 'Stage Updated',
        message: `Application advanced to ${targetStageStatus}`,
        type: 'success',
      });
      setTransitionModalVisible(false);
      setTransitionRemarks('');
      fetchDetail();
    } catch (err: any) {
      showAlert({
        title: 'Transition Failed',
        message: err?.response?.data?.error || err?.message || 'Could not advance stage',
        type: 'error',
      });
    } finally {
      setTransitioning(false);
    }
  };

  const handleVerifyDocument = async (documentId: string) => {
    if (!id) return;
    setVerifyingDoc(true);
    try {
      await admissionService.verifyDocument(id, {
        documentId,
        status: 'VERIFIED',
      });
      showAlert({ title: 'Document Verified', message: 'Document marked as verified.', type: 'success' });
      fetchDetail();
    } catch (err: any) {
      showAlert({ title: 'Verification Error', message: err?.message || 'Failed to verify', type: 'error' });
    } finally {
      setVerifyingDoc(false);
    }
  };

  const handleRejectDocument = async () => {
    if (!id || !selectedDocId) return;
    if (!rejectionReason.trim()) {
      showAlert({ title: 'Reason Required', message: 'Please specify the rejection reason.', type: 'warning' });
      return;
    }
    setVerifyingDoc(true);
    try {
      await admissionService.verifyDocument(id, {
        documentId: selectedDocId,
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        replacementRequested: true,
      });
      showAlert({
        title: 'Document Rejected',
        message: 'Applicant has been notified to re-upload a valid document.',
        type: 'warning',
      });
      setRejectDocModalVisible(false);
      setRejectionReason('');
      fetchDetail();
    } catch (err: any) {
      showAlert({ title: 'Rejection Error', message: err?.message || 'Failed to reject', type: 'error' });
    } finally {
      setVerifyingDoc(false);
    }
  };

  const handleScheduleInterview = async () => {
    if (!id) return;
    setSchedulingInterview(true);
    try {
      await admissionService.scheduleInterview(id, {
        interviewType,
        title: interviewTitle,
        scheduledDate: interviewDate,
        startTime: interviewStartTime,
        endTime: interviewEndTime,
        location: interviewLocation,
        mode: 'OFFLINE',
      });
      showAlert({
        title: 'Interview Scheduled',
        message: 'Interview slot recorded and parent notified.',
        type: 'success',
      });
      setInterviewModalVisible(false);
      fetchDetail();
    } catch (err: any) {
      showAlert({ title: 'Scheduling Error', message: err?.message || 'Could not schedule interview', type: 'error' });
    } finally {
      setSchedulingInterview(false);
    }
  };

  const handleSubmitEvaluation = async () => {
    if (!id || !evalInterviewId) return;
    setSubmittingEval(true);
    try {
      await admissionService.evaluateInterview(id, {
        interviewId: evalInterviewId,
        rubricScores,
        recommendation: evalRecommendation,
        feedback: evalFeedback,
      });
      showAlert({
        title: 'Evaluation Submitted',
        message: 'Interview evaluation & rubric scores have been saved.',
        type: 'success',
      });
      setEvalModalVisible(false);
      fetchDetail();
    } catch (err: any) {
      showAlert({ title: 'Evaluation Error', message: err?.message || 'Could not save rubric', type: 'error' });
    } finally {
      setSubmittingEval(false);
    }
  };

  const handleMakeDecision = async () => {
    if (!id) return;
    setSubmittingDecision(true);
    try {
      await admissionService.makeDecision(id, {
        decision: selectedDecision,
        decisionReason: decisionReason.trim(),
      });
      showAlert({
        title: `Decision: ${selectedDecision}`,
        message: 'Application decision recorded successfully.',
        type: 'success',
      });
      setDecisionModalVisible(false);
      fetchDetail();
    } catch (err: any) {
      showAlert({ title: 'Decision Failed', message: err?.message || 'Could not save decision', type: 'error' });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleConvertToStudent = async () => {
    if (!id) return;
    setConverting(true);
    try {
      const res = await admissionService.convertToStudent(id, {
        custom_admission_no: customAdmissionNo.trim() || undefined,
        roll_number: customRollNo.trim() ? Number(customRollNo.trim()) : undefined,
      });

      setConversionSuccess({
        admissionNumber: res.student?.admission_number || res.admissionNumber,
        studentId: res.student?.id || res.studentId,
      });

      showAlert({
        title: '🎉 Admission Finalized!',
        message: `Student account generated successfully. Official Admission No: ${res.student?.admission_number || res.admissionNumber}`,
        type: 'success',
      });

      fetchDetail();
    } catch (err: any) {
      showAlert({
        title: 'Conversion Blocked',
        message: err?.response?.data?.error || err?.message || 'Conversion requirements not met',
        type: 'error',
      });
    } finally {
      setConverting(false);
    }
  };

  const handleAddNote = async () => {
    if (!id || !newNote.trim()) return;
    setAddingNote(true);
    try {
      await admissionService.addNote(id, newNote.trim(), notePriority);
      showAlert({ title: 'Note Added', message: 'Internal staff note recorded.', type: 'success' });
      setNewNote('');
      fetchDetail();
    } catch (err: any) {
      showAlert({ title: 'Note Error', message: err?.message || 'Could not save note', type: 'error' });
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.loadingText}>Opening application dossier...</Text>
      </View>
    );
  }

  const app = data?.application;
  const isConverted = app?.status === 'CONVERTED_TO_STUDENT';
  const readyForConversion = data?.conversionReadiness?.ready;

  return (
    <View style={styles.container}>
      <AdminHeader
        title={app?.application_no || app?.application_number || 'Admission Dossier'}
        showBackButton
        rightAction={{
          icon: 'refresh-outline',
          onPress: fetchDetail,
        }}
      />

      {/* Top Dossier Header Card */}
      <View style={styles.dossierHeader}>
        <View style={styles.dossierTopRow}>
          <View style={styles.dossierAvatar}>
            <Text style={styles.dossierAvatarText}>
              {(app?.student_first_name || 'A')[0].toUpperCase()}
            </Text>
          </View>

          <View style={styles.dossierInfoCol}>
            <Text style={styles.dossierStudentName}>
              {app?.student_first_name} {app?.student_last_name}
            </Text>
            <Text style={styles.dossierMeta}>
              Applying for: <Text style={styles.boldText}>{app?.class_name || 'Grade'}</Text> • {app?.academic_year_name}
            </Text>
            <Text style={styles.dossierContact}>
              Parent: {app?.father_name || app?.mother_name || 'Guardian'} (📞 {app?.father_phone || app?.parent_phone})
            </Text>
          </View>

          {/* Transition Stage Action */}
          {!isConverted && (
            <TouchableOpacity
              style={styles.transitionStageBtn}
              onPress={() => setTransitionModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="git-pull-request-outline" size={16} color="#FFFFFF" />
              <Text style={styles.transitionStageBtnText}>Advance Stage</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status Pills Row */}
        <View style={styles.dossierPillsRow}>
          <View style={[styles.stagePill, { backgroundColor: app?.stage_color || '#0F766E' }]}>
            <Text style={styles.stagePillText}>
              {app?.current_stage_name || app?.status}
            </Text>
          </View>

          {app?.decision_status && (
            <View
              style={[
                styles.decisionPill,
                app.decision_status === 'APPROVED' ? styles.decisionApproved : styles.decisionOther,
              ]}
            >
              <Text style={styles.decisionPillText}>DECISION: {app.decision_status}</Text>
            </View>
          )}

          {app?.is_sla_breached && (
            <View style={styles.slaBreachBadge}>
              <Ionicons name="alert-circle" size={12} color="#DC2626" />
              <Text style={styles.slaBreachBadgeText}>SLA BREACHED</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tabs Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {[
          { key: 'overview', label: 'Overview', icon: 'person-outline' },
          { key: 'documents', label: `Docs (${data?.documents?.verifiedDocuments || 0}/${data?.documents?.requiredDocuments || 0})`, icon: 'document-text-outline' },
          { key: 'interview', label: `Interview (${data?.interviews?.length || 0})`, icon: 'calendar-outline' },
          { key: 'decision', label: 'Decision', icon: 'ribbon-outline' },
          { key: 'comms', label: `Messages (${data?.communications?.length || 0})`, icon: 'chatbubble-ellipses-outline' },
          { key: 'conversion', label: 'Student Conversion', icon: 'school-outline' },
          { key: 'notes', label: `Notes (${data?.notes?.length || 0})`, icon: 'create-outline' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key as DetailTab)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? '#0F766E' : '#64748B'}
            />
            <Text
              style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Body */}
      <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={styles.tabSection}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Student Particulars</Text>
              <View style={styles.dataGrid}>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Date of Birth</Text>
                  <Text style={styles.dataVal}>{app?.dob || 'Not specified'}</Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Gender</Text>
                  <Text style={styles.dataVal}>{app?.gender_name || 'N/A'}</Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Blood Group</Text>
                  <Text style={styles.dataVal}>{app?.blood_group_name || 'N/A'}</Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Aadhaar Number</Text>
                  <Text style={styles.dataVal}>{app?.aadhaar_number || 'N/A'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Family & Guardians</Text>
              <View style={styles.dataGrid}>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Father's Name</Text>
                  <Text style={styles.dataVal}>{app?.father_name || 'N/A'}</Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Father's Phone</Text>
                  <Text style={styles.dataVal}>{app?.father_phone || 'N/A'}</Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Mother's Name</Text>
                  <Text style={styles.dataVal}>{app?.mother_name || 'N/A'}</Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Primary Email</Text>
                  <Text style={styles.dataVal}>{app?.parent_email || 'N/A'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardHeader}>Logistics & Medical</Text>
              <View style={styles.dataGrid}>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Transport Required</Text>
                  <Text style={styles.dataVal}>{app?.transport_required ? 'Yes' : 'No'}</Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={styles.dataLabel}>Hostel Required</Text>
                  <Text style={styles.dataVal}>{app?.hostel_required ? 'Yes' : 'No'}</Text>
                </View>
                <View style={[styles.dataItem, { width: '100%' }]}>
                  <Text style={styles.dataLabel}>Medical Notes / Allergies</Text>
                  <Text style={styles.dataVal}>{app?.medical_conditions || 'None reported'}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB: DOCUMENTS WORKBENCH */}
        {activeTab === 'documents' && (
          <View style={styles.tabSection}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Document Verification Workbench</Text>
              <Text style={styles.cardSub}>
                Verify submitted original/scanned certificates. Rejecting will prompt the applicant for an immediate replacement.
              </Text>

              {data?.documents?.checklist.map((docItem) => {
                const isVerified = docItem.status === 'VERIFIED';
                const isRejected = docItem.status === 'REJECTED';
                const isUploaded = Boolean(docItem.document);

                return (
                  <View key={docItem.documentType} style={styles.docRow}>
                    <View style={styles.docRowLeft}>
                      <Ionicons
                        name={isVerified ? 'checkmark-circle' : isRejected ? 'close-circle' : 'document-outline'}
                        size={24}
                        color={isVerified ? '#059669' : isRejected ? '#DC2626' : '#0F766E'}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docTitle}>
                          {docItem.title} {docItem.isMandatory ? '*' : ''}
                        </Text>
                        <Text style={styles.docMeta}>
                          {docItem.document?.file_name || 'No file uploaded yet'}
                        </Text>
                        {isRejected && docItem.document?.rejection_reason ? (
                          <Text style={styles.rejectionNote}>
                            Reason: {docItem.document.rejection_reason}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.docRowActions}>
                      {docItem.document?.file_url ? (
                        <TouchableOpacity
                          style={styles.viewDocBtn}
                          onPress={() => docItem.document?.file_url && Linking.openURL(docItem.document.file_url)}
                        >
                          <Ionicons name="eye-outline" size={14} color="#0F766E" />
                          <Text style={styles.viewDocBtnText}>View</Text>
                        </TouchableOpacity>
                      ) : null}

                      {isUploaded && !isVerified && (
                        <>
                          <TouchableOpacity
                            style={styles.verifyBtn}
                            onPress={() => docItem.document && handleVerifyDocument(docItem.document.id)}
                            disabled={verifyingDoc}
                          >
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            <Text style={styles.verifyBtnText}>Verify</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => {
                              if (docItem.document) {
                                setSelectedDocId(docItem.document.id);
                                setRejectDocModalVisible(true);
                              }
                            }}
                          >
                            <Ionicons name="close" size={14} color="#DC2626" />
                            <Text style={styles.rejectBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {isVerified && (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB: INTERVIEW & RUBRIC */}
        {activeTab === 'interview' && (
          <View style={styles.tabSection}>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardHeader}>Interview & Entrance Assessment</Text>
                <TouchableOpacity
                  style={styles.scheduleActionBtn}
                  onPress={() => setInterviewModalVisible(true)}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.scheduleActionBtnText}>Schedule Slot</Text>
                </TouchableOpacity>
              </View>

              {(data?.interviews || []).length === 0 ? (
                <Text style={styles.emptyNote}>No interview sessions scheduled yet.</Text>
              ) : (
                data?.interviews.map((iv) => (
                  <View key={iv.id} style={styles.interviewSessionCard}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.interviewSessionTitle}>{iv.title}</Text>
                      <View style={styles.sessionStatusPill}>
                        <Text style={styles.sessionStatusText}>{iv.status}</Text>
                      </View>
                    </View>

                    <Text style={styles.sessionDate}>
                      📅 {new Date(iv.scheduled_date).toLocaleDateString()} ({iv.start_time} - {iv.end_time})
                    </Text>

                    {iv.rubric_scores ? (
                      <View style={styles.rubricBox}>
                        <Text style={styles.rubricHeader}>Rubric Evaluation (1-5):</Text>
                        <View style={styles.rubricGrid}>
                          {Object.entries(iv.rubric_scores).map(([metric, score]) => (
                            <View key={metric} style={styles.rubricItem}>
                              <Text style={styles.rubricLabel}>{metric.replace('_', ' ')}:</Text>
                              <Text style={styles.rubricScore}>{score} / 5</Text>
                            </View>
                          ))}
                        </View>
                        {iv.recommendation ? (
                          <Text style={styles.rubricRecommendation}>
                            Recommendation: <Text style={styles.boldText}>{iv.recommendation}</Text>
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.evaluateActionBtn}
                        onPress={() => {
                          setEvalInterviewId(iv.id);
                          setEvalModalVisible(true);
                        }}
                      >
                        <Ionicons name="calculator-outline" size={16} color="#0F766E" />
                        <Text style={styles.evaluateActionBtnText}>Evaluate with Rubric</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* TAB: DECISION */}
        {activeTab === 'decision' && (
          <View style={styles.tabSection}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Management Admission Decision</Text>
              <Text style={styles.cardSub}>
                Record the final decision of the admissions committee.
              </Text>

              <View style={styles.decisionStatusCard}>
                <Text style={styles.decisionStatusLabel}>Current Decision:</Text>
                <Text
                  style={[
                    styles.decisionStatusVal,
                    app?.decision_status === 'APPROVED' ? { color: '#059669' } : { color: '#0F172A' },
                  ]}
                >
                  {app?.decision_status || 'NOT DECIDED'}
                </Text>
                {app?.decision_reason ? (
                  <Text style={styles.decisionReasonText}>Rationale: {app.decision_reason}</Text>
                ) : null}
              </View>

              {!isConverted && (
                <TouchableOpacity
                  style={styles.recordDecisionBtn}
                  onPress={() => setDecisionModalVisible(true)}
                >
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.recordDecisionBtnText}>Set / Update Decision</Text>
                </TouchableOpacity>
              )}
              {app?.status === 'WAITLISTED' && (
                <TouchableOpacity
                  style={[styles.recordDecisionBtn, { marginTop: 10, backgroundColor: '#0F766E' }]}
                  onPress={async () => {
                    try {
                      await admissionService.promoteWaitlist(id);
                      showAlert({ title: 'Promoted', message: 'Applicant promoted from waitlist.', type: 'success' });
                      fetchDetail();
                    } catch (err: any) {
                      showAlert({ title: 'Promote failed', message: err?.message || 'Could not promote', type: 'error' });
                    }
                  }}
                >
                  <Text style={styles.recordDecisionBtnText}>Promote from waitlist</Text>
                </TouchableOpacity>
              )}
              {app?.status === 'FEE_PENDING' && (
                <TouchableOpacity
                  style={[styles.recordDecisionBtn, { marginTop: 10, backgroundColor: '#D97706' }]}
                  onPress={async () => {
                    try {
                      await admissionService.markFeePaid(id);
                      showAlert({ title: 'Fee recorded', message: 'Admission fee marked as paid.', type: 'success' });
                      fetchDetail();
                    } catch (err: any) {
                      showAlert({ title: 'Update failed', message: err?.message || 'Could not mark fee paid', type: 'error' });
                    }
                  }}
                >
                  <Text style={styles.recordDecisionBtnText}>Mark admission fee paid</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {activeTab === 'comms' && (
          <View style={styles.tabSection}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Applicant communication</Text>
              <TextInput
                style={styles.input}
                placeholder="Subject"
                value={staffMessageSubject}
                onChangeText={setStaffMessageSubject}
              />
              <TextInput
                style={[styles.input, { height: 80, marginTop: 8 }]}
                placeholder="Message to parent / applicant"
                multiline
                value={staffMessageBody}
                onChangeText={setStaffMessageBody}
              />
              <TouchableOpacity
                style={[styles.recordDecisionBtn, { marginTop: 10 }]}
                disabled={sendingStaffMessage}
                onPress={async () => {
                  if (!id || !staffMessageSubject.trim() || !staffMessageBody.trim()) {
                    showAlert({ title: 'Required', message: 'Subject and message are required.', type: 'warning' });
                    return;
                  }
                  setSendingStaffMessage(true);
                  try {
                    await admissionService.sendMessage(id, staffMessageSubject.trim(), staffMessageBody.trim());
                    setStaffMessageSubject('');
                    setStaffMessageBody('');
                    showAlert({ title: 'Sent', message: 'Message sent to applicant.', type: 'success' });
                    fetchDetail();
                  } catch (err: any) {
                    showAlert({ title: 'Send failed', message: err?.message || 'Could not send', type: 'error' });
                  } finally {
                    setSendingStaffMessage(false);
                  }
                }}
              >
                <Text style={styles.recordDecisionBtnText}>{sendingStaffMessage ? 'Sending...' : 'Send message'}</Text>
              </TouchableOpacity>
              <View style={{ marginTop: 16 }}>
                {(data?.communications || []).length === 0 ? (
                  <Text style={styles.emptyNote}>No messages yet.</Text>
                ) : (
                  data?.communications.map((c) => (
                    <View key={c.id} style={styles.noteItem}>
                      <Text style={styles.noteAuthor}>{c.sender_type} · {c.subject} · {new Date(c.created_at).toLocaleString()}</Text>
                      <Text style={styles.noteText}>{c.message}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}

        {/* TAB: TRANSACTIONAL STUDENT CONVERSION */}
        {activeTab === 'conversion' && (
          <View style={styles.tabSection}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Convert to Official Enrolled Student</Text>
              <Text style={styles.cardSub}>
                Transactionally generates student profile, parent mapping, academic year enrollment, and collision-free admission number.
              </Text>

              {isConverted ? (
                <View style={styles.conversionSuccessBox}>
                  <Ionicons name="checkmark-circle" size={48} color="#059669" />
                  <Text style={styles.conversionSuccessTitle}>Student Successfully Enrolled</Text>
                  <Text style={styles.conversionSuccessSub}>Official Admission Number:</Text>
                  <View style={styles.admissionNoBadge}>
                    <Text style={styles.admissionNoBadgeText}>
                      {conversionSuccess?.admissionNumber || app?.converted_admission_no}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewStudentBtn}
                    onPress={() => router.push('/admin/students')}
                  >
                    <Ionicons name="people-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.viewStudentBtnText}>Go to Students Directory</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.conversionForm}>
                  {/* Pre-flight Check Banner */}
                  <View
                    style={[
                      styles.preflightBox,
                      readyForConversion ? styles.preflightReady : styles.preflightBlocked,
                    ]}
                  >
                    <Ionicons
                      name={readyForConversion ? 'checkmark-circle' : 'alert-circle'}
                      size={20}
                      color={readyForConversion ? '#059669' : '#DC2626'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.preflightTitle,
                          readyForConversion ? { color: '#065F46' } : { color: '#991B1B' },
                        ]}
                      >
                        {readyForConversion ? 'Ready for Student Conversion' : 'Pre-flight Validation Warning'}
                      </Text>
                      {data?.conversionReadiness?.errors.map((e, idx) => (
                        <Text key={idx} style={styles.preflightError}>• {e}</Text>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Custom Admission Number (Leave blank to auto-generate sequentially)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. ADM/26/0120 (Auto if blank)"
                      value={customAdmissionNo}
                      onChangeText={setCustomAdmissionNo}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Roll Number (Optional - Auto-assigned sequentially if blank)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 1"
                      keyboardType="numeric"
                      value={customRollNo}
                      onChangeText={setCustomRollNo}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.convertSubmitBtn, converting && styles.btnDisabled]}
                    onPress={handleConvertToStudent}
                    disabled={converting}
                  >
                    {converting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="flash" size={18} color="#FFFFFF" />
                        <Text style={styles.convertSubmitBtnText}>
                          Execute Transactional Conversion
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* TAB: NOTES & AUDIT */}
        {activeTab === 'notes' && (
          <View style={styles.tabSection}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Staff Internal Notes</Text>

              <View style={styles.addNoteBox}>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  placeholder="Add private staff note regarding candidate..."
                  multiline
                  value={newNote}
                  onChangeText={setNewNote}
                />
                <TouchableOpacity
                  style={styles.addNoteBtn}
                  onPress={handleAddNote}
                  disabled={addingNote}
                >
                  {addingNote ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.addNoteBtnText}>Save Note</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 16 }}>
                {(data?.notes || []).length === 0 ? (
                  <Text style={styles.emptyNote}>No internal notes logged yet.</Text>
                ) : (
                  data?.notes.map((n) => (
                    <View key={n.id} style={styles.noteItem}>
                      <Text style={styles.noteAuthor}>Staff Note • {new Date(n.created_at).toLocaleString()}</Text>
                      <Text style={styles.noteText}>{n.note}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Stage Advance Modal */}
      <Modal
        visible={transitionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTransitionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Advance Workflow Stage</Text>
            <Text style={styles.modalSub}>Select next destination stage for this applicant:</Text>

            {[
              'APPLICATION_SUBMITTED',
              'UNDER_VERIFICATION',
              'DOCUMENT_VERIFICATION',
              'INTERVIEW_SCHEDULED',
              'ENTRANCE_TEST_SCHEDULED',
              'MANAGEMENT_APPROVAL',
              'PROVISIONAL_OFFER_SENT',
              'ADMISSION_APPROVED',
              'FEE_PAYMENT_PENDING',
              'READY_FOR_ENROLLMENT',
            ].map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.stageOptionBtn, targetStageStatus === st && styles.stageOptionBtnActive]}
                onPress={() => setTargetStageStatus(st)}
              >
                <Text
                  style={[
                    styles.stageOptionText,
                    targetStageStatus === st && styles.stageOptionTextActive,
                  ]}
                >
                  {st.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={[styles.input, { marginTop: 12, height: 50 }]}
              placeholder="Stage advance remarks / notes..."
              value={transitionRemarks}
              onChangeText={setTransitionRemarks}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTransitionModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleTransitionStage}
                disabled={transitioning || !targetStageStatus}
              >
                {transitioning ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Advance</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Document Modal */}
      <Modal
        visible={rejectDocModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectDocModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Document</Text>
            <Text style={styles.modalSub}>
              Specify why this document is unacceptable. The applicant will be notified to upload a replacement.
            </Text>

            <TextInput
              style={[styles.input, { height: 72, marginTop: 12 }]}
              placeholder="e.g. Scanned copy is illegible or blurry, please re-upload clear photo."
              multiline
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectDocModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleRejectDocument}
                disabled={verifyingDoc}
              >
                <Text style={styles.modalConfirmBtnText}>Reject & Request Re-upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal
        visible={interviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInterviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Schedule Interview / Interaction</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={interviewTitle} onChangeText={setInterviewTitle} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={interviewDate} onChangeText={setInterviewDate} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput style={styles.input} value={interviewStartTime} onChangeText={setInterviewStartTime} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>End Time</Text>
                <TextInput style={styles.input} value={interviewEndTime} onChangeText={setInterviewEndTime} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location / Room</Text>
              <TextInput style={styles.input} value={interviewLocation} onChangeText={setInterviewLocation} />
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setInterviewModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleScheduleInterview}
                disabled={schedulingInterview}
              >
                <Text style={styles.modalConfirmBtnText}>Save Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rubric Evaluation Modal */}
      <Modal
        visible={evalModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEvalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rubric Scoring (1 - 5 Stars)</Text>

            {['communication', 'confidence', 'academic_readiness', 'behaviour'].map((dim) => (
              <View key={dim} style={styles.rubricScoringRow}>
                <Text style={styles.rubricScoringLabel}>{dim.replace('_', ' ').toUpperCase()}</Text>
                <View style={styles.scoreButtonsRow}>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <TouchableOpacity
                      key={score}
                      style={[
                        styles.scoreBtn,
                        rubricScores[dim] === score && styles.scoreBtnActive,
                      ]}
                      onPress={() => setRubricScores({ ...rubricScores, [dim]: score })}
                    >
                      <Text
                        style={[
                          styles.scoreBtnText,
                          rubricScores[dim] === score && styles.scoreBtnTextActive,
                        ]}
                      >
                        {score}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Evaluator Recommendation</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {['RECOMMENDED', 'CONDITIONALLY_RECOMMENDED', 'NOT_RECOMMENDED'].map((rec) => (
                  <TouchableOpacity
                    key={rec}
                    style={[styles.recPill, evalRecommendation === rec && styles.recPillActive]}
                    onPress={() => setEvalRecommendation(rec)}
                  >
                    <Text style={[styles.recPillText, evalRecommendation === rec && styles.recPillTextActive]}>
                      {rec.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={[styles.input, { height: 60, marginTop: 8 }]}
              placeholder="Candidate feedback / notes..."
              multiline
              value={evalFeedback}
              onChangeText={setEvalFeedback}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEvalModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSubmitEvaluation}
                disabled={submittingEval}
              >
                <Text style={styles.modalConfirmBtnText}>Submit Rubric</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Decision Modal */}
      <Modal
        visible={decisionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDecisionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Admission Decision</Text>

            {(['APPROVED', 'CONDITIONALLY_APPROVED', 'WAITLISTED', 'REJECTED'] as const).map((dec) => (
              <TouchableOpacity
                key={dec}
                style={[styles.stageOptionBtn, selectedDecision === dec && styles.stageOptionBtnActive]}
                onPress={() => setSelectedDecision(dec)}
              >
                <Text style={[styles.stageOptionText, selectedDecision === dec && styles.stageOptionTextActive]}>
                  {dec.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={[styles.input, { height: 60, marginTop: 10 }]}
              placeholder="Decision rationale / conditions..."
              multiline
              value={decisionReason}
              onChangeText={setDecisionReason}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDecisionModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleMakeDecision}
                disabled={submittingDecision}
              >
                <Text style={styles.modalConfirmBtnText}>Save Decision</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  dossierHeader: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dossierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dossierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dossierAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dossierInfoCol: {
    flex: 1,
  },
  dossierStudentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  dossierMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  dossierContact: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  transitionStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  transitionStageBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dossierPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  stagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stagePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  decisionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  decisionApproved: {
    backgroundColor: '#D1FAE5',
  },
  decisionOther: {
    backgroundColor: '#FEF3C7',
  },
  decisionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  slaBreachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slaBreachBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B91C1C',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#CCFBF1',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabSection: {
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  dataItem: {
    width: '50%',
    marginBottom: 12,
  },
  dataLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  dataVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 2,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  docRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  rejectionNote: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
    marginTop: 2,
  },
  docRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F0FDFA',
    gap: 4,
  },
  viewDocBtnText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#059669',
    gap: 4,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    gap: 4,
  },
  rejectBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  scheduleActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  interviewSessionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  interviewSessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sessionStatusPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sessionStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  sessionDate: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  rubricBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rubricHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  rubricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  rubricItem: {
    width: '50%',
    marginBottom: 6,
  },
  rubricLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  rubricScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  rubricRecommendation: {
    fontSize: 12,
    color: '#0F172A',
    marginTop: 4,
  },
  evaluateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  evaluateActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  decisionStatusCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  decisionStatusLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  decisionStatusVal: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  decisionReasonText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    textAlign: 'center',
  },
  recordDecisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    height: 44,
    borderRadius: 10,
    gap: 6,
  },
  recordDecisionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  preflightBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  preflightReady: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  preflightBlocked: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
  },
  preflightTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  preflightError: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  conversionSuccessBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  conversionSuccessTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
    marginTop: 10,
  },
  conversionSuccessSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  admissionNoBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginVertical: 12,
  },
  admissionNoBadgeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 1,
  },
  viewStudentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F766E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 8,
  },
  viewStudentBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  conversionForm: {
    marginTop: 8,
  },
  convertSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    height: 50,
    borderRadius: 12,
    marginTop: 14,
    gap: 8,
  },
  convertSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  addNoteBox: {
    marginTop: 8,
  },
  addNoteBtn: {
    backgroundColor: '#0F766E',
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
  },
  addNoteBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  noteItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0F766E',
  },
  noteAuthor: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  noteText: {
    fontSize: 13,
    color: '#0F172A',
    marginTop: 4,
  },
  emptyNote: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 12,
  },
  stageOptionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stageOptionBtnActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#0F766E',
  },
  stageOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  stageOptionTextActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  rubricScoringRow: {
    marginBottom: 10,
  },
  rubricScoringLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  scoreButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBtnActive: {
    backgroundColor: '#0F766E',
  },
  scoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  scoreBtnTextActive: {
    color: '#FFFFFF',
  },
  recPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  recPillActive: {
    backgroundColor: '#0F766E',
  },
  recPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  recPillTextActive: {
    color: '#FFFFFF',
  },
});
