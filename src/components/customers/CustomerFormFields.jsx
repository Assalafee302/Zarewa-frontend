import React, { useState } from 'react';
import { ChevronDown, User, MapPin, Briefcase, Tags } from 'lucide-react';
import { CustomerStaffLinkField } from '../sales/CustomerStaffLinkField';
import {
  CUSTOMER_FIELD,
  CUSTOMER_LABEL,
  CUSTOMER_SECTION,
  CUSTOMER_SECTION_TITLE,
  CUSTOMER_SELECT,
  CUSTOMER_TEXTAREA,
} from './customerUi';

function Field({ label, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className={CUSTOMER_LABEL}>
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-ui-xs text-slate-500 leading-relaxed">{hint}</p> : null}
    </div>
  );
}

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
        <Field label="Full name" required>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={CUSTOMER_FIELD}
            placeholder="Customer or company contact name"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone" required={!staffLinked} hint={staffLinked ? 'Optional for staff purchase credit accounts.' : undefined}>
            <input
              required={!staffLinked}
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              className={CUSTOMER_FIELD}
              placeholder={staffLinked ? 'Optional' : 'e.g. 0803 555 0142'}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={CUSTOMER_FIELD}
              placeholder="name@example.com"
            />
          </Field>
        </div>
      </Section>

      <Section title="Addresses" icon={MapPin}>
        <Field label="Shipping address">
          <textarea
            rows={2}
            value={form.addressShipping}
            onChange={(e) => setForm((f) => ({ ...f, addressShipping: e.target.value }))}
            className={CUSTOMER_TEXTAREA}
            placeholder="Site or delivery address"
          />
        </Field>
        {showBilling ? (
          <Field label="Billing address">
            <textarea
              rows={2}
              value={form.addressBilling}
              onChange={(e) => setForm((f) => ({ ...f, addressBilling: e.target.value }))}
              className={CUSTOMER_TEXTAREA}
              placeholder="Invoice address (leave blank to use shipping)"
            />
          </Field>
        ) : null}
      </Section>

      <Section title="Account settings" icon={Briefcase}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Tier">
            <select
              value={form.tier}
              onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
              className={CUSTOMER_SELECT}
            >
              {tierOptions.map((t) => (
                <option key={t} value={t}>
                  {t === 'Staff' ? 'Staff (purchase credit)' : t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment terms">
            <select
              value={form.paymentTerms}
              onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
              className={CUSTOMER_SELECT}
            >
              {paymentTermsOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={CUSTOMER_SELECT}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Field>
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
          <Field label="Company / trading name">
            <input
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              className={CUSTOMER_FIELD}
              placeholder="Optional legal or trading name"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Lead source">
              <input
                value={form.leadSource}
                onChange={(e) => setForm((f) => ({ ...f, leadSource: e.target.value }))}
                className={CUSTOMER_FIELD}
                placeholder="Referral, walk-in, WhatsApp…"
              />
            </Field>
            <Field label="Preferred contact">
              <select
                value={form.preferredContact}
                onChange={(e) => setForm((f) => ({ ...f, preferredContact: e.target.value }))}
                className={CUSTOMER_SELECT}
              >
                <option value="Phone">Phone</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Email">Email</option>
                <option value="Site visit">Site visit</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Next follow-up">
              <input
                type="date"
                value={form.followUpISO}
                onChange={(e) => setForm((f) => ({ ...f, followUpISO: e.target.value }))}
                className={CUSTOMER_FIELD}
              />
            </Field>
            <Field label="Tags">
              <input
                value={form.crmTagsStr}
                onChange={(e) => setForm((f) => ({ ...f, crmTagsStr: e.target.value }))}
                className={CUSTOMER_FIELD}
                placeholder="VIP, price sensitive, Kano"
              />
            </Field>
          </div>
          <Field label="Profile notes">
            <textarea
              rows={3}
              value={form.crmProfileNotes}
              onChange={(e) => setForm((f) => ({ ...f, crmProfileNotes: e.target.value }))}
              className={CUSTOMER_TEXTAREA}
              placeholder="Preferences, risks, and history for anyone serving this account…"
            />
          </Field>
        </Section>
      ) : null}

      {children}
    </div>
  );
}
