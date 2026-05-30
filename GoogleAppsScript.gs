const SPREADSHEET_ID = '1rttsg9txS1BrTADM7cMnJveQsKycBJzZquVRPoW6EWo';
const SHEET_NAME = 'OrderSheet';
const DRIVE_FOLDER_ID = '1QxshPegSnd6U0eXrAHoWhjAks0BXibnU';
const DEFAULT_STATUS = 'Submitted';
const DEFAULT_PAID = 'n';

function doPost(e) {
  try {
	const payload = JSON.parse(e.postData.contents || '{}');
	if (payload.action === 'submitOrder') {
	  return jsonResponse(handleSubmitOrder_(payload));
	}

	if (payload.action === 'lookupOrder') {
	  return jsonResponse(handleLookupOrder_(payload));
	}

	return jsonResponse({ success: false, message: 'Unsupported action.' });
  } catch (error) {
	return jsonResponse({ success: false, message: error.message || 'Unexpected server error.' });
  }
}

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'lookupOrder') {
	return jsonResponse(handleLookupOrder_({
	  guid: e.parameter.guid,
	  email: e.parameter.email,
	  sheetName: e.parameter.sheetName || SHEET_NAME
	}));
  }

  return jsonResponse({ success: true, message: 'Apps Script is running.' });
}

function handleSubmitOrder_(payload) {
	if (String(payload.honeypot || '').trim()) {
	return {
	  success: false,
	  message: 'Submission ignored.'
	};
  }

	validateRequired_(payload.firstName, 'First name is required.');
  validateRequired_(payload.lastName, 'Last name is required.');
  validateRequired_(payload.email, 'Email is required.');
	validateRequired_(payload.street1, 'Street address is required.');
  validateRequired_(payload.city, 'City is required.');
  validateRequired_(payload.state, 'State is required.');
  validateRequired_(payload.zipCode, 'Zip code is required.');

  const files = payload.files || {};
  ['front', 'back', 'left', 'right'].forEach(function (key) {
	if (!files[key] || !files[key].content) {
	  throw new Error('All four photos are required.');
	}
  });

  const guid = Utilities.getUuid();
  const now = new Date();
  const createdAt = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  const folderName = buildOrderFolderName_(guid, now, payload.state);
  const orderFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFolder(folderName);

  const frontPhotoUrl = saveDriveFile_(orderFolder, 'Front', files.front);
  const backPhotoUrl = saveDriveFile_(orderFolder, 'Back', files.back);
  const leftPhotoUrl = saveDriveFile_(orderFolder, 'Left', files.left);
  const rightPhotoUrl = saveDriveFile_(orderFolder, 'Right', files.right);

  const sheet = getSheet_(payload.sheetName || SHEET_NAME);
  sheet.appendRow([
	guid,
	createdAt,
	payload.firstName || '',
	payload.lastName || '',
	payload.email,
	payload.phone || '',
	payload.street1 || '',
	payload.street2 || '',
	payload.city || '',
	payload.state,
	payload.zipCode || '',
	payload.finish || '',
	payload.price || '',
	frontPhotoUrl,
	backPhotoUrl,
	leftPhotoUrl,
	rightPhotoUrl,
	DEFAULT_STATUS,
	'',
	'',
	createdAt,
	DEFAULT_PAID
  ]);

  return {
	success: true,
	guid: guid,
	message: 'Order submitted successfully.',
	createdAt: createdAt
  };
}

function handleLookupOrder_(payload) {
  validateRequired_(payload.guid, 'GUID is required.');
  validateRequired_(payload.email, 'Email is required.');

  const sheet = getSheet_(payload.sheetName || SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
	return { success: false, message: 'No orders found.' };
  }

  const headers = values[0];
  const guidIndex = headers.indexOf('Guid');
  const emailIndex = headers.indexOf('Email');

  for (var i = 1; i < values.length; i += 1) {
	const row = values[i];
	if (String(row[guidIndex]).trim() === String(payload.guid).trim() && String(row[emailIndex]).trim().toLowerCase() === String(payload.email).trim().toLowerCase()) {
	  return {
		success: true,
		message: 'Order found.',
		order: mapOrderRow_(headers, row)
	  };
	}
  }

  return { success: false, message: 'No order matched that GUID and email.' };
}

function mapOrderRow_(headers, row) {
  const data = {};
  headers.forEach(function (header, index) {
	data[header] = row[index];
  });

  return {
	guid: data.Guid || '',
	createdAt: data.CreatedAt || '',
	email: data.Email || '',
	state: data.State || '',
	finish: data.Finish || '',
	price: data.Price || '',
	status: data.Status || DEFAULT_STATUS,
	trackingUrl: data.TrackingUrl || '',
	shippingLabelUrl: data.ShippingLabelUrl || '',
	lastUpdated: data.LastUpdated || data.CreatedAt || ''
  };
}

function saveDriveFile_(folder, label, filePayload) {
  const extension = getExtension_(filePayload.fileName || '', filePayload.mimeType || '');
  const bytes = Utilities.base64Decode(filePayload.content);
  const blob = Utilities.newBlob(bytes, filePayload.mimeType || 'application/octet-stream', label + extension);
  const file = folder.createFile(blob);
  return file.getUrl();
}

function getExtension_(fileName, mimeType) {
  const name = fileName || '';
  if (name.indexOf('.') !== -1) {
	return name.substring(name.lastIndexOf('.'));
  }

  const map = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp'
  };

  return map[mimeType] || '';
}

function buildOrderFolderName_(guid, dateValue, state) {
  const datePart = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyyMMdd');
  const cleanState = String(state || 'NA').toUpperCase().replace(/[^A-Z0-9]+/g, '');
  return guid + '_' + datePart + '_' + cleanState;
}

function getSheet_(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
	throw new Error('Sheet not found: ' + sheetName);
  }
  return sheet;
}

function validateRequired_(value, message) {
  if (!String(value || '').trim()) {
	throw new Error(message);
  }
}

function jsonResponse(payload) {
  return ContentService
	.createTextOutput(JSON.stringify(payload))
	.setMimeType(ContentService.MimeType.JSON);
}
