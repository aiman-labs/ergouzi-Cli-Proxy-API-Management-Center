import type { ReactNode } from 'react';
import { InfoTip } from '@/components/ui/Tooltip';
import { FIELDS_ROOT_CLASS } from './fields/FieldPrimitives';
import styles from './SectionCard.module.scss';

export type SectionCardProps = {
  /** Section number 01-07; omit for the common alias view. */
  indexLabel?: string;
  icon?: ReactNode;
  title: ReactNode;
  /** 分区说明：默认收进标题后的 InfoTip，不占版面。 */
  description?: ReactNode;
  /** Keep the section description visible below its title. */
  keepDescriptionVisible?: boolean;
  /** True only for the initial entrance; tab changes do not replay it. */
  animateIn?: boolean;
  children: ReactNode;
};

/**
 * Natural-height section card replacing the old fixed-height snap carousel.
 * Matches site cards with 14px radius, 1px border, and 82% color mix.
 */
export function SectionCard({
  indexLabel,
  icon,
  title,
  description,
  keepDescriptionVisible = false,
  animateIn = false,
  children,
}: SectionCardProps) {
  return (
    <section className={`${styles.card} ${animateIn ? styles.cardEnter : ''}`}>
      <header
        className={
          description && keepDescriptionVisible
            ? `${styles.header} ${styles.headerWithDescription}`
            : styles.header
        }
      >
        <div className={styles.badges}>
          {indexLabel ? <span className={styles.indexBadge}>{indexLabel}</span> : null}
          {icon ? <span className={styles.iconBadge}>{icon}</span> : null}
        </div>
        <div className={styles.heading}>
          <div className={styles.titleLine}>
            <h2 className={styles.title}>{title}</h2>
            {description && !keepDescriptionVisible ? (
              <InfoTip
                content={description}
                label={typeof title === 'string' ? title : undefined}
              />
            ) : null}
          </div>
          {description && keepDescriptionVisible ? (
            <p className={styles.description}>{description}</p>
          ) : null}
        </div>
      </header>
      <div className={`${styles.content} ${FIELDS_ROOT_CLASS}`}>{children}</div>
    </section>
  );
}
