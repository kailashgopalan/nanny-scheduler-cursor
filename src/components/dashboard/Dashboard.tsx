import { Notifications } from '../notifications/Notifications';
import { useAuth } from '../auth/AuthProvider';
import { Box, Paper, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <Box>
      <Notifications />
      
      {currentUser?.pendingEmployers?.length > 0 && currentUser.role === 'nanny' && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" color="primary">
            Pending Link Requests
          </Typography>
          <Typography>
            You have {currentUser.pendingEmployers.length} pending employer{currentUser.pendingEmployers.length > 1 ? 's' : ''} waiting to connect.
            <Button 
              component={Link} 
              to="/relationships"
              sx={{ ml: 2 }}
              variant="contained"
            >
              Review Requests
            </Button>
          </Typography>
        </Paper>
      )}

      {/* Show current links summary */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">
          Your {currentUser?.role === 'employer' ? 'Nannies' : 'Employers'}
        </Typography>
        <Typography>
          {currentUser?.role === 'employer' 
            ? `You have ${currentUser.linkedNannies?.length || 0} linked nannies`
            : `You have ${currentUser.linkedEmployers?.length || 0} linked employers`
          }
        </Typography>
      </Paper>
      
      {/* Rest of dashboard content */}
    </Box>
  );
}; 