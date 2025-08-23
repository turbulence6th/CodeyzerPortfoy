import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Grid,
  MenuItem,
  Autocomplete
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { priceService } from '../api/priceService';
import type { AssetType, Holding } from '../models/types';

// Varlık türleri ve sembol önerileri
const assetTypes: { value: AssetType; label: string; examples: string }[] = [
  { value: 'CURRENCY', label: 'Döviz', examples: 'USD/TRY, EUR/TRY, Altın' },
  { value: 'STOCK', label: 'Hisse Senedi', examples: 'THYAO, ISCTR, AKBNK' },
  { value: 'FUND', label: 'Fon', examples: 'TEFAS Kodları' },
];

const symbolSuggestions: Record<AssetType, string[]> = {
  CURRENCY: ['USDTRY', 'EURTRY', 'GAUTRY', 'TRY'],
  COMMODITY: [], // Kullanılmayacak ama tip uyumluluğu için
  STOCK: [
    'AEFES', 'AGHOL', 'AGROT', 'AHGAZ', 'AKBNK', 'AKSA', 'AKSEN', 'ALARK', 
    'ALFAS', 'ALTNY', 'ANHYT', 'ANSGR', 'ARCLK', 'ARDYZ', 'ASELS', 'ASTOR', 
    'AVPGY', 'BERA', 'BIMAS', 'BRSAN', 'BRYAT', 'BSOKE', 'BTCIM', 'CANTE', 
    'CCOLA', 'CIMSA', 'CLEBI', 'CWENE', 'DOAS', 'DOHOL', 'ECILC', 'EFORC', 
    'EGEEN', 'EKGYO', 'ENERY', 'ENJSA', 'ENKAI', 'EREGL', 'EUPWR', 'FROTO', 
    'GARAN', 'GESAN', 'GOLTS', 'GRTHO', 'GSRAY', 'GUBRF', 'HALKB', 'HEKTS', 
    'IEYHO', 'ISCTR', 'ISMEN', 'KARSN', 'KCAER', 'KCHOL', 'KONTR', 'KONYA', 
    'KOZAA', 'KOZAL', 'KRDMD', 'KTLEV', 'LMKDC', 'MAGEN', 'MAVI', 'MGROS', 
    'MIATK', 'MPARK', 'OBAMS', 'ODAS', 'OTKAR', 'OYAKC', 'PASEU', 'PETKM', 
    'PGSUS', 'RALYH', 'REEDR', 'RYGYO', 'SAHOL', 'SASA', 'SELEC', 'SISE', 
    'SKBNK', 'SMRTG', 'SOKM', 'TABGD', 'TAVHL', 'TCELL', 'THYAO', 'TKFEN', 
    'TOASO', 'TSKB', 'TTKOM', 'TTRAK', 'TUPRS', 'TURSG', 'ULKER', 'VAKBN', 
    'VESTL', 'YEOTK', 'YKBNK', 'ZOREN'
  ],
  FUND: [
    'AAL', 'AC1', 'AC4', 'AC5', 'AC6', 'ACU', 'ADE', 'AFA', 'AFO', 'AFT', 'AFV', 'AGC', 'AHN', 'AHU', 'AIS', 'AJK', 'AKE', 'AN1', 'ANZ', 'APT', 'ARL', 'ARM', 'AUT', 'AYR',
    'BBF', 'BDC', 'BDS', 'BGP', 'BHF', 'BIH', 'BNC', 'BTE', 'BVZ',
    'CKS', 'CPU', 'CVK',
    'DAS', 'DBA', 'DBB', 'DBH', 'DBK', 'DBZ', 'DCB', 'DDF', 'DGH', 'DLY', 'DMG', 'DOL', 'DOV', 'DPB', 'DPK', 'DSP', 'DTZ', 'DVT', 'DZM',
    'EBD', 'EDU', 'EIC', 'EIB', 'EIL', 'EKF', 'EUN', 'EUZ', 'EYT',
    'FBI', 'FBV', 'FBZ', 'FDG', 'FI3', 'FIB', 'FIL', 'FIT', 'FJB', 'FJZ', 'FKE', 'FMG', 'FNO', 'FPE', 'FPK', 'FPZ', 'FS5', 'FSF', 'FSH', 'FSK', 'FSR', 'FUB', 'FYO', 'FZJ', 'FZP',
    'GA1', 'GAG', 'GAH', 'GAS', 'GBL', 'GBN', 'GBV', 'GBZ', 'GGK', 'GKH', 'GLC', 'GLS', 'GMC', 'GO1', 'GO2', 'GO3', 'GO4', 'GO6', 'GOL', 'GPA', 'GPB', 'GPC', 'GPF', 'GPG', 'GPI', 'GPL', 'GPT', 'GPU', 'GRL', 'GRO', 'GTA', 'GTF', 'GTY', 'GTZ', 'GUB', 'GUM', 'GUV', 'GYK', 'GZE', 'GZJ', 'GZP', 'GZV', 'GZY', 'GZZ',
    'HAM', 'HBF', 'HDA', 'HDK', 'HEH', 'HGV', 'HIM', 'HMG', 'HOA', 'HOY', 'HP3', 'HPO', 'HPT', 'HSL', 'HST', 'HVK', 'HVT', 'HYV',
    'IAT', 'IAU', 'ICA', 'ICC', 'ICD', 'ICE', 'ICV', 'IDF', 'IDL', 'IDO', 'IDY', 'IEV', 'IFV', 'IHC', 'IJA', 'IJB', 'IJH', 'IJP', 'IJV', 'IJZ', 'IIE', 'IKP', 'ILZ', 'IMF', 'IOG', 'IOO', 'IPV', 'IRF', 'IRV', 'IRY', 'IST', 'ITP', 'IUF', 'IUH', 'IUV', 'IVY', 'IV8', 'IYB', 'IZB', 'IZS',
    'JET',
    'KAV', 'KCV', 'KDT', 'KIE', 'KIF', 'KIS', 'KKH', 'KLU', 'KMF', 'KPP', 'KRC', 'KRF', 'KRT', 'KSA', 'KSK', 'KSV', 'KTJ', 'KTM', 'KTN', 'KTR', 'KTT', 'KTV', 'KUB', 'KUT', 'KVS', 'KZL',
    'LID', 'LLA',
    'MBL', 'MET', 'MGH', 'MJB', 'MJG', 'MJL', 'MKG', 'MPN', 'MPF', 'MPK', 'MPP', 'MTV', 'MTX',
    'NAU', 'NBH', 'NBZ', 'NCS', 'NHP', 'NJF', 'NJR', 'NJY', 'NRG', 'NSD', 'NSA', 'NSK', 'NVB', 'NVT', 'NVZ', 'NZT',
    'OBI', 'OBP', 'ODP', 'OFS', 'OFI', 'OGD', 'OJB', 'OJK', 'OJT', 'OKP', 'OKT', 'OLA', 'OLE', 'ONN', 'ONK', 'ONS', 'OPD', 'OPF', 'OPL', 'OSD', 'OSL', 'OTJ', 'OTK', 'OUD', 'OVD',
    'PAF', 'PAL', 'PBK', 'PBR', 'PDD', 'PDF', 'PFS', 'PIL', 'PKF', 'PJL', 'PPE', 'PPP', 'PPN', 'PPT', 'PPS', 'PPZ', 'PRU', 'PRY', 'PSL', 'PUC', 'PVK',
    'RBA', 'RBI', 'RBK', 'RBR', 'RBT', 'RBV', 'RIK', 'RJG', 'RKV', 'RPD', 'RPG', 'RPP', 'RPS', 'RPT', 'RPX', 'RTP',
    'SPN', 'SPE', 'SUA', 'SUC',
    'TAL', 'TBV', 'TCA', 'TCB', 'TCF', 'TDG', 'TE3', 'TE4', 'TEJ', 'TFF', 'TGR', 'TI4', 'TI6', 'TJI', 'TJT', 'TLE', 'TMG', 'TMM', 'TOT', 'TPC', 'TPF', 'TPJ', 'TPL', 'TPP', 'TPV', 'TPZ', 'TTA', 'TUA', 'TVN', 'TZT',
    'UP1', 'UP2', 'UPD', 'UPP',
    'VFK', 'VMV', 'VNK',
    'YAY', 'YBE', 'YBS', 'YCY', 'YFV', 'YGM', 'YJY', 'YKS', 'YKT', 'YLO', 'YMD', 'YOT', 'YP4', 'YPK', 'YPL', 'YSU', 'YTD', 'YTY', 'YUN', 'YVG', 'YZC', 'YZG', 'YZK',
    'ZBJ', 'ZBO', 'ZCD', 'ZCN', 'ZDD', 'ZFB', 'ZJB', 'ZJI', 'ZMT', 'ZMY', 'ZP6', 'ZP8', 'ZP9', 'ZPA', 'ZPF', 'ZPG', 'ZSF', 'TZT'
  ]
};

interface AddHoldingDialogProps {
  open: boolean;
  onClose: () => void;
  onAddHolding: (holding: Holding) => void;
}

export const AddHoldingDialog: React.FC<AddHoldingDialogProps> = ({
  open,
  onClose,
  onAddHolding
}) => {
  const [type, setType] = useState<AssetType>('CURRENCY');
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validating, setValidating] = useState(false);

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const validateSymbol = async (symbolToValidate: string): Promise<boolean> => {
    try {
      setValidating(true);
      const priceData = await priceService.fetchSinglePrice(symbolToValidate);
      
      // Fiyat 0 olsa bile, önceki günün fiyatı varsa sembol geçerlidir.
      // Bu, AFA gibi fonların güncel fiyatı 0 olduğunda eklenebilmesini sağlar.
      if (priceData && (priceData.price > 0 || (priceData.previousClose && priceData.previousClose > 0))) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Symbol validation error:', error);
      return false;
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    setError('');

    // Temel validasyon
    if (!symbol.trim()) {
      setError('Sembol zorunludur');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Geçerli bir miktar giriniz');
      return;
    }

    const cleanSymbol = symbol.toUpperCase().trim();

    // "TRY" sembolü için özel durum
    if (cleanSymbol !== 'TRY') {
      // Sembol doğrulama
      setValidating(true);
      const isValidSymbol = await validateSymbol(cleanSymbol);
      
      if (!isValidSymbol) {
        setError(`"${cleanSymbol}" sembolü bulunamadı veya fiyat bilgisi alınamıyor. Lütfen geçerli bir sembol giriniz.`);
        setValidating(false); // validation bitti
        return;
      }
      setValidating(false); // validation bitti
    }

    // Varlığı ekle
    const newHolding: Holding = {
      id: uuidv4(),
      type: type,
      symbol: cleanSymbol,
      name: cleanSymbol,
      amount: amountNum,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddHolding(newHolding);

    setSuccess('Varlık başarıyla eklendi ve fiyat bilgisi doğrulandı!');
    
    // 2 saniye sonra modalı kapat
    setTimeout(() => {
      handleClose();
    }, 2000);
  };

  const handleClose = () => {
    // Başarı durumunda formu sıfırlamadan sadece kapat
    if (success) {
      onClose();
      // Gecikmeli sıfırlama, kapanma animasyonunun bitmesini bekler
      setTimeout(() => {
        setType('CURRENCY');
        setSymbol('');
        setAmount('');
        setNote('');
        setError('');
        setSuccess('');
        setValidating(false);
      }, 300);
      return;
    }

    // Normal kapatma/iptal durumu
    setType('CURRENCY');
    setSymbol('');
    setAmount('');
    setNote('');
    setError('');
    setSuccess('');
    setValidating(false);
    onClose();
  };

  const getCurrentSymbols = () => {
    return symbolSuggestions[type] || [];
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>Yeni Varlık Ekle</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            {/* Varlık Türü */}
            <Grid size={{ xs: 12 }}>
              <TextField
                select
                fullWidth
                label="Varlık Türü"
                value={type}
                onChange={(e) => setType(e.target.value as AssetType)}
                helperText={assetTypes.find(t => t.value === type)?.examples}
                disabled={success !== ''}
              >
                {assetTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Sembol */}
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                freeSolo
                options={getCurrentSymbols()}
                value={symbol}
                onInputChange={(_, newValue) => setSymbol(newValue || '')}
                disabled={success !== ''}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Sembol"
                    placeholder={type === 'CURRENCY' ? 'USDTRY' : type === 'STOCK' ? 'THYAO' : 'TFF'}
                    helperText={
                      type === 'CURRENCY' ? 'Döviz sembolü (örn: USDTRY, EURTRY)' :
                      type === 'STOCK' ? 'Hisse kodu (örn: THYAO, ISCTR)' :
                      'TEFAS fon kodu (örn: TFF, AFT)'
                    }
                    required
                  />
                )}
              />
            </Grid>

            {/* Miktar */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Miktar"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputProps={{ min: 0, step: 'any' }}
                helperText={
                  type === 'CURRENCY' ? 'Döviz miktarı' :
                  type === 'STOCK' ? 'Hisse adedi' :
                  'Fon pay adedi'
                }
                required
                disabled={success !== ''}
              />
            </Grid>

            {/* Not */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Not (Opsiyonel)"
                multiline
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Bu varlık hakkında notlarınız..."
                disabled={success !== ''}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>{success ? 'Kapat' : 'İptal'}</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={validating || success !== ''}
        >
          {validating ? 'Doğrulanıyor...' : 'Ekle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 