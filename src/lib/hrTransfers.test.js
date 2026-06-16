import { describe, expect, it } from 'vitest';
import { hrTransferApprovalChain } from './hrTransfers.js';

describe('hrTransferApprovalChain', () => {
  it('inter-branch includes branch review before HR and GM', () => {
    const { chain, currentIdx } = hrTransferApprovalChain('inter_branch', 'branch_review');
    expect(chain).toEqual(['Draft', 'Branch review', 'HR review', 'GM approval', 'Approved', 'Completed']);
    expect(currentIdx).toBe(1);
  });

  it('department transfer skips branch and GM', () => {
    const { chain } = hrTransferApprovalChain('in_branch_department', 'hr_review');
    expect(chain).toEqual(['Draft', 'HR review', 'Approved', 'Completed']);
  });
});
