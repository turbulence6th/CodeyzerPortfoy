import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CategoryCharts } from './pages/CategoryCharts';
import { useAppSelector } from './hooks/redux';
import { usePrices } from './hooks/usePrices';

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
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
