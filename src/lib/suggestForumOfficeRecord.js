import { detectOfficeRecordType } from './officeRecordTypes';
import { improveMemoRuleBased } from './smartMemoComposer';

/**
 * Client-side Zare-style suggestion from forum topic → office record wizard prefill.
 * @param {{ title?: string; body?: string }} topic
 */
export function suggestForumOfficeRecord(topic = {}) {
  const title = String(topic.title || '').trim();
  const body = String(topic.body || '').trim();
  const combined = [title, body].filter(Boolean).join('\n\n');
  const recordType = detectOfficeRecordType(title, body);
  const improved = improveMemoRuleBased(title, combined, recordType);
  return {
    recordType,
    subject: improved.subject || title || 'Office record from forum',
    body: improved.body || combined,
    freeText: combined,
  };
}
