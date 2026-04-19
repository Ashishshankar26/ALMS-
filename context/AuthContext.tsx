import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthData = {
  name?: string;
  id?: string;
  username?: string;
  password?: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  authData: AuthData | null;
  login: (data: AuthData) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  authData: null,
  login: async () => {},
  logout: async () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkLogin = async () => {
      try {
        const storedAuth = await AsyncStorage.getItem('@auth_data');
        if (storedAuth) {
          setAuthData(JSON.parse(storedAuth));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to load auth data', error);
      } finally {
        setLoading(false);
      }
    };
    checkLogin();
  }, []);

  const login = async (data: AuthData) => {
    setAuthData(data);
    setIsAuthenticated(true);
    await AsyncStorage.setItem('@auth_data', JSON.stringify(data));
  };

  const logout = async () => {
    setAuthData(null);
    setIsAuthenticated(false);
    await AsyncStorage.multiRemove([
      '@auth_data',
      '@scraped_data',
      '@timetable_data',
      '@results_json',
      '@credentials'
    ]);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, authData, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
