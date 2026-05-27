import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const CurrencyContext = createContext(null);

const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api`;
const SYMBOLS = {
  'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£',
  'AUD': 'A$', 'CAD': 'C$'
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'INR');
  const [currencySymbol, setCurrencySymbol] = useState(() => SYMBOLS[localStorage.getItem('currency') || 'INR'] || '₹');

  const updateCurrency = useCallback((curr) => {
    setCurrency(curr);
    setCurrencySymbol(SYMBOLS[curr] || curr);
    localStorage.setItem('currency', curr);
  }, []);

  // Fetch the global currency from backend on mount AND whenever auth token changes.
  // The settings endpoint is the source of truth — localStorage is just a cache.
  useEffect(() => {
    let cancelled = false;
    const fetchServerCurrency = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_BASE}/settings`, { headers });
        if (cancelled) return;
        const serverCurrency = res.data?.currency;
        if (serverCurrency && serverCurrency !== currency) {
          updateCurrency(serverCurrency);
        }
      } catch {
        // Settings endpoint may require auth; silently keep localStorage value.
      }
    };
    fetchServerCurrency();

    // Re-fetch when storage changes (e.g., user logs in in another tab)
    const onStorage = (e) => {
      if (e.key === 'token') fetchServerCurrency();
    };
    const onAuthChange = () => fetchServerCurrency();
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth-changed', onAuthChange);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth-changed', onAuthChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatAmount = (amount) => {
    if (typeof amount !== 'number') {
      amount = parseFloat(amount) || 0;
    }
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, currencySymbol, formatAmount, updateCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
};
