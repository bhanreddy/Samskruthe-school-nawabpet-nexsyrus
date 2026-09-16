import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import AdminHeader from '../../components/AdminHeader';
import { useTheme } from '../../hooks/useTheme';
import { useAccountsWebChrome } from '../../contexts/AccountsWebChromeContext';
import type { SchoolTheme } from '../../theme/types';
import { OmrService, OmrExam, OmrTemplate } from '../../services/omrService';
import { alertCompat } from '../../utils/crossPlatformAlert';
import { printOrSaveSlips } from '../../utils/documentSlipPdf';
import { SCHOOL_NAME } from '../../constants/school';
import { SCHOOL_CONFIG } from '../../constants/schoolConfig';
import { FeatureRouteGuard, FEATURE_KEYS } from '../feature-access';

type PrintSource = 'exam' | 'template';
type PrintMode = 'students' | 'blank';

function OmrPrintSheetsContent() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);
  const { shellActive } = useAccountsWebChrome();
  const params = useLocalSearchParams<{ examId?: string; templateId?: string }>();

  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [exams, setExams] = useState<OmrExam[]>([]);
  const [templates, setTemplates] = useState<OmrTemplate[]>([]);
  const [source, setSource] = useState<PrintSource>(params.templateId && !params.examId ? 'template' : 'exam');
  const [selectedExamId, setSelectedExamId] = useState(params.examId || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(params.templateId || '');
  const [mode, setMode] = useState<PrintMode>(params.examId ? 'students' : 'blank');
  const [copies, setCopies] = useState('1');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [examsRes, templatesRes] = await Promise.all([
          OmrService.getExams({ limit: 50 }),
          OmrService.getTemplates(),
        ]);
        if (!alive) return;
        const examRows = examsRes.success ? examsRes.data : [];
        const templateRows = templatesRes.success ? templatesRes.data : [];
        setExams(examRows);
        setTemplates(templateRows);
        setSelectedExamId((current) => current || params.examId || examRows[0]?.id || '');
        setSelectedTemplateId((current) => current || params.templateId || templateRows[0]?.id || '');
        if (!params.examId && examRows.length === 0 && templateRows.length > 0) {
          setSource('template');
        }
      } catch (err: any) {
        if (alive) alertCompat('Error', err.message || 'Failed to load OMR print options');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.examId, params.templateId]);

  const selectedTemplate = templates.find((tpl) => tpl.id === selectedTemplateId) || null;
  const schoolName = SCHOOL_NAME || SCHOOL_CONFIG.name || 'School';

  const handlePrint = async () => {
    try {
      if (source === 'exam' && !selectedExamId) {
        alertCompat('Required', 'Select an OMR exam to print sheets for.');
        return;
      }
      if (source === 'template' && !selectedTemplateId) {
        alertCompat('Required', 'Select an OMR sheet template.');
        return;
      }

      const copyCount = Math.min(50, Math.max(1, parseInt(copies, 10) || 1));
      setPrinting(true);

      const payload = source === 'exam'
        ? await OmrService.getExamPrintHtml(selectedExamId, {
            mode: mode === 'students' ? 'students' : 'blank',
            copies: copyCount,
          })
        : await OmrService.getTemplatePrintHtml(selectedTemplateId, {
            copies: copyCount,
            title: selectedTemplate?.name,
          });

      if (!payload?.html) {
        throw new Error('The printer did not receive a sheet layout.');
      }

      const filename = `${(payload.school_name || schoolName).replace(/\s+/g, '-')}-OMR-Sheet.pdf`;
      await printOrSaveSlips(payload.html, filename);
    } catch (err: any) {
      alertCompat('Print Failed', err.message || 'Could not generate the OMR sheet for printing.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <View style={styles.root}>
      {!shellActive && <AdminHeader title="Print OMR Sheets" showBackButton />}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading print templates...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.letterheadCard}>
            <Text style={styles.letterheadKicker}>Printed header</Text>
            <Text style={styles.letterheadSchool}>{schoolName}</Text>
            <Text style={styles.letterheadHint}>
              Every sheet uses this school name at the top, plus the same corner markers, admission-number
              grid, and answer bubbles the staff OMR scanner reads for marks.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Sheet source</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[styles.segment, source === 'exam' && styles.segmentActive]}
              onPress={() => setSource('exam')}
            >
              <Text style={[styles.segmentText, source === 'exam' && styles.segmentTextActive]}>OMR Exam</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, source === 'template' && styles.segmentActive]}
              onPress={() => {
                setSource('template');
                setMode('blank');
              }}
            >
              <Text style={[styles.segmentText, source === 'template' && styles.segmentTextActive]}>Blank template</Text>
            </TouchableOpacity>
          </View>

          {source === 'exam' ? (
            <View>
              <Text style={styles.fieldLabel}>Select exam</Text>
              {exams.length === 0 ? (
                <Text style={styles.emptyText}>No OMR exams are configured yet. Print a blank template instead.</Text>
              ) : (
                exams.map((exam) => {
                  const active = exam.id === selectedExamId;
                  return (
                    <TouchableOpacity
                      key={exam.id}
                      style={[styles.choiceCard, active && styles.choiceCardActive]}
                      onPress={() => setSelectedExamId(exam.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.choiceTitle}>{exam.title}</Text>
                        <Text style={styles.choiceMeta}>
                          {[exam.class_name, exam.subject_name, `${exam.question_count || exam.total_questions || 0} Q`]
                            .filter(Boolean)
                            .join(' • ')}
                        </Text>
                      </View>
                      {active ? <Ionicons name="checkmark-circle" size={20} color="#4F46E5" /> : null}
                    </TouchableOpacity>
                  );
                })
              )}

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Print mode</Text>
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  style={[styles.segment, mode === 'students' && styles.segmentActive]}
                  onPress={() => setMode('students')}
                >
                  <Text style={[styles.segmentText, mode === 'students' && styles.segmentTextActive]}>
                    One per student
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segment, mode === 'blank' && styles.segmentActive]}
                  onPress={() => setMode('blank')}
                >
                  <Text style={[styles.segmentText, mode === 'blank' && styles.segmentTextActive]}>Blank copies</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helpText}>
                {mode === 'students'
                  ? 'Each enrolled student gets a named sheet with admission-number bubbles already marked.'
                  : 'Students fill their name and admission number on the sheet before the exam.'}
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.fieldLabel}>Select template</Text>
              {templates.map((tpl) => {
                const active = tpl.id === selectedTemplateId;
                return (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[styles.choiceCard, active && styles.choiceCardActive]}
                    onPress={() => setSelectedTemplateId(tpl.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceTitle}>{tpl.name}</Text>
                      <Text style={styles.choiceMeta}>
                        {tpl.total_questions} questions • {tpl.options_per_question} options • A4
                      </Text>
                    </View>
                    {active ? <Ionicons name="checkmark-circle" size={20} color="#4F46E5" /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {(source === 'template' || mode === 'blank') && (
            <View style={styles.copiesRow}>
              <Text style={styles.fieldLabel}>Number of copies</Text>
              <TextInput
                style={styles.copiesInput}
                keyboardType="number-pad"
                value={copies}
                onChangeText={setCopies}
                maxLength={2}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.printBtn, printing && styles.printBtnDisabled]}
            onPress={handlePrint}
            disabled={printing}
          >
            {printing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="print" size={18} color="#FFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.printBtnText}>
              {printing ? 'Preparing sheets...' : Platform.OS === 'web' ? 'Print OMR sheets' : 'Print / Save OMR sheets'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

export default function OmrPrintSheetsScreen() {
  return (
    <FeatureRouteGuard feature={FEATURE_KEYS.OMR_SCANNER}>
      <OmrPrintSheetsContent />
    </FeatureRouteGuard>
  );
}

function getStyles(theme: SchoolTheme, isDark: boolean) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    loaderText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
    },
    content: {
      padding: 20,
      paddingBottom: 48,
      maxWidth: 760,
      width: '100%',
      alignSelf: 'center',
    },
    letterheadCard: {
      backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
      borderRadius: 16,
      padding: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: isDark ? '#3730A3' : '#C7D2FE',
    },
    letterheadKicker: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: '#4F46E5',
      marginBottom: 4,
    },
    letterheadSchool: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.text,
    },
    letterheadHint: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textSecondary,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    segmentRow: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 9,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: '#4F46E5',
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    segmentTextActive: {
      color: '#FFFFFF',
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 12,
    },
    choiceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    choiceCardActive: {
      borderColor: '#4F46E5',
      backgroundColor: isDark ? 'rgba(79,70,229,0.16)' : '#EEF2FF',
    },
    choiceTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    choiceMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    helpText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: -6,
      marginBottom: 8,
      lineHeight: 18,
    },
    copiesRow: {
      marginTop: 8,
      marginBottom: 8,
    },
    copiesInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      fontWeight: '700',
      width: 88,
    },
    printBtn: {
      marginTop: 20,
      backgroundColor: '#4F46E5',
      borderRadius: 12,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    printBtnDisabled: {
      opacity: 0.7,
    },
    printBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
