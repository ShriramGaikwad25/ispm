"use client";

// Settings (Scheduler) — when this definition's detection runs. Not part of
// the deployed console's definition editor: FREQUENCY mode follows the
// console's agent schedule (frequency, time, time zone); CRON mode follows
// ISPM's Quartz scheduler (cron expression, misfire instruction).

import { CalendarClock } from "lucide-react";
import type { DefinitionSchedule } from "@/lib/assurance-events-api";
import {
  DEFAULT_SCHEDULE, FREQUENCIES, MISFIRE_INSTRUCTIONS, TIME_ZONES, WEEKDAYS, describeSchedule, nextRuns,
  scheduleErrors,
} from "@/lib/assurance-schedule";
import { INPUT, LABEL, cx } from "../ui";
import { KeyValueList, Section } from "./fields";
import type { TabProps } from "./tabs";

const label = (code: string) => code.charAt(0) + code.slice(1).toLowerCase().replace("_", " ");

export function SchedulerTab({ dto, patch, ro }: TabProps) {
  const schedule: DefinitionSchedule = { ...DEFAULT_SCHEDULE, ...dto.schedule };
  const set = (p: Partial<DefinitionSchedule>) => patch({ schedule: { ...schedule, ...p } });
  const errors = scheduleErrors(schedule);
  const runs = nextRuns(schedule);
  const isCron = schedule.mode === "CRON";
  const zoned = (d: Date) => d.toLocaleString("en-US", {
    timeZone: schedule.timeZone, weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const local = (d: Date) => d.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });

  return (
    <>
      <Section title="Detection schedule"
               hint="When this definition's detection runs. A disabled schedule keeps its settings but never fires; findings can still be raised on demand.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Enabled</label>
            <select className={INPUT} disabled={ro} value={String(schedule.enabled)}
                    onChange={(e) => set({ enabled: e.target.value === "true" })}>
              <option value="true">yes</option>
              <option value="false">no</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Schedule type</label>
            <select className={INPUT} disabled={ro} value={schedule.mode}
                    onChange={(e) => set({ mode: e.target.value as DefinitionSchedule["mode"] })}>
              <option value="FREQUENCY">Frequency</option>
              <option value="CRON">Cron expression (advanced)</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Time zone</label>
            <select className={INPUT} disabled={ro} value={schedule.timeZone}
                    onChange={(e) => set({ timeZone: e.target.value })}>
              {TIME_ZONES.map((z) => <option key={z}>{z}</option>)}
            </select>
          </div>

          {isCron ? (
            <div className="md:col-span-3">
              <label className={LABEL}>Cron expression (Quartz: sec min hour day-of-month month day-of-week [year])</label>
              <input className={cx(INPUT, "font-mono")} disabled={ro} placeholder="0 0 2 * * ?"
                     value={schedule.cronExpression ?? ""} onChange={(e) => set({ cronExpression: e.target.value })} />
              <div className="text-[11px] text-gray-500 mt-0.5">
                e.g. <code>0 0 2 * * ?</code> daily at 02:00 · <code>0 0/30 * * * ?</code> every 30 minutes ·{" "}
                <code>0 0 6 ? * MON-FRI</code> weekdays at 06:00
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className={LABEL}>Frequency</label>
                <select className={INPUT} disabled={ro} value={schedule.frequency}
                        onChange={(e) => set({ frequency: e.target.value as DefinitionSchedule["frequency"] })}>
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{label(f)}</option>)}
                </select>
              </div>
              {schedule.frequency !== "ON_DEMAND" && (
                <div>
                  <label className={LABEL}>{schedule.frequency === "HOURLY" ? "Minute past the hour (HH:mm)" : "Time"}</label>
                  <input type="time" className={INPUT} disabled={ro} value={schedule.time}
                         onChange={(e) => set({ time: e.target.value })} />
                </div>
              )}
              {schedule.frequency === "WEEKLY" && (
                <div>
                  <label className={LABEL}>Day of week</label>
                  <select className={INPUT} disabled={ro} value={schedule.dayOfWeek ?? 1}
                          onChange={(e) => set({ dayOfWeek: Number(e.target.value) })}>
                    {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </div>
              )}
              {schedule.frequency === "MONTHLY" && (
                <div>
                  <label className={LABEL}>Day of month (1–31; short months use their last day)</label>
                  <input type="number" min={1} max={31} className={INPUT} disabled={ro} value={schedule.dayOfMonth ?? 1}
                         onChange={(e) => set({ dayOfMonth: Number(e.target.value) })} />
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      <Section title="Run window and misfires"
               hint="Leave the dates empty to run indefinitely. The misfire instruction decides what happens to runs missed while the scheduler was down or the definition was paused.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={LABEL}>Start date</label>
            <input type="date" className={INPUT} disabled={ro} value={schedule.startDate ?? ""}
                   onChange={(e) => set({ startDate: e.target.value || undefined })} />
          </div>
          <div>
            <label className={LABEL}>End date</label>
            <input type="date" className={INPUT} disabled={ro} value={schedule.endDate ?? ""}
                   onChange={(e) => set({ endDate: e.target.value || undefined })} />
          </div>
          <div>
            <label className={LABEL}>Misfire instruction</label>
            <select className={INPUT} disabled={ro} value={schedule.misfireInstruction}
                    onChange={(e) => set({ misfireInstruction: e.target.value })}>
              {MISFIRE_INSTRUCTIONS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Preview">
        {errors.length > 0 && (
          <div className="space-y-1">
            {errors.map((e) => <div key={e} className="text-sm text-red-600">✕ {e}</div>)}
          </div>
        )}
        <KeyValueList rows={[
          ["Schedule", <span key="s" className="inline-flex items-center gap-1.5"><CalendarClock size={14} className="text-gray-400" />{describeSchedule(schedule)}</span>],
          ["Misfires", schedule.misfireInstruction],
          ["Window", schedule.startDate || schedule.endDate
            ? `${schedule.startDate ?? "now"} → ${schedule.endDate ?? "no end"}`
            : "no limit"],
        ]} />
        {!schedule.enabled ? (
          <div className="text-sm text-gray-500">Disabled — nothing runs until it is enabled.</div>
        ) : isCron ? (
          errors.length === 0 && (
            <div className="text-sm text-gray-500">Upcoming cron runs are computed by the scheduler once saved.</div>
          )
        ) : schedule.frequency === "ON_DEMAND" ? (
          <div className="text-sm text-gray-500">Runs only when triggered manually.</div>
        ) : runs.length > 0 ? (
          <div>
            <div className="text-xs text-gray-500 mb-1">Next {runs.length} runs</div>
            <table className="text-sm">
              <tbody>
                {runs.map((r) => (
                  <tr key={r.toISOString()}>
                    <td className="pr-4 py-0.5 text-gray-800">{zoned(r)} <span className="text-xs text-gray-400">{schedule.timeZone}</span></td>
                    <td className="py-0.5 text-xs text-gray-500">{local(r)} your time</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : errors.length === 0 && (
          <div className="text-sm text-amber-700">No runs fall inside the start and end dates.</div>
        )}
      </Section>
    </>
  );
}
