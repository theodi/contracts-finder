import { Client } from '@hubspot/api-client';
import dotenv from 'dotenv';
import hubspotConfig from '../config/hubspot.js';

dotenv.config();

class HubSpotService {
  constructor() {
    this.client = new Client({ accessToken: process.env.HUBSPOT_API_KEY });
  }

  /**
   * Create a new deal in HubSpot from contract data
   * @param {Object} contract - The contract object
   * @param {Object} user - The user creating the deal
   * @returns {Object} - The created deal information
   */
  async createDeal(contract, user) {
    try {
      // Prepare deal properties
      const dealProperties = {
        dealname: contract.title,
        amount: this.calculateDealAmount(contract),
        dealstage: hubspotConfig.defaultStage,
        pipeline: hubspotConfig.defaultPipeline,
        description: this.buildDealDescription(contract),
        closedate: this.getCloseDate(contract),
        //hs_priority: this.getPriority(contract),
        //hs_deal_stage_probability: this.getProbability(contract),
        // Custom properties for contract tracking
        /*
        [hubspotConfig.customProperties.contract_id]: contract.itemId,
        [hubspotConfig.customProperties.organisation_name]: contract.organisationName,
        [hubspotConfig.customProperties.contract_status]: contract.noticeStatus,
        [hubspotConfig.customProperties.contract_type]: contract.noticeType,
        [hubspotConfig.customProperties.contract_value_low]: contract.valueLow,
        [hubspotConfig.customProperties.contract_value_high]: contract.valueHigh,
        [hubspotConfig.customProperties.contract_deadline]: contract.deadlineDate,
        [hubspotConfig.customProperties.contract_published_date]: contract.publishedDate,
        [hubspotConfig.customProperties.contract_location]: contract.postcode,
        [hubspotConfig.customProperties.contract_region]: contract.region,
        [hubspotConfig.customProperties.contract_sector]: contract.sector,
        [hubspotConfig.customProperties.contract_cpv_codes]: contract.cpvCodes,
        [hubspotConfig.customProperties.ai_rating_score]: contract.aiRating?.score,
        [hubspotConfig.customProperties.ai_rating_relevance]: contract.aiRating?.relevance,
        [hubspotConfig.customProperties.reviewer_rating_score]: contract.reviewerRating?.score,
        [hubspotConfig.customProperties.reviewer_rating_relevance]: contract.reviewerRating?.relevance,
        [hubspotConfig.customProperties.created_by_user]: user.displayName || user.email,
        [hubspotConfig.customProperties.created_from_contract_finder]: true
        */
      };

      // Create the deal
      const deal = await this.client.crm.deals.basicApi.create({
        properties: dealProperties
      });

      return {
        success: true,
        dealId: deal.id,
        dealUrl: `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID}/deal/${deal.id}`,
        deal: deal
      };
    } catch (error) {
      console.error('Error creating HubSpot deal:', error);
      throw new Error(`Failed to create HubSpot deal: ${error.message}`);
    }
  }

  /**
   * Check if a deal already exists for this contract
   * @param {string} contractId - The contract itemId
   * @returns {Object|null} - The existing deal or null
   */
  async findExistingDeal(contractId) {
    try {
      const response = await this.client.crm.deals.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'contract_id',
            operator: 'EQ',
            value: contractId
          }]
        }],
        properties: ['dealname', 'amount', 'dealstage', 'contract_id', 'hs_object_id'],
        limit: 1
      });

      return response.results.length > 0 ? response.results[0] : null;
    } catch (error) {
      console.error('Error searching for existing deal:', error);
      return null;
    }
  }

  /**
   * Get deal by ID
   * @param {string} dealId - The HubSpot deal ID
   * @returns {Object} - The deal information
   */
  async getDeal(dealId) {
    try {
      const deal = await this.client.crm.deals.basicApi.getById(dealId, ['dealname', 'amount', 'dealstage', 'contract_id', 'hs_object_id']);
      return deal;
    } catch (error) {
      console.error('Error getting deal:', error);
      throw new Error(`Failed to get deal: ${error.message}`);
    }
  }

  /**
   * Calculate deal amount based on contract values
   */
  calculateDealAmount(contract) {
    const config = hubspotConfig.amountCalculation;
    
    if (config.useAwardedValue && contract.awardedValue) {
      return contract.awardedValue.toString();
    } else if (config.useAverageOfRange && contract.valueLow && contract.valueHigh) {
      return ((contract.valueLow + contract.valueHigh) / 2).toString();
    } else if (config.useLowValue && contract.valueLow) {
      return contract.valueLow.toString();
    } else if (config.useHighValue && contract.valueHigh) {
      return contract.valueHigh.toString();
    } else if (contract.valueLow) {
      return contract.valueLow.toString();
    } else if (contract.valueHigh) {
      return contract.valueHigh.toString();
    }
    return '0';
  }

  /**
   * Build deal description from contract data
   */
  buildDealDescription(contract) {
    let description = `Contract: ${contract.title}\n\n`;
    
    if (contract.description) {
      description += `Description: ${contract.description}\n\n`;
    }
    
    description += `Organisation: ${contract.organisationName}\n`;
    description += `Status: ${contract.noticeStatus}\n`;
    description += `Type: ${contract.noticeType}\n`;
    
    if (contract.valueLow || contract.valueHigh) {
      description += `Value: `;
      if (contract.valueLow && contract.valueHigh) {
        description += `£${contract.valueLow.toLocaleString()} - £${contract.valueHigh.toLocaleString()}`;
      } else if (contract.valueLow) {
        description += `From £${contract.valueLow.toLocaleString()}`;
      } else if (contract.valueHigh) {
        description += `Up to £${contract.valueHigh.toLocaleString()}`;
      }
      description += '\n';
    }
    
    if (contract.deadlineDate) {
      description += `Deadline: ${new Date(contract.deadlineDate).toISOString().split('T')[0]}\n`;
    }
    
    if (contract.postcode) {
      description += `Location: ${contract.postcode}\n`;
    }
    
    if (contract.aiRating?.explanation) {
      description += `\nAI Analysis: ${contract.aiRating.explanation}\n`;
    }
    
    if (contract.reviewerRating?.comments) {
      description += `\nReviewer Comments: ${contract.reviewerRating.comments}\n`;
    }
    
    // Add link back to the contract
    const host = process.env.HOST || 'http://localhost:3000';
    const contractUrl = `${host}/contracts/${contract.itemId}`;
    description += `\n---\n📋 View full contract details: ${contractUrl}\n`;
    
    return description;
  }

  /**
   * Get close date for the deal
   */
  getCloseDate(contract) {
    if (contract.deadlineDate) {
      return new Date(contract.deadlineDate).toISOString().split('T')[0];
    }
    // Default to 30 days from now if no deadline
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    return defaultDate.toISOString().split('T')[0];
  }

  /**
   * Get priority based on AI rating and contract value
   */
  getPriority(contract) {
    const relevance = contract.aiRating?.relevance;
    return hubspotConfig.priorityMappings[relevance] || 'LOW';
  }

  /**
   * Get probability based on AI rating
   */
  getProbability(contract) {
    const relevance = contract.aiRating?.relevance;
    switch (relevance) {
      case 'excellent': return 90;
      case 'high': return 75;
      case 'medium': return 50;
      case 'low': return 25;
      default: return 25;
    }
  }

  /**
   * Test HubSpot connection
   */
  async testConnection() {
    try {
      const response = await this.client.crm.deals.basicApi.getPage(1);
      return { success: true, message: 'HubSpot connection successful' };
    } catch (error) {
      console.error('HubSpot connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new HubSpotService(); 