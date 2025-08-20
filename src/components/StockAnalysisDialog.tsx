import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Box,
  IconButton,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface StockAnalysisDialogProps {
  open: boolean;
  onClose: () => void;
  symbol: string | null;
}

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/turbulence6th/HisseAnaliz/main/hisse-analiz/';

export const StockAnalysisDialog: React.FC<StockAnalysisDialogProps> = ({ open, onClose, symbol }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && symbol) {
      const fetchAnalysis = async () => {
        setLoading(true);
        setError(null);
        setContent('');
        try {
          const response = await fetch(`${GITHUB_BASE_URL}${symbol}.md`);
          if (response.ok) {
            const text = await response.text();
            setContent(text);
          } else {
            setError(`"${symbol}" için analiz dosyası bulunamadı. (HTTP ${response.status})`);
          }
        } catch (err) {
          setError('Analiz yüklenirken bir ağ hatası oluştu.');
        } finally {
          setLoading(false);
        }
      };

      fetchAnalysis();
    }
  }, [open, symbol]);

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        <Typography variant="h6" component="div">{symbol} Hisse Analizi</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {content && (
          <Box sx={{
            '& h1': { typography: 'h4', mt: 2, mb: 1 },
            '& h2': { typography: 'h5', mt: 2, mb: 1 },
            '& h3': { typography: 'h6', mt: 2, mb: 1 },
            '& p': { typography: 'body1', mb: 1 },
            '& a': { color: 'primary.main' },
            '& table': { width: '100%', borderCollapse: 'collapse', mb: 2 },
            '& th, & td': { border: '1px solid #ddd', p: 1 },
            '& th': { backgroundColor: '#f2f2f2', fontWeight: 'bold' }
          }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};
