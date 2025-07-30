import Contract from '../models/Contract.js';
import Organisation from '../models/Organisation.js';
import { processAndStoreContracts } from './contractsFinder.js';

export async function checkAndRunInitialImport() {
  try {
    // Check if database has any contracts
    const contractCount = await Contract.countDocuments({});
    
    if (contractCount === 0) {
      console.log('Database is empty. Running initial import...');
      
      // Get organization search keywords or use defaults
      const organisation = await Organisation.findOne({});
      const keywords = organisation?.searchKeywords?.length > 0 ? organisation.searchKeywords : ['data', 'digital', 'software', 'IT', 'technology'];
      
      console.log(`Running initial import with keywords: ${keywords.join(', ')}`);
      const result = await processAndStoreContracts(keywords);
      
      console.log(`Initial import completed! Total processed: ${result.processed}, New: ${result.new}, Updated: ${result.updated}`);
      return { success: true, processed: result.processed, new: result.new, updated: result.updated };
    } else {
      console.log(`Database already has ${contractCount} contracts. Skipping initial import.`);
      return { success: true, skipped: true, existingCount: contractCount };
    }
  } catch (error) {
    console.error('Error during initial import check:', error);
    return { success: false, error: error.message };
  }
} 