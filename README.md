# Etymon Project Documentation

**Version**: 1.0  
**Last Updated**: May 7, 2025  
**Project URL**: https://etymonapp.com

## 1. Project Overview

**Etymon** is a web-based language learning platform designed to help users master new languages through interactive content. It offers articles, exercises, text-to-speech (TTS) functionality, user feedback, progress tracking, and Google Single Sign-On (SSO). The platform targets a global audience, using a freemium model with Google AdSense monetization and potential premium subscriptions.

**Objectives** (MVP, April 2025):
- Deliver engaging language learning content.
- Enhance user interaction via TTS, feedback, and progress tracking.
- Ensure scalability, security, and compliance with LGPD, GDPR, and CCPA.
- Optimize for SEO and monetize via ads.

## 2. Technical Architecture

### 2.1 Frontend
- **Framework**: Angular 17
- **Purpose**: Renders responsive UI for articles, exercises, feedback, progress, and legal pages.
- **Key Components**:
  - `HomeComponent`: Displays featured article and article list.
  - `ArticleComponent`: Shows individual articles.
  - `FeedbackComponent`: Handles feedback form.
  - `TermsComponent`, `PrivacyComponent`: Legal pages.
  - `DashboardComponent`: Displays user progress.
- **Dependencies**: `@angular/material`.
- **Features**: Responsive design, AdSense ads (sidebar for desktop, bottom for mobile), cookie consent.

### 2.2 Backend
- **Framework**: Node.js 22 with Express
- **Purpose**: Manages API requests, authentication, data storage, and TTS.
- **Key Files**:
  - Main server script: Defines API routes.
  - SQLite database: Stores application data.
  - Configuration file: Manages environment variables.
  - Credentials file: Stores third-party service credentials.
- **API Endpoints**:
  - Authentication: Google SSO.
  - Articles: Fetch article content.
  - Exercises: Validate user responses.
  - TTS: Generate audio from text.
  - Feedback: Collect user submissions.
  - Progress: Track user activity and completion.
- **Dependencies**: `express`, `sqlite3`, `axios`.

### 2.3 Database
- **Type**: SQLite
- **Tables**:
  - `articles`: Stores article data.
  - `feedback`: Stores user feedback.
  - `progress`: Tracks user exercise completions and activity.
- **Security**: Restricted file permissions, regular backups.

### 2.4 Infrastructure
- **Hosting**: VPS on a cloud provider
- **Web Server**: Nginx for serving static files and proxying API requests.
- **Process Manager**: PM2 for backend process management.
- **SSL**: Let’s Encrypt for HTTPS.
- **CI/CD**: GitHub Actions for automated deployment.

## 3. Features

### 3.1 Completed Features
- **Articles**:
  - Accessible via API, displayed on the homepage with a featured article and list.
  - Supports reading practice for language learners.
- **Exercises**:
  - Validates user responses via API, integrated into articles or dashboard.
  - Reinforces language skills through interactive tasks.
- **Text-to-Speech (TTS)**:
  - Generates audio from text, enhancing accessibility.
  - Supports multiple voices for varied learning experiences.
- **Progress Tracking**:
  - Monitors user activity (e.g., completed exercises, article views).
  - Displayed on a dashboard for user motivation.
- **Authentication**: Google SSO for secure, seamless login.
- **Feedback**: Custom form with a floating button/popup for user input.
- **Monetization**: Google AdSense with responsive ad placements (sidebar for desktop, bottom for mobile).
- **Legal Compliance**:
  - Terms of Use: Outlines user responsibilities and platform rules.
  - Privacy Policy: Details data collection (e.g., SSO, feedback, progress) and user rights.

### 3.2 Planned Features
- See Backlog (Section 6).

## 4. Deployment

### 4.1 Local Development
- **Frontend**: Run development server (port 4200).
- **Backend**: Run server script (port 3000).
- **Database**: SQLite with local file storage.

### 4.2 Production Deployment
- **Steps**:
  1. Build frontend: Compile Angular code.
  2. Transfer files: Sync frontend and backend to VPS, excluding database.
  3. Set permissions: Restrict access to sensitive files.
  4. Install dependencies: Update backend packages.
  5. Restart services: Reload web server and backend process.
- **CI/CD**: GitHub Actions automates deployment, preserving database integrity.
- **Backups**: Database snapshots before updates.

### 4.3 File Structure
- **Frontend**: Compiled static files.
- **Backend**: Server scripts, database, and configuration.
- **Backups**: Database archives.

## 5. Security and Compliance

- **Cybersecurity**:
  - HTTPS encryption.
  - Secure file permissions.
  - Input sanitization for API requests.
- **Privacy**:
  - Compliance with LGPD, GDPR, and CCPA via Privacy Policy and cookie consent.
  - User consent required for data collection.
- **Monitoring**:
  - Application logs for debugging.
  - Planned analytics for user insights.

## 6. Backlog (Planned)

- **Voice-Based AI Chat**:
  - Enable voice discussions about articles using speech-to-text, AI, and TTS, with transcript storage.
- **SEO Optimization**:
  - Implement server-side rendering and sitemap for better search engine ranking.
- **Premium Subscriptions**:
  - Introduce paid features with payment integration.
- **Multilingual Support**:
  - Translate UI and legal documents for global users.
- **Analytics Dashboard**:
  - Develop an admin interface to visualize user behavior and platform metrics.
