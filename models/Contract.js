import mongoose from 'mongoose';

const contractSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  parentId: String,
  noticeIdentifier: String,
  title: {
    type: String,
    required: true
  },
  description: String,
  cpvDescription: String,
  cpvDescriptionExpanded: String,
  publishedDate: Date,
  deadlineDate: Date,
  awardedDate: Date,
  awardedValue: Number,
  awardedSupplier: String,
  approachMarketDate: Date,
  valueLow: Number,
  valueHigh: Number,
  postcode: String,
  coordinates: String,
  isSubNotice: Boolean,
  noticeType: String,
  noticeStatus: String,
  isSuitableForSme: Boolean,
  isSuitableForVco: Boolean,
  lastNotifableUpdate: Date,
  organisationName: {
    type: String,
    required: true
  },
  sector: String,
  cpvCodes: String,
  cpvCodesExtended: String,
  region: String,
  regionText: String,
  start: Date,
  end: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // AI Rating fields
  aiRating: {
    score: {
      type: Number,
      min: 0,
      max: 10
    },
    relevance: {
      type: String,
      enum: ['low', 'medium', 'high', 'excellent']
    },
    explanation: {
      type: String
    },
    opportunityDescription: {
      type: String
    },
    matchReasons: [{
      type: String
    }],
    ratedAt: {
      type: Date
    },
    ratedBy: {
      type: String,
      default: 'AI'
    }
  },
  // Human Reviewer Rating fields
  reviewerRating: {
    score: {
      type: Number,
      min: 0,
      max: 10
    },
    relevance: {
      type: String,
      enum: ['low', 'medium', 'high', 'excellent']
    },
    comments: {
      type: String
    },
    ratedAt: {
      type: Date
    },
    ratedBy: {
      type: String
    },
    reviewerName: {
      type: String
    }
  },
  // HubSpot Deal Tracking fields
  hubspotDeal: {
    dealId: {
      type: String,
      index: true
    },
    dealUrl: String,
    createdAt: {
      type: Date
    },
    createdBy: {
      type: String
    },
    dealName: String,
    dealAmount: Number,
    dealStage: String,
    lastSynced: {
      type: Date
    }
  }
});

// Update the updatedAt field before saving
contractSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Contract', contractSchema); 