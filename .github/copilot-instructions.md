# Copilot Instructions

## Project Guidelines
- For this project, use Google Apps Script with Google Sheets so submissions receive a generated GUID that is returned to the website, and support retrieving order info by GUID plus Email.
- The user plans to use a Google Sheets API-based workflow for submissions.
- For this project, use one Cloudflare Worker per site, keep each site's data in its own Google Sheet, and create the order first so a GUID exists before Stripe payment updates the payment success or failure status.
- The order workflow should include editable status, shipping label support, and customer retrieval that can show tracking and optionally generate a QR code from the tracking link.
- The Google Sheet includes a PAID column, and new orders should always start with PAID set to "n".
- The required reference photos are Front, Back, Left, and Right; do not remove left/right side coverage to a single side image.
- Use Drive order folder names in the format GUID with Date then underscore State, and avoid using @ symbols in folder names.
- Add bot protection with a honeypot field, keep phone number optional, and require email plus all four photo uploads.
- The checkout flow should move into a right-side slide-out modal with a multi-step experience, using Stripe as the primary payment option.
- Prefer a lightweight Cloudflare server to keep sensitive integration details off the client while still connecting to Google Sheets. 
- Reuse the same Cloudflare and Stripe accounts across multiple sites while keeping each site's integration separated.