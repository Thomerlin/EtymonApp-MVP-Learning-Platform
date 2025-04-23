# Etymon Learning Platform

## Google OAuth Configuration

To fix the Google OAuth error "invalid_request", follow these steps:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Go to "APIs & Services" > "Credentials"
4. Edit your OAuth 2.0 Client ID or create a new one
5. Configure the following:

   * **Application type**: Web application
   * **Name**: Etymon App
   * **Authorized JavaScript origins**: 
     - `http://localhost:4200` (for development)