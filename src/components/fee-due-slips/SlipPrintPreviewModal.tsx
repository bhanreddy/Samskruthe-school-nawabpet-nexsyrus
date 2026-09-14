import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { printOrSaveSlips } from '../../utils/documentSlipPdf';

interface SlipPrintPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  html: string;
  templateName?: string;
  studentCount?: number;
  layoutMode?: number;
  isDark?: boolean;
}

export const SlipPrintPreviewModal: React.FC<SlipPrintPreviewModalProps> = ({
  visible,
  onClose,
  html,
  templateName = 'Standard Fee Due Slip',
  studentCount = 1,
  layoutMode = 1,
  isDark = false,
}) => {
  if (!visible) return null;

  const [printing, setPrinting] = useState(false);

  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subtextColor = isDark ? '#9CA3AF' : '#4B5563';
  const bg = isDark ? '#111827' : '#F8FAFC';
  const panelBg = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E2E8F0';

  const estimatedPages = Math.ceil(studentCount / (layoutMode || 1));

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await printOrSaveSlips(html, `${templateName.replace(/\s+/g, '-')}.pdf`);
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '94vw',
          maxWidth: 1100,
          height: '92vh',
          backgroundColor: bg,
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: `1px solid ${borderColor}`,
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: panelBg,
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#2563EB', letterSpacing: 0.5 }}>
              PRINT PREVIEW
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: textColor }}>
              {templateName}
            </div>
            <div style={{ fontSize: 12, color: subtextColor, marginTop: 2 }}>
              Students: <strong>{studentCount}</strong> · Est. Pages: <strong>{estimatedPages}</strong> · Layout: <strong>{layoutMode} {layoutMode === 1 ? 'slip/page' : 'slips/page'}</strong> · Format: <strong>A4 Portrait</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              Back
            </button>

            <button
              onClick={handlePrint}
              disabled={printing}
              style={{
                padding: '8px 18px',
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
              {printing ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="print" size={16} color="#FFF" />}
              Print Slips
            </button>
          </div>
        </div>

        {/* Document Preview Frame */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#CBD5E1',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            style={{
              width: 794,
              minHeight: 1123,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <iframe
              srcDoc={html}
              title="Print Preview Frame"
              style={{
                width: '100%',
                height: 1123,
                border: 'none',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
