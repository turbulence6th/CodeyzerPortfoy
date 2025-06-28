import React, { useState } from 'react';
import { 
  Grid, 
  Box, 
  Fab
} from '@mui/material';
import { MdAdd as AddIcon } from 'react-icons/md';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { usePrices } from '../hooks/usePrices';
import { updateHolding, removeHolding, addHolding } from '../store/portfolioSlice';
import { PortfolioSummary } from '../components/PortfolioSummary';
import { HoldingsList } from '../components/HoldingsList';
import { AddHoldingDialog } from '../components/AddHoldingDialog';
import { EditHoldingDialog } from '../components/EditHoldingDialog';
import { DeleteHoldingDialog } from '../components/DeleteHoldingDialog';
import type { Holding } from '../models/types';

export const Dashboard: React.FC = () => {
  const holdings = useAppSelector((state) => state.portfolio.holdings);
  const categoryCharts = useAppSelector((state) => state.category.charts);
  const dispatch = useAppDispatch();

  const { prices, loading, error, lastUpdate } = usePrices(holdings);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);

  const totalValue = holdings.reduce((total, holding) => {
    const priceData = prices[holding.symbol];
    return total + (priceData ? priceData.price * holding.amount : 0);
  }, 0);

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

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        {/* Portföy Özeti */}
        <PortfolioSummary
          totalValue={totalValue}
          holdingsCount={holdings.length}
          loading={loading}
          error={error}
          lastUpdate={lastUpdate}
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
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedHolding(null);
        }}
        onUpdateHolding={handleUpdateHolding}
      />

      <DeleteHoldingDialog
        open={deleteDialogOpen}
        holding={selectedHolding}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedHolding(null);
        }}
        onDeleteHolding={handleConfirmDelete}
      />
    </Box>
  );
}; 