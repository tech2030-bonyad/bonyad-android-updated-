// 🎫 useSupportTickets Hook - Manage Support Ticket State
import { useState, useEffect, useCallback } from 'react';
import SupportTicketService from '../services/SupportTicketService';
import { SupportTicket, CreateTicketRequest, TicketRating } from '../types/chat';

interface UseSupportTicketsOptions {
  language?: 'en' | 'ar';
}

export const useSupportTickets = (options: UseSupportTicketsOptions = {}) => {
  const { language = 'en' } = options;
  
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SupportTicketService.getMyTickets();
      setTickets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new ticket
  const createTicket = useCallback(async (data: CreateTicketRequest): Promise<SupportTicket | null> => {
    setLoading(true);
    setError(null);
    try {
      const newTicket = await SupportTicketService.createTicket(data);
      setTickets(prev => [newTicket, ...prev]);
      return newTicket;
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get ticket details
  const getTicketDetails = useCallback(async (ticketId: number): Promise<SupportTicket | null> => {
    try {
      return await SupportTicketService.getTicketDetails(ticketId);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ticket details');
      return null;
    }
  }, []);

  // Rate a ticket
  const rateTicket = useCallback(async (ticketId: number, rating: TicketRating): Promise<boolean> => {
    try {
      const success = await SupportTicketService.rateTicket(ticketId, rating);
      if (success) {
        setTickets(prev => prev.map(t => 
          t.id === ticketId ? { ...t, rating: rating.rating, feedback: rating.feedback } : t
        ));
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to rate ticket');
      return false;
    }
  }, []);

  // Close a ticket
  const closeTicket = useCallback(async (ticketId: number): Promise<boolean> => {
    try {
      const success = await SupportTicketService.closeTicket(ticketId);
      if (success) {
        setTickets(prev => prev.map(t => 
          t.id === ticketId ? { ...t, status: 'CLOSED' } : t
        ));
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to close ticket');
      return false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Helper methods
  const getStatusColor = useCallback((status: string) => {
    return SupportTicketService.getStatusColor(status);
  }, []);

  const getStatusText = useCallback((status: string) => {
    return SupportTicketService.getStatusText(status, language);
  }, [language]);

  const getPriorityColor = useCallback((priority: string) => {
    return SupportTicketService.getPriorityColor(priority);
  }, []);

  const getPriorityText = useCallback((priority: string) => {
    return SupportTicketService.getPriorityText(priority, language);
  }, [language]);

  const getCategoryText = useCallback((category: string) => {
    return SupportTicketService.getCategoryText(category, language);
  }, [language]);

  // Stats
  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.status === 'PENDING').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
    unread: tickets.filter(t => t.hasUnreadMessages).length,
  };

  return {
    tickets,
    loading,
    error,
    stats,
    fetchTickets,
    createTicket,
    getTicketDetails,
    rateTicket,
    closeTicket,
    getStatusColor,
    getStatusText,
    getPriorityColor,
    getPriorityText,
    getCategoryText,
  };
};

export default useSupportTickets;
