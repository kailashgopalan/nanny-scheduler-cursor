import React from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import { PaymentSummary } from './PaymentSummary';
import { PaymentHistory } from './PaymentHistory';
import { PaymentActions } from './PaymentActions';

export const PaymentPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Payments
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <PaymentSummary />
        </Grid>
        
        <Grid item xs={12} md={8}>
          <PaymentActions />
          <PaymentHistory />
        </Grid>
      </Grid>
    </Box>
  );
}; 