"use client";

import type { ServiceErrorCode } from "@excelcabs/types";
import { ErrorState } from "@excelcabs/ui/composites/error-state";

import { errorMessage, isServiceError } from "@/services/errors";

const TITLE_BY_CODE: Partial<Record<ServiceErrorCode, string>> = {
  NOT_FOUND: "Not found",
  FORBIDDEN: "You don't have access to this",
};

interface QueryErrorProps {
  error: unknown;
  /** Usually the query's `refetch`. */
  onRetry: () => void;
  /** Spinner on the retry button, e.g. `query.isFetching`. */
  retrying?: boolean;
  className?: string;
}

/** Failed-query panel: a specific title for NOT_FOUND / FORBIDDEN, the service message and a retry. */
export function QueryError({ error, onRetry, retrying = false, className }: QueryErrorProps) {
  const title = (isServiceError(error) && TITLE_BY_CODE[error.code]) || "Something went wrong";
  return (
    <ErrorState
      title={title}
      message={errorMessage(error)}
      onRetry={onRetry}
      retrying={retrying}
      className={className}
    />
  );
}
