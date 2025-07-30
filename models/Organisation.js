import mongoose from 'mongoose';

const organisationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  industry: {
    type: String,
    required: true
  },
  size: {
    type: String,
    enum: ['startup', 'small', 'medium', 'large'],
    required: true
  },
  capabilities: [{
    type: String
  }],
  interests: [{
    type: String
  }],
  exclusions: [{
    type: String
  }],
  searchKeywords: [{
    type: String
  }],
  location: {
    type: String
  },
  website: {
    type: String
  },
  contactEmail: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
organisationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Organisation', organisationSchema); 