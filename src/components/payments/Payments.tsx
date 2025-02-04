import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Grid, Chip } from '@mui/material';
import { CreatePayment } from './CreatePayment';
import { PaymentsList } from './PaymentsList';
import { useAuth } from '../auth/AuthProvider';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { Payment, ScheduleRequest } from '../../types';
import { calculateHours } from '../../utils/paymentUtils';

export const Payments: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState({
    totalOwed: 0,
    totalPaid: 0,
    remainingBalance: 0
  });

  useEffect(() => {
    const fetchPaymentSummary = async () => {
      if (!currentUser) return;

      try {
        // Get all schedule requests for calculating total to receive
        const scheduleQuery = query(
          collection(db, 'scheduleRequests'),
          where(
            currentUser.role === 'employer' ? 'employerId' : 'nannyId',
            '==',
            currentUser.uid
          ),
          where('status', '==', 'approved')
        );

        // Get all payments
        const paymentsQuery = query(
          collection(db, 'payments'),
          where(
            currentUser.role === 'employer' ? 'employerId' : 'nannyId',
            '==',
            currentUser.uid
          )
        );

        // Fetch both in parallel
        const [scheduleSnapshot, paymentsSnapshot] = await Promise.all([
          getDocs(scheduleQuery),
          getDocs(paymentsQuery)
        ]);

        console.log('Schedule snapshot:', {
          empty: scheduleSnapshot.empty,
          size: scheduleSnapshot.size,
          docs: scheduleSnapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }))
        });

        const approvedRequests = scheduleSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            date: data.date?.toDate?.() || data.date
          };
        }) as ScheduleRequest[];

        const payments = paymentsSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Payment[];

        console.log('Processed approved requests:', approvedRequests);
        console.log('Processed payments:', payments);

        if (currentUser.role === 'employer') {
          console.log('Calculating for employer');
          const totalOwed = approvedRequests.reduce((sum, request) => {
            console.log('Processing request:', request);
            const hours = calculateHours(request.startTime, request.endTime);
            const amount = hours * (request.hourlyRate || 0);
            
            console.log('Request calculation:', {
              startTime: request.startTime,
              endTime: request.endTime,
              hours,
              hourlyRate: request.hourlyRate,
              amount
            });
            
            return sum + amount;
          }, 0);

          const totalPaid = payments
            .filter(payment => payment.status === 'approved')
            .reduce((sum, payment) => sum + payment.amount, 0);

          console.log('Final calculations:', {
            totalOwed,
            totalPaid,
            requests: approvedRequests.length,
            payments: payments.length
          });

          setSummary({
            totalOwed,
            totalPaid,
            remainingBalance: totalOwed - totalPaid
          });
        } else {
          // For nannies: calculate from approved schedule requests
          const totalToReceive = approvedRequests.reduce((sum, request) => {
            const hours = calculateHours(request.startTime, request.endTime);
            const amount = hours * (request.hourlyRate || 0);
            console.log('Nanny calculation:', {
              hours,
              hourlyRate: request.hourlyRate,
              amount
            });
            return sum + amount;
          }, 0);

          const totalReceived = payments
            .filter(payment => payment.status === 'approved')
            .reduce((sum, payment) => sum + payment.amount, 0);

          console.log('Nanny totals:', {
            totalToReceive,
            totalReceived,
            requests: approvedRequests.length,
            payments: payments.length
          });

          setSummary({
            totalOwed: totalToReceive,
            totalPaid: totalReceived,
            remainingBalance: totalToReceive - totalReceived
          });
        }
      } catch (error) {
        console.error('Error fetching payment summary:', error);
      }
    };

    fetchPaymentSummary();
  }, [currentUser]);

  const handleResetAllPayments = async () => {
    if (!currentUser) return;
    
    try {
      const q = query(
        collection(db, 'payments'),
        where(
          currentUser.role === 'employer' ? 'employerId' : 'nannyId',
          '==',
          currentUser.uid
        )
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error resetting payments:', error);
    }
  };

  const handleClearBalances = async () => {
    if (!currentUser || !window.confirm('Are you sure you want to clear all balances? This will reset all approved schedule requests and payments.')) return;
    
    try {
      // Get all schedule requests to reset
      const scheduleQuery = query(
        collection(db, 'scheduleRequests'),
        where(
          currentUser.role === 'employer' ? 'employerId' : 'nannyId',
          '==',
          currentUser.uid
        ),
        where('status', '==', 'approved')
      );

      // Get all payments to reset
      const paymentsQuery = query(
        collection(db, 'payments'),
        where(
          currentUser.role === 'employer' ? 'employerId' : 'nannyId',
          '==',
          currentUser.uid
        )
      );

      const [scheduleSnapshot, paymentsSnapshot] = await Promise.all([
        getDocs(scheduleQuery),
        getDocs(paymentsQuery)
      ]);

      const batch = writeBatch(db);

      // Reset schedule requests to 'pending'
      scheduleSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { status: 'pending' });
      });

      // Delete all payments
      paymentsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      
      // Reset local state
      setSummary({
        totalOwed: 0,
        totalPaid: 0,
        remainingBalance: 0
      });
    } catch (error) {
      console.error('Error clearing balances:', error);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Payments</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {process.env.NODE_ENV === 'development' && (
              <>
                <Button 
                  variant="outlined" 
                  color="error" 
                  onClick={handleResetAllPayments}
                >
                  Reset All Payments
                </Button>
                <Button 
                  variant="outlined" 
                  color="warning" 
                  onClick={handleClearBalances}
                >
                  Clear Balances
                </Button>
              </>
            )}
            {currentUser?.role === 'employer' && (
              <Button 
                variant="contained" 
                onClick={() => setIsCreateOpen(true)}
              >
                Create Payment
              </Button>
            )}
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {currentUser?.role === 'employer' ? (
            <>
              <Grid item xs={12} md={4}>
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Owed
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    ${summary.totalOwed.toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Paid
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    ${summary.totalPaid.toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Remaining Balance
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    ${summary.remainingBalance.toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
            </>
          ) : (
            <>
              <Grid item xs={12} md={4}>
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Pending to Receive
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    ${summary.remainingBalance.toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Received
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    ${summary.totalPaid.toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Owed
                  </Typography>
                  <Typography variant="h4" sx={{ mt: 1 }}>
                    ${summary.totalOwed.toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>
            </>
          )}
        </Grid>

        <PaymentsList />
      </Paper>

      <CreatePayment 
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </Box>
  );
}; 