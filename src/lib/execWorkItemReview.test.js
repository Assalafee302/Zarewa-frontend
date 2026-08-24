import { describe, expect, it } from 'vitest';
import {
  execWorkItemOpensInModal,
  execWorkItemReviewContext,
  resolveExecReviewView,
} from './execWorkItemReview.js';

describe('execWorkItemReview', () => {
  it('opens overtime in the executive review modal', () => {
    expect(execWorkItemOpensInModal('overtime')).toBe(true);
    expect(execWorkItemOpensInModal('ot_request')).toBe(true);
    const view = resolveExecReviewView({
      id: 'ot:OT-1',
      kind: 'overtime',
      reviewContext: { otRequestId: 'OT-1', row: { id: 'OT-1' } },
    });
    expect(view.view).toBe('overtime');
    expect(view.otRequestId).toBe('OT-1');
  });

  it('maps missing-BM governance to an integrity view instead of a blank fallback', () => {
    const view = resolveExecReviewView({
      id: 'missing_bm:BR-KD',
      kind: 'governance',
      title: 'No Branch Manager — Kano',
      branchId: 'BR-KD',
      reviewContext: {
        integrityKind: 'missing_branch_manager',
        reasons: ['Data integrity — missing key role'],
        row: { integrityKind: 'missing_branch_manager', branchId: 'BR-KD' },
      },
    });
    expect(view.view).toBe('integrity');
    expect(view.integrityKind).toBe('missing_branch_manager');
  });

  it('does not treat overtime row id as a quotation ref', () => {
    const ctx = execWorkItemReviewContext({
      id: 'ot:OT-9',
      kind: 'overtime',
      reviewContext: { row: { id: 'OT-9', quotationRef: 'Q-1' } },
    });
    expect(ctx.otRequestId).toBe('OT-9');
    expect(ctx.quotationRef).toBe('Q-1');
  });
});
