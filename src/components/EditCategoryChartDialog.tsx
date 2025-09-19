import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { 
  MdAdd as AddIcon, 
  MdDelete as DeleteIcon, 
  MdEdit as EditIcon,
  MdExpandMore as ExpandMoreIcon,
  MdSave as SaveIcon
} from 'react-icons/md';
import { v4 as uuidv4 } from 'uuid';
import type { CategoryChart as CategoryChartType, Category, Holding } from '../models/types';

interface EditCategoryChartDialogProps {
  open: boolean;
  chart: CategoryChartType | null;
  onClose: () => void;
  onUpdateChart: (chartId: string, updates: Partial<CategoryChartType>) => void;
  holdings: Holding[];
}

// Önceden tanımlı renkler
const PREDEFINED_COLORS = [
  '#1976d2', '#ff9800', '#4caf50', '#f44336', '#9c27b0',
  '#2196f3', '#ff5722', '#8bc34a', '#e91e63', '#673ab7',
  '#03a9f4', '#ff9800', '#cddc39', '#607d8b', '#795548'
];

export const EditCategoryChartDialog: React.FC<EditCategoryChartDialogProps> = ({
  open,
  chart,
  onClose,
  onUpdateChart,
  holdings
}) => {
  const [chartName, setChartName] = useState('');
  const [chartDescription, setChartDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedHoldings, setSelectedHoldings] = useState<Holding[]>([]);
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('');
  const [includeUncategorized, setIncludeUncategorized] = useState(true);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Dialog açıldığında verileri yükle
  useEffect(() => {
    if (chart && open) {
      setChartName(chart.name);
      setChartDescription(chart.description || '');
      setCategories([...chart.categories]);
      setIncludeUncategorized(chart.includeUncategorized ?? true);
    }
  }, [chart, open]);

  const handleClose = () => {
    // Editing state'lerini temizle
    setEditingCategory(null);
    setEditCategoryName('');
    setEditCategoryColor('');
    setNewCategoryName('');
    setSelectedHoldings([]);
    setSelectedColor(PREDEFINED_COLORS[0]);
    onClose();
  };

  const handleSaveChart = () => {
    if (!chart || chartName.trim() === '' || categories.length === 0) return;

    const updates: Partial<CategoryChartType> = {
      name: chartName.trim(),
      description: chartDescription.trim() || undefined,
      categories: categories,
      includeUncategorized: includeUncategorized,
      updatedAt: new Date().toISOString()
    };

    onUpdateChart(chart.id, updates);
    handleClose();
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
    const nextColorIndex = categories.length % PREDEFINED_COLORS.length;
    setSelectedColor(PREDEFINED_COLORS[nextColorIndex]);
  };

  const handleRemoveCategory = (categoryId: string) => {
    setCategories(categories.filter(cat => cat.id !== categoryId));
    if (editingCategory === categoryId) {
      setEditingCategory(null);
    }
  };

  const handleStartEditCategory = (category: Category) => {
    setEditingCategory(category.id);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color);
  };

  const handleSaveEditCategory = (categoryId: string) => {
    if (editCategoryName.trim() === '') return;

    setCategories(categories.map(cat => 
      cat.id === categoryId 
        ? { ...cat, name: editCategoryName.trim(), color: editCategoryColor, updatedAt: new Date().toISOString() }
        : cat
    ));
    setEditingCategory(null);
    setEditCategoryName('');
    setEditCategoryColor('');
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryName('');
    setEditCategoryColor('');
  };

  const handleUpdateCategoryHoldings = (categoryId: string, newHoldings: Holding[]) => {
    setCategories(categories.map(cat => 
      cat.id === categoryId 
        ? { ...cat, holdingIds: newHoldings.map(h => h.id), updatedAt: new Date().toISOString() }
        : cat
    ));
  };

  const handleColorChange = (event: SelectChangeEvent) => {
    setSelectedColor(event.target.value);
  };

  const handleEditColorChange = (event: SelectChangeEvent) => {
    setEditCategoryColor(event.target.value);
  };

  // Kategorilerde kullanılmayan varlıkları filtrele
  const getAvailableHoldings = (excludeCategoryId?: string): Holding[] => {
    const usedHoldingIds = new Set(
      categories.filter(cat => cat.id !== excludeCategoryId).flatMap(cat => cat.holdingIds)
    );
    return holdings.filter(holding => !usedHoldingIds.has(holding.id));
  };

  // Belirli bir kategorinin varlıklarını al
  const getCategoryHoldings = (categoryId: string): Holding[] => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return [];
    return holdings.filter(holding => category.holdingIds.includes(holding.id));
  };

  const availableHoldings = getAvailableHoldings();

  if (!chart) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle>Kategori Grafiğini Düzenle</DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          {/* Grafik Bilgileri */}
          <Box>
            <TextField
              fullWidth
              label="Grafik Adı"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Açıklama (Opsiyonel)"
              value={chartDescription}
              onChange={(e) => setChartDescription(e.target.value)}
              sx={{ mt: 2 }}
              multiline
              rows={2}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={includeUncategorized}
                  onChange={(e) => setIncludeUncategorized(e.target.checked)}
                />
              }
              label="Kategorisiz Varlıkları Grafiğe Dahil Et"
              sx={{ mt: 1 }}
            />
          </Box>

          <Divider />

          {/* Mevcut Kategoriler */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Mevcut Kategoriler ({categories.length})
            </Typography>
            
            {categories.map((category) => (
              <Accordion key={category.id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Box sx={{ 
                      width: 16, 
                      height: 16, 
                      backgroundColor: category.color, 
                      borderRadius: '50%' 
                    }} />
                    
                    {editingCategory === category.id ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexGrow: 1 }}>
                        <TextField
                          size="small"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          fullWidth
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FormControl size="small" sx={{ minWidth: 100, flexGrow: 1 }}>
                            <Select
                              value={editCategoryColor}
                              onChange={handleEditColorChange}
                              onClick={(e) => e.stopPropagation()}
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
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveEditCategory(category.id);
                            }}
                            color="primary"
                          >
                            <SaveIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelEditCategory();
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    ) : (
                      <>
                        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                          {category.name} ({category.holdingIds.length} varlık)
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditCategory(category);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCategory(category.id);
                          }}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Bu kategorideki varlıklar:
                    </Typography>
                    
                    <FormControl size="small" fullWidth>
                      <InputLabel>Kategorideki Varlıklar</InputLabel>
                      <Select<string[]>
                        multiple
                        value={getCategoryHoldings(category.id).map(h => h.id)}
                        onChange={(event) => {
                          const selectedIds = typeof event.target.value === 'string' 
                            ? [event.target.value] 
                            : event.target.value;
                          const newSelectedHoldings = selectedIds.map(id => 
                            [...getCategoryHoldings(category.id), ...getAvailableHoldings(category.id)].find(h => h.id === id)
                          ).filter(Boolean) as Holding[];
                          handleUpdateCategoryHoldings(category.id, newSelectedHoldings);
                        }}
                        label="Kategorideki Varlıklar"
                        renderValue={(selected) => {
                          if (selected.length === 0) {
                            return 'Varlıkları seçin veya çıkarın';
                          }
                          return `${selected.length} varlık seçildi`;
                        }}
                      >
                        {[...getCategoryHoldings(category.id), ...getAvailableHoldings(category.id)].map((holding) => (
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
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>

          <Divider />

          {/* Yeni Kategori Ekleme */}
          <Box sx={{ 
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            backgroundColor: 'action.hover'
          }}>
            <Typography variant="subtitle1" gutterBottom>
              Yeni Kategori Ekle
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Kategori Adı"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="ör. Yeni Kategori"
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
                disabled={newCategoryName.trim() === ''}
                size="small"
              >
                Kategori Ekle
              </Button>
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
          onClick={handleSaveChart}
          disabled={chartName.trim() === '' || categories.length === 0}
        >
          Değişiklikleri Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
};