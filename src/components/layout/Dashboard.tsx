import React from 'react';
import { 
  AppBar, 
  Box, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography 
} from '@mui/material';
import {
  Menu as MenuIcon,
  CalendarMonth,
  Payment,
  ExitToApp
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { auth } from '../../utils/firebase';
import { UpdateNannyRate } from '../auth/UpdateNannyRate';
import { ManageRelationships } from '../relationships/ManageRelationships';

const DRAWER_WIDTH = 240;

export const Dashboard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Calendar', icon: <CalendarMonth />, path: '/dashboard' },
    { text: 'Payments', icon: <Payment />, path: '/dashboard/payments' },
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap>
          {currentUser?.role === 'employer' ? 'Parent Dashboard' : 'Nanny Dashboard'}
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            onClick={() => navigate(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        <ListItem button onClick={handleSignOut}>
          <ListItemIcon><ExitToApp /></ListItemIcon>
          <ListItemText primary="Sign Out" />
        </ListItem>
      </List>
      {currentUser?.role === 'nanny' && (
        <Box sx={{ p: 2 }}>
          <UpdateNannyRate />
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{ width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` }, ml: { sm: `${DRAWER_WIDTH}px` } }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Nanny Scheduler
            </Typography>
          </Box>
          
          <Typography variant="subtitle1" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Welcome, {currentUser?.displayName} ({currentUser?.role})
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8
        }}
      >
        <Box sx={{ p: 3 }}>
          <ManageRelationships />
          {children}
        </Box>
      </Box>
    </Box>
  );
}; 