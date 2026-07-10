import { Breadcrumbs } from '../layout/Breadcrumbs';

/** @deprecated Use Breadcrumbs from components/layout — kept for HR backward compatibility. */
export function HrContextBreadcrumb(props) {
  return <Breadcrumbs {...props} />;
}

export { Breadcrumbs };
