/** A single chat message displayed in the Kiki UI. */
export interface KikiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** Optional metadata (quotes, etc.) from the backend. */
  metadata?: Record<string, unknown>;
}

/** Chat session persisted to the backend. */
export interface KikiSession {
  id: string;
  title: string;
  createdAt: string | number;
  updatedAt: string | number;
  isArchived?: boolean;
  messageCount?: number;
}

/** Query params for sessions list. */
export interface SessionsQueryParams {
  page?: number;
  limit?: number;
  isArchived?: boolean;
}

/** Query params for messages list. */
export interface MessagesQueryParams {
  page?: number;
  limit?: number;
}

/** Payload sent to POST /ai-chat/sessions. */
export interface CreateSessionPayload {
  title: string;
  userId?: number;
}

/** Payload sent to PATCH /ai-chat/sessions/:id. */
export interface UpdateSessionPayload {
  title?: string;
  isArchived?: boolean;
}

/** Payload sent to POST /ai-chat/messages. */
export interface CreateMessagePayload {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}

/** Backend pagination meta. */
export interface PaginationMeta {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/** Standard API response wrapper (matches web app). */
export interface ApiResponse<T> {
  data: T | null;
  message: string;
}

/** Paginated API response. */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  message: string;
}

/** Backend envelope shape. */
export interface BackendApiResponse<T> {
  status?: string;
  path?: string;
  statusCode?: number;
  message?: string;
  result?: T;
}

/** Quote shape received via Socket.IO (matches web app's Quote type). */
export interface KikiQuote {
  quoteId?: string | number;
  loadId?: string | number;
  bookingId?: string;
  status?: string;
  totalPrice?: number;
  price?: number;
  currency?: string;
  vehicleType?: string;
  companyName?: string;
  quoteOwnerId?: string | number;
  quoteOwnerPhone?: string;
  quoteOwnerCompanyName?: string;
  eventTime?: string;
  createdOn?: string;
  isCheaper?: boolean;
  isExpensive?: boolean;
  savingsPercentage?: number;
  raw?: unknown;
  /** The nested quote object from socket event. */
  quote?: {
    quoteId?: string | number;
    loadId?: string | number;
    bookingId?: string;
    status?: string;
    totalPrice?: number;
    price?: number;
    currency?: string;
    vehicleType?: string;
    quoteOwnerId?: string | number;
    quoteOwnerPhone?: string;
    quoteOwnerCompanyName?: string;
    createdOn?: string;
    savingsPercentage?: number;
    isCheaper?: boolean;
    isExpensive?: boolean;
  };
}
