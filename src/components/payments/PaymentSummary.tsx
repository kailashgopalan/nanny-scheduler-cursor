import React, { useEffect, useState } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../auth/AuthProvider';
import { calculateHours } from '../../utils/paymentUtils';
import { ScheduleRequest } from '../../types';

export const PaymentSummary: React.FC = () => {
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // Get total earned from approved schedules
    const schedulesQuery = query(
      collection(db, 'scheduleRequests'),
      where('status', '==', 'approved'),
      where(currentUser.role === 'employer' ? 'employerId' : 'nannyId', '==', currentUser.uid)
    );

    // Get total paid from confirmed payments
    const paymentsQuery = query(
      collection(db, 'payments'),
      where(currentUser.role === 'employer' ? 'employerId' : 'nannyId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(paymentsQuery, async (paymentsSnapshot) => {
      try {
        // Calculate total paid from confirmed payments
        let paid = 0;
        let pending = 0;
        paymentsSnapshot.docs.forEach(doc => {
          const payment = doc.data();
          if (payment.status === 'confirmed') {
            paid += payment.amount;
          } else {
            pending += payment.amount;
          }
        });
        setTotalPaid(paid);
        setTotalPending(pending);

        // Calculate total earned from approved schedules
        const schedulesSnapshot = await getDocs(schedulesQuery);
        let earned = 0;
        for (const doc of schedulesSnapshot.docs) {
          const schedule = doc.data() as ScheduleRequest;
          const hours = calculateHours(schedule.startTime, schedule.endTime);
          const hourlyRate = currentUser.hourlyRate || 0;
          earned += hours * hourlyRate;
        }
        setTotalEarned(earned);
      } catch (err) {
        console.error('Error calculating totals:', err);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Payment Summary
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography color="text.secondary" gutterBottom>
          Total Earned
        </Typography>
        <Typography variant="h4">
          ${totalEarned.toFixed(2)}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography color="text.secondary" gutterBottom>
          Total Paid
        </Typography>
        <Typography variant="h4" color="success.main">
          ${totalPaid.toFixed(2)}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography color="text.secondary" gutterBottom>
          Pending Payments
        </Typography>
        <Typography variant="h4" color="warning.main">
          ${totalPending.toFixed(2)}
        </Typography>
      </Box>

      <Box>
        <Typography color="text.secondary" gutterBottom>
          Remaining Balance
        </Typography>
        <Typography variant="h4" color="error.main">
          ${(totalEarned - totalPaid - totalPending).toFixed(2)}
        </Typography>
      </Box>
    </Paper>
  );
}; 