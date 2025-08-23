import React, { useState } from 'react';
import { 
  Grid, Paper, Typography, Box, IconButton, Accordion,
  AccordionSummary, AccordionDetails, Chip, Skeleton, Menu,
  MenuItem, ListItemIcon, ListItemText, Tooltip
} from '@mui/material';
import {
  MdEdit as EditIcon,
  MdDelete as DeleteIcon,
  MdExpandMore as ExpandMoreIcon,
  MdAssessment as AssessmentIcon,
  MdMoreVert as MoreVertIcon,
  MdErrorOutline as ErrorOutlineIcon,
  MdCloudDone as CloudDoneIcon,
  MdCloudDownload as CloudDownloadIcon,
  MdEventBusy as StaleDateIcon,
} from 'react-icons/md';
import type { Holding, AssetType, PriceData, CategoryChart } from '../models/types';
import { StockAnalysisDialog } from './StockAnalysisDialog';
import { AssetDetailDialog } from './AssetDetailDialog';
import { useAppSelector } from '../hooks/redux';
import { useBackButton } from '../hooks/useBackButton';

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
    if (holding.type === 'STOCK' || holding.type === 'FUND') {
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

  const RowItem: React.FC<{
    holding: Holding;
    isLast: boolean;
    priceData: PriceData | undefined;
    onEdit: (h: Holding) => void;
    onDelete: (h: Holding) => void;
    onOpenAnalysis: (h: Holding) => void;
  }> = ({ holding, priceData, onEdit, onDelete, onOpenAnalysis, isLast }) => {
    const { symbol, amount, note } = holding;
    const isUpdating = updatingSymbols.includes(symbol);
    const isPositive = (priceData?.changePercent ?? 0) >= 0;
    const holdingCategories = getHoldingCategories(holding.id);
    
    // Eğer anlık fiyat 0 ise ve önceki günün fiyatı varsa, onu kullan
    const priceToUse = (priceData?.price === 0 && priceData.previousClose)
      ? priceData.previousClose
      : priceData?.price;

    // Each row now manages its own menu state
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const isMenuOpen = Boolean(anchorEl);

    // Veri Kaynağı İkonu
    const sourceIcon = priceData?.source ? (
      <Tooltip title={priceData.source === 'cache' ? 'Fiyat önbellekten alındı' : 'Fiyat anlık olarak çekildi'}>
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
          {priceData.source === 'cache' ? <CloudDoneIcon size="0.9rem" /> : <CloudDownloadIcon size="0.9rem" />}
        </Box>
      </Tooltip>
    ) : null;

    // Eski Tarih Uyarısı İkonu
    const todayStr = new Date().toISOString().split('T')[0];
    const isStalePrice = holding.type === 'FUND' && priceData?.priceDate && priceData.priceDate !== todayStr;
    const staleDateIcon = isStalePrice ? (
      <Tooltip title={`Bu fiyat ${new Date(priceData.priceDate!).toLocaleDateString('tr-TR')} tarihine aittir`}>
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'warning.main' }}>
          <StaleDateIcon size="0.9rem" />
        </Box>
      </Tooltip>
    ) : null;

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
      // event.stopPropagation() is not needed here as onClose is for backdrop/escape
      setAnchorEl(null);
    };

    const handleMenuItemClick = (action: () => void) => {
      action();
      handleMenuClose();
    };
    
    return (
      <Box
        key={holding.id}
        sx={{
          position: 'relative',
          borderBottom: isLast ? 'none' : '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          // cursor: (holding.type === 'STOCK' || holding.type === 'FUND') ? 'pointer' : 'default', // Satır tıklaması kaldırıldı
          '&:hover': {
            // backgroundColor: (holding.type === 'STOCK' || holding.type === 'FUND') ? 'action.hover' : 'transparent', // Hover efekti kaldırıldı
          },
          display: 'flex',
          alignItems: 'center',
          pr: 1,
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: { xs: 'flex-start', sm: 'space-between' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            py: { xs: 0.5, sm: 1 },
            pl: { xs: 1.5, sm: 2.5 },
            pr: { xs: 0.75, sm: 2 },
            gap: { xs: 0.5, sm: 0 },
          }}
        >
          {/* Left Side */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography variant="subtitle1" fontWeight="medium">{symbol}</Typography>
              {sourceIcon}
              {staleDateIcon}
            </Box>
            {priceData?.name && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', mb: 0.25 }}>
                {priceData.name}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {amount} adet
              {priceData && !priceData.error && priceToUse && (
                <> • ₺{priceToUse.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} birim fiyat</>
              )}
            </Typography>
            {holdingCategories.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {holdingCategories.map((category, index) => (
                  <Chip key={index} label={category.name} size="small"
                    sx={{
                      backgroundColor: category.color,
                      color: 'white',
                      fontSize: '0.7rem',
                      height: '20px',
                      '& .MuiChip-label': { padding: '0 6px' }
                    }}
                    title={`${category.chartName} grafiğindeki ${category.name} kategorisi`}
                  />
                ))}
              </Box>
            )}
            {note && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic', mt: 0.25 }}>
                {note}
              </Typography>
            )}
          </Box>
          {/* Right Side */}
          <Box sx={{ flex: { xs: '0 0 auto', sm: '0 0 120px', md: '0 0 140px' }, textAlign: { xs: 'left', sm: 'right' }, mt: { xs: 0, sm: -0.25 } }}>
            {isUpdating ? (
              <>
                <Skeleton variant="text" width={80} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width={50} />
              </>
            ) : priceData?.error ? (
                <Tooltip title={priceData.error} arrow>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, gap: 0.5, color: 'error.main' }}>
                    <ErrorOutlineIcon size="1rem" />
                    <Typography variant="subtitle1" color="error" fontWeight="medium">
                      Hata
                    </Typography>
                  </Box>
                </Tooltip>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, gap: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    ₺{(priceToUse ? priceToUse * amount : 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
                {priceData && (
                  <Typography variant="body2" color={isPositive ? 'success.main' : 'error.main'}>
                    {isPositive ? '+' : ''}{priceData.changePercent.toFixed(2)}%
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Box>
        <IconButton
          aria-label="daha fazla"
          onClick={handleMenuOpen}
          size="small"
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={isMenuOpen}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()} // Prevent menu clicks from triggering row click
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {holding.type === 'STOCK' && (
            <MenuItem onClick={() => handleMenuItemClick(() => onOpenAnalysis(holding))}>
              <ListItemIcon><AssessmentIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Analiz</ListItemText>
            </MenuItem>
          )}
          {(holding.type === 'STOCK' || holding.type === 'FUND') && (
            <MenuItem onClick={() => handleMenuItemClick(() => handleOpenDetail(holding))}>
              <ListItemIcon><AssessmentIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Grafiği Görüntüle</ListItemText>
            </MenuItem>
          )}
          <MenuItem onClick={() => handleMenuItemClick(() => onEdit(holding))}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Düzenle</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleMenuItemClick(() => onDelete(holding))}>
            <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Sil</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    );
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
              sx={{ mb: 2, '&:before': { display: 'none' }, boxShadow: 1, borderRadius: 2, overflow: 'hidden' }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiAccordionSummary-content': { alignItems: 'center' },
                  '&:hover': { backgroundColor: 'primary.dark' }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', mr: { xs: 0, sm: 2 } }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                    {typeLabels[type]} ({typeHoldings.length})
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: '0 0 140px', textAlign: 'right', fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                    ₺{categoryTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {typeHoldings.map((holding, index) => {
                  const priceData = prices[holding.symbol];
                  return (
                    <RowItem
                      key={holding.id}
                      holding={holding}
                      isLast={index === typeHoldings.length - 1}
                      priceData={priceData}
                      onEdit={onEditHolding}
                      onDelete={onDeleteHolding}
                      onOpenAnalysis={handleOpenAnalysis}
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