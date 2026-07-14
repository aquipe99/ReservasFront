import { ErrorDetail } from "./error-detail";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: ErrorDetail[];
}
