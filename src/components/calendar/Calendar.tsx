import React, { useState } from 'react';
import { Box, IconButton, Typography, Paper, Grid, Button } from '@mui/material';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  addDays,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Delete as DeleteIcon } from '@mui/icons-material';
import { DayCell } from './DayCell';
import { useAuth } from '../auth/AuthProvider';
import { ScheduleRequestList } from './ScheduleRequestList';
import { RequestScheduleDialog } from './RequestScheduleDialog';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { currentUser } = useAuth();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Get array of week start dates
  const weekStarts = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 0 }
  );

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleDateClick = (date: Date) => {
    if (currentUser?.role !== 'employer') return;

    setSelectedDates(prev => {
      const exists = prev.some(d => isSameDay(d, date));
      if (exists) {
        return prev.filter(d => !isSameDay(d, date));
      } else {
        return [...prev, date];
      }
    });
  };

  const deleteBooking = async (bookingId: string) => {
    try {
      const bookingRef = doc(db, 'scheduleRequests', bookingId);
      await deleteDoc(bookingRef);
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  };

  return (
    <Box>
      {/* Calendar Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <IconButton onClick={handlePrevMonth} size="small">
          <ChevronLeft />
        </IconButton>
        <Button 
          onClick={handleToday} 
          variant="outlined" 
          size="small"
          sx={{ minWidth: 80 }}
        >
          TODAY
        </Button>
        <IconButton onClick={handleNextMonth} size="small">
          <ChevronRight />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1 }}>
          {format(currentDate, 'MMMM yyyy')}
        </Typography>
      </Box>

      {/* Weekday Headers */}
      <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', mb: 1 }}>
        {WEEKDAYS.map(day => (
          <Box 
            key={day}
            sx={{ 
              flex: 1,
              textAlign: 'center',
              py: 1,
              color: 'text.secondary',
              fontSize: '0.875rem'
            }}
          >
            {day}
          </Box>
        ))}
      </Box>

      {/* Calendar Weeks */}
      {weekStarts.map(weekStart => (
        <Box 
          key={weekStart.toISOString()}
          sx={{ 
            display: 'flex',
            borderBottom: 1,
            borderColor: 'divider',
            '&:last-child': {
              borderBottom: 0
            }
          }}
        >
          {Array.from({ length: 7 }).map((_, i) => {
            const date = addDays(weekStart, i);
            return (
              <Box 
                key={date.toISOString()}
                sx={{ 
                  flex: 1,
                  borderRight: i < 6 ? 1 : 0,
                  borderColor: 'divider',
                  minHeight: 100,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box 
                  sx={{
                    p: 1,
                    textAlign: 'center',
                    color: !isSameMonth(date, currentDate) ? 'text.disabled' : 
                           isToday(date) ? 'primary.main' : 'text.primary',
                    borderBottom: 1,
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="body2">
                    {format(date, 'd')}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <DayCell
                    date={date}
                    isSelected={selectedDates.some(d => isSameDay(d, date))}
                    onClick={() => handleDateClick(date)}
                    sx={{ 
                      opacity: isSameMonth(date, currentDate) ? 1 : 0.5,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      ))}

      {currentUser?.role === 'employer' && selectedDates.length > 0 && (
        <Button
          variant="contained"
          onClick={() => setIsDialogOpen(true)}
          sx={{ mt: 2 }}
        >
          Schedule Selected Days ({selectedDates.length})
        </Button>
      )}

      <RequestScheduleDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedDates([]);
        }}
        dates={selectedDates}
      />

      <ScheduleRequestList />
    </Box>
  );
}; 