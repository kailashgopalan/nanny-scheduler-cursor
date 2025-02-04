import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  IconButton,
  Chip,
  Alert
} from '@mui/material';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, arrayRemove, arrayUnion, documentId } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../auth/AuthProvider';
import { User } from '../../types';
import { Delete, PersonAdd } from '@mui/icons-material';

export const ManageRelationships: React.FC = () => {
  const [linkedUsers, setLinkedUsers] = useState<User[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const { currentUser, linkNannyToEmployer, unlinkNannyFromEmployer } = useAuth();
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Fetch linked users
  useEffect(() => {
    if (!currentUser) return;

    const linkedIds = currentUser.role === 'employer' 
      ? currentUser.linkedNannies 
      : currentUser.linkedEmployers;

    // Don't query if there are no linked users
    if (!linkedIds?.length) {
      setLinkedUsers([]);
      return;
    }

    try {
      // Make sure we have a valid array of IDs
      if (!Array.isArray(linkedIds) || linkedIds.length === 0) {
        setLinkedUsers([]);
        return;
      }

      // Only create query if we have linked users
      const q = query(
        collection(db, 'users'),
        where(documentId(), 'in', linkedIds)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
          linkedNannies: doc.data().linkedNannies || [],
          linkedEmployers: doc.data().linkedEmployers || []
        })) as User[];
        setLinkedUsers(users);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching linked users:', error);
      setLinkedUsers([]);
    }
  }, [currentUser]);

  // Add useEffect to fetch pending users
  useEffect(() => {
    if (!currentUser) {
      console.log('No current user');
      return;
    }

    console.log('Current user in pending effect:', {
      uid: currentUser.uid,
      role: currentUser.role,
      pendingEmployers: currentUser.pendingEmployers,
      pendingNannies: currentUser.pendingNannies
    });

    const pendingIds = currentUser.role === 'nanny' 
      ? (currentUser.pendingEmployers || [])
      : (currentUser.pendingNannies || []);

    console.log('Pending IDs:', pendingIds);

    if (!pendingIds?.length) {
      console.log('No pending IDs found');
      setPendingUsers([]);
      return;
    }

    try {
      // Make sure we have a valid array of IDs
      if (!Array.isArray(pendingIds) || pendingIds.length === 0) {
        console.log('Invalid pending IDs array');
        setPendingUsers([]);
        return;
      }

      console.log('Creating query with IDs:', pendingIds);

      const q = query(
        collection(db, 'users'),
        where(documentId(), 'in', pendingIds)
      );

      console.log('Fetching pending users with query:', q);

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('Pending users snapshot:', {
          empty: snapshot.empty,
          size: snapshot.size,
          docs: snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }))
        });
        
        if (snapshot.empty) {
          console.log('No pending users found in snapshot');
          setPendingUsers([]);
          return;
        }

        const users = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            ...data,
            linkedNannies: data.linkedNannies || [],
            linkedEmployers: data.linkedEmployers || [],
            pendingNannies: data.pendingNannies || [],
            pendingEmployers: data.pendingEmployers || []
          } as User;
        });

        console.log('Setting pending users:', users);
        setPendingUsers(users);
      }, (error) => {
        console.error('Error in pending users snapshot:', error);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up pending users query:', error);
      setPendingUsers([]);
    }
  }, [currentUser]);

  const handleSearch = async () => {
    if (!searchTerm || !currentUser) return;

    try {
      const targetRole = currentUser.role === 'employer' ? 'nanny' : 'employer';
      
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('role', '==', targetRole)
      );

      const snapshot = await getDocs(q);
      
      const results = snapshot.docs
        .map(doc => ({
          uid: doc.id,
          ...doc.data(),
          linkedNannies: doc.data().linkedNannies || [],
          linkedEmployers: doc.data().linkedEmployers || [],
          pendingNannies: doc.data().pendingNannies || [],
          pendingEmployers: doc.data().pendingEmployers || []
        } as User))
        .filter(user => {
          // Name match
          const nameMatch = user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
          if (!nameMatch) return false;

          // Skip self
          if (user.uid === currentUser.uid) return false;

          // Check if already linked or pending
          if (currentUser.role === 'employer') {
            return !currentUser.linkedNannies?.includes(user.uid) && 
                   !user.pendingEmployers?.includes(currentUser.uid);
          } else {
            return !currentUser.linkedEmployers?.includes(user.uid) && 
                   !currentUser.pendingEmployers?.includes(user.uid);
          }
        });

      console.log('Search results:', {
        term: searchTerm,
        currentUserRole: currentUser.role,
        results
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error in search:', error);
    }
  };

  // Add a useEffect to clear results when search term changes
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const handleLink = async (userId: string) => {
    if (!currentUser) return;

    try {
      if (currentUser.role === 'employer') {
        await linkNannyToEmployer(userId, currentUser.uid);
        setStatusMessage({
          type: 'success',
          text: 'Link request sent to nanny. They will need to accept the request.'
        });
      } else {
        await linkNannyToEmployer(currentUser.uid, userId);
        setStatusMessage({
          type: 'success',
          text: 'Successfully accepted the link request.'
        });
      }
      setIsSearchOpen(false);
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error linking users:', error);
      setStatusMessage({
        type: 'error',
        text: 'Error linking users. Please try again.'
      });
    }
  };

  const handleUnlink = async (userId: string) => {
    if (!currentUser || !window.confirm('Are you sure you want to remove this link?')) return;

    try {
      if (currentUser.role === 'employer') {
        await unlinkNannyFromEmployer(userId, currentUser.uid);
      } else {
        await unlinkNannyFromEmployer(currentUser.uid, userId);
      }
    } catch (error) {
      console.error('Error unlinking users:', error);
    }
  };

  const handleResetLinks = async () => {
    if (!currentUser || !window.confirm('Are you sure you want to reset all links? This cannot be undone.')) return;

    try {
      // Get the current user's document reference
      const userRef = doc(db, 'users', currentUser.uid);

      // Only update the current user's document
      if (currentUser.role === 'employer') {
        await updateDoc(userRef, {
          linkedNannies: []
        });
      } else {
        await updateDoc(userRef, {
          linkedEmployers: []
        });
      }

      // Clear local state
      setLinkedUsers([]);

      // Show success message
      alert('Links have been reset. You may need to ask the other users to reset their links as well.');

    } catch (error) {
      console.error('Error resetting links:', error);
      alert('Error resetting links. Please try again.');
    }
  };

  const handleRejectLink = async (userId: string) => {
    if (!currentUser || !window.confirm('Are you sure you want to reject this request?')) return;

    try {
      // Get the current user's document reference
      const userRef = doc(db, 'users', currentUser.uid);

      // Remove from pending arrays based on role
      if (currentUser.role === 'nanny') {
        await updateDoc(userRef, {
          pendingEmployers: arrayRemove(userId)
        });
      } else {
        await updateDoc(userRef, {
          pendingNannies: arrayRemove(userId)
        });
      }

      // Update local state
      setPendingUsers(prev => prev.filter(user => user.uid !== userId));
    } catch (error) {
      console.error('Error rejecting link request:', error);
      alert('Error rejecting request. Please try again.');
    }
  };

  console.log('Pre-render state:', {
    currentUser: currentUser?.role,
    pendingUsers,
    pendingLength: pendingUsers.length,
    linkedUsers,
    shouldShowPending: pendingUsers.length > 0
  });

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {currentUser?.role === 'employer' ? 'Your Nannies' : 'Your Employers'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="error"
            onClick={handleResetLinks}
          >
            Reset All Links
          </Button>
          <Button
            startIcon={<PersonAdd />}
            variant="contained"
            onClick={() => setIsSearchOpen(true)}
          >
            Add {currentUser?.role === 'employer' ? 'Nanny' : 'Employer'}
          </Button>
        </Box>
      </Box>

      {statusMessage && (
        <Alert 
          severity={statusMessage.type}
          onClose={() => setStatusMessage(null)}
          sx={{ mt: 2 }}
        >
          {statusMessage.text}
        </Alert>
      )}

      {pendingUsers.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 2, mb: 2, color: 'primary.main' }}>
            Pending Requests ({pendingUsers.length})
          </Typography>
          <Paper elevation={3} sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
            <List>
              {pendingUsers.map((user) => (
                <ListItem key={user.uid} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 1 }}>
                  <ListItemText 
                    primary={user.displayName}
                    secondary={`${user.email} (${user.role})`}
                  />
                  {user.role === 'nanny' && (
                    <Chip 
                      label={`$${user.hourlyRate}/hr`}
                      size="small"
                      sx={{ mr: 2 }}
                    />
                  )}
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleLink(user.uid)}
                    sx={{ mr: 1 }}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleRejectLink(user.uid)}
                  >
                    Reject
                  </Button>
                </ListItem>
              ))}
            </List>
          </Paper>
        </>
      )}

      <List>
        {linkedUsers.map((user) => (
          <ListItem key={user.uid}>
            <ListItemText 
              primary={user.displayName}
              secondary={
                <>
                  {user.email}
                  <br />
                  {user.role === 'nanny' ? 
                    `Hourly Rate: $${user.hourlyRate}/hr` : 
                    'Employer'
                  }
                </>
              }
            />
            <ListItemSecondaryAction>
              <IconButton 
                edge="end" 
                color="error"
                onClick={() => handleUnlink(user.uid)}
              >
                <Delete />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {linkedUsers.length === 0 && (
        <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
          {currentUser?.role === 'employer' ? 
            'No nannies linked yet. Search above to find and link with nannies.' : 
            'No employers linked yet. Wait for employers to send you link requests.'
          }
        </Typography>
      )}

      <Dialog 
        open={isSearchOpen} 
        onClose={() => {
          setIsSearchOpen(false);
          setSearchTerm('');
          setSearchResults([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Find {currentUser?.role === 'employer' ? 'Nanny' : 'Employer'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={`Search for ${currentUser?.role === 'employer' ? 'nanny' : 'employer'} by name`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              helperText={`Enter name to search for ${currentUser?.role === 'employer' ? 'nannies' : 'employers'}`}
            />
            <Button 
              onClick={handleSearch}
              variant="contained"
              disabled={!searchTerm}
              fullWidth
            >
              Search
            </Button>
          </Box>

          {searchResults.length > 0 ? (
            <List sx={{ mt: 2 }}>
              {searchResults.map((user) => (
                <ListItem key={user.uid}>
                  <ListItemText 
                    primary={user.displayName}
                    secondary={user.email}
                  />
                  {user.role === 'nanny' && user.hourlyRate && (
                    <Chip 
                      label={`$${user.hourlyRate}/hr`}
                      size="small"
                      sx={{ mr: 2 }}
                    />
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleLink(user.uid)}
                  >
                    Link
                  </Button>
                </ListItem>
              ))}
            </List>
          ) : searchTerm ? (
            <Typography color="text.secondary" align="center" sx={{ mt: 2 }}>
              No results found. Try a different search term.
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsSearchOpen(false);
            setSearchTerm('');
            setSearchResults([]);
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}; 