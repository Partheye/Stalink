import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { ConnectionModeState, TriggerRule } from '../types/connection';

interface AutomationControlPanelProps {
  connectionMode: ConnectionModeState;
  triggerRule: TriggerRule;
  intervalSec: number;
  manualOverride: boolean;
  faultInjected: boolean;
  secondsUntilNextEval: number;
  consecutiveFailures: number;
  onSelectTriggerRule: (rule: TriggerRule) => void;
  onSelectInterval: (sec: number) => void;
  onToggleFault: () => void;
  onRunProbeNow: () => void;
  onForceState: (target: ConnectionModeState) => void;
}

const TRIGGER_OPTIONS: readonly {
  id: TriggerRule;
  label: string;
  description: string;
}[] = [
  {
    id: 'heartbeat_threshold',
    label: 'Heartbeat Monitor',
    description:
      'Evaluates periodic probes and switches Offline after 2 consecutive missed heartbeats; restores when probes recover.',
  },
  {
    id: 'interval_cycle',
    label: 'Interval Cycle',
    description:
      'Automatically alternates between Online and Offline at every scheduled simulation tick.',
  },
  {
    id: 'jitter_spike',
    label: 'Packet Loss Guard',
    description:
      'Monitors simulated packet loss and disconnects automatically if loss exceeds 25%.',
  },
];

const INTERVAL_OPTIONS = [3, 5, 10] as const;

export const AutomationControlPanel: React.FC<AutomationControlPanelProps> = ({
  connectionMode,
  triggerRule,
  intervalSec,
  manualOverride,
  faultInjected,
  secondsUntilNextEval,
  consecutiveFailures,
  onSelectTriggerRule,
  onSelectInterval,
  onToggleFault,
  onRunProbeNow,
  onForceState,
}) => {
  const activeRule =
    TRIGGER_OPTIONS.find((r) => r.id === triggerRule) ?? TRIGGER_OPTIONS[0];
  const progressPct = manualOverride
    ? 0
    : Math.min(
        100,
        Math.max(0, ((intervalSec - secondsUntilNextEval) / intervalSec) * 100)
      );

  return (
    <section
      id="automation"
      aria-labelledby="automation-panel-heading"
      className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="automation-panel-heading"
            className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Automatic Toggle Behavior
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Configure background evaluation rules, heartbeat intervals, and fault
            triggers.
          </p>
        </div>
      </div>

      {/* Loop Countdown Bar */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {manualOverride
              ? 'Simulation loop paused (Manual Override)'
              : `Next evaluation in ${secondsUntilNextEval}s`}
          </span>
          <span className="font-mono-tabular text-slate-500 dark:text-slate-400">
            Missed probes: {consecutiveFailures}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-[width] duration-300 ${
              manualOverride
                ? 'bg-slate-300 dark:bg-slate-700'
                : 'bg-emerald-600 dark:bg-emerald-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Trigger Rule Selector */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
        <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Evaluation Rule
        </span>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
          role="group"
          aria-label="Automatic toggle trigger rule"
        >
          {TRIGGER_OPTIONS.map((opt) => {
            const isSelected = triggerRule === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectTriggerRule(opt.id)}
                className={`px-2.5 py-2 min-h-[38px] rounded-md text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {activeRule.description}
        </p>
      </div>

      {/* Evaluation Interval Selector */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
        <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Heartbeat Evaluation Interval
        </span>
        <div
          className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
          role="group"
          aria-label="Evaluation interval seconds"
        >
          {INTERVAL_OPTIONS.map((sec) => {
            const isSelected = intervalSec === sec;
            return (
              <button
                key={sec}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectInterval(sec)}
                className={`px-3 py-2 min-h-[38px] rounded-md text-xs font-mono-tabular font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600 ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Every {sec}s
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulated Event Triggers */}
      <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
        <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Simulate Network Conditions
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onToggleFault}
            aria-pressed={faultInjected}
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-lg border text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
              faultInjected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50'
            }`}
          >
            {faultInjected ? (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Restore Healthy Link</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Inject Link Fault</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRunProbeNow}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>Run Probe Now</span>
          </button>
        </div>
      </div>

      {/* Explicit Manual Force Controls */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
        <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Direct Manual State Control
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onForceState('Online')}
            aria-pressed={connectionMode === 'Online' && manualOverride}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-lg text-xs font-medium border whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
              connectionMode === 'Online'
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Set Online
          </button>
          <button
            type="button"
            onClick={() => onForceState('Offline')}
            aria-pressed={connectionMode === 'Offline' && manualOverride}
            className={`px-3.5 py-2.5 min-h-[44px] rounded-lg text-xs font-medium border whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 ${
              connectionMode === 'Offline'
                ? 'bg-rose-600 border-rose-600 text-white'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Set Offline
          </button>
        </div>
      </div>
    </section>
  );
};
