import { EmptyState } from './EmptyState';

/** @deprecated Use EmptyState — kept for backward compatibility. */
export function ListEmptyState(props) {
  return <EmptyState variant="panel" {...props} />;
}

export { EmptyState };
