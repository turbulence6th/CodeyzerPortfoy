import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import type { PaletteMode } from '@mui/material';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeContextProvider');
  }
  return context;
};

interface ThemeContextProviderProps {
  children: React.ReactNode;
}

// "Karbon & Kehribar" Teması - Glassmorphism & Gradient Edition
const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Açık Tema Renkleri
          primary: {
            main: '#E65100',
            light: '#FF6D00',
            dark: '#BF360C',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#455A64',
            light: '#607D8B',
            dark: '#37474F',
            contrastText: '#ffffff',
          },
          background: {
            default: '#F0F2F5',
            paper: '#FFFFFF',
          },
          text: {
            primary: '#172B4D',
            secondary: '#5E6C84',
          },
        }
      : {
          // Koyu Tema Renkleri (Maskülen ve Güçlü)
          primary: {
            main: '#FFAB00',
            light: '#FFD54F',
            dark: '#FF8F00',
            contrastText: '#000000',
          },
          secondary: {
            main: '#607D8B',
            light: '#78909C',
            dark: '#455A64',
            contrastText: '#ffffff',
          },
          background: {
            default: '#0A0A0F',
            paper: '#16161F',
          },
          text: {
            primary: '#EAEAEA',
            secondary: '#9E9E9E',
          },
        }),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 500,
      letterSpacing: '-0.005em',
    },
    subtitle2: {
      fontWeight: 600,
      letterSpacing: '0.02em',
      textTransform: 'uppercase' as const,
      fontSize: '0.7rem',
    },
    body2: {
      fontSize: '0.85rem',
    },
    caption: {
      letterSpacing: '0.03em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: 'none',
          backgroundImage: 'none',
          ...(mode === 'dark'
            ? {
                backgroundColor: 'rgba(22, 22, 31, 0.6)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }
            : {
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
              }),
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none' as const,
          fontWeight: 600,
          letterSpacing: '-0.005em',
        },
        containedPrimary: {
          background: mode === 'dark'
            ? 'linear-gradient(135deg, #FFAB00 0%, #FF8F00 100%)'
            : 'linear-gradient(135deg, #E65100 0%, #FF6D00 100%)',
          '&:hover': {
            background: mode === 'dark'
              ? 'linear-gradient(135deg, #FFD54F 0%, #FFAB00 100%)'
              : 'linear-gradient(135deg, #FF6D00 0%, #E65100 100%)',
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          background: mode === 'dark'
            ? 'linear-gradient(135deg, #FFAB00 0%, #FF8F00 100%)'
            : 'linear-gradient(135deg, #E65100 0%, #FF6D00 100%)',
          boxShadow: mode === 'dark'
            ? '0 8px 32px rgba(255, 171, 0, 0.35)'
            : '0 8px 32px rgba(230, 81, 0, 0.35)',
          '&:hover': {
            background: mode === 'dark'
              ? 'linear-gradient(135deg, #FFD54F 0%, #FFAB00 100%)'
              : 'linear-gradient(135deg, #FF6D00 0%, #E65100 100%)',
            boxShadow: mode === 'dark'
              ? '0 12px 40px rgba(255, 171, 0, 0.5)'
              : '0 12px 40px rgba(230, 81, 0, 0.5)',
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          height: 'auto',
          paddingTop: 8,
          paddingBottom: 8,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
          '&.Mui-selected': {
            color: mode === 'dark' ? '#FFAB00' : '#E65100',
          },
          transition: 'color 0.2s ease',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        container: {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        paper: {
          ...(mode === 'dark'
            ? {
                backgroundColor: 'rgba(22, 22, 31, 0.85)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }
            : {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
              }),
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          ...(mode === 'dark'
            ? {
                backgroundColor: 'rgba(22, 22, 31, 0.5)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }
            : {
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(0, 0, 0, 0.05)',
              }),
          borderRadius: '16px !important',
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: '0 0 12px 0',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          minHeight: 56,
          '&.Mui-expanded': {
            minHeight: 56,
          },
        },
        content: {
          '&.Mui-expanded': {
            margin: '12px 0',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: mode === 'dark' ? '#FFAB00' : '#E65100',
          },
          '&.Mui-checked + .MuiSwitch-track': {
            backgroundColor: mode === 'dark' ? '#FFAB00' : '#E65100',
          },
        },
      },
    },
  },
});


export const ThemeContextProvider: React.FC<ThemeContextProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    // Varsayılan olarak koyu temayı tercih edelim
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const theme = useMemo(() => createTheme(getDesignTokens(isDarkMode ? 'dark' : 'light')), [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
