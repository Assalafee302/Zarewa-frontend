import { formatPersonName } from '../../lib/formatPersonName';
import {
  ZAREWA_COMPANY_ACCOUNT_NAME,
  ZAREWA_QUOTATION_BRANDING,
} from '../../Data/companyQuotation';

function fmt(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return 'NGN 0';
  return `NGN ${v.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function Dash() {
  return <div className="receipt-thermal-dash" aria-hidden />;
}

/**
 * XP-80C / 80mm thermal receipt slip — simple browser print for roll printers.
 * Use inside `.receipt-print-root` so @page receipt-thermal-80 applies.
 */
export function ReceiptPrintThermal({
  receiptId = '—',
  dateStr = '—',
  customerName = '—',
  customerPhone = '',
  quotationRef = '—',
  projectName = '',
  lines = [],
  totalNgn = 0,
  reference = '',
  handledBy = '',
  cashierStatusLabel = '',
}) {
  const total = Number(totalNgn) || lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const displayCustomerName = formatPersonName(customerName);
  const displayHandledBy = formatPersonName(handledBy);
  const headOffice = ZAREWA_QUOTATION_BRANDING.branches?.[0];

  return (
    <div className="receipt-print-thermal receipt-thermal-slip">
      <header className="receipt-thermal-head">
        <p className="receipt-thermal-brand">{ZAREWA_COMPANY_ACCOUNT_NAME}</p>
        {headOffice?.lines?.[0] ? <p className="receipt-thermal-muted">{headOffice.lines[0]}</p> : null}
        {headOffice?.lines?.[1] ? <p className="receipt-thermal-muted">{headOffice.lines[1]}</p> : null}
        <p className="receipt-thermal-title">PAYMENT RECEIPT</p>
      </header>

      <Dash />

      <dl className="receipt-thermal-meta">
        <div>
          <dt>Receipt</dt>
          <dd className="receipt-thermal-mono">{receiptId}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{dateStr}</dd>
        </div>
        <div>
          <dt>Quotation</dt>
          <dd className="receipt-thermal-mono">{quotationRef}</dd>
        </div>
        <div>
          <dt>Customer</dt>
          <dd>{displayCustomerName}</dd>
        </div>
        {customerPhone && customerPhone !== '—' ? (
          <div>
            <dt>Phone</dt>
            <dd>{customerPhone}</dd>
          </div>
        ) : null}
        {projectName?.trim() ? (
          <div>
            <dt>Project</dt>
            <dd>{projectName.trim()}</dd>
          </div>
        ) : null}
        {reference ? (
          <div>
            <dt>Ref</dt>
            <dd>{reference}</dd>
          </div>
        ) : null}
        {cashierStatusLabel ? (
          <div>
            <dt>Cashier</dt>
            <dd>{cashierStatusLabel}</dd>
          </div>
        ) : null}
      </dl>

      <Dash />

      <p className="receipt-thermal-section">Allocation</p>
      <ul className="receipt-thermal-lines">
        {(lines.length ? lines : [{ payeeName: 'Payment', accountLabel: '', amount: total }]).map((l, i) => (
          <li key={i}>
            <div className="receipt-thermal-line-main">
              <span>{formatPersonName(l.payeeName || 'Payment')}</span>
              <span className="receipt-thermal-amt">{fmt(l.amount)}</span>
            </div>
            {l.accountLabel ? <p className="receipt-thermal-muted">{l.accountLabel}</p> : null}
          </li>
        ))}
      </ul>

      <Dash />

      <div className="receipt-thermal-total">
        <span>TOTAL</span>
        <span>{fmt(total)}</span>
      </div>

      <Dash />

      <footer className="receipt-thermal-foot">
        {displayHandledBy && displayHandledBy !== '—' ? (
          <p className="receipt-thermal-muted">Prepared by {displayHandledBy}</p>
        ) : null}
        <p>Thank you for your payment.</p>
        <p className="receipt-thermal-muted">*** End of receipt ***</p>
      </footer>
    </div>
  );
}

/** @deprecated Prefer ReceiptPrintThermal (XP-80C). Kept for any leftover imports. */
export function ReceiptPrintQuick(props) {
  return <ReceiptPrintThermal {...props} />;
}

/** @deprecated Prefer ReceiptPrintThermal (XP-80C). Kept for any leftover imports. */
export function ReceiptPrintFull(props) {
  return <ReceiptPrintThermal {...props} />;
}

export function AdvancePaymentPrintView({
  customerName = '—',
  amountNgn = 0,
  dateStr = '—',
  accountLabel = '—',
  reference = '—',
  purpose = '—',
  handledBy = '—',
}) {
  const displayCustomerName = formatPersonName(customerName);
  const displayHandledBy = formatPersonName(handledBy);
  const headOffice = ZAREWA_QUOTATION_BRANDING.branches?.[0];

  return (
    <div className="receipt-print-thermal receipt-thermal-slip">
      <header className="receipt-thermal-head">
        <p className="receipt-thermal-brand">{ZAREWA_COMPANY_ACCOUNT_NAME}</p>
        {headOffice?.lines?.[0] ? <p className="receipt-thermal-muted">{headOffice.lines[0]}</p> : null}
        <p className="receipt-thermal-title">ADVANCE PAYMENT</p>
      </header>
      <Dash />
      <dl className="receipt-thermal-meta">
        <div>
          <dt>Customer</dt>
          <dd>{displayCustomerName}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{dateStr}</dd>
        </div>
        <div>
          <dt>Into</dt>
          <dd>{accountLabel}</dd>
        </div>
        <div>
          <dt>Ref</dt>
          <dd>{reference || '—'}</dd>
        </div>
        <div>
          <dt>Purpose</dt>
          <dd>{purpose || '—'}</dd>
        </div>
        <div>
          <dt>By</dt>
          <dd>{displayHandledBy}</dd>
        </div>
      </dl>
      <Dash />
      <div className="receipt-thermal-total">
        <span>AMOUNT</span>
        <span>{fmt(amountNgn)}</span>
      </div>
      <Dash />
      <footer className="receipt-thermal-foot">
        <p className="receipt-thermal-muted">Deposit — not revenue until applied to a quotation.</p>
        <p className="receipt-thermal-muted">*** End of voucher ***</p>
      </footer>
    </div>
  );
}
