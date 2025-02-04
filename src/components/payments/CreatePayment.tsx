import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box
} from '@mui/material';
import { collection, query, where, getDocs, addDoc, documentId } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../auth/AuthProvider';
import { User, Payment } from '../../types';

interface CreatePaymentProps {
  open: boolean;
  onClose: () => void;
}

export const CreatePayment: React.FC<CreatePaymentProps> = ({ open, onClose }) => {
  const { currentUser } = useAuth();
  const [linkedNannies, setLinkedNannies] = useState<User[]>([]);
  const [selectedNanny, setSelectedNanny] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const fetchLinkedNannies = async () => {
      if (!currentUser?.linkedNannies?.length) {
        console.log('No linked nannies found:', currentUser?.linkedNannies);
        setLinkedNannies([]);
        return;
      }

      try {
        console.log('Fetching nannies with IDs:', currentUser.linkedNannies);
        
        const q = query(
          collection(db, 'users'),
          where(documentId(), 'in', currentUser.linkedNannies)
        );

        const snapshot = await getDocs(q);
        console.log('Nannies snapshot:', snapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        })));

        const nannies = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as User[];

        console.log('Setting linked nannies:', nannies);
        setLinkedNannies(nannies);
      } catch (error) {
        console.error('Error fetching linked nannies:', error);
      }
    };

    fetchLinkedNannies();
  }, [currentUser]);

  const handleSubmit = async () => {
    if (!currentUser || !selectedNanny || !amount) return;

    try {
      const payment: Omit<Payment, 'id'> = {
        amount: parseFloat(amount),
        date: new Date(),
        status: 'pending',
        employerId: currentUser.uid,
        nannyId: selectedNanny,
        method: 'bank_transfer',
        note: note || undefined,
        employerName: currentUser.displayName,
        nannyName: linkedNannies.find(n => n.uid === selectedNanny)?.displayName
      };

      await addDoc(collection(db, 'payments'), payment);
      onClose();
      setSelectedNanny('');
      setAmount('');
      setNote('');
    } catch (error) {
      console.error('Error creating payment:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Payment</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            select
            label="Select Nanny"
            value={selectedNanny}
            onChange={(e) => setSelectedNanny(e.target.value)}
            fullWidth
          >
            {linkedNannies.map((nanny) => (
              <MenuItem key={nanny.uid} value={nanny.uid}>
                {nanny.displayName} (${nanny.hourlyRate}/hr)
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
            InputProps={{
              startAdornment: '$'
            }}
          />

          <TextField
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={!selectedNanny || !amount}
        >
          Create Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 