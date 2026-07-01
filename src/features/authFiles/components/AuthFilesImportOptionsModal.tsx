import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  DEFAULT_AUTH_FILE_IMPORT_OPTIONS,
  type AuthFileImportOptions,
  type AuthFileImportDisabledMode,
  type AuthFileImportPriorityMode,
} from '@/features/authFiles/importOptions';
import { parsePriorityValue } from '@/features/authFiles/constants';
import styles from '@/pages/AuthFilesPage.module.scss';

export type AuthFilesImportOptionsModalProps = {
  open: boolean;
  uploading: boolean;
  disableControls: boolean;
  onClose: () => void;
  onSelectFiles: (options: AuthFileImportOptions) => void;
};

export function AuthFilesImportOptionsModal(props: AuthFilesImportOptionsModalProps) {
  const { t } = useTranslation();
  const { open, uploading, disableControls, onClose, onSelectFiles } = props;
  const [priorityMode, setPriorityMode] = useState<AuthFileImportPriorityMode>(
    DEFAULT_AUTH_FILE_IMPORT_OPTIONS.priorityMode
  );
  const [disabledMode, setDisabledMode] = useState<AuthFileImportDisabledMode>(
    DEFAULT_AUTH_FILE_IMPORT_OPTIONS.disabledMode ?? 'enabled'
  );
  const [priorityText, setPriorityText] = useState('');

  const priorityValue = parsePriorityValue(priorityText);
  const priorityError =
    priorityMode === 'set' && priorityText.trim() && priorityValue === undefined
      ? t('auth_files.import_priority_invalid')
      : '';
  const canImport =
    !disableControls &&
    !uploading &&
    (priorityMode !== 'set' || (priorityText.trim().length > 0 && priorityValue !== undefined));

  const priorityOptions = useMemo(
    () => [
      {
        value: 'strip',
        label: t('auth_files.import_priority_mode_strip'),
      },
      {
        value: 'set',
        label: t('auth_files.import_priority_mode_set'),
      },
      {
        value: 'preserve',
        label: t('auth_files.import_priority_mode_preserve'),
      },
    ],
    [t]
  );

  const disabledOptions = useMemo(
    () => [
      {
        value: 'enabled',
        label: t('auth_files.import_disabled_mode_enabled'),
      },
      {
        value: 'disabled',
        label: t('auth_files.import_disabled_mode_disabled'),
      },
      {
        value: 'preserve',
        label: t('auth_files.import_disabled_mode_preserve'),
      },
    ],
    [t]
  );

  const buildOptions = (): AuthFileImportOptions => {
    if (priorityMode === 'set') {
      return { priorityMode, priorityValue, disabledMode };
    }
    return { priorityMode, disabledMode };
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={uploading}
      width={520}
      title={t('auth_files.import_options_title')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => onSelectFiles(buildOptions())}
            disabled={!canImport}
            loading={uploading}
          >
            {t('auth_files.import_select_files')}
          </Button>
        </>
      }
    >
      <div className={styles.importOptionsEditor}>
        <div className={styles.importOptionsField}>
          <label>{t('auth_files.import_priority_mode_label')}</label>
          <Select
            value={priorityMode}
            options={priorityOptions}
            onChange={(value) => setPriorityMode(value as AuthFileImportPriorityMode)}
            ariaLabel={t('auth_files.import_priority_mode_label')}
            disabled={uploading}
          />
          <div className="hint">{t('auth_files.import_priority_mode_hint')}</div>
        </div>
        {priorityMode === 'set' && (
          <Input
            label={t('auth_files.import_priority_value_label')}
            value={priorityText}
            placeholder={t('auth_files.import_priority_value_placeholder')}
            error={priorityError || undefined}
            disabled={uploading}
            onChange={(event) => setPriorityText(event.target.value)}
          />
        )}
        <div className={styles.importOptionsField}>
          <label>{t('auth_files.import_disabled_mode_label')}</label>
          <Select
            value={disabledMode}
            options={disabledOptions}
            onChange={(value) => setDisabledMode(value as AuthFileImportDisabledMode)}
            ariaLabel={t('auth_files.import_disabled_mode_label')}
            disabled={uploading}
          />
          <div className="hint">{t('auth_files.import_disabled_mode_hint')}</div>
        </div>
      </div>
    </Modal>
  );
}
