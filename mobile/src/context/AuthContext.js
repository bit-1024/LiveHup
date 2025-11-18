import React, { createContext, useContext, useMemo, useState } from 'react';
import { authStorage } from '../utils/authStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => authStorage.getToken());
  const [currentUser, setCurrentUser] = useState(() => authStorage.getUser());

  const login = (nextToken, userInfo) => {
    authStorage.setToken(nextToken);
    authStorage.setUser(userInfo);
    setToken(nextToken);
    setCurrentUser(userInfo);
  };

  const logout = () => {
    authStorage.clear();
    setToken(null);
    setCurrentUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user: currentUser,
      isAuthenticated: Boolean(token && currentUser),
      login,
      logout,
    }),
    [token, currentUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
