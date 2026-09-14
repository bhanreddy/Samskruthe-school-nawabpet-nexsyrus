import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentTemplate } from '../../types/documentTemplate';

interface TemplateListViewProps {
  templates: DocumentTemplate[];
  loading?: boolean;
  onEdit: (template: DocumentTemplate) => void;
  onDuplicate: (template: DocumentTemplate) => void;
  onSetDefault: (template: DocumentTemplate) => void;
  onArchive: (template: DocumentTemplate) => void;
  onPreview: (template: DocumentTemplate) => void;
  onCreateNew: () => void;
  isDark?: boolean;
}

export const TemplateListView: React.FC<TemplateListViewProps> = ({
  templates,
  loading = false,
  onEdit,
  onDuplicate,
  onSetDefault,
  onArchive,
  onPreview,
  onCreateNew,
  isDark = false,
}) => {
  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subtextColor = isDark ? '#9CA3AF' : '#4B5563';
  const cardBg = isDark ? '#18202F' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E2E8F0';

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={[styles.topBanner, { backgroundColor: cardBg, borderColor }]}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: textColor }}>Document Templates</div>
          <div style={{ fontSize: 12, color: subtextColor, marginTop: 2 }}>
            Manage and customize notice formats, tear-off slips, layouts and branding
          </div>
        </div>

        <button
          onClick={onCreateNew}
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
          <Ionicons name="add" size={16} color="#FFFFFF" />
          Create New Template
        </button>
      </View>

      {/* Templates Grid */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={[styles.loadingText, { color: subtextColor }]}>Loading templates...</Text>
        </View>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16,
            marginTop: 14,
          }}
        >
          {templates.map((tpl) => {
            const slipsPerPage = tpl.page_settings?.slips_per_page || 1;
            const pageSize = tpl.page_settings?.page_size || 'A4';
            const blocksCount = tpl.template_definition?.blocks?.length || 0;

            return (
              <div
                key={tpl.id}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 14,
                  border: `1px solid ${tpl.is_default ? '#3B82F6' : borderColor}`,
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: tpl.is_default
                    ? '0 4px 12px rgba(59, 130, 246, 0.12)'
                    : '0 2px 4px rgba(0,0,0,0.04)',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          backgroundColor: '#EFF6FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="document-text-outline" size={18} color="#2563EB" />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: textColor }}>{tpl.name}</div>
                        <div style={{ fontSize: 11, color: subtextColor }}>
                          {pageSize} · {slipsPerPage} {slipsPerPage === 1 ? 'slip/page' : 'slips/page'} · {blocksCount} blocks
                        </div>
                      </div>
                    </div>

                    {tpl.is_default && (
                      <span
                        style={{
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                        }}
                      >
                        DEFAULT
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: 12, color: subtextColor, marginTop: 12, marginBottom: 16, lineHeight: 1.4 }}>
                    {tpl.description || 'Standard printable fee due notice with tear-off acknowledgement receipt.'}
                  </p>
                </div>

                {/* Card Actions */}
                <div
                  style={{
                    borderTop: `1px solid ${borderColor}`,
                    paddingTop: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => onEdit(tpl)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Edit Designer
                    </button>
                    <button
                      onClick={() => onPreview(tpl)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        backgroundColor: '#F1F5F9',
                        color: '#334155',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Preview
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      title="Duplicate Template"
                      onClick={() => onDuplicate(tpl)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 6,
                        backgroundColor: 'transparent',
                        border: `1px solid ${borderColor}`,
                        cursor: 'pointer',
                      }}
                    >
                      <Ionicons name="copy-outline" size={14} color="#4B5563" />
                    </button>
                    {!tpl.is_default && (
                      <button
                        title="Set as Default"
                        onClick={() => onSetDefault(tpl)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          backgroundColor: 'transparent',
                          border: `1px solid ${borderColor}`,
                          cursor: 'pointer',
                        }}
                      >
                        <Ionicons name="star-outline" size={14} color="#D97706" />
                      </button>
                    )}
                    {!tpl.is_default && (
                      <button
                        title="Archive Template"
                        onClick={() => onArchive(tpl)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 6,
                          backgroundColor: 'transparent',
                          border: `1px solid ${borderColor}`,
                          cursor: 'pointer',
                        }}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 20,
  },
  topBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
  },
});
