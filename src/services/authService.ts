import { UserProfile } from '../types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

export const login = async (email: string): Promise<UserProfile | null> => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const user = await response.json();
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem('user');
  window.location.reload();
};

export const getCurrentUser = (): UserProfile | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};
