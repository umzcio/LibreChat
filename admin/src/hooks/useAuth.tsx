import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from '~/utils/axios';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First check if we have a token
      const token = localStorage.getItem('adminToken');

      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Verify the token by calling an admin endpoint
      await axios.get('/api/admin/stats', {
        withCredentials: true,
      });

      // If we got here, the token is valid and user is admin
      // Try to get user details from localStorage or make another call
      const storedUser = localStorage.getItem('adminUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } else {
        // Token is valid but we don't have user details
        // This shouldn't happen but we'll stay authenticated
        setIsAuthenticated(true);
        setUser(null);
      }
    } catch (error: any) {
      // If we get a 401, the token is invalid
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await axios.post('/api/auth/login', {
      email,
      password,
    }, {
      withCredentials: true,
    });

    // LibreChat login returns { token, user }
    const { token, user: userData } = response.data;

    if (userData && userData.role === 'ADMIN') {
      // Store token and user in localStorage for persistence
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(userData));

      setIsAuthenticated(true);
      setUser(userData);
      return true;
    }

    throw new Error('Unauthorized: Admin access required');
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
    } catch (error) {
      // Even if logout fails, clear local storage
    }
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
