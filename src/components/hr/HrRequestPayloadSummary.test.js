import { describe, expect, it } from 'vitest';
import { hrRequestApprovalChain } from './HrRequestPayloadSummary.jsx';

describe('hrRequestApprovalChain', () => {
  it('uses HR review before branch endorsement before GM HR', () => {
    const { chain, currentIdx } = hrRequestApprovalChain('branch_manager_review', 'leave');
    expect(chain).toEqual(['Draft', 'HR review', 'Branch manager', 'GM HR', 'Approved']);
    expect(currentIdx).toBe(2);
  });

  it('marks hr_review at step 1', () => {
    const { currentIdx } = hrRequestApprovalChain('hr_review', 'loan');
    expect(currentIdx).toBe(1);
  });

  it('marks rejected at deciding stage', () => {
    const { currentIdx, rejected } = hrRequestApprovalChain('rejected', 'leave');
    expect(currentIdx).toBe(4);
    expect(rejected).toBe(true);
  });
});
