import React, { useEffect, useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  Chip,
  Box,
  Button,
  Divider,
  Typography,
  IconButton
} from '@mui/material';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../auth/AuthProvider';
import { Payment } from '../../types';
import { format } from 'date-fns';
import { Delete as DeleteIcon } from '@mui/icons-material';

export const PaymentsList: React.FC = () => {
  const { currentUser } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'payments'),
      where(
        currentUser.role === 'employer' ? 'employerId' : 'nannyId',
        '==',
        currentUser.uid
      ),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const paymentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      })) as Payment[];

      setPayments(paymentData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handlePaymentAction = async (paymentId: string, action: 'approved' | 'rejected') => {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentRef, {
        status: action
      });
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const deletePayment = async (paymentId: string) => {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await deleteDoc(paymentRef);
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  const renderPaymentActions = (payment: Payment) => {
    if (currentUser?.role === 'nanny' && payment.status === 'pending') {
      return (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            color="success"
            onClick={() => handlePaymentAction(payment.id, 'approved')}
          >
            Accept
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => handlePaymentAction(payment.id, 'rejected')}
          >
            Reject
          </Button>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Chip
          label={payment.status}
          color={
            payment.status === 'approved' ? 'success' :
            payment.status === 'rejected' ? 'error' :
            'warning'
          }
          size="small"
        />
        {currentUser?.role === 'employer' && (
          <IconButton
            size="small"
            color="error"
            onClick={() => deletePayment(payment.id)}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </Box>
    );
  };

  if (payments.length === 0) {
    return (
      <Typography color="text.secondary" align="center">
        No payments found
      </Typography>
    );
  }

  return (
    <List>
      {payments.map((payment, index) => (
        <React.Fragment key={payment.id}>
          {index > 0 && <Divider />}
          <ListItem>
            <ListItemText
              primary={`$${payment.amount.toFixed(2)}`}
              secondary={
                <>
                  {format(payment.date, 'MMM d, yyyy')}
                  {payment.note && (
                    <Typography variant="body2" color="text.secondary">
                      Note: {payment.note}
                    </Typography>
                  )}
                  {currentUser?.role === 'nanny' ? 
                    `From: ${payment.employerName}` :
                    `To: ${payment.nannyName}`
                  }
                </>
              }
            />
            {renderPaymentActions(payment)}
          </ListItem>
        </React.Fragment>
      ))}
    </List>
  );
}; 