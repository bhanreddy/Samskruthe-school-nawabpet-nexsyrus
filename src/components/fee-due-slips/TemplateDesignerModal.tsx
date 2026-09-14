import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  DocumentTemplate,
  TemplateBlock,
  TemplatePageSettings,
  DueStudentItem,
} from '../../types/documentTemplate';
import { FeeDueSlipService } from '../../services/feeDueSlipService';

interface TemplateDesignerModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (template: DocumentTemplate) => void;
  initialTemplate?: DocumentTemplate | null;
  selectedStudent?: DueStudentItem | null;
  isDark?: boolean;
}

export const TemplateDesignerModal: React.FC<TemplateDesignerModalProps> = ({
  visible,
  onClose,
  onSaved,
  initialTemplate,
  selectedStudent,
  isDark = false,
}) => {
  if (!visible) return null;

  const [name, setName] = useState(initialTemplate?.name || 'Standard Fee Due Slip');
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [isDefault, setIsDefault] = useState(initialTemplate?.is_default || false);
  const [blocks, setBlocks] = useState<TemplateBlock[]>(
    initialTemplate?.template_definition?.blocks || []
  );
  const [pageSettings, setPageSettings] = useState<TemplatePageSettings>(
    initialTemplate?.page_settings || {
      page_size: 'A4',
      orientation: 'portrait',
      slips_per_page: 1,
      margins: { top: 8, bottom: 8, left: 8, right: 8 },
      primary_color: '#1E3A8A',
      accent_color: '#B91C1C',
    }
  );

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(blocks[0]?.id || null);
  const [previewMode, setPreviewMode] = useState<'sample' | 'live'>('sample');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const textColor = isDark ? '#F9FAFB' : '#111827';
  const subtextColor = isDark ? '#9CA3AF' : '#4B5563';
  const bg = isDark ? '#111827' : '#F8FAFC';
  const panelBg = isDark ? '#1F2937' : '#FFFFFF';
  const borderColor = isDark ? '#374151' : '#E2E8F0';

  // Load preview whenever blocks or settings change
  useEffect(() => {
    let active = true;
    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const res = await FeeDueSlipService.previewSlip({
          template_name: name,
          template_definition: { version: 1, blocks },
          page_settings: pageSettings,
          use_sample_data: previewMode === 'sample' || !selectedStudent,
          student_id: previewMode === 'live' && selectedStudent ? selectedStudent.student_id : undefined,
        });
        if (active) {
          setPreviewHtml(res.html);
          setValidationErrors([]);
        }
      } catch (err: any) {
        if (active) {
          setValidationErrors([err.message || 'Failed to render preview.']);
        }
      } finally {
        if (active) setLoadingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreview, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [blocks, pageSettings, previewMode, selectedStudent]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const toggleBlockEnabled = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, enabled: !b.enabled } : b))
    );
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const reordered = [...blocks];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    setBlocks(reordered);
  };

  const updateSelectedBlock = (updates: Partial<TemplateBlock>) => {
    if (!selectedBlockId) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === selectedBlockId ? { ...b, ...updates } : b))
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setValidationErrors(['Template name cannot be empty.']);
      return;
    }
    setSaving(true);
    try {
      let saved: DocumentTemplate;
      if (initialTemplate?.id) {
        saved = await FeeDueSlipService.updateTemplate(initialTemplate.id, {
          name,
          description,
          is_default: isDefault,
          template_definition: { version: 1, blocks },
          page_settings: pageSettings,
        });
      } else {
        saved = await FeeDueSlipService.createTemplate({
          name,
          description,
          is_default: isDefault,
          template_definition: { version: 1, blocks },
          page_settings: pageSettings,
        });
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setValidationErrors([err.message || 'Failed to save template.']);
    } finally {
      setSaving(false);
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
          width: '96vw',
          maxWidth: 1400,
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
        {/* Top Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="color-palette-outline" size={20} color="#2563EB" />
            </div>
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template Name..."
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: textColor,
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: 320,
                }}
              />
              <div style={{ fontSize: 11, color: subtextColor }}>Document Template Designer</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: textColor, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Set as Default Template
            </label>

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
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
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
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="checkmark" size={16} color="#FFF" />}
              Save Template
            </button>
          </div>
        </div>

        {/* Validation Errors Notice */}
        {validationErrors.length > 0 && (
          <div style={{ padding: '8px 20px', backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: 12, fontWeight: 600 }}>
            {validationErrors.join(' ')}
          </div>
        )}

        {/* 3-Column Workspace */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Column 1: Document Structure & Blocks Palette */}
          <div
            style={{
              width: 300,
              backgroundColor: panelBg,
              borderRight: `1px solid ${borderColor}`,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, fontWeight: 700, fontSize: 13, color: textColor }}>
              Document Blocks
            </div>

            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blocks.map((block, idx) => {
                const isSelected = block.id === selectedBlockId;
                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlockId(block.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? '#3B82F6' : borderColor}`,
                      backgroundColor: isSelected ? (isDark ? '#1E293B' : '#EFF6FF') : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={block.enabled}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleBlockEnabled(block.id);
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 600, color: textColor }}>
                          {block.title || block.type.replace(/_/g, ' ').toUpperCase()}
                        </div>
                        <div style={{ fontSize: 10, color: subtextColor }}>Type: {block.type}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(idx, 'up');
                        }}
                        disabled={idx === 0}
                        style={{ border: 'none', background: 'transparent', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}
                      >
                        <Ionicons name="chevron-up" size={14} color={textColor} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(idx, 'down');
                        }}
                        disabled={idx === blocks.length - 1}
                        style={{ border: 'none', background: 'transparent', cursor: idx === blocks.length - 1 ? 'default' : 'pointer', opacity: idx === blocks.length - 1 ? 0.3 : 1 }}
                      >
                        <Ionicons name="chevron-down" size={14} color={textColor} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Live Canvas Document Preview */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#CBD5E1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflowY: 'auto',
              padding: 20,
              position: 'relative',
            }}
          >
            {/* Canvas Toolbar */}
            <div
              style={{
                width: '100%',
                maxWidth: 820,
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: panelBg,
                padding: '8px 14px',
                borderRadius: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: subtextColor }}>Layout:</span>
                {[
                  { value: 1, label: '1 Slip / Page' },
                  { value: 2, label: '2 Slips / Page' },
                  { value: 4, label: '4 Slips / Page' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPageSettings({ ...pageSettings, slips_per_page: opt.value as any })}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: pageSettings.slips_per_page === opt.value ? 700 : 500,
                      backgroundColor: pageSettings.slips_per_page === opt.value ? '#2563EB' : '#F1F5F9',
                      color: pageSettings.slips_per_page === opt.value ? '#FFFFFF' : '#334155',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setPreviewMode('sample')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: previewMode === 'sample' ? 700 : 500,
                    backgroundColor: previewMode === 'sample' ? '#3B82F6' : '#F1F5F9',
                    color: previewMode === 'sample' ? '#FFFFFF' : '#334155',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Sample Data
                </button>
                <button
                  onClick={() => setPreviewMode('live')}
                  disabled={!selectedStudent}
                  title={!selectedStudent ? 'Select a student in the table first' : ''}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: previewMode === 'live' ? 700 : 500,
                    backgroundColor: previewMode === 'live' ? '#3B82F6' : '#F1F5F9',
                    color: previewMode === 'live' ? '#FFFFFF' : '#334155',
                    border: 'none',
                    cursor: selectedStudent ? 'pointer' : 'not-allowed',
                    opacity: selectedStudent ? 1 : 0.5,
                  }}
                >
                  Selected Student {selectedStudent ? `(${selectedStudent.student_name})` : ''}
                </button>
              </div>
            </div>

            {/* Rendered Live Canvas Iframe */}
            {loadingPreview && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  padding: 16,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ActivityIndicator size="small" color="#2563EB" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Updating canvas...</span>
              </div>
            )}

            <div
              style={{
                width: 794, // 210mm in 96dpi pixels
                minHeight: 1123, // 297mm in 96dpi pixels
                backgroundColor: '#FFFFFF',
                boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <iframe
                srcDoc={previewHtml}
                title="Template Preview Canvas"
                style={{
                  width: '100%',
                  height: 1123,
                  border: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
          </div>

          {/* Column 3: Properties Inspector Panel */}
          <div
            style={{
              width: 320,
              backgroundColor: panelBg,
              borderLeft: `1px solid ${borderColor}`,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, fontWeight: 700, fontSize: 13, color: textColor }}>
              Properties Inspector
            </div>

            {selectedBlock ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: subtextColor }}>Block Title</label>
                  <input
                    type="text"
                    value={selectedBlock.title || ''}
                    onChange={(e) => updateSelectedBlock({ title: e.target.value })}
                    style={{
                      width: '100%',
                      marginTop: 4,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: `1px solid ${borderColor}`,
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                {selectedBlock.type === 'header' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: textColor }}>
                      <input
                        type="checkbox"
                        checked={selectedBlock.show_logo !== false}
                        onChange={(e) => updateSelectedBlock({ show_logo: e.target.checked })}
                      />
                      Show School Logo
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: textColor }}>
                      <input
                        type="checkbox"
                        checked={selectedBlock.show_school_details !== false}
                        onChange={(e) => updateSelectedBlock({ show_school_details: e.target.checked })}
                      />
                      Show Address & Contacts
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: textColor }}>
                      <input
                        type="checkbox"
                        checked={selectedBlock.show_document_number !== false}
                        onChange={(e) => updateSelectedBlock({ show_document_number: e.target.checked })}
                      />
                      Show Document Number
                    </label>
                  </div>
                )}

                {selectedBlock.type === 'fee_summary' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: textColor }}>
                      <input
                        type="checkbox"
                        checked={selectedBlock.show_due_in_words !== false}
                        onChange={(e) => updateSelectedBlock({ show_due_in_words: e.target.checked })}
                      />
                      Show Due Amount in Words
                    </label>
                  </div>
                )}

                {selectedBlock.type === 'payment_instructions' && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: subtextColor }}>Notice Instructions</label>
                    <textarea
                      value={selectedBlock.notice_text || ''}
                      onChange={(e) => updateSelectedBlock({ notice_text: e.target.value })}
                      rows={4}
                      style={{
                        width: '100%',
                        marginTop: 4,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: `1px solid ${borderColor}`,
                        fontSize: 12,
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                )}

                {selectedBlock.type === 'tear_off_slip' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: textColor }}>
                      <input
                        type="checkbox"
                        checked={selectedBlock.show_scissors !== false}
                        onChange={(e) => updateSelectedBlock({ show_scissors: e.target.checked })}
                      />
                      Show Scissors Tear Line (✂)
                    </label>
                  </div>
                )}

                {/* Theme Colors */}
                <div style={{ borderTop: `1px solid ${borderColor}`, paddingTop: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: subtextColor }}>Primary Theme Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <input
                      type="color"
                      value={pageSettings.primary_color || '#1E3A8A'}
                      onChange={(e) => setPageSettings({ ...pageSettings, primary_color: e.target.value })}
                      style={{ width: 34, height: 34, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{pageSettings.primary_color}</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: subtextColor }}>Urgent Due Accent Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <input
                      type="color"
                      value={pageSettings.accent_color || '#B91C1C'}
                      onChange={(e) => setPageSettings({ ...pageSettings, accent_color: e.target.value })}
                      style={{ width: 34, height: 34, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{pageSettings.accent_color}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: subtextColor, fontSize: 13 }}>
                Select a block on the left to edit its properties.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
