# Contracts Finder Application

This is a Node.js application that automatically searches for government contracts using the UK Contracts Finder API, stores them in MongoDB, and uses AI to rate their relevance to your organization. It includes Google OAuth authentication, contract management, and AI-powered contract analysis.

## Features

- **Google OAuth Authentication**: Secure user authentication using Google accounts
- **Contract Search**: Automated daily search of UK Contracts Finder API
- **MongoDB Storage**: Persistent storage of contract data with deduplication
- **AI Contract Rating**: Uses Anthropic Claude AI to rate contract relevance
- **Organization Profiles**: Define your organization's capabilities and interests
- **DataTables Interface**: Advanced search, sort, and filter capabilities
- **Scheduled Jobs**: Automated contract fetching and AI rating
- **Manual Controls**: Trigger searches and rating manually
- **Responsive Design**: Works on desktop and mobile devices

## Usage

1. Clone the Repository:

```
git clone <repository-url>
cd nodejs-oauth-template
```

2. Install Dependencies:

```
npm install
```

3. Copy Configuration File:

Copy the config.env.example file to config.env:

```
cp config.env.example config.env
```

4. Update Environment Variables:

Open the config.env file in the root directory of the project and update the following environment variables:

```
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3080/auth/google/callback

# Session Configuration
SESSION_SECRET=your_session_secret_here

# HubSpot Configuration (optional)
HUBSPOT_API_KEY=your_hubspot_api_key_here
WEBHOOK_API_KEY=your_webhook_api_key_here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/contracts-finder

# AI Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

**Required Variables:**
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Get these from Google Cloud Console
- `SESSION_SECRET`: A random string for session security
- `MONGODB_URI`: Your MongoDB connection string
- `ANTHROPIC_API_KEY`: Your Anthropic API key for AI contract rating

**Optional Variables:**
- `ANTHROPIC_MODEL`: AI model to use (default: claude-sonnet-4-20250514)
  - Available models: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-sonnet-4-20250514

5. Start the Server:

```
npm start
```

6. Access the Application:

Open a web browser and navigate to http://localhost:3080 to access the application. You can log in using your Google account to access the contracts finder.

## Configuration

### AI Model Selection

You can change the AI model used for contract rating by setting the `ANTHROPIC_MODEL` environment variable:

- `claude-3-5-sonnet-20241022`: Fast and cost-effective
- `claude-3-5-haiku-20241022`: Fastest and most cost-effective
- `claude-sonnet-4-20250514`: Most capable (default)

### Organization Profile

After logging in, set up your organization profile to enable AI contract rating:
1. Go to the "Organisation" page
2. Fill in your organization details, capabilities, and interests
3. Add search keywords for contract discovery
4. Define what work you don't do (exclusions)

## Dependencies

- Express.js
- Passport.js
- Passport-Google-OAuth
- Express-Session
- Dotenv
- MongoDB & Mongoose
- node-fetch
- node-cron
- @anthropic-ai/sdk
- DataTables

## License
This project is licensed under the MIT License.