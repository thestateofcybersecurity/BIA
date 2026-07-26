'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { savePlan } from '@/lib/actions';
import type {
  ContinuityPlan,
  TeamMember,
  ActivationTrigger,
  CommunicationEntry,
  ActivationLevel,
  BusinessProcess,
} from '@/lib/domain/types';
import {
  ACTIVATION_LEVELS,
  ACTIVATION_LABELS,
  ACTIVATION_DESCRIPTIONS,
  SUGGESTED_RESPONSE_ROLES,
  SUGGESTED_AUDIENCES,
} from '@/lib/domain/constants';
import { Card, btn } from '@/components/ui';

/** Stable ids without pulling nanoid into the client bundle. */
function rowId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const REMOVE =
  'shrink-0 rounded border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted hover:border-bad hover:text-bad';

export function PlanForm({
  initial,
  processes,
}: {
  initial: ContinuityPlan | null;
  processes: BusinessProcess[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    declarationAuthority: initial?.declarationAuthority ?? '',
    standDownAuthority: initial?.standDownAuthority ?? '',
    commandLocation: initial?.commandLocation ?? '',
    bridgeDetails: initial?.bridgeDetails ?? '',
    team: initial?.team ?? [],
    triggers: initial?.triggers ?? [],
    communications: initial?.communications ?? [],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const patchMember = (id: string, field: keyof TeamMember, value: string) => {
    setSaved(false);
    setForm((f) => ({
      ...f,
      team: f.team.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    }));
  };

  const patchTrigger = (
    id: string,
    field: 'condition' | 'authority' | 'level',
    value: string
  ) => {
    setSaved(false);
    setForm((f) => ({
      ...f,
      triggers: f.triggers.map((t) =>
        t.id === id
          ? field === 'level'
            ? { ...t, level: value as ActivationLevel }
            : { ...t, [field]: value }
          : t
      ),
    }));
  };

  const patchComm = (id: string, field: keyof CommunicationEntry, value: string) => {
    setSaved(false);
    setForm((f) => ({
      ...f,
      communications: f.communications.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  const drop = (key: 'team' | 'triggers' | 'communications', id: string) => {
    setSaved(false);
    setForm((f) => ({
      ...f,
      [key]: (f[key] as { id: string }[]).filter((row) => row.id !== id),
    }));
  };

  const addMember = () =>
    set('team', [
      ...form.team,
      {
        id: rowId('m'),
        role: '',
        name: '',
        title: '',
        email: '',
        phone: '',
        deputy: '',
        deputyPhone: '',
      } satisfies TeamMember,
    ]);

  const addTrigger = () =>
    set('triggers', [
      ...form.triggers,
      { id: rowId('t'), level: 'partial', condition: '', authority: '' } satisfies ActivationTrigger,
    ]);

  const addComm = () =>
    set('communications', [
      ...form.communications,
      {
        id: rowId('c'),
        audience: '',
        channel: '',
        timing: '',
        owner: '',
        keyMessage: '',
      } satisfies CommunicationEntry,
    ]);

  /** Seed the roster and comms plan with the standard roles and audiences. */
  const seedStructure = () => {
    setSaved(false);
    setForm((f) => ({
      ...f,
      team:
        f.team.length > 0
          ? f.team
          : SUGGESTED_RESPONSE_ROLES.slice(0, 5).map((role) => ({
              id: rowId('m'),
              role,
              name: '',
              title: '',
              email: '',
              phone: '',
              deputy: '',
              deputyPhone: '',
            })),
      triggers:
        f.triggers.length > 0
          ? f.triggers
          : ACTIVATION_LEVELS.map((level) => ({
              id: rowId('t'),
              level,
              condition: '',
              authority: '',
            })),
      communications:
        f.communications.length > 0
          ? f.communications
          : SUGGESTED_AUDIENCES.slice(0, 4).map((audience) => ({
              id: rowId('c'),
              audience,
              channel: '',
              timing: '',
              owner: '',
              keyMessage: '',
            })),
    }));
  };

  const ownersWithoutContact = processes.filter((p) => p.owner && !p.ownerEmail);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await savePlan(form);
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <Card
        title="Command and authority"
        subtitle="Who declares, who stands down, and where the response runs from"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="p-declare">Declaration authority</label>
            <input
              id="p-declare"
              value={form.declarationAuthority}
              onChange={(e) => set('declarationAuthority', e.target.value)}
              placeholder="COO, or Incident Commander in their absence"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="p-standdown">Stand-down authority</label>
            <input
              id="p-standdown"
              value={form.standDownAuthority}
              onChange={(e) => set('standDownAuthority', e.target.value)}
              placeholder="Incident Commander, with COO confirmation"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="p-location">Command location (primary / alternate)</label>
            <input
              id="p-location"
              value={form.commandLocation}
              onChange={(e) => set('commandLocation', e.target.value)}
              placeholder="HQ boardroom / Northside office, room 2B"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="p-bridge">Response bridge</label>
            <input
              id="p-bridge"
              value={form.bridgeDetails}
              onChange={(e) => set('bridgeDetails', e.target.value)}
              placeholder="Standing bridge 555-0100 pin 4471, Teams channel #incident"
            />
          </div>
        </div>
      </Card>

      <Card
        title="Activation criteria"
        subtitle="Observable conditions that trigger each level, so declaring is not a judgement call under pressure"
      >
        {form.triggers.length === 0 ? (
          <p className="mb-3 text-sm text-ink-muted">
            No criteria set. Add one per level so the on-call staff know what warrants a call.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {form.triggers.map((t) => (
              <div key={t.id} className="rounded-md border border-line bg-paper/60 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
                      <select
                        aria-label="Activation level"
                        value={t.level}
                        onChange={(e) =>
                          patchTrigger(t.id, 'level', e.target.value as ActivationLevel)
                        }
                      >
                        {ACTIVATION_LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {ACTIVATION_LABELS[l]}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Declaring authority"
                        value={t.authority}
                        onChange={(e) =>
                          patchTrigger(t.id, 'authority', e.target.value)
                        }
                        placeholder="Who can declare at this level"
                      />
                    </div>
                    <input
                      aria-label="Condition"
                      value={t.condition}
                      onChange={(e) =>
                        patchTrigger(t.id, 'condition', e.target.value)
                      }
                      placeholder="Any Tier 1 process down beyond 1 hour with no restoration estimate"
                    />
                    <p className="text-xs text-ink-muted">{ACTIVATION_DESCRIPTIONS[t.level]}</p>
                  </div>
                  <button type="button" className={REMOVE} onClick={() => drop('triggers', t.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button type="button" className={`${btn.secondary} mt-3`} onClick={addTrigger}>
          Add criterion
        </button>
      </Card>

      <Card
        title="Response team roster"
        subtitle="The people who run the response, with the numbers someone will actually dial at 2am"
      >
        {form.team.length === 0 ? (
          <p className="mb-3 text-sm text-ink-muted">
            No roster yet. Every role needs a named primary and a deputy, because the plan has to
            work when one of them is unreachable.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {form.team.map((m) => (
              <div key={m.id} className="rounded-md border border-line bg-paper/60 p-3">
                <div className="flex items-start gap-3">
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <input
                      aria-label="Role"
                      list="response-roles"
                      value={m.role}
                      onChange={(e) => patchMember(m.id, 'role', e.target.value)}
                      placeholder="Incident Commander"
                    />
                    <input
                      aria-label="Name"
                      value={m.name}
                      onChange={(e) => patchMember(m.id, 'name', e.target.value)}
                      placeholder="Name"
                    />
                    <input
                      aria-label="Job title"
                      value={m.title}
                      onChange={(e) => patchMember(m.id, 'title', e.target.value)}
                      placeholder="Job title"
                    />
                    <input
                      aria-label="Email"
                      type="email"
                      value={m.email}
                      onChange={(e) => patchMember(m.id, 'email', e.target.value)}
                      placeholder="name@example.com"
                    />
                    <input
                      aria-label="Phone"
                      value={m.phone}
                      onChange={(e) => patchMember(m.id, 'phone', e.target.value)}
                      placeholder="Mobile, reachable out of hours"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        aria-label="Deputy"
                        value={m.deputy}
                        onChange={(e) => patchMember(m.id, 'deputy', e.target.value)}
                        placeholder="Deputy"
                      />
                      <input
                        aria-label="Deputy phone"
                        value={m.deputyPhone}
                        onChange={(e) =>
                          patchMember(m.id, 'deputyPhone', e.target.value)
                        }
                        placeholder="Deputy phone"
                      />
                    </div>
                  </div>
                  <button type="button" className={REMOVE} onClick={() => drop('team', m.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <datalist id="response-roles">
          {SUGGESTED_RESPONSE_ROLES.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
        <button type="button" className={`${btn.secondary} mt-3`} onClick={addMember}>
          Add team member
        </button>
      </Card>

      <Card
        title="Communications plan"
        subtitle="Who hears what, through which channel, and how fast"
      >
        {form.communications.length === 0 ? (
          <p className="mb-3 text-sm text-ink-muted">
            No audiences defined. Regulated organizations usually have a reporting clock running
            from detection, so timing here should match the obligation, not an aspiration.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {form.communications.map((c) => (
              <div key={c.id} className="rounded-md border border-line bg-paper/60 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="grid gap-2 sm:grid-cols-4">
                      <input
                        aria-label="Audience"
                        list="comms-audiences"
                        value={c.audience}
                        onChange={(e) =>
                          patchComm(c.id, 'audience', e.target.value)
                        }
                        placeholder="Audience"
                      />
                      <input
                        aria-label="Channel"
                        value={c.channel}
                        onChange={(e) =>
                          patchComm(c.id, 'channel', e.target.value)
                        }
                        placeholder="Channel"
                      />
                      <input
                        aria-label="Timing"
                        value={c.timing}
                        onChange={(e) =>
                          patchComm(c.id, 'timing', e.target.value)
                        }
                        placeholder="Within 1 hour"
                      />
                      <input
                        aria-label="Owner"
                        value={c.owner}
                        onChange={(e) =>
                          patchComm(c.id, 'owner', e.target.value)
                        }
                        placeholder="Owner"
                      />
                    </div>
                    <textarea
                      aria-label="Key message"
                      rows={2}
                      value={c.keyMessage}
                      onChange={(e) =>
                        patchComm(c.id, 'keyMessage', e.target.value)
                      }
                      placeholder="Holding message: what is known, what is being done, when the next update comes."
                    />
                  </div>
                  <button
                    type="button"
                    className={REMOVE}
                    onClick={() => drop('communications', c.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <datalist id="comms-audiences">
          {SUGGESTED_AUDIENCES.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        <button type="button" className={`${btn.secondary} mt-3`} onClick={addComm}>
          Add audience
        </button>
      </Card>

      {ownersWithoutContact.length > 0 && (
        <p className="text-xs text-ink-muted">
          {ownersWithoutContact.length} process owner
          {ownersWithoutContact.length === 1 ? ' has' : 's have'} no email recorded, so the plan
          contact directory will list them by name only. Add contact details on each process.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className={btn.primary} disabled={pending}>
          {pending ? 'Saving…' : 'Save plan'}
        </button>
        <button type="button" className={btn.secondary} onClick={seedStructure}>
          Fill standard structure
        </button>
        {saved && !pending && <span className="text-sm text-ok">Saved.</span>}
      </div>
    </form>
  );
}
