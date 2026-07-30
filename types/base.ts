export interface Identifiable {
  id: string;
}

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

export interface BaseEntity extends Identifiable, Timestamped {}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
