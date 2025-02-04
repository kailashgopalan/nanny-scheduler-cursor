import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { useAuth } from '../auth/AuthProvider';
import { format } from 'date-fns';

export const Notifications: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser?.notifications?.length) {
    return null;
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Notifications
      </Typography>
      <List>
        {currentUser.notifications.map((notification) => (
          <ListItem key={notification.id}>
            <ListItemText
              primary={notification.message}
              secondary={format(notification.createdAt, 'MMM d, yyyy h:mm a')}
            />
            {notification.status === 'unread' && (
              <Chip
                label="New"
                color="primary"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}; 