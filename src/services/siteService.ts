import { Site } from '../types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

export const getSites = async (callback: (sites: Site[]) => void) => {
  try {
    const response = await fetch(`${API_URL}/sites`);
    const data = await response.json();
    callback(data);
  } catch (error) {
    console.error('Error fetching sites:', error);
  }
};

export const getSite = async (id: string) => {
  try {
    const response = await fetch(`${API_URL}/sites/${id}`);
    if (!response.ok) return null;
    return await response.json() as Site;
  } catch (error) {
    console.error(`Error fetching site ${id}:`, error);
    return null;
  }
};

export const createSite = async (site: Partial<Site>) => {
  try {
    const response = await fetch(`${API_URL}/sites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site),
    });
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error creating site:', error);
  }
};

export const updateSite = async (id: string, site: Partial<Site>) => {
  try {
    await fetch(`${API_URL}/sites/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(site),
    });
  } catch (error) {
    console.error(`Error updating site ${id}:`, error);
  }
};

export const deleteSite = async (id: string) => {
  try {
    await fetch(`${API_URL}/sites/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error(`Error deleting site ${id}:`, error);
  }
};
