import React from 'react';
import { CoilLifeList } from '../../components/operations/CoilLifeList';
import { CoilLifeFlowBar } from '../../components/operations/CoilLifeFlowBar';
import { CoilMovementTimeline } from '../../components/operations/CoilMovementTimeline';
import { CoilRollFinishSummary } from '../../components/operations/CoilRollFinishSummary';
import { CoilCountYard } from '../../components/operations/CoilCountYard';
import { CoilCountSheet } from '../../components/operations/CoilCountSheet';
import { CoilDashboardCardGrid } from '../../components/operations/CoilDashboardCards';
import { ProductionRegisterCoilRow } from '../../components/operations/ProductionRegisterCoilRow';
import { formatSignedKg, buildCoilLife } from '../../lib/coilExpectedLife';
import { CoilVarianceBadge } from '../../components/operations/CoilVarianceBadge';

const LOTS = [
  {
    coilNo: 'CL-KD-2043',
    materialTypeName: 'Aluzinc',
    gaugeLabel: '0.20',
    colour: 'Bush green',
    weightKg: 5000,
    currentWeightKg: 5000,
    currentStatus: 'Available',
    location: 'Bay A',
    productID: 'PRD-102',
  },
  {
    coilNo: 'CL-KD-1888',
    materialTypeName: 'Aluminium',
    gaugeLabel: '0.45',
    colour: 'Terracotta',
    weightKg: 4200,
    currentWeightKg: 900,
    currentStatus: 'Available',
    location: 'Bay B',
    productID: 'COIL-ALU',
  },
  {
    coilNo: 'CL-KD-1760',
    materialTypeName: 'Aluzinc',
    gaugeLabel: '0.18',
    colour: 'Off white',
    weightKg: 4800,
    currentWeightKg: 4620,
    currentStatus: 'Reserved',
    location: 'Bay A',
    productID: 'PRD-102',
  },
];

const JOBS = [
  { coilNo: 'CL-KD-2043', jobID: 'J-41', metersProduced: 100, consumedWeightKg: 190 },
  { coilNo: 'CL-KD-1888', jobID: 'J-42', metersProduced: 800, consumedWeightKg: 1100 },
  { coilNo: 'CL-KD-1760', jobID: 'J-43', metersProduced: 80, consumedWeightKg: 140 },
];

const DETAIL = LOTS[1];
const detailLife = buildCoilLife(DETAIL, JOBS.filter((j) => j.coilNo === DETAIL.coilNo), [
  { id: 'tail', type: 'ADJUST', detail: 'roll finished — tail 40 kg', atISO: '2026-03-02', createdByName: 'Sule', reason: 'Spool only' },
]);

function Phone({ id, title, children }) {
  return (
    <section data-screen={id} className="mx-auto mb-8 w-full max-w-[390px] rounded-2xl border border-slate-200 bg-[#f4f6f5] p-3">
      <h2 className="mb-2 text-sm font-bold text-zarewa-teal">{title}</h2>
      {children}
    </section>
  );
}

export default function CoilUxGallery() {
  return (
      <main className="min-h-screen bg-slate-100 px-2 py-4">
        <Phone id="screen-coil-list" title="Coil list">
          <CoilLifeList lots={LOTS} jobCoils={JOBS} colourLabel={(c) => c || '—'} />
        </Phone>
        <Phone id="screen-coil-detail" title="Coil detail">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="font-mono text-lg font-bold text-zarewa-teal">{DETAIL.coilNo}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <p>Received kg <strong>{detailLife.receivedKg}</strong></p>
              <p>Metres run <strong>{detailLife.metres}</strong></p>
              <p>Expected kg <strong>{detailLife.expectedKg?.toFixed(1)}</strong></p>
              <p>ERP kg <strong>{detailLife.erpKg}</strong></p>
              <p>
                Variance <CoilVarianceBadge status={detailLife.status} varianceLabel={formatSignedKg(detailLife.varianceKg)} />
              </p>
              <p>Rate used <strong>{detailLife.rateKgPerM} kg/m</strong></p>
            </div>
            <div className="mt-3">
              <CoilLifeFlowBar
                receivedKg={detailLife.receivedKg}
                usedKg={detailLife.bookedKg}
                remainingKg={detailLife.erpKg}
                tailKg={40}
              />
            </div>
            <div className="mt-3">
              <CoilMovementTimeline
                coil={DETAIL}
                jobRows={[]}
                movements={[
                  {
                    id: 'grn',
                    type: 'GRN',
                    detail: 'Received 4200 kg',
                    atISO: '2026-02-01T08:00',
                    createdByName: 'Amina',
                    reason: 'Weighbridge',
                  },
                  {
                    id: 'job-old',
                    type: 'PRODUCTION',
                    detail: 'Job J-42 consumed 2000 kg · 800 m',
                    jobID: 'J-42',
                    atISO: '2026-02-10T09:00',
                    createdByName: 'Ibrahim',
                  },
                  {
                    id: 'job-new',
                    type: 'PRODUCTION',
                    detail: 'Job J-42 completion correction 1100 kg · 800 m',
                    jobID: 'J-42',
                    atISO: '2026-02-11T09:00',
                    createdByName: 'Ibrahim',
                    reason: 'Scale reading replaced the first entry',
                  },
                  {
                    id: 'tail',
                    type: 'ADJUST',
                    detail: 'roll finished — tail 40 kg',
                    atISO: '2026-03-02T15:00',
                    createdByName: 'Sule',
                    reason: 'Spool only',
                  },
                ]}
              />
            </div>
          </div>
        </Phone>
        <Phone id="screen-job-entry" title="Production job entry">
          <ProductionRegisterCoilRow
            row={{
              id: 'r1',
              coilNo: 'CL-KD-2043',
              openingWeightKg: '1200',
              closingWeightKg: '187',
              metersProduced: '4',
              note: '',
            }}
            index={0}
            lot={LOTS[0]}
            freeKg={5000}
            inModal={false}
            canPickCoilAndOpening={false}
            canCaptureRun
            canEditCompletedCoilCorrections={false}
            readOnly={false}
            jobSt="Running"
            draftRow={false}
            showRemove={false}
            specWarn=""
            coilTailFinishMaxKg={85}
            recommendedOptions={[]}
            otherOptions={[{ coilNo: 'CL-KD-2043', label: 'CL-KD-2043' }]}
            disabledCoilNos={[]}
            onFieldChange={() => {}}
            onRemove={() => {}}
          />
        </Phone>
        <Phone id="screen-roll-finish" title="Roll finish">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <CoilRollFinishSummary
              receivedKg={5000}
              bookedKg={190}
              tailKg={80}
              metres={100}
              rate={1.935}
              onWatchList
            />
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Reason
              <textarea className="z-input mt-1 min-h-20 w-full" placeholder="Reason (required) — why this roll is off the expected kg" />
            </label>
          </div>
        </Phone>
        <Phone id="screen-count" title="Stock count">
          <CoilCountYard lots={LOTS} />
        </Phone>
        <Phone id="screen-count-sheet" title="Count sheet">
          <div className="overflow-x-auto bg-white">
            <CoilCountSheet lots={LOTS} branchName="Kaduna" dateLabel="7 October 2026" />
          </div>
        </Phone>
        <Phone id="screen-dashboard" title="Dashboard cards">
          <CoilDashboardCardGrid
            stats={{
              offCount: 2,
              offKg: 2480,
              paidCount: 3,
              paidNgn: 4500000,
              watchCount: 2,
              notSeen: 6,
              notSeenHint: 'On hand, not on the sheet',
            }}
            onOffExpected={() => {}}
            onPaid={() => {}}
            onWatch={() => {}}
            onNotSeen={() => {}}
          />
        </Phone>
        <Phone id="screen-advance" title="Supplier advance">
          <div className="space-y-2">
            {[
              ['Paid – not received', '₦4,200,000', '2 POs · goods outstanding'],
              ['Received, not valued', '₦80,000', 'PO-KD-26-0066 · accessories'],
              ['True over-payment', '₦200,000', '1 PO · cash above valued goods'],
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-ui-xs font-bold uppercase tracking-wide text-amber-700">{label}</p>
                <p className="mt-1 text-xl font-black tabular-nums text-zarewa-teal">{value}</p>
                <p className="mt-1 text-ui-xs text-slate-500">{hint}</p>
              </div>
            ))}
          </div>
        </Phone>
      </main>
  );
}
