/** Props for presentational components (keeps UI modules free of ad-hoc exported prop types). */

export type UsersListViewProps = {
  users: unknown[];
  loading: boolean;
  error: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyLabel?: string;
};
