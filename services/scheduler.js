import cron from 'node-cron';
import { processAndStoreContracts } from './contractsFinder.js';
import { rateUnratedContracts } from './aiRating.js';
import Organisation from '../models/Organisation.js';

export function startScheduler() {
  // Run every 24 hours at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Starting scheduled contracts search...');
    try {
      // Get organization search keywords
      const organisation = await Organisation.findOne({});
      const keywords = organisation?.searchKeywords?.length > 0 ? organisation.searchKeywords : ['data'];
      
      const result = await processAndStoreContracts(keywords);
      console.log('Scheduled contracts search completed:', result);
    } catch (error) {
      console.error('Error in scheduled contracts search:', error);
    }
  }, {
    scheduled: true,
    timezone: "Europe/London"
  });

  // Run contract rating every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('Starting scheduled contract rating...');
    try {
      const result = await rateUnratedContracts();
      console.log('Scheduled contract rating completed:', result);
    } catch (error) {
      console.error('Error in scheduled contract rating:', error);
    }
  }, {
    scheduled: true,
    timezone: "Europe/London"
  });

  console.log('Contracts finder scheduler started. Will run daily at 2 AM.');
}

// Function to manually trigger a search
export async function triggerManualSearch(keyword = null) {
  try {
    let keywords;
    if (keyword) {
      // Use provided keyword
      keywords = [keyword];
    } else {
      // Get organization search keywords
      const organisation = await Organisation.findOne({});
      keywords = organisation?.searchKeywords?.length > 0 ? organisation.searchKeywords : ['data'];
    }
    
    console.log(`Manually triggering contracts search for keywords: ${keywords.join(', ')}`);
    const result = await processAndStoreContracts(keywords);
    console.log('Manual contracts search completed:', result);
    return result;
  } catch (error) {
    console.error('Error in manual contracts search:', error);
    throw error;
  }
} 