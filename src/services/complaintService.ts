import { Complaint } from '../types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

export const getComplaints = async (callback: (complaints: Complaint[]) => void) => {
  try {
    const response = await fetch(`${API_URL}/complaints`);
    const data = await response.json();
    callback(data);
  } catch (error) {
    console.error('Error fetching complaints:', error);
  }
};

export const getSiteComplaints = async (siteId: string, callback: (complaints: Complaint[]) => void) => {
  try {
    const response = await fetch(`${API_URL}/sites/${siteId}/complaints`);
    const data = await response.json();
    callback(data);
  } catch (error) {
    console.error(`Error fetching complaints for site ${siteId}:`, error);
  }
};

export const createComplaint = async (complaint: Partial<Complaint>) => {
  try {
    const response = await fetch(`${API_URL}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(complaint),
    });
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error creating complaint:', error);
  }
};

export const updateComplaint = async (id: string, complaint: Partial<Complaint>) => {
  try {
    await fetch(`${API_URL}/complaints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(complaint),
    });
  } catch (error) {
    console.error(`Error updating complaint ${id}:`, error);
  }
};
