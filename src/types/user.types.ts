/** Paginated list shape aligned with backend PageDto patterns */
export type PageMeta = {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type PagedUsersResponse = {
  results?: unknown[];
  meta?: PageMeta;
  // Backend may return alternate shapes; keep loose for forward-compat
  [key: string]: unknown;
};

export type UserEntity = Record<string, unknown>;

/** Query params for `GET /users`. */
export type UsersListParams = {
  page?: number;
  take?: number;
  q?: string;
  order?: 'ASC' | 'DESC';
};
