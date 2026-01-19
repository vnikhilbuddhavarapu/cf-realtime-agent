import type { ApiResponse } from "../types";

export function jsonResponse<T>(data: T, status = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  return Response.json(response, { status });
}

export function errorResponse(error: string, status = 500): Response {
  const response: ApiResponse = {
    success: false,
    error,
  };
  return Response.json(response, { status });
}
