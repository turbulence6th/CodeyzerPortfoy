import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CategoryCharts } from './pages/CategoryCharts';
import { useAppSelector } from './hooks/redux';
import { usePrices } from './hooks/usePrices';
import { config } from './utils/config';

function App() {
  const holdings = useAppSelector(state => state.portfolio.holdings);
  const { refreshPrices, loading } = usePrices(holdings, config.api.autoRefreshPrices);

  return (
    <Router>
      <Layout onRefreshPrices={refreshPrices} isLoading={loading}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/category-charts" element={<CategoryCharts />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
