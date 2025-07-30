// authRoutes.js

import express from 'express';
import passport from '../passport.js'; // Import the passport module

import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Authentication route for Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Authentication route for Django
router.get('/django',
  passport.authenticate('django')
);

// Callback endpoint for Google authentication
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/error' }),
  async (req, res) => {
    //console.log('Google callback - user authenticated:', req.isAuthenticated());
    //console.log('Google callback - user:', req.user);
    //console.log('Google callback - session:', req.session);
    
    req.session.authMethod = 'google';
    res.redirect('/contracts');
  }
);

// Callback endpoint for Django authentication
router.get('/django/callback',
  passport.authenticate('django', { failureRedirect: '/error' }),
  async (req, res) => {
    req.session.authMethod = 'django';
    await processLogin(req);
    res.redirect('/contracts');
  }
);

router.post('/logout', function(req, res, next){
  console.log('Logout requested - destroying session');
  req.logout(function(err) {
    if (err) { 
      console.error('Logout error:', err);
      return next(err); 
    }
    req.session.destroy(function(err) {
      if (err) {
        console.error('Session destroy error:', err);
        return next(err);
      }
      console.log('Logout successful - redirecting to home');
      res.redirect('/');
    });
  });
});

// GET logout route for direct access
router.get('/logout', function(req, res, next){
  console.log('GET logout requested - destroying session');
  req.logout(function(err) {
    if (err) { 
      console.error('Logout error:', err);
      return next(err); 
    }
    req.session.destroy(function(err) {
      if (err) {
        console.error('Session destroy error:', err);
        return next(err);
      }
      console.log('Logout successful - redirecting to home');
      res.redirect('/');
    });
  });
});

router.get('/profile', ensureAuthenticated, async (req, res) => {
  const page = {
    title: "Profile page",
    link: "/profile"
  };
  res.locals.page = page;
  res.render('pages/auth/profile');
});

export default router;