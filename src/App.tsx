import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { URLOpenListenerEvent } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CategoryCharts } from './pages/CategoryCharts';
import { Settings } from './pages/Settings';
import { useAppSelector, useAppDispatch } from './hooks/redux';
import { usePrices } from './hooks/usePrices';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Box, CircularProgress } from '@mui/material';
import { setTotalDebt } from './store/portfolioSlice';

function AppContent() {
  const holdings = useAppSelector(state => state.portfolio.holdings);
  const { refreshPrices } = usePrices(holdings);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard onRefresh={refreshPrices} />} />
        <Route path="/category-charts" element={<CategoryCharts />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

function AuthGuard() {
  const { isAuthenticated, isLoading, isBiometricEnabled, verifyIdentity, error, lockApp } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    let stateListener: PluginListenerHandle | undefined;
    let urlListener: PluginListenerHandle | undefined;

    const setupListeners = async () => {
      stateListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive && isBiometricEnabled) {
          lockApp();
        }
      });

      urlListener = await CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        const url = new URL(event.url);
        if (url.hostname === 'borc-geldi') {
          const debtAmount = parseFloat(url.searchParams.get('tutar') || '0');
          if (!isNaN(debtAmount)) {
            dispatch(setTotalDebt(debtAmount));
          }
        }
      });
    };

    setupListeners();

    return () => {
      stateListener?.remove();
      urlListener?.remove();
    };
  }, [isBiometricEnabled, lockApp, dispatch]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <AppContent />;
  }

  return <LoginScreen onUnlock={verifyIdentity} error={error || undefined} />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </Router>
  );
}

export default App;
