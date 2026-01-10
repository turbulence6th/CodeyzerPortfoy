import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import {
  MdAccountBalance as AccountBalance,
  MdDashboard as Dashboard,
  MdBarChart as BarChart,
  MdSettings as SettingsIcon,
} from 'react-icons/md';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';

dayjs.extend(relativeTime);
dayjs.locale('tr');

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lastUpdate, lastUpdateStats } = useAppSelector((state) => state.portfolio);

  const getCurrentTab = () => {
    switch (location.pathname) {
      case '/':
        return 0;
      case '/category-charts':
        return 1;
      case '/settings':
        return 2;
      default:
        return 0;
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/category-charts');
        break;
      case 2:
        navigate('/settings');
        break;
    }
  };

  return (
    <Box sx={{ flexGrow: 1, pb: 10 }}>
      <AppBar 
        position="sticky" 
        elevation={2} 
        sx={{ 
          pt: 'env(safe-area-inset-top)',
          top: 0,
          zIndex: 1100
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
              <AccountBalance size={24} />
            </Box>
            <Typography variant="h6" component="div" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Codeyzer Portföy
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {lastUpdate && (
              <Box sx={{ mr: 1, textAlign: 'right' }}>
                <Typography variant="caption" component="div" sx={{ lineHeight: 1.2, fontSize: '0.7rem' }}>
                  Son Güncelleme
                </Typography>
                <Typography variant="caption" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.2, fontSize: '0.75rem' }}>
                  {dayjs(lastUpdate).format('D MMM, HH:mm')}
                </Typography>
                {lastUpdateStats && lastUpdateStats.total > 0 && (
                  <Typography variant="caption" component="div" sx={{ lineHeight: 1.1, fontSize: '0.65rem', opacity: 0.8 }}>
                    ({lastUpdateStats.live} anlık, {lastUpdateStats.cached} önbellekten)
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 12 }}>
        {children}
      </Container>

      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          pb: 'env(safe-area-inset-bottom)',
          bgcolor: '#212121',
          borderRadius: 0,
          zIndex: 1000
        }}
        elevation={3}
      >
        <BottomNavigation
          value={getCurrentTab()}
          onChange={handleTabChange}
          showLabels
        >
          <BottomNavigationAction
            label="Dashboard"
            icon={<Dashboard />}
          />
          <BottomNavigationAction
            label="Kategoriler"
            icon={<BarChart />}
          />
          <BottomNavigationAction
            label="Ayarlar"
            icon={<SettingsIcon />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}; 