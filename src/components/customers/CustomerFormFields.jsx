import React, { useState } from 'react';
import { ChevronDown, User, MapPin, Briefcase, Tags } from 'lucide-react';
import { CustomerStaffLinkField } from '../sales/CustomerStaffLinkField';
import { FormField } from '../layout/FormLayout';
import { Input, Select, Textarea } from '../ui/Input';
import {
  CUSTOMER_SECTION,
  CUSTOMER_SECTION_TITLE,
} from './customerUi';

function Section({ title, icon: Icon, children, defaultOpen = true, collapsible = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const header = (
    <div className="flex items-center justify-between gap-2">
      <p className={CUSTOMER_SECTION_TITLE}>
        {Icon ? <Icon size={14} className="text-teal-600" /> : null}
        {title}
      </p>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-zarewa-teal"
          aria-expanded={open}
        >
          <ChevronDown size={16} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
      ) : null}
    </div>
  );
  return (
    <section className={CUSTOMER_SECTION}>
      {header}
      {!collapsible || open ? <div className="space-y-4 pt-1">{children}</div> : null}
    </section>
  );
}

/**
 * Shared customer create/edit fields.
 * @param {{
 *   form: object;
 *   setForm: (fn: (f: object) => object) => void;
 *   customerId?: string;
 *   showCrm?: boolean;
 *   showBilling?: boolean;
 *   paymentTermsOptions?: string[];
 *   tierOptions?: string[];
 *   children?: React.ReactNode;
 * }} props
 */
export function CustomerFormFields({
  form,
  setForm,
  customerId = '',
  showCrm = false,
  showBilling = false,
  paymentTermsOptions = ['Due on receipt', 'Net 30'],
  tierOptions = ['Regular', 'VIP', 'Wholesale', 'Staff'],
  children,
}) {
  const staffLinked = Boolean(String(form.linkedStaffUserId || '').trim());

  const onStaffChange = (staffUserId) => {
    setForm((f) => ({
      ...f,
      linkedStaffUserId: staffUserId,
      tier: staffUserId ? 'Staff' : f.tier === 'Staff' ? 'Regular' : f.tier,
      paymentTerms: staffUserId
        ? 'Staff credit'
        : f.paymentTerms === 'Staff credit'
          ? 'Net 30'
          : f.paymentTerms,
    }));
  };

  return (
    <div className="space-y-5">
      <Section title="Identity" icon={User}>
        <FormField label="Full name" required>
          <Input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Customer or company contact name"
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Phone"
            required={!staffLinked}
            hint={staffLinked ? 'Optional for staff purchase credit accounts.' : undefined}
          >
            <Input
              required={!staffLinked}
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              placeholder={staffLinked ? 'Optional' : 'e.g. 0803 555 0142'}
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@example.com"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Title / role label">
            <Input
              value={form.customerTitle || ''}
              onChange={(e) => setForm((f) => ({ ...f, customerTitle: e.target.value }))}
              placeholder="e.g. Dealer, Installer, Driver"
            />
          </FormField>
          <FormField
            label="Role tags"
            hint="Optional. Customers are your commercial accounts; Client/site on the quotation holds the end-client name."
          >
            <Input
              value={form.roleTagsStr || ''}
              onChange={(e) => setForm((f) => ({ ...f, roleTagsStr: e.target.value }))}
              placeholder="e.g. dealer"
            />
          </FormField>
        </div>
      </Section>

      <Section title="Addresses" icon={MapPin}>
        <FormField label="Shipping address">
          <Textarea
            rows={2}
            value={form.addressShipping}
            onChange={(e) => setForm((f) => ({ ...f, addressShipping: e.target.value }))}
            placeholder="Site or delivery address"
          />
        </FormField>
        {showBilling ? (
          <FormField label="Billing address">
            <Textarea
              rows={2}
              value={form.addressBilling}
              onChange={(e) => setForm((f) => ({ ...f, addressBilling: e.target.value }))}
              placeholder="Invoice address (leave blank to use shipping)"
            />
          </FormField>
        ) : null}
      </Section>

      <Section title="Account settings" icon={Briefcase}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Tier">
            <Select
              value={form.tier}
              onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
            >
              {tierOptions.map((t) => (
                <option key={t} value={t}>
                  {t === 'Staff' ? 'Staff (purchase credit)' : t}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Payment terms">
            <Select
              value={form.paymentTerms}
              onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
            >
              {paymentTermsOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </FormField>
        </div>
      </Section>

      <Section title="Staff purchase credit" collapsible defaultOpen={staffLinked}>
        <CustomerStaffLinkField
          value={form.linkedStaffUserId}
          customerId={customerId}
          onChange={onStaffChange}
          onStaffPick={(staff) => {
            if (!staff) return;
            setForm((f) => ({
              ...f,
              name: f.name.trim() ? f.name : staff.label || staff.displayName || f.name,
            }));
          }}
        />
      </Section>

      {showCrm ? (
        <Section title="CRM profiling" icon={Tags}>
          <FormField label="Company / trading name">
            <Input
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              placeholder="Optional legal or trading name"
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Lead source">
              <Input
                value={form.leadSource}
                onChange={(e) => setForm((f) => ({ ...f, leadSource: e.target.value }))}
                placeholder="Referral, walk-in, WhatsApp…"
              />
            </FormField>
            <FormField label="Preferred contact">
              <Select
                value={form.preferredContact}
                onChange={(e) => setForm((f) => ({ ...f, preferredContact: e.target.value }))}
              >
                <option value="Phone">Phone</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email</option>
                <option value="Site visit">Site visit</option>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Next follow-up">
              <Input
                type="date"
                value={form.followUpISO}
                onChange={(e) => setForm((f) => ({ ...f, followUpISO: e.target.value }))}
              />
            </FormField>
            <FormField label="Tags">
              <Input
                value={form.crmTagsStr}
                onChange={(e) => setForm((f) => ({ ...f, crmTagsStr: e.target.value }))}
                placeholder="VIP, price sensitive, Kano"
              />
            </FormField>
          </div>
          <FormField label="Profile notes">
            <Textarea
              rows={3}
              value={form.crmProfileNotes}
              onChange={(e) => setForm((f) => ({ ...f, crmProfileNotes: e.target.value }))}
              placeholder="Preferences, risks, and history for anyone serving this account…"
            />
          </FormField>
        </Section>
      ) : null}

      {staffLinked ? (
        <Section title="Payout account (refunds)" icon={Briefcase}>
          <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-3 text-sm text-teal-950 leading-snug">
            <p className="font-semibold">Uses HR payroll bank</p>
            <p className="mt-1 text-xs text-teal-900/90">
              This staff-linked customer pays refunds from the employee’s HR bank details (same account as
              salary). Update bank name and account number in HR staff profile or My Profile — you do not
              need a separate bank here.
            </p>
            {(form.bankName || form.bankAccountNo) && (
              <p className="mt-2 text-ui-xs text-slate-600">
                Legacy customer bank fields are ignored when HR bank is on file
                {form.bankName || form.bankAccountNo
                  ? ` (was ${[form.bankName, form.bankAccountNo].filter(Boolean).join(' · ')})`
                  : ''}
                .
              </p>
            )}
          </div>
        </Section>
      ) : (
        <Section title="Payout account (refunds)" icon={Briefcase}>
          <FormField label="Account name">
            <Input
              value={form.bankAccountName || ''}
              onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))}
              placeholder="Name on bank account"
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Bank name">
              <Input
                value={form.bankName || ''}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                placeholder="e.g. Access Bank"
              />
            </FormField>
            <FormField label="Account number">
              <Input
                value={form.bankAccountNo || ''}
                onChange={(e) => setForm((f) => ({ ...f, bankAccountNo: e.target.value }))}
                placeholder="Bank account number"
              />
            </FormField>
          </div>
        </Section>
      )}

      {children}
    </div>
  );
}
