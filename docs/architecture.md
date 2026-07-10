# LeadFlow AI - Backend Architecture

## Project Overview

LeadFlow AI is an AI-powered CSV Importer built for the GrowEasy Software Developer Assignment.

The purpose of this system is to intelligently convert CSV files exported from different platforms into a standardized GrowEasy CRM format using AI.

The backend is designed to be stateless, scalable, and production-oriented while keeping the implementation simple enough for the assignment.

---

# Tech Stack

Frontend
- Next.js
- TypeScript
- Tailwind CSS

Backend
- Node.js
- Express
- TypeScript

AI
- Gemini 2.5 Pro

Queue
- BullMQ
- Redis

Database
- None

Storage
- Temporary Local Storage

---

# Business Problem

Different companies export lead data in different CSV formats.

Example:

Facebook Export

Name | Phone | Email

Google Ads

Customer | Mobile Number | Work Email

Real Estate CRM

Applicant | Contact | Notes

Marketing Agency

Lead | Whatsapp | Remarks

Although the column names differ, they all represent the same customer information.

Our goal is to understand the meaning of each field using AI and convert every record into the GrowEasy CRM schema.

---

# Backend Responsibilities

The backend is responsible for

- Receiving CSV uploads
- Validating uploaded files
- Reading CSV data
- Generating preview data
- Processing records asynchronously
- Calling Gemini AI
- Validating AI responses
- Normalizing extracted data
- Detecting duplicate leads
- Returning standardized CRM records

The backend is NOT responsible for storing CRM data permanently.

---

# End-to-End Flow

## Step 1

User uploads CSV.

↓

Validate CSV.

↓

Store temporarily inside

uploads/temp/

↓

Read only enough rows for preview.

↓

Return

- importId
- headers
- previewRows
- totalRows

No AI runs during preview.

---

## Step 2

Frontend displays preview.

↓

User verifies uploaded data.

↓

Clicks

Confirm Import

---

## Step 3

Frontend calls

POST /imports/process

↓

Backend creates BullMQ Job.

↓

Immediately returns

jobId

No heavy processing happens inside the HTTP request.

---

## Step 4

BullMQ Worker starts.

Worker

↓

Open CSV using Streams

↓

Read rows incrementally

↓

Create batches

↓

25 rows per batch

↓

Send batch to Gemini

↓

Receive CRM records

↓

Validate

↓

Normalize

↓

Detect duplicates

↓

Merge results

↓

Update BullMQ progress

The worker never loads the complete CSV into memory.

---

## Step 5

Frontend polls

GET /jobs/:jobId

until processing completes.

No WebSockets.

No SSE.

Simple polling.

---

## Step 6

Frontend calls

GET /jobs/:jobId/result

↓

Backend returns

- Processed Records
- Skipped Records
- Import Statistics

↓

Temporary uploaded CSV is deleted.

---

# AI Responsibility

Gemini has ONLY one responsibility.

Input

Parsed CSV rows.

Output

GrowEasy CRM records.

Gemini should NOT

- Validate data
- Normalize data
- Detect duplicates
- Manage queues
- Know about Express
- Know about BullMQ

Gemini only performs semantic mapping.

---

# Post AI Pipeline

Gemini Response

↓

Response Validator

↓

Normalizer

↓

Duplicate Detector

↓

Result Builder

↓

Final Response

---

# Batch Processing

CSV is processed in batches.

Default Batch Size

25 rows

Reason

- Lower token usage
- Better retry support
- Better scalability
- Faster recovery from failures

---

# Queue Architecture

Express

↓

BullMQ Queue

↓

Worker

↓

CSV Reader

↓

Batch Builder

↓

Gemini

↓

Validator

↓

Normalizer

↓

Duplicate Detector

↓

Result Builder

---

# Progress Tracking

Frontend polls

GET /jobs/:jobId

Example

{
    "status":"processing",
    "progress":42,
    "processedRows":420,
    "totalRows":1000
}

---

# Folder Responsibilities

controllers/    
Receives HTTP requests and returns HTTP responses.

routes/
Maps URLs to controllers.

services/
Business logic.

queues/
BullMQ configuration.

jobs/
Worker implementation.

validators/
Zod schemas and response validation.

middlewares/
Upload middleware, error handling, etc.

utils/
Reusable helper functions.

prompts/
Gemini prompts.

types/
Shared TypeScript types.

config/
Environment configuration.

---

# Guiding Principles

- Keep controllers thin.
- Services should have one responsibility.
- Never trust AI output.
- Stream large CSV files.
- Never block HTTP requests.
- Use queues for long-running tasks.
- Keep the backend stateless.
- Keep the code modular and testable.