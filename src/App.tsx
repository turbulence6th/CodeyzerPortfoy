import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CategoryCharts } from './pages/CategoryCharts';
import { Settings } from './pages/Settings';
import { useAppSelector } from './hooks/redux';
import { usePrices } from './hooks/usePrices';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Box, CircularProgress } from '@mui/material';

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

  useEffect(() => {
    // Uygulama arka plandan tekrar açıldığında kilitle
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive && isBiometricEnabled) {
        lockApp();
      }
    });

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [isBiometricEnabled, lockApp]);

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
