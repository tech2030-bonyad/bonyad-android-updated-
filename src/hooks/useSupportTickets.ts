// 🎫 useSupportTickets Hook – same integration as web (SupportTicketService)
import { useState, useEffect, useCallback } from 'react';
import * as SupportTicketService from '../services/SupportTicketService';
import { SupportTicket, CreateTicketRequest } from '../types/chat';

interface UseSupportTicketsOptions {
  language?: 'en' | 'ar';
  statusFilter?: string;
}

export const useSupportTickets = (options: UseSupportTicketsOptions = {}) => {
  const { language = 'en', statusFilter } = options;

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SupportTicketService.getMyTickets(statusFilter as any);
      setTickets(data);
    } catch (err: any) {
      const message = err?.message && typeof err.message === 'string' ? err.message : 'Failed to fetch tickets';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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

  const getTicketDetails = useCallback(async (ticketId: number): Promise<SupportTicket | null> => {
    try {
      return await SupportTicketService.getTicketDetails(ticketId);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ticket details');
      return null;
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const getStatusColor = useCallback((status: string) => SupportTicketService.getStatusColor(status), []);
  const getStatusText = useCallback((status: string) => SupportTicketService.getStatusText(status, language), [language]);
  const getPriorityColor = useCallback((priority: string) => SupportTicketService.getPriorityColor(priority), []);
  const getPriorityText = useCallback((priority: string) => SupportTicketService.getPriorityText(priority, language), [language]);
  const getCategoryText = useCallback((category: string) => SupportTicketService.getCategoryText(category, language), [language]);

  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.status === 'PENDING' || t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'WAITING_FOR_CUSTOMER').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
    unread: tickets.filter(t => (t.unreadMessageCount ?? 0) > 0 || t.hasUnreadMessages).length,
  };

  return {
    tickets,
    loading,
    error,
    stats,
    fetchTickets,
    createTicket,
    getTicketDetails,
    getStatusColor,
    getStatusText,
    getPriorityColor,
    getPriorityText,
    getCategoryText,
  };
};

export default useSupportTickets;
