import { EmptyState } from './EmptyState';
import { PageLoader } from './PageLoader';

/** @deprecated Use EmptyState variant="inline" — kept for backward compatibility. */
export function DeskEmptyState({ icon, title, description, actionLabel, onAction, action, ...rest }) {
  return (
    <EmptyState
      variant="inline"
      icon={icon}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      action={action}
      {...rest}
    />
  );
}

/** @deprecated Use PageLoader skeleton prop — kept for backward compatibility. */
export function DeskLoadingSkeleton({ rows = 4 }) {
  return <PageLoader variant="inline" skeleton skeletonRows={rows} message="Loading…" className="min-h-0" />;
}

export { EmptyState, PageLoader };
