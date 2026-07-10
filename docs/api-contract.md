# LeadFlow AI - API Contract

This document outlines the RESTful API contract for the LeadFlow AI backend, strictly adhering to the architectural constraints (Stateless, BullMQ, Redis, No WebSockets, No DB).

---

## 1. Upload CSV Preview

*   **Endpoint:** `/api/imports/preview`
*   **HTTP Method:** `POST`
*   **Purpose:** Receives the CSV file, validates its format, stores it temporarily on disk, and reads a small chunk of rows to generate a preview. **No AI runs during this step.**
*   **Request:**
    *   **Content-Type:** `multipart/form-data`
    *   **Payload:** `file` (The CSV binary file)
*   **Response (200 OK):**
    ```json
    {
      "importId": "uuid-1234-5678",
      "headers": ["Name", "Phone", "Email"],
      "previewRows": [
        ["John Doe", "555-0100", "john@example.com"],
        ["Jane Smith", "555-0101", "jane@example.com"]
      ],
      "totalRows": 1500
    }
    ```
*   **Possible Errors:**
    *   `400 Bad Request`: Missing file, file is not a CSV, or file exceeds size limits.
    *   `500 Internal Server Error`: Disk write failure when saving to `uploads/temp/`.
*   **Controller:** `ImportController.generatePreview()`
*   **Service:** `CsvReaderService` (Handles file system operations, streams the first few rows, and extracts headers).
*   **Why this API exists:** To give the user immediate visual confirmation that their file was read correctly *without* triggering the expensive, time-consuming AI mapping process yet.

---

## 2. Start Import

*   **Endpoint:** `/api/imports/process`
*   **HTTP Method:** `POST`
*   **Purpose:** Tells the backend that the user confirmed the import. The backend takes the `importId`, creates a new BullMQ job, and returns the `jobId` immediately so the HTTP request finishes quickly.
*   **Request:**
    *   **Content-Type:** `application/json`
    *   **Payload:**
    ```json
    {
      "importId": "uuid-1234-5678"
    }
    ```
*   **Response (202 Accepted):**
    ```json
    {
      "jobId": "bullmq-job-999",
      "message": "Processing started."
    }
    ```
*   **Possible Errors:**
    *   `400 Bad Request`: Missing `importId` in the body.
    *   `404 Not Found`: No temporary CSV file found in `uploads/temp/` matching the `importId`.
    *   `500 Internal Server Error`: Redis is down / BullMQ failed to enqueue the job.
*   **Controller:** `ImportController.startProcessing()`
*   **Service:** `QueueService` (Validates the file exists, connects to Redis, and adds the task to the BullMQ queue).
*   **Why this API exists:** Because parsing thousands of rows and calling Gemini takes time. We must separate the immediate user action ("Confirm Import") from the heavy processing to prevent HTTP timeouts and blockages in the Express Event Loop.

---

## 3. Get Job Status

*   **Endpoint:** `/api/jobs/:jobId`
*   **HTTP Method:** `GET`
*   **Purpose:** Allows the frontend to regularly check the status of the background worker processing the CSV.
*   **Request:**
    *   **Params:** `jobId` passed directly in the URL path.
*   **Response (200 OK):**
    ```json
    {
      "status": "processing",
      "progress": 42,
      "processedRows": 420,
      "totalRows": 1000
    }
    ```
    *(Status Enum: `pending`, `processing`, `completed`, `failed`)*
*   **Possible Errors:**
    *   `404 Not Found`: `jobId` does not exist in Redis.
    *   `500 Internal Server Error`: Redis connection failure.
*   **Controller:** `JobController.getJobStatus()`
*   **Service:** `QueueService` (Queries BullMQ/Redis for the active job state and progress metadata).
*   **Why this API exists:** Because WebSockets and Server-Sent Events (SSE) are strictly prohibited in this architecture, the frontend needs a lightweight HTTP endpoint it can poll every few seconds to update the progress bar.

---

## 4. Get Import Result

*   **Endpoint:** `/api/jobs/:jobId/result`
*   **HTTP Method:** `GET`
*   **Purpose:** Retrieves the final, standardized CRM records and statistics from Redis once the job is `completed`. Also triggers the cleanup of the temporary CSV file.
*   **Request:**
    *   **Params:** `jobId` passed directly in the URL path.
*   **Response (200 OK):**
    ```json
    {
      "processedRecords": [
        { 
          "firstName": "John", 
          "lastName": "Doe", 
          "phoneNumber": "+15550100", 
          "emailAddress": "john@example.com" 
        }
      ],
      "skippedRecords": [
        { 
          "rowNumber": 42, 
          "reason": "Duplicate detected" 
        }
      ],
      "importStatistics": {
        "totalRows": 1000,
        "successfullyProcessed": 999,
        "failedOrSkipped": 1
      }
    }
    ```
*   **Possible Errors:**
    *   `400 Bad Request`: The job is still `processing` or `pending` (frontend polled too early).
    *   `404 Not Found`: `jobId` does not exist or results have already expired/been deleted from Redis.
    *   `500 Internal Server Error`: The background job crashed and marked as `failed`, so results cannot be retrieved.
*   **Controller:** `JobController.getJobResult()`
*   **Service:** `ResultBuilderService` (Pulls the final aggregated JSON array from Redis) and `FileCleanupService` (Deletes the CSV from `uploads/temp/`).
*   **Why this API exists:** Because the backend is strictly stateless and has no permanent database. Once processing is done, the data must be handed off to the frontend, and the backend must wipe its temporary state to save disk space and memory.
