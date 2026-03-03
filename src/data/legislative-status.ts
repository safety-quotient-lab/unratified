/**
 * Legislative status data for the U.S. ICESCR ratification pipeline.
 *
 * Models the 4-step Senate treaty ratification process as a state machine.
 * All strings follow E-prime and fair witness voice conventions.
 */

export type StepStatus = 'completed' | 'stalled' | 'pending';

export interface PipelineStep {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  status: StepStatus;
  dates: {
    started?: string;
    completed?: string;
    stalledSince?: string;
  };
}

export interface CongressStatus {
  number: number;
  session: number;
  pendingBill: string | null;
  lastAction: string;
  lastActionDate: string;
}

export interface Milestone {
  year: number;
  label: string;
  description: string;
}

/** The 4-step U.S. Senate treaty ratification pipeline for ICESCR. */
export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 'signature',
    label: 'Presidential Signature',
    shortLabel: 'Signed',
    description:
      'President Carter signed the ICESCR on October 5, 1977, signaling U.S. intent to ratify. Signature does not constitute ratification under international law.',
    status: 'completed',
    dates: {
      started: '1977-10-05',
      completed: '1977-10-05',
    },
  },
  {
    id: 'committee',
    label: 'Senate Foreign Relations Committee',
    shortLabel: 'Committee',
    description:
      'The Senate Foreign Relations Committee held hearings on the ICESCR in November 1979 (96th Congress) but never advanced the treaty to a committee vote. Without committee action, the treaty cannot advance to the full Senate.',
    status: 'stalled',
    dates: {
      stalledSince: '1978-01-01',
    },
  },
  {
    id: 'senate-vote',
    label: 'Full Senate Vote (67 votes needed)',
    shortLabel: 'Senate Vote',
    description:
      'A two-thirds supermajority (67 of 100 senators) must consent to ratification. This step requires prior committee approval.',
    status: 'pending',
    dates: {},
  },
  {
    id: 'ratification',
    label: 'Instrument of Ratification Deposited',
    shortLabel: 'Ratified',
    description:
      'Following Senate consent, the President deposits the instrument of ratification with the UN Secretary-General. The U.S. then becomes a State Party to the ICESCR.',
    status: 'pending',
    dates: {},
  },
];

/** Current Congress and pending legislative activity. */
export const CONGRESS_STATUS: CongressStatus = {
  number: 119,
  session: 2,
  pendingBill: null,
  lastAction:
    'No ratification legislation introduced in the 119th Congress (2025–2026).',
  lastActionDate: '2026-03-03',
};

/** Key historical milestones in the U.S.–ICESCR timeline. */
export const MILESTONES: Milestone[] = [
  {
    year: 1966,
    label: 'Covenant Adopted',
    description: 'The UN General Assembly adopted the ICESCR on December 16, 1966.',
  },
  {
    year: 1976,
    label: 'Entered into Force',
    description:
      'The ICESCR entered into force internationally on January 3, 1976, after 35 ratifications.',
  },
  {
    year: 1977,
    label: 'U.S. Signed',
    description: 'President Carter signed the ICESCR on October 5, 1977.',
  },
  {
    year: 2026,
    label: 'No Ratification',
    description:
      'Nearly five decades after signing, the U.S. Senate has never voted on ICESCR ratification.',
  },
];

/** Nations that have ratified the ICESCR as of March 2026. */
export const NATIONS_RATIFIED = 173;

/** Total UN member states for context. */
export const UN_MEMBER_STATES = 193;

/** Year the U.S. signed the ICESCR. */
const SIGNING_YEAR = 1977;

/** Current year for computed helpers. */
const CURRENT_YEAR = 2026;

/** Returns the number of years since the U.S. signed the ICESCR. */
export function yearsSinceSigning(): number {
  return CURRENT_YEAR - SIGNING_YEAR;
}

/** Returns the index (0-based) of the current active/stalled step. */
export function currentStepIndex(): number {
  const stalledIdx = PIPELINE_STEPS.findIndex((s) => s.status === 'stalled');
  if (stalledIdx >= 0) return stalledIdx;
  const pendingIdx = PIPELINE_STEPS.findIndex((s) => s.status === 'pending');
  if (pendingIdx >= 0) return pendingIdx;
  return PIPELINE_STEPS.length - 1;
}

/** Returns the label of the next required action to advance ratification. */
export function nextRequiredStep(): string {
  const idx = currentStepIndex();
  const step = PIPELINE_STEPS[idx];
  if (step.status === 'stalled') {
    return `Senate Foreign Relations Committee — schedule a ratification vote`;
  }
  if (idx < PIPELINE_STEPS.length) {
    return step.label;
  }
  return 'Completed';
}
