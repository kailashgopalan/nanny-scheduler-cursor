import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { collection, query, where, onSnapshot, addDoc, getDocs, deleteDoc, updateDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../components/auth/AuthProvider';
import { Payment, ScheduleRequest, User } from '../types';
import { calculateHours } from '../utils/paymentUtils';
import { PaymentHistory } from '../components/payments/PaymentHistory';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const { currentUser } = useAuth();
  const [selectedNannyId, setSelectedNannyId] = useState('');
  const [nannies, setNannies] = useState<User[]>([]);

  // Only calculate total owed for both employers and nannies
  useEffect(() => {
    if (!currentUser) return;

    const fetchTotalOwed = async () => {
      try {
        const schedulesQuery = query(
          collection(db, 'scheduleRequests'),
          where('status', '==', 'approved'),
          where(currentUser.role === 'employer' ? 'employerId' : 'nannyId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(schedulesQuery);
        let owed = 0;
        
        for (const scheduleDoc of snapshot.docs) {
          const scheduleData = scheduleDoc.data();
          const schedule = {
            ...scheduleData,
            date: scheduleData.date.toDate(),
            id: scheduleDoc.id
          } as ScheduleRequest;

          const hours = calculateHours(schedule.startTime, schedule.endTime);
          
          if (currentUser.role === 'employer') {
            // For employers: use nanny's rate
            if (schedule.nannyId) {
              const nannyDoc = await getDoc(doc(db, 'users', schedule.nannyId));
              const hourlyRate = nannyDoc.data()?.hourlyRate || 0;
              owed += hours * hourlyRate;
            }
          } else {
            // For nannies: use their own rate
            owed += hours * (currentUser.hourlyRate || 0);
          }
        }

        console.log('Final total owed:', owed);
        setTotalOwed(owed);
      } catch (error) {
        console.error('Error calculating total owed:', error);
      }
    };

    fetchTotalOwed();
  }, [currentUser]);

  // Only fetch manual payments (not auto-generated ones)
  useEffect(() => {
    if (!currentUser) return;

    let queryConstraints = [
      where(currentUser.role === 'employer' ? 'employerId' : 'nannyId', '==', currentUser.uid),
      where('method', 'in', ['cash', 'bank_transfer'])
    ];

    // Only add the 'in' filter if we have linked users
    if (currentUser.role === 'nanny' && currentUser.linkedEmployers?.length) {
      queryConstraints.push(where('employerId', 'in', currentUser.linkedEmployers));
    } else if (currentUser.role === 'employer' && currentUser.linkedNannies?.length) {
      queryConstraints.push(where('nannyId', 'in', currentUser.linkedNannies));
    }

    const paymentsQuery = query(
      collection(db, 'payments'),
      ...queryConstraints
    );

    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      const newPayments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      })) as Payment[];

      setPayments(newPayments.sort((a, b) => b.date.getTime() - a.date.getTime()));

      const paid = newPayments
        .filter(p => p.status === 'confirmed')
        .reduce((sum, p) => sum + p.amount, 0);
      setTotalPaid(paid);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const remainingBalance = totalOwed - totalPaid;

  // Update nanny selection query
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'employer') return;
    
    // Only query if we have linked nannies
    if (!currentUser.linkedNannies?.length) {
      setNannies([]);
      return;
    }

    const q = query(
      collection(db, 'users'),
      where('role', '==', 'nanny'),
      where('uid', 'in', currentUser.linkedNannies)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nannyList = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as User[];
      setNannies(nannyList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreatePayment = async () => {
    if (!currentUser || !paymentAmount || !selectedNannyId) return;

    try {
      const amount = parseFloat(paymentAmount);
      await addDoc(collection(db, 'payments'), {
        amount,
        date: new Date(),
        status: 'pending',
        employerId: currentUser.uid,
        nannyId: selectedNannyId,
        method: 'bank_transfer', // or could be a selected value from the dialog
      });
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setSelectedNannyId('');
    } catch (err) {
      console.error('Error creating payment:', err);
    }
  };

  const handleResetPayments = async () => {
    if (!currentUser) return;
    
    try {
      // Reset payments
      const paymentsQuery = query(
        collection(db, 'payments'),
        where(currentUser.role === 'employer' ? 'employerId' : 'nannyId', '==', currentUser.uid)
      );
      
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentDeletePromises = paymentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(paymentDeletePromises);

      // Reset approved schedules by updating their status to 'pending'
      const schedulesQuery = query(
        collection(db, 'scheduleRequests'),
        where('status', '==', 'approved'),
        where(currentUser.role === 'employer' ? 'employerId' : 'nannyId', '==', currentUser.uid)
      );

      const schedulesSnapshot = await getDocs(schedulesQuery);
      const scheduleUpdatePromises = schedulesSnapshot.docs.map(doc => 
        updateDoc(doc.ref, { status: 'pending' })
      );
      await Promise.all(scheduleUpdatePromises);
      
      // Reset local state
      setTotalOwed(0);
      setTotalPaid(0);
      setPayments([]);
      
      console.log('All payments and schedules reset successfully');
    } catch (err) {
      console.error('Error resetting data:', err);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Payment Summary
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography color="text.secondary" gutterBottom>
              Total Owed
            </Typography>
            <Typography variant="h4">
              ${totalOwed.toFixed(2)}
            </Typography>
          </Box>

          <Box>
            <Typography color="text.secondary" gutterBottom>
              {currentUser?.role === 'employer' ? 'Total Paid' : 'Total Received'}
            </Typography>
            <Typography variant="h4" color="success.main">
              ${totalPaid.toFixed(2)}
            </Typography>
          </Box>

          <Box>
            <Typography color="text.secondary" gutterBottom>
              Remaining Balance
            </Typography>
            <Typography variant="h4" color="error.main">
              ${(totalOwed - totalPaid).toFixed(2)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {currentUser?.role === 'employer' && (
            <Button 
              variant="contained" 
              onClick={() => setIsPaymentDialogOpen(true)}
            >
              MAKE PAYMENT
            </Button>
          )}
          <Button 
            variant="outlined" 
            color="error" 
            onClick={handleResetPayments}
          >
            RESET ALL PAYMENTS
          </Button>
        </Box>
      </Paper>

      <PaymentHistory 
        payments={payments} 
        remainingBalance={totalOwed - totalPaid}
      />

      <Dialog open={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)}>
        <DialogTitle>Make Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Nanny</InputLabel>
              <Select
                value={selectedNannyId}
                onChange={(e) => setSelectedNannyId(e.target.value)}
                label="Select Nanny"
              >
                {nannies.map((nanny) => (
                  <MenuItem key={nanny.uid} value={nanny.uid}>
                    {nanny.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Payment Amount"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: '$'
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreatePayment} 
            variant="contained"
            disabled={!selectedNannyId || !paymentAmount}
          >
            Submit Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 