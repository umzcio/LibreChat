import { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

export function useAuth() {
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
    const userData = response.data.user || response.data;

    if (userData && userData.role === 'ADMIN') {
      setIsAuthenticated(true);
      setUser(userData);
      return true;
    }

    throw new Error('Unauthorized: Admin access required');
  };

  const logout = async () => {
    await axios.post('/api/auth/logout', {}, { withCredentials: true });
    setIsAuthenticated(false);
    setUser(null);
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
  };
}
