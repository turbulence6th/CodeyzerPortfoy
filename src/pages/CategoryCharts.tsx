import React, { useState } from 'react';
import { Box, Fab } from '@mui/material';
import { MdAdd as AddIcon } from 'react-icons/md';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { usePrices } from '../hooks/usePrices';
import { addChart, removeChart, updateChart } from '../store/categorySlice';
import { CategoryChartsList } from '../components/CategoryChartsList';
import { AddCategoryChartDialog } from '../components/AddCategoryChartDialog';
import { EditCategoryChartDialog } from '../components/EditCategoryChartDialog';
import { DeleteCategoryChartDialog } from '../components/DeleteCategoryChartDialog';
import type { CategoryChart as CategoryChartType } from '../models/types';

export const CategoryCharts: React.FC = () => {
  const holdings = useAppSelector((state) => state.portfolio.holdings);
  const charts = useAppSelector((state) => state.category.charts);
  const dispatch = useAppDispatch();

  const { prices } = usePrices(holdings);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<CategoryChartType | null>(null);

  const handleAddChart = (chart: CategoryChartType) => {
    dispatch(addChart(chart));
  };

  const handleEditChart = (chartId: string) => {
    const chart = charts.find(c => c.id === chartId);
    if (chart) {
      setSelectedChart(chart);
      setEditDialogOpen(true);
    }
  };

  const handleUpdateChart = (chartId: string, updates: Partial<CategoryChartType>) => {
    dispatch(updateChart({ id: chartId, updates }));
    setEditDialogOpen(false);
    setSelectedChart(null);
  };

  const handleDeleteChart = (chartId: string) => {
    const chart = charts.find(c => c.id === chartId);
    if (chart) {
      setSelectedChart(chart);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = (chartId: string) => {
    dispatch(removeChart(chartId));
    setDeleteDialogOpen(false);
    setSelectedChart(null);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <CategoryChartsList
        charts={charts}
        holdings={holdings}
        prices={prices}
        onDeleteChart={handleDeleteChart}
        onEditChart={handleEditChart}
      />

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add-chart"
        sx={{
          position: 'fixed',
          bottom: 88,
          right: 16,
        }}
        onClick={() => setAddDialogOpen(true)}
        disabled={holdings.length === 0}
      >
        <AddIcon />
      </Fab>

      {/* Dialogs */}
      <AddCategoryChartDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAddChart={handleAddChart}
        holdings={holdings}
      />

      <EditCategoryChartDialog
        open={editDialogOpen}
        chart={selectedChart}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedChart(null);
        }}
        onUpdateChart={handleUpdateChart}
        holdings={holdings}
      />

      <DeleteCategoryChartDialog
        open={deleteDialogOpen}
        chart={selectedChart}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedChart(null);
        }}
        onDeleteChart={handleConfirmDelete}
      />
    </Box>
  );
}; 