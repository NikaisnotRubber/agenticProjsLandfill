# Database Setup Guide

This guide will help you set up PostgreSQL database with Prisma ORM for the AgentiMailCS application.

## Prerequisites

1. PostgreSQL 13+ installed and running
2. Node.js 18+ installed
3. npm or yarn package manager

## Setup Steps

### 1. Install PostgreSQL

- **Windows**: Download from https://www.postgresql.org/download/windows/
- **macOS**: Use Homebrew: `brew install postgresql`
- **Linux**: Use your package manager: `sudo apt-get install postgresql`

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE agentimailcs;
CREATE USER agentimailcs_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE agentimailcs TO agentimailcs_user;

# Exit psql
\q
```

### 3. Configure Environment Variables

Update the `.env` file with your database connection string:

```env
DATABASE_URL="postgresql://agentimailcs_user:your_password_here@localhost:5432/agentimailcs"
NODE_ENV="development"
```

### 4. Install Dependencies

```bash
npm install @prisma/client prisma tsx
```

### 5. Generate Prisma Client and Push Schema

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# OR create and run migrations (for production)
npm run db:migrate
```

### 6. Seed Database with Sample Data

```bash
npm run db:seed
```

## Available Scripts

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run database migrations
- `npm run db:studio` - Open Prisma Studio for database management
- `npm run db:seed` - Seed database with sample data

## Database Schema

### Tables

1. **emails** - Stores original email data
   - id, subject, body, sender, receiver, timestamp, source, priority, hasLogs

2. **attachments** - Stores email attachments
   - id, name, content, type, emailId

3. **processing_results** - Stores AI processing results
   - id, emailId, category, confidence, reasoning, keyIndicators, suggestedAction, agentResponse, status, processingTime

4. **feedback** - Stores user feedback on processing results
   - id, processingResultId, content, rating

5. **email_replies** - Stores email reply data
   - id, processingResultId, replyContent, recipientEmail, subject, sentAt, status

### Relationships

- Email 1:N Attachments
- Email 1:1 ProcessingResult
- ProcessingResult 1:1 Feedback
- ProcessingResult 1:1 EmailReply

## API Endpoints

### Emails
- `GET /api/emails` - Get all emails
- `POST /api/emails` - Create new email
- `GET /api/emails/[id]` - Get email by ID
- `DELETE /api/emails/[id]` - Delete email

### Processing Results
- `GET /api/processing-results` - Get all processing results
- `POST /api/processing-results` - Create processing result
- `GET /api/processing-results/stats` - Get processing statistics

### Email Replies
- `POST /api/email-replies` - Send email reply with feedback

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running: `pg_ctl status`
- Check database exists: `psql -U postgres -l`
- Verify user permissions

### Migration Issues
- Reset database: `npx prisma migrate reset`
- Force push schema: `npx prisma db push --force-reset`

### Data Issues
- View data in Prisma Studio: `npm run db:studio`
- Reset and reseed: `npx prisma migrate reset && npm run db:seed`

## Production Deployment

1. Use proper connection pooling
2. Set up SSL connection
3. Use migrations instead of db push
4. Set up backup strategies
5. Configure monitoring and logging

## Security Considerations

- Use environment variables for sensitive data
- Implement proper authentication/authorization
- Use connection pooling
- Regular security updates
- Database backup and recovery procedures