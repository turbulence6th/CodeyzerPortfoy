import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Alert,
  Snackbar,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { clearPriceCache, restorePortfolioState, setTotalDebt } from '../store/portfolioSlice';
import { restoreCategoryState } from '../store/categorySlice';
import { useTheme } from '../contexts/ThemeContext';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { MdSync as SyncIcon } from 'react-icons/md';


export function Settings() {
  const dispatch = useAppDispatch();
  const entireState = useAppSelector((state) => state);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(() => {
    return JSON.parse(localStorage.getItem('isBiometricEnabled') || 'false');
  });
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem('isBiometricEnabled', JSON.stringify(isBiometricEnabled));
  }, [isBiometricEnabled]);

  const handleClearCache = () => {
    dispatch(clearPriceCache());
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleExportData = async () => {
    try {
      // Platforma özel mantıktan önce izinleri kontrol et ve iste
      if (Capacitor.getPlatform() === 'android') {
        const permissions = await Filesystem.requestPermissions();
        if (permissions.publicStorage !== 'granted') {
          setSnackbarMessage('Hata: Dosya yazma izni verilmedi.');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          return;
        }
      }

      const dataToExport = JSON.stringify(entireState, null, 2);
      const fileName = `codeyzer_portfolio_backup_${new Date().toISOString()}.json`;

      if (Capacitor.getPlatform() === 'android') {
        // Android'de, veriyi doğrudan Documents klasörüne yazmayı dene
        await Filesystem.writeFile({
          path: fileName,
          data: dataToExport,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
      } else {
        // Web ve diğer platformlar için genel bir indirme metodu
        const blob = new Blob([dataToExport], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      setSnackbarMessage(`Veriler başarıyla "${fileName}" olarak dışa aktarıldı.`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

    } catch (e) {
      console.error('Veri dışa aktarılırken hata:', e);
      setSnackbarMessage('Hata: Veriler dışa aktarılamadı. Lütfen dosya izinlerini kontrol edin.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const importedState = JSON.parse(text);

        // State'in her bir dilimini ayrı ayrı restore et
        if (importedState.portfolio && importedState.category) {
          dispatch(restorePortfolioState(importedState.portfolio));
          dispatch(restoreCategoryState(importedState.category));
          setSnackbarMessage('Veriler başarıyla içe aktarıldı!');
          setSnackbarSeverity('success');
        } else {
          throw new Error('Yedekleme dosyası beklenen formatta değil.');
        }
      } catch (error) {
        console.error('İçe aktarma hatası:', error);
        setSnackbarMessage('Hata: Dosya okunurken veya işlenirken bir sorun oluştu.');
        setSnackbarSeverity('error');
      } finally {
        setSnackbarOpen(true);
        // Aynı dosyayı tekrar seçebilmek için input değerini sıfırla
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSyncDebt = async () => {
    // Web platformunda simülasyon yap
    if (Capacitor.getPlatform() === 'web') {
      dispatch(setTotalDebt(20000));
      setSnackbarMessage('Web simülasyonu: Borç 20.000 TL olarak ayarlandı.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
      return;
    }

    // Mobil platformlarda diğer uygulamayı aç
    const url = 'codeyzer-ekstre-takip://borcu-getir';
    try {
      // Modern Android'deki güvenlik kısıtlamaları nedeniyle `canOpenUrl`
      // her zaman doğru sonuç vermeyebilir. Bu yüzden doğrudan açmayı deneyip,
      // uygulama yüklü değilse hatayı yakalamak daha güvenilir bir yöntemdir.
      await AppLauncher.openUrl({ url });
    } catch (error) {
      console.error('Uygulama açılırken hata oluştu:', error);
      // Hata genellikle kullanıcıda diğer uygulamanın yüklü olmamasından kaynaklanır.
      alert('Hata: Codeyzer Ekstre Takip uygulaması başlatılamadı. Lütfen uygulamanın cihazınızda yüklü olduğundan emin olun.');
    }
  };

  return (
    <Box>
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />
      <Typography variant="h4" gutterBottom>
        Ayarlar
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6">Veri & Senkronizasyon</Typography>
            <Typography variant="body2" color="text.secondary">
              Portföy verilerinizi yedekleyin, geri yükleyin veya diğer uygulamalarla senkronize edin.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start', mt: 1, flexWrap: 'wrap' }}>
             <Button
              variant="outlined"
              onClick={handleImportClick}
            >
              İçe Aktar
            </Button>
            <Button
              variant="contained"
              onClick={handleExportData}
            >
              Dışa Aktar
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleSyncDebt}
              startIcon={<SyncIcon />}
            >
              Borçları Senkronize Et
            </Button>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h6">Koyu Tema</Typography>
            <Typography variant="body2" color="text.secondary">
              Uygulamanın görsel temasını açık veya koyu olarak değiştirin.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isDarkMode}
                  onChange={toggleTheme}
                />
              }
              label={isDarkMode ? 'Aktif' : 'Pasif'}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h6">Uygulama Kilidi</Typography>
            <Typography variant="body2" color="text.secondary">
              Uygulamayı açarken parmak izi veya yüz tanıma ile koruma sağlayın.
              (Cihazınızın desteklemesi gerekmektedir)
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}>
            <FormControlLabel
              control={
                <Switch
                  checked={isBiometricEnabled}
                  onChange={(e) => setIsBiometricEnabled(e.target.checked)}
                />
              }
              label={isBiometricEnabled ? 'Aktif' : 'Pasif'}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h6">Fiyat Önbelleği</Typography>
            <Typography variant="body2" color="text.secondary">
              Uygulamanın daha hızlı açılması için fiyat verileri cihazınızda saklanır.
              Eğer fiyatlarda bir tutarsızlık olduğunu düşünüyorsanız, tüm önbelleği temizleyebilirsiniz.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}>
            <Button
              variant="contained"
              color="warning"
              onClick={handleClearCache}
            >
              Önbelleği Temizle
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
