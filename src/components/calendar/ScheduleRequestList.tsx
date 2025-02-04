import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Chip, List, ListItem, ListItemText } from '@mui/material';
import { format } from 'date-fns';
import { useAuth } from '../auth/AuthProvider';
import { db } from '../../utils/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { ScheduleRequest } from '../../types';
import { calculateHours, calculateAmount } from '../../utils/paymentUtils';
import { Delete, Edit } from '@mui/icons-material';
import { IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { parse, format as formatDate } from 'date-fns';

export const ScheduleRequestList: React.FC = () => {
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [editingRequest, setEditingRequest] = useState<ScheduleRequest | null>(null);
  const [editStartTime, setEditStartTime] = useState<Date | null>(null);
  const [editEndTime, setEditEndTime] = useState<Date | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'scheduleRequests'),
      where(
        currentUser.role === 'employer' ? 'employerId' : 'nannyId',
        '==',
        currentUser.uid
      ),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      })) as ScheduleRequest[];

      console.log('Fetched requests:', requestData);
      setRequests(requestData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!currentUser) return;
    
    try {
      const requestRef = doc(db, 'scheduleRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      const requestData = requestDoc.data() as ScheduleRequest;
      
      await updateDoc(requestRef, { status });

      // Remove the automatic payment creation
      // Only update the schedule request status
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    
    try {
      await deleteDoc(doc(db, 'scheduleRequests', requestId));
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const handleEdit = (request: ScheduleRequest) => {
    setEditingRequest(request);
    setEditStartTime(parse(request.startTime, 'HH:mm', new Date()));
    setEditEndTime(parse(request.endTime, 'HH:mm', new Date()));
  };

  const handleSaveEdit = async () => {
    if (!editingRequest || !editStartTime || !editEndTime) return;

    try {
      await updateDoc(doc(db, 'scheduleRequests', editingRequest.id), {
        startTime: formatDate(editStartTime, 'HH:mm'),
        endTime: formatDate(editEndTime, 'HH:mm'),
      });
      setEditingRequest(null);
      setEditStartTime(null);
      setEditEndTime(null);
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  if (!requests.length) return null;

  return (
    <Paper sx={{ mt: 3, p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Schedule Requests
      </Typography>
      <List>
        {requests.map((request) => (
          <ListItem key={request.id}>
            <ListItemText
              primary={format(request.date, 'MMM d, yyyy')}
              secondary={`${request.startTime} - ${request.endTime}`}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {currentUser?.role === 'nanny' && request.status === 'pending' && (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => handleUpdateStatus(request.id, 'approved')}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleUpdateStatus(request.id, 'rejected')}
                  >
                    Reject
                  </Button>
                </>
              )}
              <Chip
                label={request.status}
                color={
                  request.status === 'approved' ? 'success' :
                  request.status === 'rejected' ? 'error' :
                  'warning'
                }
                size="small"
              />
              {currentUser?.role === 'employer' && (
                <>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleEdit(request)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(request.id)}
                  >
                    <Delete />
                  </IconButton>
                </>
              )}
            </Box>
          </ListItem>
        ))}
      </List>

      <Dialog open={Boolean(editingRequest)} onClose={() => setEditingRequest(null)}>
        <DialogTitle>Edit Schedule Request</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TimePicker
                label="Start Time"
                value={editStartTime}
                onChange={(newValue) => setEditStartTime(newValue)}
              />
              <TimePicker
                label="End Time"
                value={editEndTime}
                onChange={(newValue) => setEditEndTime(newValue)}
              />
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingRequest(null)}>Cancel</Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained"
            disabled={!editStartTime || !editEndTime}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}; 