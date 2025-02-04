import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box, Typography } from '@mui/material';
import { useAuth } from './AuthProvider';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';

export const UpdateNannyRate: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState('');
  const { currentUser } = useAuth();

  const handleSubmit = async () => {
    if (!currentUser || !rate) return;
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        hourlyRate: parseFloat(rate)
      });
      setOpen(false);
    } catch (error) {
      console.error('Error updating rate:', error);
    }
  };

  if (currentUser?.role !== 'nanny') return null;

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Current Hourly Rate: ${currentUser.hourlyRate?.toFixed(2) || '0.00'}/hour
      </Typography>
      <Button onClick={() => setOpen(true)} variant="outlined">
        Update Hourly Rate
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Update Your Hourly Rate</DialogTitle>
        <DialogContent>
          <TextField
            label="Hourly Rate"
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
            InputProps={{
              startAdornment: '$'
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Update Rate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 