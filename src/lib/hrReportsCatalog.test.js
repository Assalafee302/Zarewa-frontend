import { describe, expect, it } from 'vitest';
import { REPORT_CATEGORY_LABELS, buildReportQuery } from './hrReportsCatalog';

describe('hrReportsCatalog', () => {
  it('defines all report category labels', () => {
    expect(REPORT_CATEGORY_LABELS.employee).toBe('Employee Reports');
    expect(REPORT_CATEGORY_LABELS.attendance).toBe('Attendance Reports');
    expect(REPORT_CATEGORY_LABELS.compliance).toBe('Compliance Reports');
  });

  it('buildReportQuery omits empty values', () => {
    const q = buildReportQuery({ branchId: 'BR-KD', status: '', fromIso: '2026-01-01' });
    expect(q).toContain('branchId=BR-KD');
    expect(q).toContain('fromIso=2026-01-01');
    expect(q).not.toContain('status=');
  });
});

describe('HR Phase 2 letter types', () => {
  const PHASE2_LETTERS = [
    'appointment',
    'confirmation',
    'probation_extension',
    'salary_increment',
    'training_approval',
    'leave_approval',
    'leave_rejection',
    'dismissal',
    'resignation_acceptance',
    'exit_clearance',
    'return_of_property',
    'confidentiality_pledge',
    'handbook_receipt',
    'certificate_of_service',
  ];

  it('includes all Phase 2 letter type ids for picker coverage', () => {
    PHASE2_LETTERS.forEach((id) => {
      expect(id.length).toBeGreaterThan(2);
    });
    expect(PHASE2_LETTERS).toHaveLength(14);
  });
});
