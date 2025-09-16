// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom'; // <--- IMPORT THIS
import { UserRole } from '@/api/types';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string; // A display name
}

// This interface defines the data we expect to find inside the JWT token
interface JwtPayload {
  sub: string; // The subject, which is the user's email
  id: string;  // The user's database ID
  role: UserRole;
  exp: number; // The token's expiration timestamp
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  loading: boolean;
  token: string | null; // We also expose the token itself
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('foodbot_admin_token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // This effect runs on app startup or whenever the token changes
  useEffect(() => {
    if (token) {
      try {
        // 1. Decode the token to read the user's information
        const payload: JwtPayload = JSON.parse(atob(token.split('.')[1]));

        // 2. Check if the token has expired
        if (payload.exp * 1000 < Date.now()) {
          throw new Error("Token has expired");
        }
        
        // 3. If the token is valid, create the user object for the app
        setUser({
          id: String(payload.id),
          email: payload.sub,
          role: payload.role.toLowerCase() as UserRole,
          name: payload.sub.split('@')[0], // Create a simple name from the email
        });

      } catch (error) {
        console.error("Authentication Error:", error);
        // If the token is invalid or expired, clear the session
        localStorage.removeItem('foodbot_admin_token');
        setToken(null);
        setUser(null);
      }
    }
    setLoading(false);
  }, [token]);

  // This is the REAL login function that talks to the backend
  const login = async (email: string, password: string, role: UserRole) => {
    setLoading(true);
    try {
      // Use your environment variable for the API URL
      const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:10000';
      
      const response = await fetch(`${API_URL}/api/v1/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: email, // Backend expects 'username', frontend uses 'email'
          password, 
          role 
        }),
      });

      if (!response.ok) {
        // Throw an error to be caught by the login form
        throw new Error('Login failed. Please check your credentials and selected role.');
      }

      const data = await response.json();
      const newToken = data.access_token;
      
      // Save the new token to localStorage and update the state
      localStorage.setItem('foodbot_admin_token', newToken);
      setToken(newToken); // This will trigger the useEffect above to set the user


      const payload: JwtPayload = JSON.parse(atob(newToken.split('.')[1]));
      const userRole = payload.role.toLowerCase();

      // Redirect based on the role found in the token
      if (userRole === 'kitchen') {
        navigate('/staff-dashboard');
      } else if (userRole === 'delivery') {
        navigate('/delivery-dashboard');
      } else {
        // Default redirect for 'admin' and 'manager'
        navigate('/');
      }



    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('foodbot_admin_token');
  };

  const value = { user, isAuthenticated: !!user, login, logout, loading, token };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};