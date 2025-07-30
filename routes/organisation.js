import express from 'express';
import Organisation from '../models/Organisation.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Show organisation profile page
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const organisation = await Organisation.findOne({});
    const page = {
      title: "Organisation Profile",
      link: "/organisation"
    };
    res.locals.page = page;
    res.locals.organisation = organisation;
    res.render('pages/organisation/index');
  } catch (error) {
    console.error('Error rendering organisation page:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Update organisation profile
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const {
      name,
      description,
      industry,
      size,
      capabilities,
      interests,
      exclusions,
      searchKeywords,
      location,
      website,
      contactEmail
    } = req.body;

    // Validate required fields
    if (!name || !description || !industry || !size) {
      req.flash('error', 'Please fill in all required fields (Name, Description, Industry, and Size)');
      return res.redirect('/organisation');
    }

    // Parse arrays from form data
    const capabilitiesArray = capabilities ? capabilities.split(',').map(c => c.trim()).filter(c => c) : [];
    const interestsArray = interests ? interests.split(',').map(i => i.trim()).filter(i => i) : [];
    const exclusionsArray = exclusions ? exclusions.split(',').map(e => e.trim()).filter(e => e) : [];
    const searchKeywordsArray = searchKeywords ? searchKeywords.split(',').map(k => k.trim()).filter(k => k) : ['data'];

    const organisationData = {
      name,
      description,
      industry,
      size,
      capabilities: capabilitiesArray,
      interests: interestsArray,
      exclusions: exclusionsArray,
      searchKeywords: searchKeywordsArray,
      location,
      website,
      contactEmail
    };

    // Check if organisation already exists
    const existingOrganisation = await Organisation.findOne({});
    
    if (existingOrganisation) {
      // Update existing organisation
      await Organisation.findOneAndUpdate({}, organisationData, { new: true });
      req.flash('success', 'Organisation profile updated successfully!');
    } else {
      // Create new organisation
      await new Organisation(organisationData).save();
      req.flash('success', 'Organisation profile created successfully!');
    }

    res.redirect('/organisation');
  } catch (error) {
    console.error('Error updating organisation profile:', error);
    req.flash('error', 'Error updating organisation profile: ' + error.message);
    res.redirect('/organisation');
  }
});

export default router; 