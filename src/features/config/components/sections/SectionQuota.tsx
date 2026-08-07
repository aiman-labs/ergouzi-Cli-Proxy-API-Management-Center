import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { CONFIG_TAB_ICONS, SECTION_INDEX_LABELS } from '../../constants';
import type { ConfigSectionProps } from '../../types';
import { SectionCard } from '../SectionCard';
import {
  FieldAnchor,
  FieldGrid,
  FieldGroup,
  FieldStack,
  ToggleRow,
} from '../fields/FieldPrimitives';
import { QuotaSwitchPreviewModelToggle, QuotaSwitchProjectToggle } from '../fields/sharedFields';
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
        <FieldGroup
          title={label('request_fallback_title')}
          description={label('request_fallback_desc')}
        >
          <FieldGrid>
            <QuotaSwitchProjectToggle values={values} disabled={disabled} onChange={onChange} />
            <QuotaSwitchPreviewModelToggle
              values={values}
              disabled={disabled}
              onChange={onChange}
            />
            <FieldAnchor fieldId="quotaAntigravityCredits">
              <ToggleRow
                title={label('antigravity_credits')}
                checked={values.quotaAntigravityCredits}
                disabled={disabled}
                onChange={(quotaAntigravityCredits) => onChange({ quotaAntigravityCredits })}
              />
            </FieldAnchor>
          </FieldGrid>
        </FieldGroup>

        <FieldGroup title={label('auto_disable_title')} description={label('auto_disable_desc')}>
          <FieldGrid>
            <FieldAnchor fieldId="quotaAutoDisableEnabled">
              <ToggleRow
                title={label('auto_disable_enabled')}
                description={label('auto_disable_enabled_desc')}
                checked={values.quotaAutoDisableEnabled}
                disabled={disabled}
                onChange={(quotaAutoDisableEnabled) => onChange({ quotaAutoDisableEnabled })}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableAutoEnable">
              <ToggleRow
                title={label('auto_enable')}
                description={label('auto_enable_desc')}
                checked={values.quotaAutoDisableAutoEnable}
                disabled={disabled}
                onChange={(quotaAutoDisableAutoEnable) => onChange({ quotaAutoDisableAutoEnable })}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableScanIntervalSeconds">
              <Input
                label={label('scan_interval')}
                type="number"
                value={values.quotaAutoDisableScanIntervalSeconds}
                onChange={(event) =>
                  onChange({ quotaAutoDisableScanIntervalSeconds: event.target.value })
                }
                disabled={disabled}
                hint={label('scan_interval_hint')}
                error={error('quotaAutoDisableScanIntervalSeconds')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableScanConcurrency">
              <Input
                label={label('scan_concurrency')}
                type="number"
                value={values.quotaAutoDisableScanConcurrency}
                onChange={(event) =>
                  onChange({ quotaAutoDisableScanConcurrency: event.target.value })
                }
                disabled={disabled}
                hint={label('scan_concurrency_hint')}
                error={error('quotaAutoDisableScanConcurrency')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableScanRateLimitPerSecond">
              <Input
                label={label('scan_rate_limit')}
                type="number"
                value={values.quotaAutoDisableScanRateLimitPerSecond}
                onChange={(event) =>
                  onChange({ quotaAutoDisableScanRateLimitPerSecond: event.target.value })
                }
                disabled={disabled}
                hint={label('scan_rate_limit_hint')}
                error={error('quotaAutoDisableScanRateLimitPerSecond')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableProbeTimeoutSeconds">
              <Input
                label={label('probe_timeout')}
                type="number"
                value={values.quotaAutoDisableProbeTimeoutSeconds}
                onChange={(event) =>
                  onChange({ quotaAutoDisableProbeTimeoutSeconds: event.target.value })
                }
                disabled={disabled}
                hint={label('probe_timeout_hint')}
                error={error('quotaAutoDisableProbeTimeoutSeconds')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableMinCapacityCoveragePercent">
              <Input
                label={label('min_capacity_coverage')}
                type="number"
                value={values.quotaAutoDisableMinCapacityCoveragePercent}
                onChange={(event) =>
                  onChange({ quotaAutoDisableMinCapacityCoveragePercent: event.target.value })
                }
                disabled={disabled}
                hint={label('min_capacity_coverage_hint')}
                error={error('quotaAutoDisableMinCapacityCoveragePercent')}
              />
            </FieldAnchor>
          </FieldGrid>
        </FieldGroup>

        <FieldGroup title={label('plan_policies_title')} description={label('plan_policies_desc')}>
          <FieldGrid>
            <FieldAnchor fieldId="quotaAutoDisableProPlanEnabled">
              <ToggleRow
                title={label('pro_plan_enabled')}
                checked={values.quotaAutoDisableProPlanEnabled}
                disabled={disabled}
                onChange={(quotaAutoDisableProPlanEnabled) =>
                  onChange({ quotaAutoDisableProPlanEnabled })
                }
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableProPlanThresholdPercent">
              <Input
                label={label('plan_disable_threshold', { plan: 'Pro' })}
                type="number"
                value={values.quotaAutoDisableProPlanThresholdPercent}
                onChange={(event) =>
                  onChange({ quotaAutoDisableProPlanThresholdPercent: event.target.value })
                }
                disabled={disabled}
                error={error('quotaAutoDisableProPlanThresholdPercent')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableProPlanResumeThresholdPercent">
              <Input
                label={label('plan_resume_threshold', { plan: 'Pro' })}
                type="number"
                value={values.quotaAutoDisableProPlanResumeThresholdPercent}
                onChange={(event) =>
                  onChange({ quotaAutoDisableProPlanResumeThresholdPercent: event.target.value })
                }
                disabled={disabled}
                error={error('quotaAutoDisableProPlanResumeThresholdPercent')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisablePlusPlanEnabled">
              <ToggleRow
                title={label('plus_plan_enabled')}
                checked={values.quotaAutoDisablePlusPlanEnabled}
                disabled={disabled}
                onChange={(quotaAutoDisablePlusPlanEnabled) =>
                  onChange({ quotaAutoDisablePlusPlanEnabled })
                }
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisablePlusPlanThresholdPercent">
              <Input
                label={label('plan_disable_threshold', { plan: 'Plus' })}
                type="number"
                value={values.quotaAutoDisablePlusPlanThresholdPercent}
                onChange={(event) =>
                  onChange({ quotaAutoDisablePlusPlanThresholdPercent: event.target.value })
                }
                disabled={disabled}
                error={error('quotaAutoDisablePlusPlanThresholdPercent')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisablePlusPlanResumeThresholdPercent">
              <Input
                label={label('plan_resume_threshold', { plan: 'Plus' })}
                type="number"
                value={values.quotaAutoDisablePlusPlanResumeThresholdPercent}
                onChange={(event) =>
                  onChange({ quotaAutoDisablePlusPlanResumeThresholdPercent: event.target.value })
                }
                disabled={disabled}
                error={error('quotaAutoDisablePlusPlanResumeThresholdPercent')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableTeamPlanEnabled">
              <ToggleRow
                title={label('team_plan_enabled')}
                description={label('team_plan_enabled_desc')}
                checked={values.quotaAutoDisableTeamPlanEnabled}
                disabled={disabled}
                onChange={(quotaAutoDisableTeamPlanEnabled) =>
                  onChange({ quotaAutoDisableTeamPlanEnabled })
                }
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableTeamPlanThresholdPercent">
              <Input
                label={label('plan_disable_threshold', { plan: 'Team' })}
                type="number"
                value={values.quotaAutoDisableTeamPlanThresholdPercent}
                onChange={(event) =>
                  onChange({ quotaAutoDisableTeamPlanThresholdPercent: event.target.value })
                }
                disabled={disabled}
                error={error('quotaAutoDisableTeamPlanThresholdPercent')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableTeamPlanResumeThresholdPercent">
              <Input
                label={label('plan_resume_threshold', { plan: 'Team' })}
                type="number"
                value={values.quotaAutoDisableTeamPlanResumeThresholdPercent}
                onChange={(event) =>
                  onChange({ quotaAutoDisableTeamPlanResumeThresholdPercent: event.target.value })
                }
                disabled={disabled}
                error={error('quotaAutoDisableTeamPlanResumeThresholdPercent')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaAutoDisableProFiveHourCapacityAlertThreshold">
              <Input
                label={label('pro_five_hour_capacity_alert_threshold')}
                type="number"
                value={values.quotaAutoDisableProFiveHourCapacityAlertThreshold}
                onChange={(event) =>
                  onChange({
                    quotaAutoDisableProFiveHourCapacityAlertThreshold: event.target.value,
                  })
                }
                disabled={disabled}
                hint={label('pro_five_hour_capacity_alert_threshold_hint')}
                error={error('quotaAutoDisableProFiveHourCapacityAlertThreshold')}
              />
            </FieldAnchor>
          </FieldGrid>
        </FieldGroup>

        <FieldGroup
          title={label('capacity_alerts_title')}
          description={label('capacity_alerts_desc')}
        >
          <FieldGrid>
            <FieldAnchor fieldId="quotaCapacityAlertsEnabled">
              <ToggleRow
                title={label('capacity_alerts_enabled')}
                description={label('capacity_alerts_enabled_desc')}
                checked={values.quotaCapacityAlertsEnabled}
                disabled={disabled}
                onChange={(quotaCapacityAlertsEnabled) => onChange({ quotaCapacityAlertsEnabled })}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaCapacitySnapshotsIncluded">
              <ToggleRow
                title={label('capacity_snapshots_included')}
                description={label('capacity_snapshots_included_desc')}
                checked={values.quotaCapacitySnapshotsIncluded}
                disabled={disabled}
                onChange={(quotaCapacitySnapshotsIncluded) =>
                  onChange({ quotaCapacitySnapshotsIncluded })
                }
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaCapacityProFiveHourThreshold">
              <Input
                label={label('capacity_pro_five_hour_threshold')}
                type="number"
                value={values.quotaCapacityProFiveHourThreshold}
                onChange={(event) =>
                  onChange({ quotaCapacityProFiveHourThreshold: event.target.value })
                }
                disabled={disabled}
                hint={label('capacity_threshold_hint')}
                error={error('quotaCapacityProFiveHourThreshold')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaCapacityProWeeklyThreshold">
              <Input
                label={label('capacity_pro_weekly_threshold')}
                type="number"
                value={values.quotaCapacityProWeeklyThreshold}
                onChange={(event) =>
                  onChange({ quotaCapacityProWeeklyThreshold: event.target.value })
                }
                disabled={disabled}
                hint={label('capacity_threshold_hint')}
                error={error('quotaCapacityProWeeklyThreshold')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaCapacityPlusFiveHourThreshold">
              <Input
                label={label('capacity_plus_five_hour_threshold')}
                type="number"
                value={values.quotaCapacityPlusFiveHourThreshold}
                onChange={(event) =>
                  onChange({ quotaCapacityPlusFiveHourThreshold: event.target.value })
                }
                disabled={disabled}
                hint={label('capacity_threshold_hint')}
                error={error('quotaCapacityPlusFiveHourThreshold')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaCapacityPlusWeeklyThreshold">
              <Input
                label={label('capacity_plus_weekly_threshold')}
                type="number"
                value={values.quotaCapacityPlusWeeklyThreshold}
                onChange={(event) =>
                  onChange({ quotaCapacityPlusWeeklyThreshold: event.target.value })
                }
                disabled={disabled}
                hint={label('capacity_threshold_hint')}
                error={error('quotaCapacityPlusWeeklyThreshold')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaCapacityTeamFiveHourThreshold">
              <Input
                label={label('capacity_team_five_hour_threshold')}
                type="number"
                value={values.quotaCapacityTeamFiveHourThreshold}
                onChange={(event) =>
                  onChange({ quotaCapacityTeamFiveHourThreshold: event.target.value })
                }
                disabled={disabled}
                hint={label('capacity_threshold_hint')}
                error={error('quotaCapacityTeamFiveHourThreshold')}
              />
            </FieldAnchor>
            <FieldAnchor fieldId="quotaCapacityTeamWeeklyThreshold">
              <Input
                label={label('capacity_team_weekly_threshold')}
                type="number"
                value={values.quotaCapacityTeamWeeklyThreshold}
                onChange={(event) =>
                  onChange({ quotaCapacityTeamWeeklyThreshold: event.target.value })
                }
                disabled={disabled}
                hint={label('capacity_threshold_hint')}
                error={error('quotaCapacityTeamWeeklyThreshold')}
              />
            </FieldAnchor>
          </FieldGrid>
        </FieldGroup>
      </FieldStack>
    </SectionCard>
  );
}
