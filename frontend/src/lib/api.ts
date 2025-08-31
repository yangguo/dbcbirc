const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface CaseSearchRequest {
  // Pagination
  page?: number
  page_size?: number

  // Org scope
  org_name?: string

  // Date filters (support both names)
  start_date?: string
  end_date?: string
  date_start?: string
  date_end?: string

  // Text filters
  title_text?: string
  wenhao_text?: string
  people_text?: string
  event_text?: string
  law_text?: string
  penalty_text?: string
  org_text?: string

  // Other filters
  industry?: string
  province?: string
  min_penalty?: number

  // General keyword
  keyword?: string

  // For backward compatibility
  penalty_type?: string

  [key: string]: any
}

// Backend response models
export interface CaseDetail {
  id: string
  title: string
  subtitle: string
  publish_date: string
  content: string
  summary?: string
  wenhao?: string
  people?: string
  event?: string
  law?: string
  penalty?: string
  org?: string
  penalty_date?: string
  category?: string
  amount?: number
  province?: string
  industry?: string
}

export interface CaseSearchResponse {
  cases: CaseDetail[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

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
  async searchCases(searchParams: CaseSearchRequest): Promise<CaseSearchResponse> {
    return this.request<CaseSearchResponse>('/api/v1/search/', {
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

  // Admin - Get Case Details Progress
  async getCaseDetailsProgress(orgName: string) {
    return this.request(`/api/v1/admin/case-details-progress/${encodeURIComponent(orgName)}`)
  }

  // Admin - Cleanup Temp Files
  async cleanupTempFiles() {
    return this.request('/api/v1/admin/cleanup-temp-files', {
      method: 'POST',
    })
  }

  // Admin - Get Pending Cases for Update
  async getPendingCases(orgName: string) {
    return this.request(`/api/v1/admin/pending-cases/${encodeURIComponent(orgName)}`)
  }

  // Admin - Update Selected Case Details
  async updateSelectedCaseDetails(orgName: string, selectedCaseIds: string[]) {
    return this.request('/api/v1/admin/update-selected-case-details', {
      method: 'POST',
      body: JSON.stringify({
        org_name: orgName,
        selected_case_ids: selectedCaseIds
      }),
    })
  }

  // Admin - Refresh Data
  async refreshData() {
    return this.request('/api/v1/admin/refresh-data', {
      method: 'POST',
    })
  }

  // Admin - Get Tasks History
  async getTasks(limit = 50) {
    return this.request(`/api/v1/admin/tasks?limit=${limit}`)
  }

  // Admin - Get Active Tasks
  async getActiveTasks() {
    return this.request('/api/v1/admin/tasks/active')
  }

  // Admin - Get Specific Task
  async getTask(taskId: string) {
    return this.request(`/api/v1/admin/tasks/${taskId}`)
  }

  // Export Cases CSV
  async exportCasesCSV(searchParams?: CaseSearchRequest): Promise<Blob> {
    let url = `${this.baseUrl}/api/v1/analytics/export/csv`
    
    // If search parameters are provided, add them as query parameters
    if (searchParams && Object.keys(searchParams).length > 0) {
      const params = new URLSearchParams()
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && !Number.isNaN(value)) {
          // Skip NaN values for numbers
          if (typeof value === 'number' && Number.isNaN(value)) {
            return
          }
          params.append(key, String(value))
        }
      })
      if (params.toString()) {
        url += `?${params.toString()}`
      }
    }
    
    const response = await fetch(url)
    
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

  async getClassificationStats() {
    return this.request('/api/v1/admin/classification-stats')
  }

  async autoClassifyCases(caseIds?: string[]) {
    return this.request('/api/v1/categories/auto-classify', {
      method: 'POST',
      body: JSON.stringify({
        case_ids: caseIds,
      }),
    })
  }

  // 案例上线相关API
  async getCaseOnlineStats() {
    return this.request('/api/v1/online/stats')
  }

  async getCaseDiffData() {
    return this.request('/api/v1/online/diff-data')
  }



  async updateOnlineCases() {
    return this.request('/api/v1/online/update', {
      method: 'POST',
    })
  }

  async downloadDiffData(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/cases/online/download-diff`, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.blob()
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient()
export default apiClient