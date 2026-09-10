import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const login = useCallback((token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const toast = useCallback((message, type = 'success') => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // When a request fails auth (expired/invalid token), api.js clears storage and
  // fires this event — reset the UI to logged-out so the user re-authenticates
  // instead of getting stuck with token-less requests ("Token topilmadi").
  useEffect(() => {
    function onExpired() {
      setUser(null);
      toast('Sessiya tugadi. Iltimos, qaytadan kiring.', 'error');
    }
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [toast]);

  return (
    <AuthContext.Provider value={{ user, login, logout, toast, toasts }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
