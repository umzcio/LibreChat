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
      const response = await axios.get('/api/auth/user', {
        withCredentials: true,
      });

      // Check if user is admin
      if (response.data && response.data.role === 'ADMIN') {
        setIsAuthenticated(true);
        setUser(response.data);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
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
      // Store token in localStorage
      localStorage.setItem('adminToken', token);

      setIsAuthenticated(true);
      setUser(userData);
      return true;
    }

    throw new Error('Unauthorized: Admin access required');
  };

  const logout = async () => {
    await axios.post('/api/auth/logout', {}, { withCredentials: true });
    localStorage.removeItem('adminToken');
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
