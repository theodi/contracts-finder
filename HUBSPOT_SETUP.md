# HubSpot Integration Setup Guide

This guide will help you set up the HubSpot integration for creating deals from contract details.

## Prerequisites

1. A HubSpot account with API access
2. HubSpot API access token
3. HubSpot Portal ID

## Setup Steps

### 1. Create HubSpot Custom Properties

You'll need to create custom properties in HubSpot to store contract-specific information. Here are the properties you should create:

#### Deal Properties to Create:

- **contract_id** (Text) - Stores the contract itemId
- **organisation_name** (Text) - Stores the contracting organisation name
- **contract_status** (Text) - Stores the contract notice status
- **contract_type** (Text) - Stores the contract notice type
- **contract_value_low** (Number) - Stores the lower value range
- **contract_value_high** (Number) - Stores the upper value range
- **contract_deadline** (Date) - Stores the contract deadline
- **contract_published_date** (Date) - Stores the contract published date
- **contract_location** (Text) - Stores the contract location (postcode)
- **contract_region** (Text) - Stores the contract region
- **contract_sector** (Text) - Stores the contract sector
- **contract_cpv_codes** (Text) - Stores the CPV codes
- **ai_rating_score** (Number) - Stores the AI rating score
- **ai_rating_relevance** (Text) - Stores the AI rating relevance
- **reviewer_rating_score** (Number) - Stores the reviewer rating score
- **reviewer_rating_relevance** (Text) - Stores the reviewer rating relevance
- **created_by_user** (Text) - Stores the user who created the deal
- **created_from_contract_finder** (Boolean) - Indicates if deal was created from Contract Finder

### 2. Get HubSpot API Key

1. Go to your HubSpot account
2. Navigate to Settings > Account Setup > Integrations > API Keys
3. Create a new API key or use an existing one
4. Copy the API key

### 3. Get HubSpot Portal ID

1. In your HubSpot account, go to Settings > Account Setup > Account Defaults
2. Note your Portal ID (it's in the URL when you're logged into HubSpot)

### 4. Environment Variables

Add the following environment variables to your `.env` file:

```env
HUBSPOT_API_KEY=your_hubspot_api_key_here
HUBSPOT_PORTAL_ID=your_portal_id_here
HOST=https://your-domain.com
```

### 5. Install Dependencies

Run the following command to install the HubSpot SDK:

```bash
npm install
```

## Configuration

### Pipeline and Stage Configuration

You can configure the default pipeline and stage in `config/hubspot.js`:

```javascript
export const hubspotConfig = {
  defaultPipeline: 'default', // Your pipeline ID
  defaultStage: 'appointmentscheduled', // Your stage ID
  // ... other config
};
```

### Custom Property Names

If you used different property names in HubSpot, update the `customProperties` section in `config/hubspot.js`:

```javascript
customProperties: {
  contract_id: 'your_contract_id_property_name',
  organisation_name: 'your_organisation_name_property_name',
  // ... etc
}
```

## Usage

### Creating a Deal

1. Navigate to any contract detail page
2. Look for the "HubSpot Deal Management" section
3. Click "Create HubSpot Deal" button
4. The system will:
   - Check for existing deals to prevent duplicates
   - Create a new deal with all contract information
   - Link the deal back to the contract

### Deal Information Included

The created deal will include:

- **Deal Name**: Contract title
- **Amount**: Calculated from contract values (awarded value, average of range, etc.)
- **Description**: Full contract description with all relevant details + link back to contract
- **Close Date**: Contract deadline or 30 days from creation
- **Priority**: Based on AI rating (HIGH/MEDIUM/LOW)
- **Probability**: Based on AI rating (25-90%)
- **Stage**: Default stage (configurable)
- **Pipeline**: Default pipeline (configurable)

### Duplicate Prevention

The system prevents duplicate deals by:

1. Checking if a deal already exists in the database for the contract
2. Searching HubSpot for existing deals with the same contract_id
3. Linking existing deals if found

## Testing

### Test HubSpot Connection

You can test the HubSpot connection by visiting:

```
GET /contracts/test-hubspot
```

This will verify that your API token and configuration are working correctly.

### Test Deal Creation

1. Go to any contract detail page
2. Click "Create HubSpot Deal"
3. Check that the deal appears in your HubSpot account
4. Verify all contract information is correctly mapped

## Troubleshooting

### Common Issues

1. **"HubSpot connection failed"**
   - Check your API key is correct
   - Verify the key has the necessary permissions
   - Ensure your HubSpot account is active

2. **"Custom properties not found"**
   - Verify all custom properties are created in HubSpot
   - Check property names match the configuration
   - Ensure properties are available for deals

3. **"Deal creation failed"**
   - Check HubSpot API limits
   - Verify all required fields are populated
   - Check HubSpot account status

### Debug Mode

To enable debug logging, add to your `.env`:

```env
DEBUG=hubspot:*
```

## Security Considerations

1. **API Key Security**: Never commit your HubSpot API key to version control
2. **Environment Variables**: Use environment variables for all sensitive configuration
3. **Access Control**: Ensure only authorized users can create deals
4. **Rate Limiting**: Be aware of HubSpot API rate limits

## Support

If you encounter issues:

1. Check the HubSpot API documentation
2. Verify your HubSpot account permissions
3. Test the connection using the test endpoint
4. Check the application logs for detailed error messages 