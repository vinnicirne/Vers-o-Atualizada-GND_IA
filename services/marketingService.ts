
import { api } from './api';
import { Lead, LeadStatus, MarketingEvent, Deal } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service to manage Leads, Deals and Marketing Events.
 * Functions are designed to handle both User context (Tenant) and Admin context.
 */

// --- LEADS ---

export const getLeads = async (ownerId: string, isAdmin = false): Promise<Lead[]> => {
    let filters: any = {};
    
    // If not admin, restrict to owner_id
    if (!isAdmin) {
        filters.owner_id = ownerId;
    }
    
    const { data, error } = await api.select('leads', filters);
    
    if (error) {
        // Graceful fallback if table doesn't exist yet
        if (typeof error === 'string' && (error.includes('does not exist') || error.includes('404'))) {
            return [];
        }
        console.error("Error fetching leads:", error);
        throw new Error("Failed to fetch leads");
    }
    
    return (data || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const createLead = async (leadData: Partial<Lead>, ownerId: string): Promise<Lead | null> => {
    const newLead = {
        id: uuidv4(),
        owner_id: ownerId,
        status: 'new',
        score: 0,
        ...leadData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await api.insert('leads', newLead);
    
    if (error) {
        console.error("Error creating lead:", error);
        throw new Error("Failed to create lead");
    }
    
    return data ? data[0] : null;
};

export const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { error } = await api.update('leads', { 
        ...updates, 
        updated_at: new Date().toISOString() 
    }, { id });
    
    if (error) throw new Error(String(error));
};

export const deleteLead = async (id: string) => {
    const { error } = await api.delete('leads', { id });
    if (error) throw new Error(String(error));
};

// --- EVENTS & SCORING ---

export const trackMarketingEvent = async (leadId: string, eventType: MarketingEvent['event_type'], metadata: any = {}) => {
    const event = {
        id: uuidv4(),
        lead_id: leadId,
        event_type: eventType,
        metadata,
        created_at: new Date().toISOString()
    };

    // 1. Record Event
    await api.insert('marketing_events', event);

    // 2. Update Lead Score based on event
    let scoreIncrement = 0;
    switch(eventType) {
        case 'page_view': scoreIncrement = 1; break;
        case 'email_open': scoreIncrement = 2; break;
        case 'click': scoreIncrement = 5; break;
        case 'form_submit': scoreIncrement = 10; break;
        case 'purchase': scoreIncrement = 50; break;
    }

    if (scoreIncrement > 0) {
        // Fetch current score first (limitation of simple proxy update)
        const { data: leads } = await api.select('leads', { id: leadId });
        if (leads && leads.length > 0) {
            const currentScore = leads[0].score || 0;
            const newScore = currentScore + scoreIncrement;
            
            // Auto-qualify if score high
            let newStatus = leads[0].status;
            if (newScore >= 50 && newStatus === 'new') {
                newStatus = 'qualified';
            }

            await updateLead(leadId, { score: newScore, status: newStatus });
        }
    }
};

// --- DEALS ---

export const getDeals = async (leadId: string): Promise<Deal[]> => {
    const { data, error } = await api.select('deals', { lead_id: leadId });
    if (error) return [];
    return data || [];
};

export const createDeal = async (dealData: Partial<Deal>, ownerId: string) => {
    const newDeal = {
        id: uuidv4(),
        owner_id: ownerId,
        status: 'open',
        ...dealData,
        created_at: new Date().toISOString()
    };
    await api.insert('deals', newDeal);
};
