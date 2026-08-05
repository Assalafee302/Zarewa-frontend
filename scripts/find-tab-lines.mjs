import fs from 'fs';

const lines = fs.readFileSync('scripts/_orig_account.jsx', 'utf8').split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes("activeTab === 'desk'")) console.log('desk', i + 1, l.trim().slice(0, 60));
  if (l.includes('<FinanceSequencePanel>')) console.log('fsp', i + 1);
  if (l.includes('</FinanceSequencePanel>')) console.log('fsp end', i + 1);
  if (l.includes("activeTab === 'audit'")) console.log('audit', i + 1);
}
