import React, { useState } from 'react';
import { 
  Grid, Paper, Typography, Box, Accordion,
  AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  MdExpandMore as ExpandMoreIcon,
} from 'react-icons/md';
import type { Holding, AssetType, PriceData, CategoryChart } from '../models/types';
import { StockAnalysisDialog } from './StockAnalysisDialog';
import { AssetDetailDialog } from './AssetDetailDialog';
import { useAppSelector } from '../hooks/redux';
import { useBackButton } from '../hooks/useBackButton';
import { useTheme } from '../contexts/ThemeContext';
import { HoldingRowItem } from './HoldingRowItem';

interface HoldingsListProps {
  holdings: Holding[];
  prices: Record<string, PriceData>;
  categoryCharts?: CategoryChart[];
  onEditHolding: (holding: Holding) => void;
  onDeleteHolding: (holding: Holding) => void;
}

export const HoldingsList: React.FC<HoldingsListProps> = ({
  holdings,
  prices,
  categoryCharts = [],
  onEditHolding,
  onDeleteHolding
}) => {
  const updatingSymbols = useAppSelector((state) => state.portfolio.updatingSymbols);
  const { isDarkMode } = useTheme();
  const [expandedPanels, setExpandedPanels] = useState<string[]>(['CURRENCY', 'STOCK', 'FUND']);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  const handleCloseAnalysis = () => {
    setAnalysisDialogOpen(false);
    setSelectedHolding(null);
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedHolding(null);
  };

  // Mobil Geri Tuşu için genel hook kullanımı
  useBackButton(handleCloseAnalysis, analysisDialogOpen);
  useBackButton(handleCloseDetail, detailDialogOpen);

  const handleOpenAnalysis = (holding: Holding) => {
    setSelectedHolding(holding);
    setAnalysisDialogOpen(true);
  };

  const handleOpenDetail = (holding: Holding) => {
    if (holding.type === 'STOCK' || holding.type === 'FUND' || holding.symbol === 'GAUTRY') {
      setSelectedHolding(holding);
      setDetailDialogOpen(true);
    }
  };
  
  const handlePanelChange = (panel: string) => {
    setExpandedPanels(prev => 
      prev.includes(panel) 
        ? prev.filter(p => p !== panel)
        : [...prev, panel]
    );
  };

  const getHoldingCategories = (holdingId: string) => {
    const categories: { name: string; color: string; chartName: string }[] = [];
    categoryCharts.forEach(chart => {
      chart.categories.forEach(category => {
        if (category.holdingIds.includes(holdingId)) {
          categories.push({
            name: category.name,
            color: category.color,
            chartName: chart.name
          });
        }
      });
    });
    return categories;
  };

  if (holdings.length === 0) {
    return (
      <Grid size={{ xs: 12 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Portföy Detayları</Typography>
          <Typography variant="body1" color="text.secondary">
            Henüz varlık eklenmemiş. Sağ alttaki "+" butonunu kullanarak varlık ekleyebilirsiniz.
          </Typography>
        </Paper>
      </Grid>
    );
  }

  const typeLabels: Record<AssetType, string> = {
    CURRENCY: 'Döviz',
    STOCK: 'Hisse Senedi', 
    FUND: 'Fon',
    COMMODITY: 'Emtia'
  };

  const typeOrder: AssetType[] = ['CURRENCY', 'STOCK', 'FUND'];

  const groupedHoldings = holdings.reduce((groups, holding) => {
    const type = holding.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(holding);
    return groups;
  }, {} as Record<AssetType, Holding[]>);

  Object.keys(groupedHoldings).forEach(type => {
    groupedHoldings[type as AssetType].sort((a, b) => a.symbol.localeCompare(b.symbol));
  });

  const calculateCategoryTotal = (typeHoldings: Holding[]) => {
    return typeHoldings.reduce((total, holding) => {
      const priceData = prices[holding.symbol];
      // Eğer anlık fiyat 0 ise ve önceki günün fiyatı varsa, onu kullan
      const priceToUse = (priceData?.price === 0 && priceData.previousClose)
        ? priceData.previousClose
        : priceData?.price;
      const value = priceToUse ? priceToUse * holding.amount : 0;
      return total + value;
    }, 0);
  };

  return (
    <Grid size={{ xs: 12 }}>
      <Box>
        {typeOrder.map(type => {
          const typeHoldings = groupedHoldings[type];
          if (!typeHoldings || typeHoldings.length === 0) return null;
          const categoryTotal = calculateCategoryTotal(typeHoldings);
          const isExpanded = expandedPanels.includes(type);
          return (
            <Accordion key={type} expanded={isExpanded} onChange={() => handlePanelChange(type)}
              sx={{ mb: 2, overflow: 'hidden' }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}
                sx={{
                  background: isDarkMode
                    ? 'linear-gradient(135deg, rgba(255, 171, 0, 0.15) 0%, rgba(255, 143, 0, 0.08) 100%)'
                    : 'linear-gradient(135deg, rgba(230, 81, 0, 0.12) 0%, rgba(255, 109, 0, 0.06) 100%)',
                  color: 'text.primary',
                  '& .MuiAccordionSummary-content': { alignItems: 'center' },
                  '& .MuiAccordionSummary-expandIconWrapper': {
                    color: isDarkMode ? '#FFAB00' : '#E65100'
                  },
                  borderBottom: '1px solid',
                  borderColor: isDarkMode
                    ? 'rgba(255, 171, 0, 0.15)'
                    : 'rgba(230, 81, 0, 0.1)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: { xs: 0, sm: 2 } }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                    {typeLabels[type]}
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                      ({typeHoldings.length})
                    </Typography>
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ flex: '0 0 140px', textAlign: 'right', fontSize: { xs: '0.95rem', sm: '1rem' } }}>
                    ₺{categoryTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, py: 0.5 }}>
                {typeHoldings.map((holding, index) => {
                  const priceData = prices[holding.symbol];
                  return (
                    <HoldingRowItem
                      key={holding.id}
                      holding={holding}
                      isLast={index === typeHoldings.length - 1}
                      priceData={priceData}
                      isUpdating={updatingSymbols.includes(holding.symbol)}
                      categories={getHoldingCategories(holding.id)}
                      onEdit={onEditHolding}
                      onDelete={onDeleteHolding}
                      onOpenAnalysis={handleOpenAnalysis}
                      onOpenDetail={handleOpenDetail}
                    />
                  );
                })}
              </AccordionDetails>
            </Accordion>
          );
        }).filter(Boolean)}
      </Box>

      <StockAnalysisDialog
        open={analysisDialogOpen}
        onClose={handleCloseAnalysis}
        symbol={selectedHolding?.symbol ?? null}
      />
      <AssetDetailDialog
        open={detailDialogOpen}
        onClose={handleCloseDetail}
        holding={selectedHolding}
        priceData={selectedHolding ? prices[selectedHolding.symbol] : null}
      />
    </Grid>
  );
}; 