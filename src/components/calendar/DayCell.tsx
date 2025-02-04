import React, { useEffect, useState } from 'react';
import { Box, Typography, SxProps, Theme, Chip } from '@mui/material';
import { format } from 'date-fns';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../auth/AuthProvider';
import { ScheduleRequest } from '../../types';

interface DayCellProps {
  date: Date;
  isSelected: boolean;
  onClick: () => void;
  sx?: SxProps<Theme>;
}

export const DayCell: React.FC<DayCellProps> = ({
  date,
  isSelected,
  onClick,
  sx = {}
}) => {
  const [scheduleStatus, setScheduleStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchScheduleStatus = async () => {
      if (!currentUser) return;

      try {
        // Base query without 'in' filter
        const baseQuery = query(
          collection(db, 'scheduleRequests'),
          where('date', '==', date),
          where(currentUser.role === 'employer' ? 'employerId' : 'nannyId', '==', currentUser.uid)
        );

        // Get base results
        const querySnapshot = await getDocs(baseQuery);
        let status = null;

        if (!querySnapshot.empty) {
          status = querySnapshot.docs[0].data().status;
        }

        setScheduleStatus(status);
      } catch (error) {
        console.error('Error fetching schedule status:', error);
        setScheduleStatus(null);
      }
    };

    fetchScheduleStatus();
  }, [currentUser, date]);

  return (
    <Box
      onClick={onClick}
      sx={{
        height: '100%',
        width: '100%',
        cursor: 'pointer',
        bgcolor: isSelected ? 'primary.light' : 'background.paper',
        transition: 'background-color 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        '&:hover': {
          bgcolor: isSelected ? 'primary.light' : 'action.hover',
        },
        ...sx
      }}
    >
      {scheduleStatus && (
        <Chip
          label={scheduleStatus}
          color={
            scheduleStatus === 'approved' ? 'success' :
            scheduleStatus === 'rejected' ? 'error' : 'warning'
          }
          size="small"
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: '80px'
          }}
        />
      )}
    </Box>
  );
}; 