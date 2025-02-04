import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Chip,
} from '@mui/material';
import { format } from 'date-fns';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../../utils/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, getDoc, doc } from 'firebase/firestore';
import { User } from '../../types';

interface RequestScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  dates: Date[];
}

interface NannyOption {
  id: string;
  displayName: string;
  hourlyRate: number;
}

export const RequestScheduleDialog: React.FC<RequestScheduleDialogProps> = ({
  open,
  onClose,
  dates,
}) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [error, setError] = useState<string | null>(null);
  const [nannies, setNannies] = useState<NannyOption[]>([]);
  const [selectedNanny, setSelectedNanny] = useState<string>('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchNannies = async () => {
      try {
        const nannyQuery = query(
          collection(db, 'users'),
          where('role', '==', 'nanny')
        );
        const nannySnapshot = await getDocs(nannyQuery);
        
        const nannyOptions = nannySnapshot.docs.map(doc => ({
          id: doc.id,
          displayName: doc.data().displayName,
          hourlyRate: doc.data().hourlyRate || 0,
        }));
        
        setNannies(nannyOptions);
      } catch (error) {
        console.error('Error fetching nannies:', error);
        setError('Failed to load nannies');
      }
    };

    fetchNannies();
  }, []);

  const calculateTotalCost = () => {
    if (!selectedNanny) return 0;
    const nanny = nannies.find(n => n.id === selectedNanny);
    if (!nanny) return 0;

    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const hoursPerDay = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    return hoursPerDay * nanny.hourlyRate * dates.length;
  };

  const handleSubmit = async () => {
    if (!currentUser || !selectedNanny) return;
    setError(null);

    try {
      const nannyDoc = await getDoc(doc(db, 'users', selectedNanny));
      const nannyData = nannyDoc.data();
      const hourlyRate = nannyData?.hourlyRate || 0;

      console.log('Creating schedule request with:', {
        selectedNanny,
        nannyData,
        hourlyRate
      });

      const requests = dates.map(date => {
        const request = {
          date: Timestamp.fromDate(date),
          startTime,
          endTime,
          status: 'pending',
          employerId: currentUser.uid,
          nannyId: selectedNanny,
          hourlyRate,
          createdAt: Timestamp.fromDate(new Date())
        };
        console.log('Request data:', request);
        return request;
      });

      await Promise.all(
        requests.map(request => 
          addDoc(collection(db, 'scheduleRequests'), request)
        )
      );

      onClose();
    } catch (error) {
      console.error('Error creating schedule requests:', error);
      setError('Failed to create schedule requests');
    }
  };

  const selectedNannyRate = nannies.find(n => n.id === selectedNanny)?.hourlyRate || 0;
  const totalCost = calculateTotalCost();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Schedule Request for {dates.length} {dates.length === 1 ? 'Day' : 'Days'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Selected Dates:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {dates.map(date => (
              <Chip
                key={date.toISOString()}
                label={format(date, 'MMM d, yyyy')}
                size="small"
              />
            ))}
          </Box>

          <FormControl fullWidth>
            <InputLabel>Select Nanny</InputLabel>
            <Select
              value={selectedNanny}
              onChange={(e) => setSelectedNanny(e.target.value)}
              label="Select Nanny"
            >
              {nannies.map((nanny) => (
                <MenuItem key={nanny.id} value={nanny.id}>
                  {nanny.displayName} (${nanny.hourlyRate}/hour)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Start Time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
              fullWidth
            />
            <TextField
              label="End Time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
              fullWidth
            />
          </Box>

          {selectedNanny && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Rate: ${selectedNannyRate}/hour
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Hours per day: {((new Date(`1970-01-01T${endTime}`).getTime() - new Date(`1970-01-01T${startTime}`).getTime()) / (1000 * 60 * 60)).toFixed(1)}
              </Typography>
              <Typography variant="h6" color="primary">
                Total Estimated Cost: ${totalCost.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={!selectedNanny}
        >
          Schedule {dates.length} {dates.length === 1 ? 'Day' : 'Days'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 