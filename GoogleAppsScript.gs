const SPREADSHEET_ID = '1rttsg9txS1BrTADM7cMnJveQsKycBJzZquVRPoW6EWo';
const SHEET_NAME = 'OrderSheet';
const PROMO_SHEET_NAME = 'Promocodes';
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

	if (payload.action === 'updateStripeSession') {
	  return jsonResponse(handleUpdateStripeSession_(payload));
	}

	if (payload.action === 'updatePaymentStatus') {
	  return jsonResponse(handleUpdatePaymentStatus_(payload));
	}

	if (payload.action === 'validatePromoCode') {
	  return jsonResponse(handleValidatePromoCode_(payload));
	}

	if (payload.action === 'incrementPromoUsage') {
	  return jsonResponse(handleIncrementPromoUsage_(payload));
	}

	return jsonResponse({ success: false, message: 'Unsupported action.' });
  } catch (error) {
	return jsonResponse({ success: false, message: error.message || 'Unexpected server error.' });
  }
}

function handleUpdateStripeSession_(payload) {
  validateRequired_(payload.guid, 'GUID is required.');
  const sheet = getSheet_(payload.sheetName || SHEET_NAME);
  const updated = updateOrderFieldsByGuid_(sheet, payload.guid, {
	StripeSessionId: payload.stripeSessionId || '',
	PaymentStatus: payload.paymentStatus || 'pending',
	PAID: payload.paid || 'n',
	LastUpdated: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
  });

  if (!updated) {
	return { success: false, message: 'Order not found for Stripe session update.' };
  }

  return { success: true, message: 'Stripe session saved.' };
}

function handleUpdatePaymentStatus_(payload) {
  validateRequired_(payload.guid, 'GUID is required.');
  const sheet = getSheet_(payload.sheetName || SHEET_NAME);
  const updated = updateOrderFieldsByGuid_(sheet, payload.guid, {
	PaymentStatus: payload.paymentStatus || 'pending',
	StripeSessionId: payload.stripeSessionId || '',
	StripePaymentIntentId: payload.stripePaymentIntentId || '',
	PaymentAmount: payload.paymentAmount || '',
	PaymentCurrency: payload.paymentCurrency || '',
	PAID: payload.paid || 'n',
	LastUpdated: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
  });

  if (!updated) {
	return { success: false, message: 'Order not found for payment update.' };
  }

  return { success: true, message: 'Payment status updated.' };
}

function handleValidatePromoCode_(payload) {
  const promoCode = String(payload.promoCode || '').trim();
  validateRequired_(promoCode, 'Promo code is required.');

  const sheet = getSheet_(payload.sheetName || PROMO_SHEET_NAME);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
	return { success: false, message: 'No promo codes found.' };
  }

  const headers = values[0];
  const promoCodeIndex = headers.indexOf('PromoCode');
  const activeIndex = headers.indexOf('Active');
  const discountIndex = headers.indexOf('Discount');

  if (promoCodeIndex === -1 || activeIndex === -1 || discountIndex === -1) {
	throw new Error('Promocodes sheet is missing required headers.');
  }

  for (var i = 1; i < values.length; i += 1) {
	const row = values[i];
	const rowCode = String(row[promoCodeIndex] || '').trim();

	if (rowCode.toLowerCase() !== promoCode.toLowerCase()) {
	  continue;
	}

	if (String(row[activeIndex] || '').trim().toUpperCase() !== 'Y') {
	  return { success: false, message: 'Promo code is not active.' };
	}

	const discount = String(row[discountIndex] || '').trim();
	if (discount !== '0.95' && discount !== '0.90' && discount !== '0.85') {
	  return { success: false, message: 'Promo code discount is not supported.' };
	}

	return {
	  success: true,
	  promoCode: rowCode,
	  discount: discount,
	  message: 'Promo code applied.'
	};
  }

  return { success: false, message: 'Promo code not found.' };
}

function handleIncrementPromoUsage_(payload) {
  validateRequired_(payload.promoCode, 'Promo code is required.');
  validateRequired_(payload.guid, 'GUID is required.');

  const orderSheet = getSheet_(SHEET_NAME);
  const orderValues = orderSheet.getDataRange().getValues();
  if (orderValues.length < 2) {
	return { success: false, message: 'No orders found.' };
  }

  const orderHeaders = orderValues[0];
  const guidIndex = orderHeaders.indexOf('Guid');
  const promoUsageCountedIndex = orderHeaders.indexOf('PromoUsageCounted');
  const promoCodeIndex = orderHeaders.indexOf('PromoCode');

  if (guidIndex === -1) {
	throw new Error('Guid column not found in OrderSheet.');
  }

  var matchedOrderRow = -1;
  for (var i = 1; i < orderValues.length; i += 1) {
	if (String(orderValues[i][guidIndex]).trim() === String(payload.guid).trim()) {
	  matchedOrderRow = i + 1;
	  break;
	}
  }

  if (matchedOrderRow === -1) {
	return { success: false, message: 'Order not found for promo usage update.' };
  }

  if (promoUsageCountedIndex !== -1) {
	const countedValue = String(orderSheet.getRange(matchedOrderRow, promoUsageCountedIndex + 1).getValue() || '').trim().toUpperCase();
	if (countedValue === 'Y') {
	  return { success: true, message: 'Promo usage already counted.' };
	}
  }

  const promoSheet = getSheet_(PROMO_SHEET_NAME);
  const promoValues = promoSheet.getDataRange().getValues();
  if (promoValues.length < 2) {
	return { success: false, message: 'No promo codes found.' };
  }

  const promoHeaders = promoValues[0];
  const promoCodeSheetIndex = promoHeaders.indexOf('PromoCode');
  const usageIndex = promoHeaders.indexOf('Usage');

  if (promoCodeSheetIndex === -1 || usageIndex === -1) {
	throw new Error('Promocodes sheet is missing PromoCode or Usage headers.');
  }

  var matchedPromoRow = -1;
  for (var j = 1; j < promoValues.length; j += 1) {
	if (String(promoValues[j][promoCodeSheetIndex] || '').trim().toLowerCase() === String(payload.promoCode).trim().toLowerCase()) {
	  matchedPromoRow = j + 1;
	  break;
	}
  }

  if (matchedPromoRow === -1) {
	return { success: false, message: 'Promo code not found for usage update.' };
  }

  const currentUsage = Number(promoSheet.getRange(matchedPromoRow, usageIndex + 1).getValue() || 0);
  promoSheet.getRange(matchedPromoRow, usageIndex + 1).setValue(currentUsage + 1);

  if (promoCodeIndex !== -1) {
	orderSheet.getRange(matchedOrderRow, promoCodeIndex + 1).setValue(String(payload.promoCode || '').trim());
  }

  if (promoUsageCountedIndex !== -1) {
	orderSheet.getRange(matchedOrderRow, promoUsageCountedIndex + 1).setValue('Y');
  }

  const lastUpdatedIndex = orderHeaders.indexOf('LastUpdated');
  if (lastUpdatedIndex !== -1) {
	orderSheet.getRange(matchedOrderRow, lastUpdatedIndex + 1).setValue(
	  Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss')
	);
  }

  return { success: true, message: 'Promo usage incremented.' };
}

function updateOrderFieldsByGuid_(sheet, guid, fieldMap) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
	return false;
  }

  const headers = values[0];
  const guidIndex = headers.indexOf('Guid');
  if (guidIndex === -1) {
	throw new Error('Guid column not found.');
  }

  for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
	if (String(values[rowIndex][guidIndex]).trim() !== String(guid).trim()) {
	  continue;
	}

	Object.keys(fieldMap).forEach(function (fieldName) {
	  const columnIndex = headers.indexOf(fieldName);
	  if (columnIndex !== -1) {
		sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(fieldMap[fieldName]);
	  }
	});

	return true;
  }

  return false;
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

  sendOrderConfirmationEmail_(payload, guid, createdAt);

  return {
	success: true,
	guid: guid,
	message: 'Order submitted successfully.',
	createdAt: createdAt
  };
}

function sendOrderConfirmationEmail_(payload, orderNumber, createdAt) {
  const email = String(payload.email || '').trim();
  if (!email) {
	return;
  }

  const firstName = String(payload.firstName || '').trim();
  const subject = 'Garage 2 Shelf Order Number: ' + orderNumber;
  const message = [
	'Hi ' + (firstName || 'there') + ',',
	'',
	'Thank you for starting your Garage 2 Shelf order.',
	'Your Order Number is: ' + orderNumber,
	'',
	'Order details:',
	'- Finish: ' + String(payload.finish || ''),
	'- Price: $' + String(payload.price || ''),
	'- Created: ' + createdAt,
	'',
	'Your order has been created and is waiting for payment confirmation through Stripe.',
	'Save this Order Number with your email so you can check order status later.',
	'',
	'Thank you,',
	'Garage 2 Shelf'
  ].join('\n');

  MailApp.sendEmail(email, subject, message);
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
