import React from 'react';
import OmrAnswerKeyScreen from '../admin/omr/answer-key';

/**
 * Accountant access to OMR Answer Key Mapping.
 * Per specification:
 * "Answer Key Mapping must be available to: Admin, Staff, Accountant.
 * But implement this through the existing permission system.
 * Accountant should have Answer Key Mapping access as requested, but must NOT automatically receive unrestricted technical/system access."
 */
export default function AccountsOmrAnswerKey() {
  return <OmrAnswerKeyScreen />;
}
