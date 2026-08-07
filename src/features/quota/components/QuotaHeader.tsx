import { useTranslation } from 'react-i18next';
import { IconRefreshCw } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import type { CodexQuotaJobProgress } from '@/stores/useCodexQuotaJobStore';
import { useCountUp } from '@/hooks/motion';
import styles from './QuotaHeader.module.scss';

export type QuotaHeaderProps = {
  totalCount: number;
  loadedCount: number;
  attentionCount: number;
  refreshing: boolean;
  jobActive: boolean;
  progress: CodexQuotaJobProgress;
  disableControls: boolean;
  onRefreshPage: () => void;
  onRefreshAll: () => void;
  onCancel: () => void;
};

/**
 * Quota-page header with title, mono telemetry metadata, and an ink-pill refresh-all action.
 * It shares the credential-library header vocabulary without an eyebrow; the cursor starts the metadata row.
 *
 * Three data-reveal nodes are coordinated by the page shell's useRevealGroup:
 * title at 0ms, metadata at 70ms, actions at 140ms, and tabs at 210ms.
 */
export function QuotaHeader(props: QuotaHeaderProps) {
  const {
    totalCount,
    loadedCount,
    attentionCount,
    refreshing,
    jobActive,
    progress,
    disableControls,
    onRefreshPage,
    onRefreshAll,
    onCancel,
  } = props;
  const { t } = useTranslation();
  // Loaded is the only rolling number while batch results arrive.
  const displayLoadedCount = useCountUp(loadedCount);

  return (
    <header className={styles.header}>
      <div className={styles.copy}>
        <h1 className={styles.title} data-reveal>
          {t('quota_management.title')}
        </h1>
        <p className={styles.meta} data-reveal>
          <span className={styles.metaTotal}>
            {t('quota_management.meta_credentials', { count: totalCount })}
          </span>
          <span className={styles.metaDot} aria-hidden="true">
            ·
          </span>
          <span className={loadedCount > 0 ? styles.metaLoaded : styles.metaMuted}>
            {t('quota_management.meta_loaded', { count: displayLoadedCount })}
          </span>
          {attentionCount > 0 && (
            <>
              <span className={styles.metaDot} aria-hidden="true">
                ·
              </span>
              <span className={styles.metaAttention}>
                {t('quota_management.meta_attention', { count: attentionCount })}
              </span>
            </>
          )}
        </p>
      </div>
      <div className={styles.actions} data-reveal>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefreshPage}
          disabled={disableControls || refreshing || jobActive}
        >
          <IconRefreshCw size={14} />
          {t('quota_management.refresh_current_page')}
        </Button>
        <button
          type="button"
          className={styles.primaryAction}
          onClick={onRefreshAll}
          disabled={disableControls || refreshing || jobActive}
        >
          <IconRefreshCw size={14} className={refreshing ? styles.spinning : undefined} />
          {t('quota_management.refresh_all_credentials')}
        </button>
        {jobActive && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t('quota_management.refresh_job_cancel')}
          </Button>
        )}
      </div>
      {progress.status !== 'idle' && progress.total > 0 && (
        <div className={styles.jobProgress} role="status" aria-live="polite">
          <span>{t(`quota_management.refresh_job_status_${progress.status}`)}</span>
          <span>
            {t('quota_management.refresh_job_progress', {
              completed: progress.completed,
              total: progress.total,
              succeeded: progress.succeeded,
              failed: progress.failed,
            })}
          </span>
        </div>
      )}
    </header>
  );
}
