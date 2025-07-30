import fetch from 'node-fetch';
import Contract from '../models/Contract.js';

const CONTRACTS_FINDER_API_URL = 'https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/JSON';

export async function searchContracts(keyword = 'data') {
  try {
    const requestBody = {
      "searchCriteria": {
        "types": [
          "Contract"
        ],
        "statuses": [
          "Open"
        ],
        "keyword": keyword,
        "queryString": null,
        "regions": null,
        "postcode": null,
        "radius": 0.0,
        "valueFrom": null,
        "valueTo": null,
        "publishedFrom": null,
        "publishedTo": null,
        "deadlineFrom": null,
        "deadlineTo": null,
        "approachMarketFrom": null,
        "approachMarketTo": null,
        "awardedFrom": null,
        "awardedTo": null,
        "isSubcontract": null,
        "suitableForSme": true,
        "suitableForVco": false,
        "cpvCodes": null
      },
      "size": 1000
    };

    const response = await fetch(CONTRACTS_FINDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.hitCount} contracts for keyword: ${keyword}`);
    
    return data;
  } catch (error) {
    console.error('Error searching contracts:', error);
    throw error;
  }
}

export async function processAndStoreContracts(keywords = ['data']) {
  try {
    let totalProcessed = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    
    // If keywords is a string, convert to array
    const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
    
    for (const keyword of keywordArray) {
      console.log(`Searching for keyword: ${keyword}`);
      const data = await searchContracts(keyword);
      
      if (!data.noticeList || data.noticeList.length === 0) {
        console.log(`No contracts found for keyword: ${keyword}`);
        continue;
      }

      let processed = 0;
      let newContracts = 0;
      let updatedContracts = 0;

      for (const notice of data.noticeList) {
        const contractData = notice.item;
        
        try {
          // Check if contract already exists
          const existingContract = await Contract.findOne({ itemId: contractData.id });
          
          if (existingContract) {
            // Update existing contract
            await Contract.findOneAndUpdate(
              { itemId: contractData.id },
              contractData,
              { new: true }
            );
            updatedContracts++;
          } else {
            // Create new contract
            const newContract = new Contract({
              itemId: contractData.id,
              ...contractData
            });
            await newContract.save();
            newContracts++;
          }
          
          processed++;
        } catch (error) {
          console.error(`Error processing contract ${contractData.id}:`, error);
        }
      }

      totalProcessed += processed;
      totalNew += newContracts;
      totalUpdated += updatedContracts;
      
      console.log(`Processed ${processed} contracts for keyword '${keyword}'. New: ${newContracts}, Updated: ${updatedContracts}`);
    }

    console.log(`Total processed: ${totalProcessed}. Total new: ${totalNew}, Total updated: ${totalUpdated}`);
    return { processed: totalProcessed, new: totalNew, updated: totalUpdated };
  } catch (error) {
    console.error('Error processing contracts:', error);
    throw error;
  }
} 