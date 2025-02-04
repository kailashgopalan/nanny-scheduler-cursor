import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
} from '@mui/material';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../../utils/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const PaymentActions: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const { currentUser } = useAuth();

  const handleSubmit = async () => {
    if (!currentUser || !amount) return;

    try {
      await addDoc(collection(db, 'payments'), {
        amount: parseFloat(amount),
        method,
        status: 'pending',
        employerId: currentUser.uid,
        date: new Date(),
        createdAt: new Date(),
      });

      setOpen(false);
      setAmount('');
      setMethod('cash');
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  if (currentUser?.role !== 'employer') return null;

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Button
          variant="contained"
          fullWidth
          onClick={() => setOpen(true)}
        >
          Record New Payment
        </Button>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Payment Method"
              value={method}
              onChange={(e) => setMethod(e.target.value as 'cash' | 'bank_transfer')}
              fullWidth
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 