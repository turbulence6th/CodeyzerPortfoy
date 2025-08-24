import React, { useState } from 'react';
import { 
  Grid, 
  Box, 
  Fab
} from '@mui/material';
import { MdAdd as AddIcon } from 'react-icons/md';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { usePrices } from '../hooks/usePrices';
import { useBackButton } from '../hooks/useBackButton';
import { updateHolding, removeHolding, addHolding } from '../store/portfolioSlice';
import { PortfolioSummary } from '../components/PortfolioSummary';
import { HoldingsList } from '../components/HoldingsList';
import { AddHoldingDialog } from '../components/AddHoldingDialog';
import { EditHoldingDialog } from '../components/EditHoldingDialog';
import { DeleteHoldingDialog } from '../components/DeleteHoldingDialog';
import { PullToRefresh } from '../components/PullToRefresh';
import type { Holding } from '../models/types';

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

  // usePrices hook'u artık sadece fiyatları çekme mantığını yönetiyor.
  usePrices(holdings);

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

  const { totalValue, dailyChange } = holdings.reduce(
    (acc, holding) => {
      const priceData = prices[holding.symbol];
      if (priceData) {
        acc.totalValue += priceData.price * holding.amount;
        acc.dailyChange += priceData.change * holding.amount;
      } else {
        // Fiyat henüz yüklenmediyse veya bulunamadıysa uyarı ver
        // console.warn(`${holding.symbol} için fiyat bulunamadı!`);
      }
      return acc;
    },
    { totalValue: 0, dailyChange: 0 }
  );

  // Toplam portföyün dünkü değerini hesapla
  const previousDayTotalValue = totalValue - dailyChange;
  
  // Yüzdesel değişimi toplam değere göre hesapla
  const finalDailyChangePercent = previousDayTotalValue !== 0 
    ? (dailyChange / previousDayTotalValue) * 100 
    : 0;


  const handleAddHolding = (holding: Holding) => {
    dispatch(addHolding(holding));
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
            dailyChangePercent={finalDailyChangePercent}
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