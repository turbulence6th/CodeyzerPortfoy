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

// "Karbon & Kehribar" Teması
const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Açık Tema Renkleri
          primary: {
            main: '#E65100', // Koyu Turuncu
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#455A64', // Koyu Çelik Grisi
            contrastText: '#ffffff',
          },
          background: {
            default: '#F4F6F8',
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
            main: '#FFAB00', // Canlı Kehribar (Amber)
            contrastText: '#000000',
          },
          secondary: {
            main: '#607D8B', // Çelik Mavisi
            contrastText: '#ffffff',
          },
          background: {
            default: '#121212',
            paper: '#212121',
          },
          text: {
            primary: '#E0E0E0',
            secondary: '#A0A0A0',
          },
        }),
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: 'none',
          border: mode === 'dark' ? '1px solid #333' : '1px solid #ddd',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none' as const,
          fontWeight: 600,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          // Ana renkle uyumlu parlama efekti
          boxShadow: mode === 'dark' 
            ? '0 4px 14px rgba(255, 171, 0, 0.4)'
            : '0 4px 14px rgba(230, 81, 0, 0.4)',
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