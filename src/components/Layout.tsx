import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Button,
  Container,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import {
  MdBrightness4 as Brightness4,
  MdBrightness7 as Brightness7,
  MdRefresh as Refresh,
  MdAccountBalance as AccountBalance,
  MdDashboard as Dashboard,
  MdBarChart as BarChart,
} from 'react-icons/md';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

interface LayoutProps {
  children: React.ReactNode;
  onRefreshPrices?: () => void;
  isLoading?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onRefreshPrices,
  isLoading = false 
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();
  const isSmall = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentTab = () => {
    switch (location.pathname) {
      case '/':
        return 0;
      case '/category-charts':
        return 1;
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
          
          <Button
            color="inherit"
            onClick={onRefreshPrices}
            disabled={isLoading}
            startIcon={<Refresh />}
            sx={{ mr: 1 }}
          >
            {!isSmall && (isLoading ? 'Güncelleniyor...' : 'Fiyatları Güncelle')}
          </Button>

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
        </BottomNavigation>
      </Paper>
    </Box>
  );
}; 