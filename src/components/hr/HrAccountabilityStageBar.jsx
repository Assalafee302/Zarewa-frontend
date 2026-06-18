import HrAccountabilityPhaseBar from './HrAccountabilityPhaseBar';

/** Back-compat wrapper — maps legacy `activeStage` prop to `activePhase`. */
export default function HrAccountabilityStageBar({
  activeStage,
  onStageClick,
  activePhase,
  onPhaseClick,
  ...rest
}) {
  return (
    <HrAccountabilityPhaseBar
      {...rest}
      activePhase={activePhase ?? activeStage}
      onPhaseClick={onPhaseClick ?? onStageClick}
    />
  );
}
