import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BatchGenerationProgressModalProps {
  visible: boolean;
  onClose: () => void;
  progress: number;
  totalStudents: number;
  generatedCount: number;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  errorMessage?: string | null;
  onPrint: () => void;
  onDownloadCombinedPdf: () => void;
  onDownloadZip: () => void;
  onCancel: () => void;
  isDark?: boolean;
}

export const BatchGenerationProgressModal: React.FC<BatchGenerationProgressModalProps> = ({
  visible,
  onClose,
  progress,
  totalStudents,
  generatedCount,
  status,
  errorMessage,
  onPrint,
  onDownloadCombinedPdf,
  onDownloadZip,
  onCancel,
  isDark = false,
}) => {
  if (!visible) return null;

  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subtextColor = isDark ? '#9CA3AF' : '#4B5563';
  const panelBg = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E2E8F0';

  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          backgroundColor: panelBg,
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          border: `1px solid ${borderColor}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Header Icon & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: isCompleted ? '#D1FAE5' : isFailed ? '#FEE2E2' : '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={isCompleted ? 'checkmark-circle' : isFailed ? 'alert-circle' : 'documents-outline'}
              size={24}
              color={isCompleted ? '#059669' : isFailed ? '#DC2626' : '#2563EB'}
            />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: textColor }}>
              {isCompleted
                ? 'Fee Due Slips Ready'
                : isFailed
                ? 'Generation Failed'
                : 'Generating Fee Due Slips...'}
            </div>
            <div style={{ fontSize: 13, color: subtextColor }}>
              {isCompleted
                ? `Successfully generated personalized slips for ${totalStudents} students.`
                : isFailed
                ? (errorMessage || 'An error occurred while generating documents.')
                : `${generatedCount} of ${totalStudents} generated · You can continue working`}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {!isCompleted && !isFailed && (
          <div>
            <div
              style={{
                width: '100%',
                height: 10,
                backgroundColor: isDark ? '#374151' : '#E2E8F0',
                borderRadius: 5,
                overflow: 'hidden',
                margin: '10px 0 6px 0',
              }}
            >
              <div
                style={{
                  width: `${Math.max(5, Math.min(100, progress))}%`,
                  height: '100%',
                  backgroundColor: '#2563EB',
                  borderRadius: 5,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: subtextColor }}>
              <span>Batch Progress</span>
              <strong style={{ color: textColor }}>{progress}%</strong>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          {!isCompleted && !isFailed ? (
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                backgroundColor: '#FEE2E2',
                color: '#B91C1C',
                border: 'none',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          ) : isCompleted ? (
            <>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  backgroundColor: '#E2E8F0',
                  color: '#334155',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>

              <button
                onClick={onDownloadZip}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  backgroundColor: '#DBEAFE',
                  color: '#1E40AF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="archive-outline" size={15} color="#1E40AF" />
                Download ZIP
              </button>

              <button
                onClick={onPrint}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="print" size={15} color="#FFFFFF" />
                Print / Save PDF
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                backgroundColor: '#E2E8F0',
                color: '#334155',
                border: 'none',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
