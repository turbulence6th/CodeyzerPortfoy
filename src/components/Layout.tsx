import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Container,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import {
  MdBrightness4 as Brightness4,
  MdBrightness7 as Brightness7,
  MdAccountBalance as AccountBalance,
  MdDashboard as Dashboard,
  MdBarChart as BarChart,
  MdSettings as SettingsIcon,
} from 'react-icons/md';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

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
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Box sx={{ mr: 2, display: 'flex' }}>
            <AccountBalance size={24} />
          </Box>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Codeyzer Portföy
          </Typography>
          
          <IconButton
            color="inherit"
            onClick={toggleTheme}
            title={isDarkMode ? 'Açık tema' : 'Koyu tema'}
          >
            {isDarkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
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