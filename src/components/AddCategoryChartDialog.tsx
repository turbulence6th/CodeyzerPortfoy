import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { MdAdd as AddIcon, MdDelete as DeleteIcon } from 'react-icons/md';
import { v4 as uuidv4 } from 'uuid';
import type { CategoryChart as CategoryChartType, Category, Holding } from '../models/types';

interface AddCategoryChartDialogProps {
  open: boolean;
  onClose: () => void;
  onAddChart: (chart: CategoryChartType) => void;
  holdings: Holding[];
}

// Önceden tanımlı renkler
const PREDEFINED_COLORS = [
  '#1976d2', '#ff9800', '#4caf50', '#f44336', '#9c27b0',
  '#2196f3', '#ff5722', '#8bc34a', '#e91e63', '#673ab7',
  '#03a9f4', '#ffc107', '#cddc39', '#607d8b', '#795548'
];

export const AddCategoryChartDialog: React.FC<AddCategoryChartDialogProps> = ({
  open,
  onClose,
  onAddChart,
  holdings
}) => {
  const [chartName, setChartName] = useState('');
  const [chartDescription, setChartDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedHoldings, setSelectedHoldings] = useState<Holding[]>([]);
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0]);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClose = () => {
    // Formu temizle
    setChartName('');
    setChartDescription('');
    setCategories([]);
    setNewCategoryName('');
    setSelectedHoldings([]);
    setSelectedColor(PREDEFINED_COLORS[0]);
    onClose();
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() === '') return;

    const newCategory: Category = {
      id: uuidv4(),
      name: newCategoryName.trim(),
      color: selectedColor,
      holdingIds: selectedHoldings.map(h => h.id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    setSelectedHoldings([]);
    
    // Bir sonraki kategori için farklı renk seç
    const nextColorIndex = (categories.length + 1) % PREDEFINED_COLORS.length;
    setSelectedColor(PREDEFINED_COLORS[nextColorIndex]);
  };

  const handleRemoveCategory = (categoryId: string) => {
    setCategories(categories.filter(cat => cat.id !== categoryId));
  };

  const handleCreateChart = () => {
    if (chartName.trim() === '' || categories.length === 0) return;

    const newChart: CategoryChartType = {
      id: uuidv4(),
      name: chartName.trim(),
      description: chartDescription.trim() || undefined,
      categories: categories,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAddChart(newChart);
    handleClose();
  };

  const handleColorChange = (event: SelectChangeEvent) => {
    setSelectedColor(event.target.value);
  };

  // Kategorilerde kullanılmayan varlıkları filtrele
  const getAvailableHoldings = (): Holding[] => {
    const usedHoldingIds = new Set(
      categories.flatMap(cat => cat.holdingIds)
    );
    return holdings.filter(holding => !usedHoldingIds.has(holding.id));
  };

  const availableHoldings = getAvailableHoldings();

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle>Yeni Kategori Grafiği Oluştur</DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* Grafik Bilgileri */}
          <Box>
            <TextField
              fullWidth
              label="Grafik Adı"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              placeholder="ör. Yatırım Dağılımı"
              required
            />
            <TextField
              fullWidth
              label="Açıklama (Opsiyonel)"
              value={chartDescription}
              onChange={(e) => setChartDescription(e.target.value)}
              placeholder="Bu grafik hakkında kısa açıklama"
              sx={{ mt: 2 }}
              multiline
              rows={2}
            />
          </Box>

          {/* Kategoriler */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Kategoriler ({categories.length})
            </Typography>
            
            {/* Mevcut kategoriler */}
            {categories.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {categories.map((category) => (
                  <Chip
                    key={category.id}
                    label={`${category.name} (${category.holdingIds.length} varlık)`}
                    sx={{ 
                      backgroundColor: category.color + '20',
                      color: category.color,
                      fontWeight: 'medium'
                    }}
                    onDelete={() => handleRemoveCategory(category.id)}
                    deleteIcon={<DeleteIcon />}
                  />
                ))}
              </Box>
            )}

            {/* Yeni kategori ekleme */}
            <Box sx={{ 
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              backgroundColor: 'action.hover'
            }}>
              <Typography variant="subtitle2" gutterBottom>
                Yeni Kategori Ekle
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Kategori Adı"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="ör. Altın Yatırımları"
                />
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Renk</InputLabel>
                  <Select
                    value={selectedColor}
                    onChange={handleColorChange}
                    label="Renk"
                  >
                    {PREDEFINED_COLORS.map((color, index) => (
                      <MenuItem key={index} value={color}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1 
                        }}>
                          <Box sx={{ 
                            width: 16, 
                            height: 16, 
                            backgroundColor: color, 
                            borderRadius: '50%' 
                          }} />
                          Renk {index + 1}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Varlıkları Seç</InputLabel>
                  <Select<string[]>
                    multiple
                    value={selectedHoldings.map(h => h.id)}
                    onChange={(event) => {
                      const selectedIds = typeof event.target.value === 'string' 
                        ? [event.target.value] 
                        : event.target.value;
                      const newSelectedHoldings = selectedIds.map(id => 
                        availableHoldings.find(h => h.id === id)
                      ).filter(Boolean) as Holding[];
                      setSelectedHoldings(newSelectedHoldings);
                    }}
                    label="Varlıkları Seç"
                    renderValue={(selected) => {
                      if (selected.length === 0) {
                        return 'Kategoriye dahil edilecek varlıkları seçin';
                      }
                      return `${selected.length} varlık seçildi`;
                    }}
                  >
                    {availableHoldings.map((holding) => (
                      <MenuItem key={holding.id} value={holding.id}>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: 'flex-start', 
                          gap: 0.5,
                          width: '100%'
                        }}>
                          <Typography variant="body2" fontWeight="medium">
                            {holding.name} ({holding.symbol})
                          </Typography>
                          {holding.note && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              {holding.note}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddCategory}
                  disabled={newCategoryName.trim() === '' || selectedHoldings.length === 0}
                  size="small"
                >
                  Kategori Ekle
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Özet */}
          {categories.length > 0 && (
            <Box sx={{ 
              backgroundColor: 'primary.main', 
              color: 'primary.contrastText',
              p: 2, 
              borderRadius: 1 
            }}>
              <Typography variant="body2">
                <strong>Özet:</strong> {categories.length} kategori, toplam {categories.reduce((sum, cat) => sum + cat.holdingIds.length, 0)} varlık kategorize edildi.
                {availableHoldings.length > 0 && (
                  <span> {availableHoldings.length} varlık kategorisiz kalacak.</span>
                )}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>İptal</Button>
        <Button
          variant="contained"
          onClick={handleCreateChart}
          disabled={chartName.trim() === '' || categories.length === 0}
        >
          Grafik Oluştur
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 