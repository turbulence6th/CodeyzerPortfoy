import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CategoryCharts } from './pages/CategoryCharts';
import { useAppSelector } from './hooks/redux';
import { usePrices } from './hooks/usePrices';

function App() {
  const holdings = useAppSelector(state => state.portfolio.holdings);
  
  const { refreshPrices } = usePrices(holdings);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard onRefresh={refreshPrices} />} />
          <Route path="/category-charts" element={<CategoryCharts />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
