import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { useTheme } from '../contexts/ThemeContext';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';

dayjs.locale('tr');

interface PortfolioSummaryProps {
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  loading: boolean;
  totalDebt: number;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  totalValue,
  dailyChange,
  dailyChangePercent,
  loading,
  totalDebt,
}) => {
  const isPositiveChange = dailyChange >= 0;
  const netWorth = totalValue - totalDebt;
  const { isDarkMode } = useTheme();

  const gradientBorder = isDarkMode
    ? 'linear-gradient(135deg, #FF8F00, #FFAB00, #FFD54F)'
    : 'linear-gradient(135deg, #BF360C, #E65100, #FF6D00)';

  return (
    <>
      {/* Toplam Deger Karti */}
      <Grid size={{ xs: 12 }}>
        <Box
          sx={{
            position: 'relative',
            borderRadius: '18px',
            padding: '2px',
            background: gradientBorder,
          }}
        >
          <Paper sx={{
            p: 2.5,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: '16px',
            backgroundColor: isDarkMode
              ? 'rgba(10, 10, 15, 0.9)'
              : 'rgba(255, 255, 255, 0.95)',
          }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Net Varlik Durumu
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              {/* Anapara */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                  TOPLAM VARLIKLAR
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {'\u20BA'}{totalValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </Typography>
              </Box>

              <Typography variant="h5" color="text.secondary" sx={{ opacity: 0.4 }}>{'\u2212'}</Typography>

              {/* Borc */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                  TOPLAM BORC
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {'\u20BA'}{totalDebt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </Typography>
              </Box>

              <Typography variant="h5" color="primary" sx={{ opacity: 0.6 }}>=</Typography>

              {/* Net Para */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                  NET VARLIK
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{
                    background: isDarkMode
                      ? 'linear-gradient(135deg, #FFAB00, #FFD54F)'
                      : 'linear-gradient(135deg, #E65100, #FF6D00)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {'\u20BA'}{netWorth.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </Typography>
              </Box>
            </Box>

            { !loading && (
              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    backgroundColor: isPositiveChange
                      ? 'rgba(76, 175, 80, 0.12)'
                      : 'rgba(244, 67, 54, 0.12)',
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    color={isPositiveChange ? 'success.main' : 'error.main'}
                  >
                    {isPositiveChange ? '+' : ''}
                    {dailyChange.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {' ('}
                    {isPositiveChange ? '+' : ''}
                    {dailyChangePercent.toFixed(2)}%
                    {')'}
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
      </Grid>
    </>
  );
};
