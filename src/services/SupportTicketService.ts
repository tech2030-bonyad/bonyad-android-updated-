// 🎫 Support Ticket Service - API Integration
import { API_BASE_URL, API_ENDPOINTS, buildApiUrlWithParams } from '../config/api';
import { storage } from '../utils/storage';
import { SupportTicket, CreateTicketRequest, TicketRating } from '../types/chat';

class SupportTicketService {
  /**
   * Get authentication headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await storage.getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };
  }

  /**
   * Create a new support ticket
   */
  async createTicket(data: CreateTicketRequest): Promise<SupportTicket> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SUPPORT.REQUESTS}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Create ticket error:', errorText);
        throw new Error(`Failed to create ticket: ${response.status}`);
      }

      const ticket: SupportTicket = await response.json();
      console.log('✅ Ticket created:', ticket.id);
      return ticket;
    } catch (error) {
      console.error('❌ Error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Get all user's tickets
   */
  async getMyTickets(): Promise<SupportTicket[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SUPPORT.MY_REQUESTS}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.status}`);
      }

      const data = await response.json();
      return data.requests || [];
    } catch (error) {
      console.error('❌ Error fetching tickets:', error);
      return [];
    }
  }

  /**
   * Get ticket details
   */
  async getTicketDetails(ticketId: number): Promise<SupportTicket | null> {
    try {
      const headers = await this.getAuthHeaders();
      const url = buildApiUrlWithParams(API_ENDPOINTS.SUPPORT.REQUEST_DETAILS, { id: ticketId });
      
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ticket details: ${response.status}`);
      }

      const ticket: SupportTicket = await response.json();
      return ticket;
    } catch (error) {
      console.error('❌ Error fetching ticket details:', error);
      return null;
    }
  }

  /**
   * Rate a resolved ticket
   */
  async rateTicket(ticketId: number, rating: TicketRating): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/support/requests/${ticketId}/rate`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(rating),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to rate ticket: ${response.status}`);
      }

      console.log('✅ Ticket rated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error rating ticket:', error);
      return false;
    }
  }

  /**
   * Close a ticket
   */
  async closeTicket(ticketId: number): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${API_BASE_URL}/support/requests/${ticketId}/close`,
        {
          method: 'POST',
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to close ticket: ${response.status}`);
      }

      console.log('✅ Ticket closed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error closing ticket:', error);
      return false;
    }
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'PENDING': return '#FFA500';
      case 'ASSIGNED': return '#3498db';
      case 'IN_PROGRESS': return '#9b59b6';
      case 'RESOLVED': return '#2ecc71';
      case 'CLOSED': return '#95a5a6';
      case 'REJECTED': return '#e74c3c';
      default: return '#7f8c8d';
    }
  }

  /**
   * Get status display text
   */
  getStatusText(status: string, language: 'en' | 'ar' = 'en'): string {
    const statusMap: Record<string, { en: string; ar: string }> = {
      PENDING: { en: 'Pending', ar: 'قيد الانتظار' },
      ASSIGNED: { en: 'Assigned', ar: 'تم التعيين' },
      IN_PROGRESS: { en: 'In Progress', ar: 'قيد التنفيذ' },
      RESOLVED: { en: 'Resolved', ar: 'تم الحل' },
      CLOSED: { en: 'Closed', ar: 'مغلق' },
      REJECTED: { en: 'Rejected', ar: 'مرفوض' },
    };
    return statusMap[status]?.[language] || status;
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'URGENT': return '#e74c3c';
      case 'HIGH': return '#e67e22';
      case 'MEDIUM': return '#f39c12';
      case 'LOW': return '#27ae60';
      default: return '#95a5a6';
    }
  }

  /**
   * Get priority display text
   */
  getPriorityText(priority: string, language: 'en' | 'ar' = 'en'): string {
    const priorityMap: Record<string, { en: string; ar: string }> = {
      URGENT: { en: 'Urgent', ar: 'عاجل' },
      HIGH: { en: 'High', ar: 'عالي' },
      MEDIUM: { en: 'Medium', ar: 'متوسط' },
      LOW: { en: 'Low', ar: 'منخفض' },
    };
    return priorityMap[priority]?.[language] || priority;
  }

  /**
   * Get category display text
   */
  getCategoryText(category: string, language: 'en' | 'ar' = 'en'): string {
    const categoryMap: Record<string, { en: string; ar: string }> = {
      General: { en: 'General', ar: 'عام' },
      Billing: { en: 'Billing', ar: 'الفواتير' },
      Technical: { en: 'Technical', ar: 'تقني' },
      Account: { en: 'Account', ar: 'الحساب' },
      Other: { en: 'Other', ar: 'أخرى' },
    };
    return categoryMap[category]?.[language] || category;
  }
}

export default new SupportTicketService();
