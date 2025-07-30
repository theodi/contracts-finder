import express from 'express';
import Contract from '../models/Contract.js';
import { triggerManualSearch } from '../services/scheduler.js';
import { checkAndRunInitialImport } from '../services/initialImport.js';
import { rateContract, rateUnratedContracts } from '../services/aiRating.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import hubspotService from '../services/hubspotService.js';

const router = express.Router();

// List all contracts with DataTables support
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const page = {
      title: "Contracts",
      link: "/contracts"
    };
    res.locals.page = page;
    res.render('pages/contracts/index');
  } catch (error) {
    console.error('Error rendering contracts page:', error);
    res.status(500).send('Internal Server Error');
  }
});

// API endpoint for DataTables
router.get('/api/data', ensureAuthenticated, async (req, res) => {
  try {
    const { showMatchesOnly } = req.query;
    
    // Build query
    let query = {};
    
    // Filter for matches only if requested
    if (showMatchesOnly === 'true') {
      query['aiRating.relevance'] = { $in: ['high', 'excellent'] };
    }

    // Get all data for client-side processing
    const contracts = await Contract.find(query)
      .select('itemId title organisationName publishedDate deadlineDate valueLow valueHigh noticeStatus aiRating reviewerRating')
      .sort({ publishedDate: -1 });

    // Format data for DataTables
    const data = contracts.map(contract => {
      let ratingDisplay;
      let ratingScore = 0; // Default score for unrated contracts
      
      if (contract.aiRating?.score) {
        ratingDisplay = `<span class="label label-${getRatingColor(contract.aiRating.relevance)}">${contract.aiRating.score}/10</span>`;
        ratingScore = contract.aiRating.score;
      } else {
        ratingDisplay = `<button class="btn btn-sm btn-primary rate-single" data-item-id="${contract.itemId}"><i class="bi bi-star"></i> Rate</button>`;
      }
      
      // Add reviewer rating if available
      let reviewerDisplay = '';
      if (contract.reviewerRating?.score) {
        reviewerDisplay = `<span class="label label-${getRatingColor(contract.reviewerRating.relevance)}">${contract.reviewerRating.score}/10</span>`;
      }
      
      return [
        contract.organisationName,
        contract.title,
        contract.publishedDate ? new Date(contract.publishedDate).toISOString().split('T')[0] : '',
        contract.deadlineDate ? new Date(contract.deadlineDate).toISOString().split('T')[0] : '',
        contract.valueLow && contract.valueHigh ? `£${contract.valueLow.toLocaleString()} - £${contract.valueHigh.toLocaleString()}` : 'Not specified',
        ratingDisplay,
        reviewerDisplay,
        `<a href="/contracts/${contract.itemId}" class="btn btn-sm btn-primary">View Details</a>`,
        ratingScore // Hidden column for sorting
      ];
    });

    res.json({ data: data });
  } catch (error) {
    console.error('Error fetching contracts data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function getRatingColor(relevance) {
  switch (relevance) {
    case 'excellent': return 'success';
    case 'high': return 'info';
    case 'medium': return 'warning';
    case 'low': return 'danger';
    default: return 'default';
  }
}

function getRatingPanelClass(relevance) {
  switch (relevance) {
    case 'excellent': return 'success';
    case 'high': return 'info';
    case 'medium': return 'warning';
    case 'low': return 'danger';
    default: return 'default';
  }
}

// View contract details
router.get('/:itemId', ensureAuthenticated, async (req, res) => {
  try {
    const contract = await Contract.findOne({ itemId: req.params.itemId });
    
    if (!contract) {
      return res.status(404).render('errors/404');
    }

    const page = {
      title: contract.title,
      link: "/contracts"
    };
    res.locals.page = page;
    res.locals.contract = contract;
    res.locals.getRatingPanelClass = getRatingPanelClass;
    res.locals.getRatingColor = getRatingColor;
    res.render('pages/contracts/detail');
  } catch (error) {
    console.error('Error fetching contract details:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Manual search trigger
router.post('/search', ensureAuthenticated, async (req, res) => {
  try {
    const { keyword = 'data' } = req.body;
    const result = await triggerManualSearch(keyword);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error triggering manual search:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initial import trigger
router.post('/initial-import', ensureAuthenticated, async (req, res) => {
  try {
    const result = await checkAndRunInitialImport();
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error triggering initial import:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rate specific contract
router.post('/rate/:itemId', ensureAuthenticated, async (req, res) => {
  try {
    const result = await rateContract(req.params.itemId);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error rating contract:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rate all unrated contracts
router.post('/rate-all', ensureAuthenticated, async (req, res) => {
  try {
    const result = await rateUnratedContracts();
    
    if (result.skipped) {
      res.json({ 
        success: true, 
        result,
        message: `Rating skipped: ${result.reason}`
      });
    } else {
      res.json({ success: true, result });
    }
  } catch (error) {
    console.error('Error rating contracts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add/Update reviewer rating
router.post('/reviewer-rate/:itemId', ensureAuthenticated, async (req, res) => {
  try {
    const { score, relevance, comments } = req.body;
    const itemId = req.params.itemId;
    
    // Validate input
    if (!score || !relevance) {
      return res.status(400).json({ success: false, error: 'Score and relevance are required' });
    }
    
    if (score < 0 || score > 10) {
      return res.status(400).json({ success: false, error: 'Score must be between 0 and 10' });
    }
    
    const validRelevance = ['low', 'medium', 'high', 'excellent'];
    if (!validRelevance.includes(relevance)) {
      return res.status(400).json({ success: false, error: 'Invalid relevance value' });
    }
    
    // Get user info
    const user = req.user;
    const reviewerName = user.displayName || user.first_name || user.email || 'Unknown';
    
    // Update the contract with reviewer rating
    const updatedContract = await Contract.findOneAndUpdate(
      { itemId: itemId },
      {
        'reviewerRating.score': parseInt(score),
        'reviewerRating.relevance': relevance,
        'reviewerRating.comments': comments || '',
        'reviewerRating.ratedAt': new Date(),
        'reviewerRating.ratedBy': user.id || user.email,
        'reviewerRating.reviewerName': reviewerName
      },
      { new: true }
    );
    
    if (!updatedContract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    
    res.json({ 
      success: true, 
      result: {
        score: updatedContract.reviewerRating.score,
        relevance: updatedContract.reviewerRating.relevance,
        comments: updatedContract.reviewerRating.comments,
        reviewerName: updatedContract.reviewerRating.reviewerName,
        ratedAt: updatedContract.reviewerRating.ratedAt
      }
    });
  } catch (error) {
    console.error('Error adding reviewer rating:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create HubSpot deal from contract
router.post('/:itemId/create-hubspot-deal', ensureAuthenticated, async (req, res) => {
  try {
    const contract = await Contract.findOne({ itemId: req.params.itemId });
    
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    // Check if deal already exists
    if (contract.hubspotDeal?.dealId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Deal already exists for this contract',
        existingDeal: contract.hubspotDeal
      });
    }

    // Check HubSpot for existing deal
    const existingDeal = await hubspotService.findExistingDeal(contract.itemId);
    if (existingDeal) {
      // Update contract with existing deal info
      contract.hubspotDeal = {
        dealId: existingDeal.id,
        dealUrl: `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID}/deal/${existingDeal.id}`,
        createdAt: new Date(),
        createdBy: req.user.displayName || req.user.email,
        dealName: existingDeal.properties.dealname,
        dealAmount: parseFloat(existingDeal.properties.amount || 0),
        dealStage: existingDeal.properties.dealstage,
        lastSynced: new Date()
      };
      await contract.save();

      return res.json({ 
        success: true, 
        message: 'Existing deal found and linked',
        deal: contract.hubspotDeal
      });
    }

    // Create new deal
    const dealResult = await hubspotService.createDeal(contract, req.user);
    
    // Update contract with deal information
    contract.hubspotDeal = {
      dealId: dealResult.dealId,
      dealUrl: dealResult.dealUrl,
      createdAt: new Date(),
      createdBy: req.user.displayName || req.user.email,
      dealName: contract.title,
      dealAmount: parseFloat(dealResult.deal.properties.amount || 0),
      dealStage: dealResult.deal.properties.dealstage,
      lastSynced: new Date()
    };
    await contract.save();

    res.json({ 
      success: true, 
      message: 'Deal created successfully',
      deal: contract.hubspotDeal
    });
  } catch (error) {
    console.error('Error creating HubSpot deal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get HubSpot deal status
router.get('/:itemId/hubspot-deal', ensureAuthenticated, async (req, res) => {
  try {
    const contract = await Contract.findOne({ itemId: req.params.itemId });
    
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }

    if (!contract.hubspotDeal?.dealId) {
      return res.json({ 
        success: true, 
        hasDeal: false,
        message: 'No deal created yet'
      });
    }

    // Get latest deal info from HubSpot
    try {
      const deal = await hubspotService.getDeal(contract.hubspotDeal.dealId);
      
      // Update contract with latest deal info
      contract.hubspotDeal.dealName = deal.properties.dealname;
      contract.hubspotDeal.dealAmount = parseFloat(deal.properties.amount || 0);
      contract.hubspotDeal.dealStage = deal.properties.dealstage;
      contract.hubspotDeal.lastSynced = new Date();
      await contract.save();

      res.json({ 
        success: true, 
        hasDeal: true,
        deal: contract.hubspotDeal
      });
    } catch (hubspotError) {
      // If we can't fetch from HubSpot, return stored data
      res.json({ 
        success: true, 
        hasDeal: true,
        deal: contract.hubspotDeal,
        warning: 'Could not fetch latest data from HubSpot'
      });
    }
  } catch (error) {
    console.error('Error getting HubSpot deal status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test HubSpot connection
router.get('/test-hubspot', ensureAuthenticated, async (req, res) => {
  try {
    const result = await hubspotService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('Error testing HubSpot connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router; 