import React from 'react';
import { Phone, Mail, MapPin, BadgeCheck, User } from 'lucide-react';
import { customerPickerPrimaryLabel } from '../../lib/customerPickerSearch';
import {
  customerInitials,
  customerStatusTone,
  customerTierTone,
  paymentRelationshipTone,
} from './customerUi';

/**
 * @param {{ customer: object; paymentRelationship: { label: string; tone: string } }} props
 */
export function CustomerProfileHero({ customer, paymentRelationship }) {
  const staffLinked =
    customer.staffUserId || customer.staffDisplayName || customer.staffEmployeeNo;

  return (
    <header
      id="cd-overview"
      className="relative overflow-hidden rounded-2xl border border-teal-900/10 bg-gradient-to-br from-[#134e4a] via-[#0f3d3a] to-[#0c3532] p-5 sm:p-6 mb-8 shadow-lg shadow-teal-950/10"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-teal-400/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-emerald-300/10 blur-2xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl font-black text-teal-200 ring-2 ring-white/15 backdrop-blur-sm">
          {customerInitials(customer.name)}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-200/80">
              {customer.customerID}
            </p>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
              {customer.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${customerStatusTone(customer.status)}`}>
              {customer.status}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${customerTierTone(customer.tier)}`}>
              {customer.tier}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${paymentRelationshipTone(paymentRelationship.tone)}`}>
              {paymentRelationship.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-teal-50/95">
            {customer.phoneNumber ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 backdrop-blur-sm">
                <Phone size={13} className="text-teal-200" />
                {customer.phoneNumber}
              </span>
            ) : null}
            {customer.email ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 backdrop-blur-sm">
                <Mail size={13} className="text-teal-200" />
                {customer.email}
              </span>
            ) : null}
            {customer.paymentTerms ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 backdrop-blur-sm">
                <BadgeCheck size={13} className="text-teal-200" />
                {customer.paymentTerms}
              </span>
            ) : null}
          </div>

          {staffLinked ? (
            <p className="inline-flex items-center gap-2 rounded-xl border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-50">
              <User size={14} className="text-teal-200 shrink-0" />
              Staff purchase credit ·{' '}
              <span className="font-bold">{customerPickerPrimaryLabel(customer)}</span>
            </p>
          ) : null}

          <p className="text-[10px] text-teal-100/70 leading-relaxed">
            <span className="font-bold text-teal-100/90">Account officer</span> {customer.createdBy || '—'}
            {customer.createdAtISO ? <span> · On file since {customer.createdAtISO}</span> : null}
            {customer.lastActivityISO ? <span> · Last activity {customer.lastActivityISO}</span> : null}
          </p>

          {(customer.addressShipping || customer.addressBilling) ? (
            <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-teal-50/85">
              {customer.addressShipping ? (
                <span className="inline-flex items-start gap-1.5 max-w-md">
                  <MapPin size={12} className="text-teal-300 mt-0.5 shrink-0" />
                  <span>
                    <span className="font-bold text-teal-100/90 uppercase text-[9px] tracking-wide block">Shipping</span>
                    {customer.addressShipping}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
