import React from 'react';
import { Paper, Typography, Box, Chip } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { CategoryChart as CategoryChartType, Holding, PriceData, CategoryChartData } from '../models/types';

interface CategoryChartProps {
  chart: CategoryChartType;
  holdings: Holding[];
  prices: Record<string, PriceData>;
}

export const CategoryChart: React.FC<CategoryChartProps> = ({
  chart,
  holdings,
  prices
}) => {
  // Kategori bazlı toplam değerleri hesapla
  const calculateCategoryData = (): CategoryChartData[] => {
    const categoryValues = chart.categories.map(category => {
      const categoryValue = category.holdingIds.reduce((total, holdingId) => {
        const holding = holdings.find(h => h.id === holdingId);
        if (holding) {
          const priceData = prices[holding.symbol];
          return total + (priceData ? priceData.price * holding.amount : 0);
        }
        return total;
      }, 0);

      return {
        name: category.name,
        value: categoryValue,
        percentage: 0, // Hesaplanacak
        color: category.color
      };
    });

    // Kategoriye atanmamış varlıklar
    const assignedHoldingIds = new Set(
      chart.categories.flatMap(cat => cat.holdingIds)
    );
    
    const unassignedValue = holdings.reduce((total, holding) => {
      if (!assignedHoldingIds.has(holding.id)) {
        const priceData = prices[holding.symbol];
        return total + (priceData ? priceData.price * holding.amount : 0);
      }
      return total;
    }, 0);

    // Kategoriye atanmamış varlıklar varsa ve grafik ayarı açıksa ekle
    if (chart.includeUncategorized && unassignedValue > 0) {
      categoryValues.push({
        name: 'Kategorisiz',
        value: unassignedValue,
        percentage: 0,
        color: '#9e9e9e' // Gri renk
      });
    }

    // Toplam değer
    const totalValue = categoryValues.reduce((sum, cat) => sum + cat.value, 0);

    // Yüzdeleri hesapla
    return categoryValues.map(cat => ({
      ...cat,
      percentage: totalValue > 0 ? (cat.value / totalValue * 100) : 0
    })).filter(cat => cat.value > 0); // Sadece değeri olan kategorileri göster
  };

  const chartData = calculateCategoryData();

  // Dinamik yükseklik hesaplama
  const calculateChartHeight = () => {
    const baseHeight = 240; // Grafik alanı için yükseklik
    const legendItemHeight = 14; // Her legend item için gereken yükseklik
    const legendPadding = 15; // Legend için minimum padding
    
    // Kategori sayısına göre legend yüksekliği hesapla
    const legendHeight = Math.max(30, chartData.length * legendItemHeight + legendPadding);
    
    return baseHeight + legendHeight;
  };

  const totalChartHeight = calculateChartHeight();
  const legendHeight = Math.max(30, chartData.length * 14 + 15);

  // Veri yoksa boş durum göster
  if (chartData.length === 0) {
    return (
      <Paper sx={{ p: 3, minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box textAlign="center">
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {chart.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bu grafik için veri bulunmuyor
          </Typography>
        </Box>
      </Paper>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
            boxShadow: 2
          }}
        >
          <Typography variant="body2" fontWeight="medium">
            {data.name}
          </Typography>
          <Typography variant="body2" color="primary">
            ₺{data.value.toLocaleString('tr-TR', { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            %{data.percentage.toFixed(1)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          {chart.name}
        </Typography>
        <Chip 
          label={`${chart.categories.length} kategori`} 
          size="small" 
          variant="outlined" 
        />
      </Box>
      
      {chart.description && (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {chart.description}
        </Typography>
      )}
      
      <Box sx={{ height: `${totalChartHeight}px`, mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              animationDuration={300}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom"
              height={legendHeight}
              wrapperStyle={{
                paddingTop: '0px',
                paddingBottom: '0px',
                fontSize: '10px',
                lineHeight: '12px',
                margin: '0px'
              }}
              formatter={(value, entry: any) => (
                <span style={{ color: entry.color, fontSize: '10px' }}>
                  {value} - ₺{entry.payload.value.toLocaleString('tr-TR', { 
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0 
                  })} (%{entry.payload.percentage.toFixed(1)})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}; 