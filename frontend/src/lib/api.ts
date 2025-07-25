const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Handle different response types
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return await response.json()
      } else {
        return response as unknown as T
      }
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error)
      throw error
    }
  }

  // Case Statistics
  async getCaseStats() {
    return this.request('/api/v1/cases/stats')
  }

  // Monthly Trends
  async getMonthlyTrends() {
    return this.request('/api/v1/analytics/monthly-trends')
  }

  // Regional Statistics
  async getRegionalStats() {
    return this.request('/api/v1/analytics/regional-stats')
  }

  // Search Cases
  async searchCases(searchParams: any) {
    return this.request('/api/v1/search/', {
      method: 'POST',
      body: JSON.stringify(searchParams),
    })
  }

  // Admin - System Info
  async getSystemInfo() {
    return this.request('/api/v1/admin/system-info')
  }

  // Admin - Update Status
  async getUpdateStatus() {
    return this.request('/api/v1/admin/update-status')
  }

  // Admin - Update Cases
  async updateCases(orgName: string, startPage: number, endPage: number) {
    return this.request('/api/v1/admin/update-cases', {
      method: 'POST',
      body: JSON.stringify({
        org_name: orgName,
        start_page: startPage,
        end_page: endPage,
      }),
    })
  }

  // Admin - Refresh Data
  async refreshData() {
    return this.request('/api/v1/admin/refresh-data', {
      method: 'POST',
    })
  }

  // Export Cases CSV
  async exportCasesCSV(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/v1/analytics/export/csv`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.blob()
  }

  // Get Case Summary
  async getCaseSummary(orgName?: string) {
    const params = orgName ? `?org_name=${encodeURIComponent(orgName)}` : ''
    return this.request(`/api/v1/cases/summary${params}`)
  }

  // Get Case Detail
  async getCaseDetail(orgName?: string) {
    const params = orgName ? `?org_name=${encodeURIComponent(orgName)}` : ''
    return this.request(`/api/v1/cases/detail${params}`)
  }

  // Get Case by ID
  async getCaseById(caseId: string) {
    return this.request(`/api/v1/cases/${caseId}`)
  }

  // Get Search Suggestions
  async getSearchSuggestions() {
    return this.request('/api/v1/search/suggestions')
  }

  // Get Summary Report
  async getSummaryReport() {
    return this.request('/api/v1/analytics/summary-report')
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient()
export default apiClient