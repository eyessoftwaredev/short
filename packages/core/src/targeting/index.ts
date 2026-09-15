export {
  abVariantSchema,
  BROWSER_VALUES,
  clientConditionSchema,
  conditionSchema,
  deviceConditionSchema,
  DEVICE_VALUES,
  geoConditionSchema,
  OS_VALUES,
  referrerConditionSchema,
  safeDestinationSchema,
  scheduleConditionSchema,
  setOperatorSchema,
  targetRuleSchema,
  type AbVariant,
  type Condition,
  type SetOperator,
  type TargetRule,
} from "./schema";

export {
  matchesCondition,
  matchesRule,
  resolveDestination,
  type ResolveInput,
  type Resolution,
  type ResolutionSource,
  type VisitorContext,
} from "./evaluate";
