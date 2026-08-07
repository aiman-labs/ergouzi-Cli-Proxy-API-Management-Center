import type { ReactNode } from 'react';
import { IconX } from '@/components/ui/icons';
import styles from './ExcludedModelRuleChip.module.scss';

/**
 * Exclusion chip with three source-based variants, replacing two nearly identical
 * handwritten markers: `.excludedModelChip` in `AuthFileDetailsSheet.module.scss`
 * and `.customRuleChip` in `AuthFilesOAuthExcludedEditPage.module.scss`.
 *
 * - `exact`    Solid primary tint: explicitly selected and directly removable.
 * - `wildcard` Dashed: derived from a wildcard rule. It has no remove action because
 *              removal requires editing the source rule.
 * - `unknown`  Muted dashed: exact rule missing from the catalog, still removable.
 */
export type ExcludedModelChipVariant = 'exact' | 'wildcard' | 'unknown';

export interface ExcludedModelRuleChipProps {
  label: string;
  variant?: ExcludedModelChipVariant;
  /** Secondary detail, such as the rule that derived this chip. */
  detail?: string;
  /** Omit to render no remove action. */
  onRemove?: () => void;
  removeAriaLabel?: string;
  disabled?: boolean;
  title?: string;
}

/** Shared wrapping container so consumers do not duplicate the flex-wrap layout. */
export function ExcludedModelChipRow({ children }: { children: ReactNode }) {
  return <div className={styles.chipRow}>{children}</div>;
}

export function ExcludedModelRuleChip({
  label,
  variant = 'exact',
  detail,
  onRemove,
  removeAriaLabel,
  disabled = false,
  title,
}: ExcludedModelRuleChipProps) {
  return (
    <span
      className={`${styles.chip} ${styles[variant]}`}
      title={title ?? (detail ? `${label} — ${detail}` : label)}
    >
      <span className={styles.label}>{label}</span>
      {detail ? <span className={styles.detail}>{detail}</span> : null}
      {onRemove ? (
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          disabled={disabled}
          aria-label={removeAriaLabel ?? label}
        >
          <IconX size={12} />
        </button>
      ) : null}
    </span>
  );
}
