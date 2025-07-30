// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config({ path: "./.env" });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// index.js

import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import flash from 'connect-flash';
import passport from './passport.js'; // Import the auth module
import authRoutes from './routes/auth.js'; // Import the authentication routes module
import contractsRoutes from './routes/contracts.js'; // Import the contracts routes module
import organisationRoutes from './routes/organisation.js'; // Import the organisation routes module
import { startScheduler } from './services/scheduler.js'; // Import the scheduler
import { checkAndRunInitialImport } from './services/initialImport.js'; // Import the initial import service

const app = express();

// Helmet configuration with CSP that allows DataTables and other libraries
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://code.jquery.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3080'];
app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

const port = process.env.PORT || 3080;
app.set('view engine', 'ejs');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/contracts-finder').then(async () => {
  console.log('Connected to MongoDB');
  
  // Check and run initial import if database is empty
  await checkAndRunInitialImport();
  
  // Start the scheduler after MongoDB connection is established
  startScheduler();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Middleware for logging
import logger from 'morgan';
//app.use(logger('dev'));

// Middleware for parsing incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Other middleware and setup code...

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false, // Change to false
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

import { ensureAuthenticated } from './middleware/auth.js';

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Initialize Flash messages
app.use(flash());

app.use(function(req, res, next) {
  res.locals.user = req.session.passport ? req.session.passport.user : req.session.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

app.use((req, res, next) => {
  // Read package.json file
  fs.readFile(path.join(__dirname, 'package.json'), 'utf8', (err, data) => {
      if (err) {
          console.error('Error reading package.json:', err);
          return next();
      }

      try {
          const packageJson = JSON.parse(data);
          // Extract version from package.json
          var software = {};
          software.version = packageJson.version;
          software.homepage = packageJson.homepage;
          software.versionLink = packageJson.homepage + "/releases/tag/v" + packageJson.version;
          res.locals.software = software;
      } catch (error) {
          console.error('Error parsing package.json:', error);
      }
      next();
  });
});

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1.
  res.setHeader('Pragma', 'no-cache'); // HTTP 1.0.
  res.setHeader('Expires', '0'); // Proxies.
  next();
});

/* Setup public directory
 * Everything in her does not require authentication */

app.use(express.static(__dirname + '/public'));

// Use authentication routes
app.use('/auth', authRoutes);

// Use contracts routes
app.use('/contracts', contractsRoutes);

// Use organisation routes
app.use('/organisation', organisationRoutes);

app.get('/', function(req, res) {
  const page = {
    title: "ODI Template",
    link: "/"
  };
  res.locals.page = page;
  res.render('pages/home');
});

/* Setup private directory, everything in here requires authentication */

app.use('/private', ensureAuthenticated);
app.use('/private', express.static(__dirname + '/private'));

/* Example of a private route */

app.get('/private', ensureAuthenticated, function(req, res) {
  const page = {
    title: "Private",
    link: "/private"
  };
  res.locals.page = page;
  res.render('pages/private');
});

// Start server
app.listen(port , () => console.log('App listening on port ' + port));