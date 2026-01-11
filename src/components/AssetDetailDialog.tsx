import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, CircularProgress, Alert, IconButton,
  ToggleButtonGroup, ToggleButton, Chip
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import CloseIcon from '@mui/icons-material/Close';
import { priceService } from '../api/priceService';
import type { Holding, PriceData, HistoricalPrice } from '../models/types';

type TimeRange = '1d' | '1w' | '1mo' | '3mo' | '6mo' | '1y' | '3y' | '5y';

interface AssetDetailDialogProps {
  open: boolean;
  onClose: () => void;
  holding: Holding | null;
  priceData: PriceData | null;
}

export const AssetDetailDialog: React.FC<AssetDetailDialogProps> = ({ open, onClose, holding, priceData }) => {
  const [historicalData, setHistoricalData] = useState<HistoricalPrice[]>([]);
  const [rangeChange, setRangeChange] = useState<{ value: number; percent: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>('1mo');

  useEffect(() => {
    if (open && holding) {
      const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        setRangeChange(null); // Her yeni istekte sıfırla

        try {
          const data = await priceService.fetchHistoricalPrices(holding.symbol, range);
          setHistoricalData(data);

          // Çekilen veriye göre yüzde değişimini hesapla
          if (data.length >= 2) {
            const firstPrice = data[0].price;
            const lastPrice = data[data.length - 1].price;
            const valueChange = lastPrice - firstPrice;
            const percentChange = firstPrice !== 0 ? (valueChange / firstPrice) * 100 : 0;
            setRangeChange({ value: valueChange, percent: percentChange });
          }
        } catch (err) {
          setError('Geçmiş fiyat verileri yüklenemedi.');
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [open, holding, range]);

  const handleRangeChange = (_event: React.MouseEvent<HTMLElement>, newRange: TimeRange | null) => {
    if (newRange) {
      setRange(newRange);
    }
  };

  const formatYAxis = (tick: number) => `₺${tick.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
  const formatTooltip = (value: number) => `₺${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">{holding?.symbol} - Detaylar</Typography>
            <Typography variant="body2" color="text.secondary">{priceData?.name}</Typography>
          </Box>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {priceData && (
          <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={2}>
            <Typography variant="h4">₺{priceData.price.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}</Typography>
            <Chip 
              label={
                loading 
                  ? '...' 
                  : rangeChange
                    ? `${rangeChange.percent >= 0 ? '+' : ''}${rangeChange.percent.toFixed(2)}%`
                    : `${priceData.changePercent >= 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%`
              }
              color={
                loading 
                  ? 'default' 
                  : rangeChange
                    ? (rangeChange.percent >= 0 ? 'success' : 'error')
                    : (priceData.changePercent >= 0 ? 'success' : 'error')
              }
              disabled={loading}
            />
          </Box>
        )}
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <ToggleButtonGroup value={range} exclusive onChange={handleRangeChange} size="small">
            {
              (holding?.type === 'STOCK' || holding?.symbol === 'GAUTRY')
                ? [
                    <ToggleButton key="1d" value="1d">1G</ToggleButton>,
                    <ToggleButton key="1w" value="1w">1H</ToggleButton>,
                    <ToggleButton key="1mo" value="1mo">1A</ToggleButton>,
                    <ToggleButton key="3mo" value="3mo">3A</ToggleButton>,
                    <ToggleButton key="6mo" value="6mo">6A</ToggleButton>,
                    <ToggleButton key="1y" value="1y">1Y</ToggleButton>,
                    <ToggleButton key="5y" value="5y">5Y</ToggleButton>,
                  ]
                : [
                    <ToggleButton key="1w" value="1w">1H</ToggleButton>,
                    <ToggleButton key="1mo" value="1mo">1A</ToggleButton>,
                    <ToggleButton key="3mo" value="3mo">3A</ToggleButton>,
                  ]
            }
          </ToggleButtonGroup>
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ height: 400 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12 }} domain={['dataMin', 'dataMax']}/>
                <Tooltip formatter={formatTooltip} />
                <Legend />
                <Line type="monotone" dataKey="price" name="Fiyat" stroke="#8884d8" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};
