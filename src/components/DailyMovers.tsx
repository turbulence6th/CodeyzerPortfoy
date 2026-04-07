import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
} from '@mui/material';
import { MdTrendingUp as TrendingUpIcon, MdTrendingDown as TrendingDownIcon } from 'react-icons/md';
import type { Holding, PriceData } from '../models/types';

interface DailyMoversProps {
  holdings: Holding[];
  prices: Record<string, PriceData>;
}

interface MoverItem {
  holding: Holding;
  changePercent: number;
}

export const DailyMovers: React.FC<DailyMoversProps> = ({ holdings, prices }) => {
  // Fiyat verisi olan ve hata içermeyen holding'leri filtrele
  const validMovers: MoverItem[] = holdings
    .filter(h => {
      const p = prices[h.symbol];
      return p && !p.error && p.changePercent !== undefined;
    })
    .map(h => ({
      holding: h,
      changePercent: prices[h.symbol].changePercent,
    }));

  // Yeterli veri yoksa render etme
  if (validMovers.length < 2) return null;

  const sorted = [...validMovers].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sorted.filter(m => m.changePercent > 0).slice(0, 3);
  const losers = sorted.filter(m => m.changePercent < 0).slice(-3).reverse();

  // Hiç artan ya da düşen yoksa render etme
  if (gainers.length === 0 && losers.length === 0) return null;

  return (
    <Grid size={{ xs: 12 }}>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ pb: '12px !important', pt: 1.5, px: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight="medium" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Günlük Hareketler
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
            {/* Artan */}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <TrendingUpIcon size="1rem" color="var(--mui-palette-success-main, #4caf50)" />
                <Typography variant="caption" color="success.main" fontWeight="medium">
                  En Çok Artan
                </Typography>
              </Box>
              {gainers.length === 0 ? (
                <Typography variant="caption" color="text.disabled">—</Typography>
              ) : (
                gainers.map(({ holding, changePercent }) => (
                  <Box key={holding.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: '55%' }}>
                      {holding.symbol}
                    </Typography>
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      +{changePercent.toFixed(2)}%
                    </Typography>
                  </Box>
                ))
              )}
            </Box>

            {/* Dikey ayraç */}
            <Box sx={{ width: '1px', bgcolor: 'divider', mx: 0.5 }} />

            {/* Düşen */}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <TrendingDownIcon size="1rem" color="var(--mui-palette-error-main, #f44336)" />
                <Typography variant="caption" color="error.main" fontWeight="medium">
                  En Çok Düşen
                </Typography>
              </Box>
              {losers.length === 0 ? (
                <Typography variant="caption" color="text.disabled">—</Typography>
              ) : (
                losers.map(({ holding, changePercent }) => (
                  <Box key={holding.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: '55%' }}>
                      {holding.symbol}
                    </Typography>
                    <Typography variant="body2" color="error.main" fontWeight="bold">
                      {changePercent.toFixed(2)}%
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
};
