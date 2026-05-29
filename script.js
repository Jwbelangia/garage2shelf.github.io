const SCRIPT_ID = '10AlswStNEky-fd_ueqdRlIzEffGZfdveXy8LeQKOlHsQZ7ITUDBEY67b';
const FORM_ENDPOINT = `https://script.google.com/macros/s/${SCRIPT_ID}/exec`;
const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const FADE_DURATION_MS = 1800;
const SLIDE_INTERVAL_MS = 5200;

const processImages = [
  { label: 'Process 1', color: '#38495f' },
  { label: 'Process 2', color: '#425a67' },
  { label: 'Process 3', color: '#4b596f' },
  { label: 'Process 4', color: '#566279' }
];

const showcaseImages = [
  { label: 'Build Gallery 1', color: '#2e3b52' },
  { label: 'Build Gallery 2', color: '#31465e' },
  { label: 'Build Gallery 3', color: '#3e4f66' },
  { label: 'Build Gallery 4', color: '#445973' }
];

const angleFields = ['Front', 'Left', 'Right', 'Rear', 'Diagonal'];

const processGallery = document.getElementById('processGallery');
const uploadsRoot = document.getElementById('angleUploads');
const fadeImage = document.getElementById('fadeImage');
const form = document.getElementById('carOrderForm');
const statusText = document.getElementById('formStatus');

function sketchPlaceholder(label) {
  const safeLabel = escapeSvgText(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="270" viewBox="0 0 420 270"><rect width="420" height="270" fill="#131821"/><g stroke="#9cb4ce" fill="none" stroke-width="5"><path d="M52 176h314l-21-55-58-29H155L96 111z"/><circle cx="129" cy="182" r="26"/><circle cx="301" cy="182" r="26"/></g><text x="210" y="245" text-anchor="middle" fill="#9cb4ce" font-family="Arial" font-size="24">${safeLabel} View</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function photoPlaceholder(label, color, width, height) {
  const safeLabel = escapeSvgText(label);
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#2e3b52';
  const safeWidth = Number.isFinite(width) ? Math.max(240, width) : 1200;
  const safeHeight = Number.isFinite(height) ? Math.max(140, height) : 650;
  const safeFontSize = Math.round(safeWidth / 13);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${safeColor}"/><stop offset="1" stop-color="#101722"/></linearGradient></defs><rect width="${safeWidth}" height="${safeHeight}" fill="url(#g)"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#d2e7ff" font-family="Arial" font-size="${safeFontSize}">${safeLabel}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const escapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return escapes[char];
  });
}

function renderProcessGallery() {
  processImages.forEach((photo, i) => {
    const img = document.createElement('img');
    img.src = photoPlaceholder(photo.label, photo.color, 500, 320);
    img.alt = `Resin process step ${i + 1}`;
    processGallery.appendChild(img);
  });
}

function renderUploadFields() {
  angleFields.forEach((angle) => {
    const wrap = document.createElement('div');
    wrap.className = 'upload-item';

    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Upload ${angle} car photo`);

    const image = document.createElement('img');
    image.src = sketchPlaceholder(angle);
    image.alt = `${angle} placeholder sketch`;

    const label = document.createElement('span');
    label.textContent = angle;

    const input = document.createElement('input');
    input.type = 'file';
    input.name = angle.toLowerCase();
    input.accept = ALLOWED_UPLOAD_TYPES.join(',');
    input.hidden = true;
    input.required = true;

    button.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const [file] = input.files;
      if (!file) return;
      if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
        statusText.textContent = `Please upload a JPG, PNG, WEBP, or GIF for ${angle}.`;
        input.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        image.src = String(reader.result);
        image.alt = `${angle} uploaded image`;
      };
      reader.readAsDataURL(file);
    });

    button.appendChild(image);
    wrap.append(button, input, label);
    uploadsRoot.appendChild(wrap);
  });
}

function setupFadeGallery() {
  let index = 0;
  fadeImage.src = photoPlaceholder(showcaseImages[index].label, showcaseImages[index].color, 1200, 650);

  setInterval(() => {
    fadeImage.classList.add('fading');
    setTimeout(() => {
      index = (index + 1) % showcaseImages.length;
      fadeImage.src = photoPlaceholder(
        showcaseImages[index].label,
        showcaseImages[index].color,
        1200,
        650
      );
      fadeImage.classList.remove('fading');
    }, FADE_DURATION_MS);
  }, SLIDE_INTERVAL_MS);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.checkValidity()) {
    statusText.textContent = 'Please fill all required fields and upload all angle photos.';
    return;
  }

  const formData = new FormData(form);
  formData.append('submittedAt', new Date().toISOString());

  statusText.textContent = 'Submitting...';
  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    statusText.textContent = 'Submitted successfully. We will contact you by email.';
    form.reset();
    uploadsRoot.replaceChildren();
    renderUploadFields();
  } catch (error) {
    console.error('Order submission failed', error);
    statusText.textContent =
      'Submission failed. If this continues, contact us directly and mention your desired resin finish.';
  }
});

renderProcessGallery();
renderUploadFields();
setupFadeGallery();
