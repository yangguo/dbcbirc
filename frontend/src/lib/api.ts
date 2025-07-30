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

  // Admin - Update Case Details
  async updateCaseDetails(orgName: string) {
    return this.request('/api/v1/admin/update-case-details', {
      method: 'POST',
      body: JSON.stringify({
        org_name: orgName,
        start_page: 1,
        end_page: 1,
      }),
    })
  }

  // Admin - Get Case Summary by Organization
  async getCaseSummaryByOrg(orgName: string) {
    return this.request(`/api/v1/admin/case-summary/${encodeURIComponent(orgName)}`)
  }

  // Admin - Get Case Detail Summary by Organization
  async getCaseDetailSummaryByOrg(orgName: string) {
    return this.request(`/api/v1/admin/case-detail-summary/${encodeURIComponent(orgName)}`)
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

  // Additional Import/Export endpoints
  async exportCasesExcel(filters?: any): Promise<Blob> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value))
      })
    }
    
    const response = await fetch(`${this.baseUrl}/api/v1/admin/export/excel?${params}`)
    if (!response.ok) throw new Error('Failed to export cases')
    return response.blob()
  }

  async exportCasesJSON(filters?: any): Promise<Blob> {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value))
      })
    }
    
    const response = await fetch(`${this.baseUrl}/api/v1/admin/export/json?${params}`)
    if (!response.ok) throw new Error('Failed to export cases')
    return response.blob()
  }

  async importCases(file: File, format: string = 'csv'): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('format', format)
    
    const response = await fetch(`${this.baseUrl}/api/v1/admin/import`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error('Failed to import cases')
    return response.json()
  }

  // Case Management endpoints
  async getAllCases(page?: number, pageSize?: number, filters?: any) {
    const params = new URLSearchParams()
    if (page) params.append('page', String(page))
    if (pageSize) params.append('page_size', String(pageSize))
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value))
      })
    }
    
    return this.request(`/api/v1/cases?${params}`)
  }

  async updateCaseById(caseId: string, caseData: any) {
    return this.request(`/api/v1/cases/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(caseData),
    })
  }

  async deleteCaseById(caseId: string) {
    return this.request(`/api/v1/cases/${caseId}`, {
      method: 'DELETE',
    })
  }

  async batchUpdateCases(caseIds: string[], updates: any) {
    return this.request('/api/v1/cases/batch-update', {
      method: 'POST',
      body: JSON.stringify({
        case_ids: caseIds,
        updates: updates,
      }),
    })
  }

  // Category Management endpoints
  async getCategories() {
    return this.request('/api/v1/categories')
  }

  async createCategory(category: any) {
    return this.request('/api/v1/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    })
  }

  async updateCategory(categoryId: string, category: any) {
    return this.request(`/api/v1/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    })
  }

  async deleteCategory(categoryId: string) {
    return this.request(`/api/v1/categories/${categoryId}`, {
      method: 'DELETE',
    })
  }

  async getCategoryStats() {
    return this.request('/api/v1/categories/stats')
  }

  async autoClassifyCases(caseIds?: string[]) {
    return this.request('/api/v1/categories/auto-classify', {
      method: 'POST',
      body: JSON.stringify({
        case_ids: caseIds,
      }),
    })
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient()
export default apiClient