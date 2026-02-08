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
import { useTheme } from '../contexts/ThemeContext';
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
  const { isDarkMode } = useTheme();

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

  const gradientLine = isDarkMode
    ? 'linear-gradient(90deg, #FF8F00, #FFAB00, #FFD54F, #FFAB00, #FF8F00)'
    : 'linear-gradient(90deg, #BF360C, #E65100, #FF6D00, #E65100, #BF360C)';

  return (
    <Box sx={{ flexGrow: 1, pb: 10 }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          pt: 'env(safe-area-inset-top)',
          top: 0,
          zIndex: 1100,
          backgroundColor: isDarkMode
            ? 'rgba(10, 10, 15, 0.8)'
            : 'rgba(240, 242, 245, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid',
          borderColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(0, 0, 0, 0.06)',
          color: isDarkMode ? '#EAEAEA' : '#172B4D',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: gradientLine,
            opacity: 0.7,
          },
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{
              mr: 2,
              display: 'flex',
              alignItems: 'center',
              color: isDarkMode ? '#FFAB00' : '#E65100',
            }}>
              <AccountBalance size={24} />
            </Box>
            <Typography variant="h6" component="div" sx={{ display: { xs: 'none', sm: 'block' } }}>
              Codeyzer Portfoy
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {lastUpdate && (
              <Box sx={{ mr: 1, textAlign: 'right' }}>
                <Typography variant="caption" component="div" sx={{ lineHeight: 1.2, fontSize: '0.7rem', opacity: 0.7 }}>
                  Son Guncelleme
                </Typography>
                <Typography variant="caption" component="div" sx={{ fontWeight: 600, lineHeight: 1.2, fontSize: '0.75rem' }}>
                  {dayjs(lastUpdate).format('D MMM, HH:mm')}
                </Typography>
                {lastUpdateStats && lastUpdateStats.total > 0 && (
                  <Typography variant="caption" component="div" sx={{ lineHeight: 1.1, fontSize: '0.65rem', opacity: 0.6 }}>
                    ({lastUpdateStats.live} anlik, {lastUpdateStats.cached} onbellekten)
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
          backgroundColor: isDarkMode
            ? 'rgba(10, 10, 15, 0.85)'
            : 'rgba(240, 242, 245, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 0,
          zIndex: 1000,
          borderTop: '1px solid',
          borderColor: isDarkMode
            ? 'rgba(255, 255, 255, 0.06)'
            : 'rgba(0, 0, 0, 0.06)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: gradientLine,
            opacity: 0.5,
          },
        }}
        elevation={0}
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
