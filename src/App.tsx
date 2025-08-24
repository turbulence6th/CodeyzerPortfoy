import { BrowserRouter as Router, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  return (
    <Layout>
      <div style={{ display: location.pathname === '/' ? 'block' : 'none' }}>
        <Dashboard onRefresh={refreshPrices} />
      </div>
      <div style={{ display: location.pathname === '/category-charts' ? 'block' : 'none' }}>
        <CategoryCharts />
      </div>
      <div style={{ display: location.pathname === '/settings' ? 'block' : 'none' }}>
        <Settings />
      </div>
    </Layout>
  );
}

function AuthGuard() {
  const { isAuthenticated, isLoading, isBiometricEnabled, verifyIdentity, error, lockApp } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const addListeners = async () => {
      const stateListener = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive && isBiometricEnabled) {
          lockApp();
        }
      });

      const urlListener = await CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        const url = new URL(event.url);
        if (url.hostname === 'borc-geldi') {
          const debtAmount = parseFloat(url.searchParams.get('tutar') || '0');
          if (!isNaN(debtAmount)) {
            dispatch(setTotalDebt(debtAmount));
          }
        }
      });

      return { stateListener, urlListener };
    };

    let listeners: {
      stateListener: PluginListenerHandle;
      urlListener: PluginListenerHandle;
    } | undefined;

    addListeners().then(handles => {
      listeners = handles;
    });

    return () => {
      listeners?.stateListener.remove();
      listeners?.urlListener.remove();
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
