import { useTranslation } from 'react-i18next';
import { CONFIG_TAB_ICONS, SECTION_INDEX_LABELS } from '../../constants';
import type { ConfigSectionProps } from '../../types';
import { SectionCard } from '../SectionCard';
import { FieldStack, SettingList, TextSetting, ToggleSetting } from '../fields/FieldPrimitives';
import { getValidationMessage } from '../blocks/shared';

const Icon = CONFIG_TAB_ICONS.quota;

export function SectionQuota({
  values,
  validationErrors,
  disabled,
  animateIn,
  onChange,
}: ConfigSectionProps) {
  const { t } = useTranslation();
  const label = (key: string, options?: Record<string, string>) =>
    t(`config_management.visual.sections.quota.${key}`, options);
  const error = (key: keyof NonNullable<typeof validationErrors>) =>
    getValidationMessage(t, validationErrors?.[key]);

  return (
    <SectionCard
      indexLabel={SECTION_INDEX_LABELS.quota}
      icon={<Icon size={16} />}
      title={label('title')}
      description={label('description')}
      animateIn={animateIn}
    >
      <FieldStack>

        <SettingList title={label('auto_disable_title')} description={label('auto_disable_desc')}>
            <ToggleSetting fieldId="quotaAutoDisableEnabled"
                label={label('auto_disable_enabled')}
                description={label('auto_disable_enabled_desc')}
                checked={values.quotaAutoDisableEnabled}
                disabled={disabled}
                onChange={(quotaAutoDisableEnabled) => onChange({ quotaAutoDisableEnabled })}/>
            <ToggleSetting fieldId="quotaAutoDisableAutoEnable"
                label={label('auto_enable')}
                description={label('auto_enable_desc')}
                checked={values.quotaAutoDisableAutoEnable}
                disabled={disabled}
                onChange={(quotaAutoDisableAutoEnable) => onChange({ quotaAutoDisableAutoEnable })}/>
            <TextSetting fieldId="quotaAutoDisableScanIntervalSeconds"
                label={label('scan_interval')}
                type="number"
                value={values.quotaAutoDisableScanIntervalSeconds}
                onChange={(value) =>
                  onChange({ quotaAutoDisableScanIntervalSeconds: value })
                }
                disabled={disabled}
                description={label('scan_interval_hint')}
                error={error('quotaAutoDisableScanIntervalSeconds')}/>
            <TextSetting fieldId="quotaAutoDisableScanConcurrency"
                label={label('scan_concurrency')}
                type="number"
                value={values.quotaAutoDisableScanConcurrency}
                onChange={(value) =>
                  onChange({ quotaAutoDisableScanConcurrency: value })
                }
                disabled={disabled}
                description={label('scan_concurrency_hint')}
                error={error('quotaAutoDisableScanConcurrency')}/>
            <TextSetting fieldId="quotaAutoDisableScanRateLimitPerSecond"
                label={label('scan_rate_limit')}
                type="number"
                value={values.quotaAutoDisableScanRateLimitPerSecond}
                onChange={(value) =>
                  onChange({ quotaAutoDisableScanRateLimitPerSecond: value })
                }
                disabled={disabled}
                description={label('scan_rate_limit_hint')}
                error={error('quotaAutoDisableScanRateLimitPerSecond')}/>
            <TextSetting fieldId="quotaAutoDisableProbeTimeoutSeconds"
                label={label('probe_timeout')}
                type="number"
                value={values.quotaAutoDisableProbeTimeoutSeconds}
                onChange={(value) =>
                  onChange({ quotaAutoDisableProbeTimeoutSeconds: value })
                }
                disabled={disabled}
                description={label('probe_timeout_hint')}
                error={error('quotaAutoDisableProbeTimeoutSeconds')}/>
            <TextSetting fieldId="quotaAutoDisableMinCapacityCoveragePercent"
                label={label('min_capacity_coverage')}
                type="number"
                value={values.quotaAutoDisableMinCapacityCoveragePercent}
                onChange={(value) =>
                  onChange({ quotaAutoDisableMinCapacityCoveragePercent: value })
                }
                disabled={disabled}
                description={label('min_capacity_coverage_hint')}
                error={error('quotaAutoDisableMinCapacityCoveragePercent')}/>
        </SettingList>

        <SettingList title={label('plan_policies_title')} description={label('plan_policies_desc')}>
            <ToggleSetting fieldId="quotaAutoDisableProPlanEnabled"
                label={label('pro_plan_enabled')}
                checked={values.quotaAutoDisableProPlanEnabled}
                disabled={disabled}
                onChange={(quotaAutoDisableProPlanEnabled) =>
                  onChange({ quotaAutoDisableProPlanEnabled })
                }/>
            <TextSetting fieldId="quotaAutoDisableProPlanThresholdPercent"
                label={label('plan_disable_threshold', { plan: 'Pro' })}
                type="number"
                value={values.quotaAutoDisableProPlanThresholdPercent}
                onChange={(value) =>
                  onChange({ quotaAutoDisableProPlanThresholdPercent: value })
                }
                disabled={disabled}
                error={error('quotaAutoDisableProPlanThresholdPercent')}/>
            <TextSetting fieldId="quotaAutoDisableProPlanResumeThresholdPercent"
                label={label('plan_resume_threshold', { plan: 'Pro' })}
                type="number"
                value={values.quotaAutoDisableProPlanResumeThresholdPercent}
                onChange={(value) =>
                  onChange({ quotaAutoDisableProPlanResumeThresholdPercent: value })
                }
                disabled={disabled}
                error={error('quotaAutoDisableProPlanResumeThresholdPercent')}/>
            <ToggleSetting fieldId="quotaAutoDisablePlusPlanEnabled"
                label={label('plus_plan_enabled')}
                checked={values.quotaAutoDisablePlusPlanEnabled}
                disabled={disabled}
                onChange={(quotaAutoDisablePlusPlanEnabled) =>
                  onChange({ quotaAutoDisablePlusPlanEnabled })
                }/>
            <TextSetting fieldId="quotaAutoDisablePlusPlanThresholdPercent"
                label={label('plan_disable_threshold', { plan: 'Plus' })}
                type="number"
                value={values.quotaAutoDisablePlusPlanThresholdPercent}
                onChange={(value) =>
                  onChange({ quotaAutoDisablePlusPlanThresholdPercent: value })
                }
                disabled={disabled}
                error={error('quotaAutoDisablePlusPlanThresholdPercent')}/>
            <TextSetting fieldId="quotaAutoDisablePlusPlanResumeThresholdPercent"
                label={label('plan_resume_threshold', { plan: 'Plus' })}
                type="number"
                value={values.quotaAutoDisablePlusPlanResumeThresholdPercent}
                onChange={(value) =>
                  onChange({ quotaAutoDisablePlusPlanResumeThresholdPercent: value })
                }
                disabled={disabled}
                error={error('quotaAutoDisablePlusPlanResumeThresholdPercent')}/>
            <ToggleSetting fieldId="quotaAutoDisableTeamPlanEnabled"
                label={label('team_plan_enabled')}
                description={label('team_plan_enabled_desc')}
                checked={values.quotaAutoDisableTeamPlanEnabled}
                disabled={disabled}
                onChange={(quotaAutoDisableTeamPlanEnabled) =>
                  onChange({ quotaAutoDisableTeamPlanEnabled })
                }/>
            <TextSetting fieldId="quotaAutoDisableTeamPlanThresholdPercent"
                label={label('plan_disable_threshold', { plan: 'Team' })}
                type="number"
                value={values.quotaAutoDisableTeamPlanThresholdPercent}
                onChange={(value) =>
                  onChange({ quotaAutoDisableTeamPlanThresholdPercent: value })
                }
                disabled={disabled}
                error={error('quotaAutoDisableTeamPlanThresholdPercent')}/>
            <TextSetting fieldId="quotaAutoDisableTeamPlanResumeThresholdPercent"
                label={label('plan_resume_threshold', { plan: 'Team' })}
                type="number"
                value={values.quotaAutoDisableTeamPlanResumeThresholdPercent}
                onChange={(value) =>
                  onChange({ quotaAutoDisableTeamPlanResumeThresholdPercent: value })
                }
                disabled={disabled}
                error={error('quotaAutoDisableTeamPlanResumeThresholdPercent')}/>
            <TextSetting fieldId="quotaAutoDisableProFiveHourCapacityAlertThreshold"
                label={label('pro_five_hour_capacity_alert_threshold')}
                type="number"
                value={values.quotaAutoDisableProFiveHourCapacityAlertThreshold}
                onChange={(value) =>
                  onChange({
                    quotaAutoDisableProFiveHourCapacityAlertThreshold: value,
                  })
                }
                disabled={disabled}
                description={label('pro_five_hour_capacity_alert_threshold_hint')}
                error={error('quotaAutoDisableProFiveHourCapacityAlertThreshold')}/>
        </SettingList>

        <SettingList
          title={label('capacity_alerts_title')}
          description={label('capacity_alerts_desc')}
        >
            <ToggleSetting fieldId="quotaCapacityAlertsEnabled"
                label={label('capacity_alerts_enabled')}
                description={label('capacity_alerts_enabled_desc')}
                checked={values.quotaCapacityAlertsEnabled}
                disabled={disabled}
                onChange={(quotaCapacityAlertsEnabled) => onChange({ quotaCapacityAlertsEnabled })}/>
            <ToggleSetting fieldId="quotaCapacitySnapshotsIncluded"
                label={label('capacity_snapshots_included')}
                description={label('capacity_snapshots_included_desc')}
                checked={values.quotaCapacitySnapshotsIncluded}
                disabled={disabled}
                onChange={(quotaCapacitySnapshotsIncluded) =>
                  onChange({ quotaCapacitySnapshotsIncluded })
                }/>
            <TextSetting fieldId="quotaCapacityProFiveHourThreshold"
                label={label('capacity_pro_five_hour_threshold')}
                type="number"
                value={values.quotaCapacityProFiveHourThreshold}
                onChange={(value) =>
                  onChange({ quotaCapacityProFiveHourThreshold: value })
                }
                disabled={disabled}
                description={label('capacity_threshold_hint')}
                error={error('quotaCapacityProFiveHourThreshold')}/>
            <TextSetting fieldId="quotaCapacityProWeeklyThreshold"
                label={label('capacity_pro_weekly_threshold')}
                type="number"
                value={values.quotaCapacityProWeeklyThreshold}
                onChange={(value) =>
                  onChange({ quotaCapacityProWeeklyThreshold: value })
                }
                disabled={disabled}
                description={label('capacity_threshold_hint')}
                error={error('quotaCapacityProWeeklyThreshold')}/>
            <TextSetting fieldId="quotaCapacityPlusFiveHourThreshold"
                label={label('capacity_plus_five_hour_threshold')}
                type="number"
                value={values.quotaCapacityPlusFiveHourThreshold}
                onChange={(value) =>
                  onChange({ quotaCapacityPlusFiveHourThreshold: value })
                }
                disabled={disabled}
                description={label('capacity_threshold_hint')}
                error={error('quotaCapacityPlusFiveHourThreshold')}/>
            <TextSetting fieldId="quotaCapacityPlusWeeklyThreshold"
                label={label('capacity_plus_weekly_threshold')}
                type="number"
                value={values.quotaCapacityPlusWeeklyThreshold}
                onChange={(value) =>
                  onChange({ quotaCapacityPlusWeeklyThreshold: value })
                }
                disabled={disabled}
                description={label('capacity_threshold_hint')}
                error={error('quotaCapacityPlusWeeklyThreshold')}/>
            <TextSetting fieldId="quotaCapacityTeamFiveHourThreshold"
                label={label('capacity_team_five_hour_threshold')}
                type="number"
                value={values.quotaCapacityTeamFiveHourThreshold}
                onChange={(value) =>
                  onChange({ quotaCapacityTeamFiveHourThreshold: value })
                }
                disabled={disabled}
                description={label('capacity_threshold_hint')}
                error={error('quotaCapacityTeamFiveHourThreshold')}/>
            <TextSetting fieldId="quotaCapacityTeamWeeklyThreshold"
                label={label('capacity_team_weekly_threshold')}
                type="number"
                value={values.quotaCapacityTeamWeeklyThreshold}
                onChange={(value) =>
                  onChange({ quotaCapacityTeamWeeklyThreshold: value })
                }
                disabled={disabled}
                description={label('capacity_threshold_hint')}
                error={error('quotaCapacityTeamWeeklyThreshold')}/>
        </SettingList>
      </FieldStack>
    </SectionCard>
  );
}
