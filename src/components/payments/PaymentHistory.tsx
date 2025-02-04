import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import { format } from 'date-fns';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../auth/AuthProvider';
import { Payment } from '../../types';

interface CreatePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  remainingBalance: number;
  onSubmit: (amount: number, method: 'cash' | 'bank_transfer', note: string) => void;
}

const CreatePaymentDialog: React.FC<CreatePaymentDialogProps> = ({
  open,
  onClose,
  remainingBalance,
  onSubmit,
}) => {
  const [amount, setAmount] = useState(remainingBalance.toString());
  const [method, setMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [note, setNote] = useState('');

  const handleSubmit = () => {
    onSubmit(parseFloat(amount), method, note);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Record Payment</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Remaining Balance: ${remainingBalance.toFixed(2)}
          </Typography>
          <TextField
            label="Payment Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: '$'
            }}
          />
          <FormControl fullWidth>
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value as 'cash' | 'bank_transfer')}
              label="Payment Method"
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Note"
            multiline
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            placeholder="Optional: Add any notes about this payment"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Record Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const PaymentHistory: React.FC<{ payments: Payment[]; remainingBalance: number }> = ({ 
  payments,
  remainingBalance 
}) => {
  const { currentUser } = useAuth();

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'confirmed'
      });
    } catch (err) {
      console.error('Error confirming payment:', err);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Payment History
      </Typography>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Note</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{format(payment.date, 'MMM d, yyyy')}</TableCell>
                <TableCell>${payment.amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip
                    label={payment.status}
                    color={payment.status === 'confirmed' ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{payment.method}</TableCell>
                <TableCell>{payment.note || '-'}</TableCell>
                <TableCell align="right">
                  {currentUser?.role === 'nanny' && payment.status === 'pending' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => handleConfirmPayment(payment.id)}
                    >
                      Confirm Receipt
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {payments.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
          No payment history found
        </Typography>
      )}
    </Paper>
  );
}; 