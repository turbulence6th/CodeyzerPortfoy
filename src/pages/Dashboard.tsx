import React, { useState, useEffect } from 'react';
import {
  Grid,
  Box,
  Fab
} from '@mui/material';
import { MdAdd as AddIcon } from 'react-icons/md';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { useBackButton } from '../hooks/useBackButton';
import { updateHolding, removeHolding, addHolding, selectPortfolioSummary, updatePriceData, setPriceCacheItem } from '../store/portfolioSlice';
import { PortfolioSummary } from '../components/PortfolioSummary';
import { HoldingsList } from '../components/HoldingsList';
import { AddHoldingDialog } from '../components/AddHoldingDialog';
import { EditHoldingDialog } from '../components/EditHoldingDialog';
import { DeleteHoldingDialog } from '../components/DeleteHoldingDialog';
import { PullToRefresh } from '../components/PullToRefresh';
import { sendHoldingsToWatch, prepareHoldingsForWatch } from '../api/watchService';
import type { Holding, PriceData } from '../models/types';

interface DashboardProps {
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onRefresh }) => {
  const dispatch = useAppDispatch();
  const {
    holdings,
    prices,
    loading,
    totalDebt,
  } = useAppSelector((state) => state.portfolio);
  const categoryCharts = useAppSelector((state) => state.category.charts);
  const { totalValue, dailyChange, dailyChangePercent } = useAppSelector(selectPortfolioSummary);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  // Geri tuşu yönetimi
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedHolding(null);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedHolding(null);
  };

  useBackButton(() => setAddDialogOpen(false), addDialogOpen);
  useBackButton(handleCloseEditDialog, editDialogOpen);
  useBackButton(handleCloseDeleteDialog, deleteDialogOpen);

  // Apple Watch'a holdings listesini gönder (varlık eklendiğinde/değiştiğinde)
  useEffect(() => {
    if (holdings.length > 0) {
      const watchHoldings = prepareHoldingsForWatch(holdings);
      sendHoldingsToWatch(watchHoldings).catch(() => {
        // Hata durumunda sessizce devam et
      });
    }
  }, [holdings]);

  const handleAddHolding = (holding: Holding, initialPriceData?: PriceData) => {
    dispatch(addHolding(holding));
    
    if (initialPriceData) {
      // Validasyon sırasında alınan veriyi direkt kullan (tekrar fetch etmemek için)
      dispatch(updatePriceData(initialPriceData));
      
      // Cache'e de ekle ki usePrices hook'u bu veriyi görsün
      if (initialPriceData.price !== 0 && !initialPriceData.error) {
        dispatch(setPriceCacheItem({
          symbol: holding.symbol,
          item: { data: initialPriceData, timestamp: Date.now() }
        }));
      }
    }
  };

  const handleEditHolding = (holding: Holding) => {
    setSelectedHolding(holding);
    setEditDialogOpen(true);
  };

  const handleUpdateHolding = (id: string, updates: Partial<Holding>) => {
    dispatch(updateHolding({ id, updates }));
    setEditDialogOpen(false);
    setSelectedHolding(null);
  };

  const handleDeleteHolding = (holding: Holding) => {
    setSelectedHolding(holding);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = (id: string) => {
    dispatch(removeHolding(id));
    setDeleteDialogOpen(false);
    setSelectedHolding(null);
  };
  
  const handleRefresh = async () => {
    onRefresh();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <Box sx={{ flexGrow: 1 }}>
        <Grid container spacing={3}>
          {/* Portföy Özeti */}
          <PortfolioSummary
            totalValue={totalValue}
            dailyChange={dailyChange}
            dailyChangePercent={dailyChangePercent}
            loading={loading}
            totalDebt={totalDebt}
          />

          {/* Portföy Detayları */}
          <Grid size={{ xs: 12 }}>
            <HoldingsList
              holdings={holdings}
              prices={prices}
              categoryCharts={categoryCharts}
              onEditHolding={handleEditHolding}
              onDeleteHolding={handleDeleteHolding}
            />
          </Grid>
        </Grid>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 88,
            right: 16,
          }}
          onClick={() => setAddDialogOpen(true)}
        >
          <AddIcon />
        </Fab>

        {/* Dialogs */}
        <AddHoldingDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onAddHolding={handleAddHolding}
        />

        <EditHoldingDialog
          open={editDialogOpen}
          holding={selectedHolding}
          onClose={handleCloseEditDialog}
          onUpdateHolding={handleUpdateHolding}
        />

        <DeleteHoldingDialog
          open={deleteDialogOpen}
          holding={selectedHolding}
          onClose={handleCloseDeleteDialog}
          onDeleteHolding={handleConfirmDelete}
        />
      </Box>
    </PullToRefresh>
  );
}; 