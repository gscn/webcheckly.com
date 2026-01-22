import { authenticatedFetch } from './authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface APIAccessStats {
  total_requests: number;
  monthly_requests: number;
  monthly_limit?: number;
  remaining_requests?: number;
}

export interface APIAccessRecord {
  id: string;
  user_id: string;
  api_endpoint: string;
  method: string;
  ip_address?: string;
  user_agent?: string;
  status_code?: number;
  response_time_ms?: number;
  created_at: string;
}

export interface APIAccessRecordsResponse {
  records: APIAccessRecord[];
  limit: number;
  offset: number;
  total: number;
}

/**
 * 获取API访问统计
 */
export async function getAPIAccessStats(): Promise<APIAccessStats> {
  const response = await authenticatedFetch(`${API_BASE_URL}/api/api-access/stats`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || 'Failed to fetch API access stats';
    console.error('[getAPIAccessStats] Error:', errorMessage, errorData);
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * 获取API访问记录列表
 */
export async function getAPIAccessRecords(limit = 20, offset = 0): Promise<APIAccessRecordsResponse> {
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/api-access/records?limit=${limit}&offset=${offset}`
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || 'Failed to fetch API access records';
    console.error('[getAPIAccessRecords] Error:', errorMessage, errorData);
    throw new Error(errorMessage);
  }
  return response.json();
}
