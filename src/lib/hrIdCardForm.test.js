import { describe, expect, it } from 'vitest';
import {
  blankIdCardApplyForm,
  buildIdCardPreviewRequest,
  emergencyContactFromStaff,
  hasOpenIdCardRequest,
  idCardApplyPayload,
  isLostCardReason,
  requiresLostCardAck,
  validateIdCardApplyForm,
} from './hrIdCardForm.js';

describe('hrIdCardForm', () => {
  it('requires replacement reason when request type is replacement', () => {
    const form = { ...blankIdCardApplyForm(), requestType: 'replacement', reason: '' };
    expect(validateIdCardApplyForm(form)).toEqual({
      ok: false,
      error: 'Please select a reason for the replacement.',
    });
  });

  it('requires lost card acknowledgement for lost replacements', () => {
    const form = {
      ...blankIdCardApplyForm(),
      requestType: 'replacement',
      reason: 'Lost',
      lostCardAcknowledged: false,
    };
    expect(requiresLostCardAck(form)).toBe(true);
    expect(validateIdCardApplyForm(form)).toEqual({
      ok: false,
      error: 'Please acknowledge the lost card replacement policy.',
    });
  });

  it('builds payload with lost card note and flags', () => {
    const form = {
      ...blankIdCardApplyForm(),
      requestType: 'replacement',
      reason: 'Lost',
      lostCardAcknowledged: true,
      notes: 'Reported on Monday',
      bloodGroup: 'O+',
      emergencyContact: 'Ada — 08012345678',
    };
    expect(idCardApplyPayload(form, 'user-1')).toEqual({
      userId: 'user-1',
      requestType: 'replacement',
      reason: 'Lost',
      replacementReason: 'Lost',
      notes: 'Reported on Monday Employee acknowledged lost card replacement policy.',
      bloodGroup: 'O+',
      emergencyContact: 'Ada — 08012345678',
      lostDamaged: true,
    });
  });

  it('detects open requests from active statuses', () => {
    expect(hasOpenIdCardRequest([{ status: 'ready' }, { status: 'collected' }])).toBe(true);
    expect(hasOpenIdCardRequest([{ status: 'collected' }, { status: 'expired' }])).toBe(false);
  });

  it('prefills emergency contact from next of kin', () => {
    expect(
      emergencyContactFromStaff({
        nextOfKin: { name: 'John Doe', phone: '08099998888' },
      })
    ).toBe('John Doe — 08099998888');
  });

  it('builds preview request from staff and form', () => {
    const preview = buildIdCardPreviewRequest(
      {
        displayName: 'Jane Doe',
        employeeNo: 'EMP-12',
        jobTitle: 'Accountant',
        department: 'Finance',
        branchId: 'HQ',
        avatarUrl: 'https://example.com/photo.jpg',
      },
      { ...blankIdCardApplyForm(), bloodGroup: 'A+' }
    );
    expect(preview.displayName).toBe('Jane Doe');
    expect(preview.bloodGroup).toBe('A+');
    expect(isLostCardReason('Lost')).toBe(true);
  });
});
