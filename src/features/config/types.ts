import type { VisualConfigValidationErrors, VisualConfigValues } from '@/types/visualConfig';

/** Shared section signature: useVisualConfig-controlled values with patch-style onChange. */
export type ConfigSectionProps = {
  values: VisualConfigValues;
  validationErrors?: VisualConfigValidationErrors;
  disabled: boolean;
  /** True only for the initial entrance; tab changes do not replay it. */
  animateIn?: boolean;
  onChange: (patch: Partial<VisualConfigValues>) => void;
};
