import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from '../../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button, Container, Typography, Box } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoogleSignIn = async (role: UserRole) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user document
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName,
          role: role,
          createdAt: new Date()
        });
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4
      }}>
        <Typography variant="h4" component="h1">
          Welcome to Nanny Scheduler
        </Typography>
        
        <Typography variant="h6" component="h2">
          Sign in as:
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column', width: '100%' }}>
          <Button
            variant="contained"
            startIcon={<GoogleIcon />}
            onClick={() => handleGoogleSignIn('employer')}
            fullWidth
            size="large"
          >
            Continue as Employer
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={() => handleGoogleSignIn('nanny')}
            fullWidth
            size="large"
          >
            Continue as Nanny
          </Button>
        </Box>
      </Box>
    </Container>
  );
}; 