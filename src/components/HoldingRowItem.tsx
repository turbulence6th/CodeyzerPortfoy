import React, { useState } from 'react';
import { 
  Box, IconButton, Chip, Skeleton, Menu,
  MenuItem, ListItemIcon, ListItemText, Tooltip, Typography
} from '@mui/material';
import {
  MdEdit as EditIcon,
  MdDelete as DeleteIcon,
  MdAssessment as AssessmentIcon,
  MdMoreVert as MoreVertIcon,
  MdErrorOutline as ErrorOutlineIcon,
  MdCloudDone as CloudDoneIcon,
  MdCloudDownload as CloudDownloadIcon,
  MdEventBusy as StaleDateIcon,
} from 'react-icons/md';
import type { Holding, PriceData } from '../models/types';

interface HoldingRowItemProps {
  holding: Holding;
  priceData?: PriceData;
  isLast: boolean;
  isUpdating: boolean;
  categories: { name: string; color: string; chartName: string }[];
  onEdit: (h: Holding) => void;
  onDelete: (h: Holding) => void;
  onOpenAnalysis: (h: Holding) => void;
  onOpenDetail: (h: Holding) => void;
}

export const HoldingRowItem: React.FC<HoldingRowItemProps> = ({ 
  holding, 
  priceData, 
  isLast, 
  isUpdating,
  categories,
  onEdit, 
  onDelete, 
  onOpenAnalysis,
  onOpenDetail
}) => {
  const { symbol, amount, note } = holding;
  const isPositive = (priceData?.changePercent ?? 0) >= 0;
  
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
    setAnchorEl(null);
  };

  const handleMenuItemClick = (action: () => void) => {
    action();
    handleMenuClose();
  };
  
  return (
    <Box
      sx={{
        position: 'relative',
        borderBottom: isLast ? 'none' : '1px solid',
        borderColor: isLast ? 'transparent' : 'rgba(128, 128, 128, 0.12)',
        display: 'flex',
        alignItems: 'center',
        pr: 1,
        transition: 'background-color 0.15s ease',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'flex-start', sm: 'space-between' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          py: { xs: 1.25, sm: 1.5 },
          pl: { xs: 2, sm: 2.5 },
          pr: { xs: 1, sm: 2 },
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
          {categories.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {categories.map((category, index) => (
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
        {(holding.type === 'STOCK' || holding.type === 'FUND' || holding.symbol === 'GAUTRY') && (
          <MenuItem onClick={() => handleMenuItemClick(() => onOpenDetail(holding))}>
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
