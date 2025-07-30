import Anthropic from '@anthropic-ai/sdk';
import Contract from '../models/Contract.js';
import Organisation from '../models/Organisation.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function rateContract(contractId) {
  try {
    const contract = await Contract.findOne({ itemId: contractId });
    if (!contract) {
      throw new Error('Contract not found');
    }

    // Get organisation description
    const organisation = await Organisation.findOne({});
    if (!organisation) {
      throw new Error('No organisation description found. Please set up your organisation profile first.');
    }

    // Create the prompt for AI rating
    const prompt = createRatingPrompt(contract, organisation);
    
    // Available models: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-sonnet-4-20250514
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Parse the AI response
    const aiResponse = response.content[0].text;
    const rating = parseAIResponse(aiResponse);

    // Update the contract with AI rating
    await Contract.findOneAndUpdate(
      { itemId: contractId },
      {
        'aiRating.score': rating.score,
        'aiRating.relevance': rating.relevance,
        'aiRating.explanation': rating.explanation,
        'aiRating.opportunityDescription': rating.opportunityDescription,
        'aiRating.matchReasons': rating.matchReasons,
        'aiRating.ratedAt': new Date(),
        'aiRating.ratedBy': 'AI'
      }
    );

    return rating;
  } catch (error) {
    console.error('Error rating contract:', error);
    throw error;
  }
}

function createRatingPrompt(contract, organisation) {
  return `You are an expert business development consultant. Your task is to rate how well a government contract opportunity matches an organisation's profile.

ORGANISATION PROFILE:
Name: ${organisation.name}
Description: ${organisation.description}
Industry: ${organisation.industry}
Size: ${organisation.size}
Capabilities: ${organisation.capabilities.join(', ')}
Interests: ${organisation.interests.join(', ')}
Exclusions: ${organisation.exclusions && organisation.exclusions.length > 0 ? organisation.exclusions.join(', ') : 'None specified'}
Location: ${organisation.location}

CONTRACT OPPORTUNITY:
Title: ${contract.title}
Organisation: ${contract.organisationName}
Description: ${contract.description}
Value Range: £${contract.valueLow?.toLocaleString() || 'Not specified'} - £${contract.valueHigh?.toLocaleString() || 'Not specified'}
Location: ${contract.postcode || 'Not specified'}
SME Suitable: ${contract.isSuitableForSme ? 'Yes' : 'No'}
CPV Codes: ${contract.cpvCodes || 'Not specified'}
Published Date: ${contract.publishedDate ? new Date(contract.publishedDate).toLocaleDateString() : 'Not specified'}
Deadline: ${contract.deadlineDate ? new Date(contract.deadlineDate).toLocaleDateString() : 'Not specified'}

Please provide a comprehensive rating in the following JSON format:

{
  "score": <number between 0-10>,
  "relevance": "<low|medium|high|excellent>",
  "explanation": "<brief explanation of the rating>",
  "opportunityDescription": "<detailed description of what this opportunity involves and why it might be interesting>",
  "matchReasons": [
    "<reason 1 why this matches the organisation>",
    "<reason 2 why this matches the organisation>",
    "<reason 3 why this matches the organisation>"
  ]
}

Consider:
- How well the contract aligns with the organisation's capabilities and interests
- Whether the contract involves any work that the organisation explicitly excludes
- The organisation's size and whether it can handle this type of contract
- Value range and whether it's appropriate for the organisation's size
- Technical requirements and whether the organisation has the necessary expertise
- If the contract involves excluded work, this should significantly lower the rating

Only return valid JSON, no additional text.`;
}

function parseAIResponse(response) {
  try {
    // Extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const rating = JSON.parse(jsonMatch[0]);
    
    // Validate the rating structure
    if (!rating.score || !rating.relevance || !rating.explanation) {
      throw new Error('Invalid rating structure from AI');
    }

    return rating;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    // Return a default rating if parsing fails
    return {
      score: 5,
      relevance: 'medium',
      explanation: 'Unable to parse AI response. Manual review recommended.',
      opportunityDescription: 'Please review this opportunity manually.',
      matchReasons: ['Manual review required']
    };
  }
}

// Global lock to prevent multiple rating processes
let isRatingInProgress = false;

export async function rateUnratedContracts() {
  // Check if rating is already in progress
  if (isRatingInProgress) {
    console.log('Contract rating already in progress. Skipping this request.');
    return { processed: 0, rated: 0, errors: 0, skipped: true, reason: 'Already in progress' };
  }

  // Set the lock
  isRatingInProgress = true;
  
  try {
    // Check if organisation profile exists
    const organisation = await Organisation.findOne({});
    if (!organisation) {
      console.log('No organisation profile found. Skipping contract rating.');
      return { processed: 0, rated: 0, errors: 0 };
    }

    let totalProcessed = 0;
    let totalRated = 0;
    let totalErrors = 0;
    let batchNumber = 0;
    const BATCH_SIZE = 5; // Process 5 contracts per batch
    const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds between batches
    const DELAY_BETWEEN_CONTRACTS = 2000; // 2 seconds between individual contracts

    while (true) {
      batchNumber++;
      console.log(`Starting batch ${batchNumber}...`);

      // Find contracts without AI ratings for this batch
      const unratedContracts = await Contract.find({
        $or: [
          { 'aiRating.score': { $exists: false } },
          { 'aiRating.score': null }
        ]
      }).limit(BATCH_SIZE);

      if (unratedContracts.length === 0) {
        console.log('No more unrated contracts found. Rating process complete.');
        break;
      }

      console.log(`Processing batch ${batchNumber}: ${unratedContracts.length} contracts`);

      let batchProcessed = 0;
      let batchRated = 0;
      let batchErrors = 0;

      for (const contract of unratedContracts) {
        try {
          await rateContract(contract.itemId);
          batchRated++;
          console.log(`Rated contract: ${contract.title}`);
          
          // Add delay between individual contracts
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CONTRACTS));
        } catch (error) {
          batchErrors++;
          console.error(`Error rating contract ${contract.itemId}:`, error);
        }
        batchProcessed++;
      }

      totalProcessed += batchProcessed;
      totalRated += batchRated;
      totalErrors += batchErrors;

      console.log(`Batch ${batchNumber} completed. Processed: ${batchProcessed}, Rated: ${batchRated}, Errors: ${batchErrors}`);

      // If there are more contracts to process, add delay before next batch
      const remainingContracts = await Contract.countDocuments({
        $or: [
          { 'aiRating.score': { $exists: false } },
          { 'aiRating.score': null }
        ]
      });

      if (remainingContracts > 0) {
        console.log(`${remainingContracts} contracts remaining. Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log(`Contract rating completed. Total processed: ${totalProcessed}, Rated: ${totalRated}, Errors: ${totalErrors}`);
    return { processed: totalProcessed, rated: totalRated, errors: totalErrors };
  } catch (error) {
    console.error('Error in batch contract rating:', error);
    throw error;
  } finally {
    // Always release the lock
    isRatingInProgress = false;
  }
} 