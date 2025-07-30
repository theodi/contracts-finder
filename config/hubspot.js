export const hubspotConfig = {
  // Default pipeline and stage settings
  defaultPipeline: '0cd65f19-c96c-4170-881b-2993f2b89679',
  defaultStage: '3329847',
  
  // Custom property mappings for contracts
  customProperties: {
    contract_id: 'contract_id',
    organisation_name: 'organisation_name',
    contract_status: 'contract_status',
    contract_type: 'contract_type',
    contract_value_low: 'contract_value_low',
    contract_value_high: 'contract_value_high',
    contract_deadline: 'contract_deadline',
    contract_published_date: 'contract_published_date',
    contract_location: 'contract_location',
    contract_region: 'contract_region',
    contract_sector: 'contract_sector',
    contract_cpv_codes: 'contract_cpv_codes',
    ai_rating_score: 'ai_rating_score',
    ai_rating_relevance: 'ai_rating_relevance',
    reviewer_rating_score: 'reviewer_rating_score',
    reviewer_rating_relevance: 'reviewer_rating_relevance',
    created_by_user: 'created_by_user',
    created_from_contract_finder: 'created_from_contract_finder'
  },
  
  // Stage probability mappings
  stageProbabilities: {
    'appointmentscheduled': 20,
    'qualifiedtobuy': 40,
    'presentationscheduled': 60,
    'contractsent': 80,
    'closedwon': 100,
    'closedlost': 0
  },
  
  // Priority mappings based on AI rating
  priorityMappings: {
    'excellent': 'HIGH',
    'high': 'HIGH',
    'medium': 'MEDIUM',
    'low': 'LOW'
  },
  
  // Deal amount calculation preferences
  amountCalculation: {
    useAwardedValue: true,
    useAverageOfRange: true,
    useLowValue: false,
    useHighValue: false
  }
};

export default hubspotConfig; 