import { useMemo, type CSSProperties } from 'react';
import type { AuthFileItem } from '@/types';
import { hasAuthFileStatusWarning } from '@/features/authFiles/constants';
import type { AuthFileStatusBarData } from '@/features/authFiles/hooks/useAuthFilesStatusBarCache';
import styles from './VaultPulse.module.scss';

/** Maximum rendered credentials; overflow is summarized by a mono "+N" suffix. */
const MAX_BARS = 160;
/** Total stagger budget, matching the 360ms useRevealGroup/ThroughputChart timing. */
const ENTRANCE_BUDGET_MS = 360;

type PulseState = 'live' | 'idle' | 'warning' | 'problem';

type PulseBar = {
  key: string;
  state: PulseState;
  disabled: boolean;
};

export type VaultPulseProps = {
  files: AuthFileItem[];
  statusBarCache: Map<string, AuthFileStatusBarData>;
};

const STATE_CLASS: Record<PulseState, string> = {
  live: styles.barLive,
  idle: styles.barIdle,
  warning: styles.barWarning,
  problem: styles.barProblem,
};

/**
 * VaultPulse credential spectrum, the page signature element.
 *
 * A sibling of dashboard LiveWire: the wire tracks traffic over time, while the
 * spectrum checks credential health across the fleet. Each bar is one credential.
 * Color and height redundantly encode health: emerald=recent traffic, gray=enabled
 * without data, amber=warning, red=unavailable; disabled bars are muted.
 * This decorative information layer is aria-hidden; the header metadata provides text.
 */
export function VaultPulse({ files, statusBarCache }: VaultPulseProps) {
  const bars = useMemo<PulseBar[]>(
    () =>
      files.slice(0, MAX_BARS).map((file) => {
        const disabled = file.disabled === true;
        let state: PulseState;
        if (file.unavailable === true) {
          state = 'problem';
        } else if (hasAuthFileStatusWarning(file)) {
          state = 'warning';
        } else {
          const authIndexKey = typeof file.authIndex === 'string' ? file.authIndex : null;
          const statusData = authIndexKey ? statusBarCache.get(authIndexKey) : undefined;
          const hasTraffic =
            Boolean(statusData) &&
            (statusData?.totalSuccess ?? 0) + (statusData?.totalFailure ?? 0) > 0;
          state = hasTraffic ? 'live' : 'idle';
        }
        return { key: file.name, state, disabled };
      }),
    [files, statusBarCache]
  );

  const overflow = files.length - bars.length;
  const delayStep = bars.length > 1 ? ENTRANCE_BUDGET_MS / (bars.length - 1) : 0;

  if (bars.length === 0) {
    return (
      <div className={styles.pulse} aria-hidden="true">
        <span className={styles.idleLine} />
      </div>
    );
  }

  return (
    <div className={styles.pulse} aria-hidden="true">
      <div className={styles.bars}>
        {bars.map((bar, index) => (
          <span
            key={bar.key}
            className={`${styles.bar} ${STATE_CLASS[bar.state]} ${bar.disabled ? styles.barDisabled : ''}`}
            style={{ '--bar-delay': `${Math.round(index * delayStep)}ms` } as CSSProperties}
          />
        ))}
      </div>
      {overflow > 0 && <span className={styles.overflow}>+{overflow}</span>}
    </div>
  );
}
