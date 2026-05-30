# Copilot Instructions

## Project Guidelines
- For this project, use Google Apps Script with Google Sheets so submissions receive a generated GUID that is returned to the website, and support retrieving order info by GUID plus Email.
- The user plans to use a Google Sheets API-based workflow for submissions.
- For this project, the order workflow should include editable status, shipping label support, and customer retrieval that can show tracking and optionally generate a QR code from the tracking link.
- The required reference photos are Front, Back, Left, and Right; do not remove left/right side coverage to a single side image.
- Use Drive order folder names in the format GUID with Date then underscore State, and avoid using @ symbols in folder names.
- Add bot protection with a honeypot field, keep phone number optional, and require email plus all four photo uploads.