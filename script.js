const featuredCarousel = document.querySelector('[data-carousel="featured"]');
const featuredSlides = featuredCarousel ? Array.from(featuredCarousel.querySelectorAll('.mini-gallery__slide')) : [];
const dotsContainer = document.querySelector('[data-dots="featured"]');
const prevButton = document.querySelector('[data-action="prev"][data-target="featured"]');
const nextButton = document.querySelector('[data-action="next"][data-target="featured"]');
const openCheckoutButton = document.getElementById('openCheckoutButton');
const resumeOrderModal = document.getElementById('resumeOrderModal');
const resumeOrderBackdrop = document.getElementById('resumeOrderBackdrop');
const resumeSavedOrderButton = document.getElementById('resumeSavedOrderButton');
const startFreshOrderButton = document.getElementById('startFreshOrderButton');
const resumePromptOrderNumber = document.getElementById('resumePromptOrderNumber');
const resumePromptEmail = document.getElementById('resumePromptEmail');
const checkoutModal = document.getElementById('checkoutModal');
const checkoutCloseButtons = Array.from(document.querySelectorAll('[data-close-checkout]'));
const checkoutStepButtons = Array.from(document.querySelectorAll('.checkout-step'));
const checkoutScreens = Array.from(document.querySelectorAll('.checkout-screen'));
const checkoutBackButton = document.getElementById('checkoutBackButton');
const checkoutNextButton = document.getElementById('checkoutNextButton');
const orderForm = document.getElementById('orderForm');
const checkoutSubmitButton = orderForm ? orderForm.querySelector('button[type="submit"]') : null;
const finishInputs = Array.from(document.querySelectorAll('input[name="finish"]'));
const priceDisplay = document.getElementById('priceDisplay');
const reviewFinish = document.getElementById('reviewFinish');
const reviewPrice = document.getElementById('reviewPrice');
const uploadInputs = Array.from(document.querySelectorAll('.upload-card input[type="file"]'));
const uploadProgressCount = document.getElementById('uploadProgressCount');
const uploadProgressPills = Array.from(document.querySelectorAll('[data-upload-pill]'));
const promoCodeInput = document.getElementById('promoCodeInput');
const applyPromoButton = document.getElementById('applyPromoButton');
const promoStatus = document.getElementById('promoStatus');
const promoSummary = document.getElementById('promoSummary');
const promoSummaryCode = document.getElementById('promoSummaryCode');
const promoSummaryDiscount = document.getElementById('promoSummaryDiscount');
const promoSummaryPrice = document.getElementById('promoSummaryPrice');
const submitStatus = document.getElementById('submitStatus');
const submitProgress = document.getElementById('submitProgress');
const submitProgressLabel = document.getElementById('submitProgressLabel');
const submitProgressPercent = document.getElementById('submitProgressPercent');
const submitProgressFill = document.getElementById('submitProgressFill');
const submitProgressNote = document.getElementById('submitProgressNote');
const savedOrderPanel = document.getElementById('savedOrderPanel');
const savedOrderNumberDisplay = document.getElementById('savedOrderNumberDisplay');
const savedOrderEmailDisplay = document.getElementById('savedOrderEmailDisplay');
const savedOrderFinishDisplay = document.getElementById('savedOrderFinishDisplay');
const orderResult = document.getElementById('orderResult');
const guidDisplay = document.getElementById('guidDisplay');
const lookupForm = document.getElementById('lookupForm');
const lookupStatus = document.getElementById('lookupStatus');
const lookupResult = document.getElementById('lookupResult');
const lookupOrderStatus = document.getElementById('lookupOrderStatus');
const lookupFinish = document.getElementById('lookupFinish');
const lookupPrice = document.getElementById('lookupPrice');
const lookupUpdated = document.getElementById('lookupUpdated');
const trackingLink = document.getElementById('trackingLink');
const shippingLabelLink = document.getElementById('shippingLabelLink');
const trackingQr = document.getElementById('trackingQr');
const trackingQrImage = document.getElementById('trackingQrImage');
const showcaseCards = Array.from(document.querySelectorAll('.showcase-card'));
const config = window.GARAGE2SHELF_CONFIG || { apiBaseUrl: '', sheetName: 'OrderSheet' };
const ORDER_REFERENCE_STORAGE_KEY = 'garage2shelf-last-order';
const ORDER_REFERENCE_COOKIE_KEY = 'garage2shelf_order_number';

let featuredIndex = 0;
let featuredIntervalId = null;
let showcaseIndex = 0;
let touchStartX = 0;
let touchEndX = 0;
let checkoutStepIndex = 0;
let isCheckoutProcessing = false;
let activeSavedOrder = null;
let activePromo = null;

function renderFeaturedDots() {
    if (!dotsContainer) {
        return;
    }

    dotsContainer.innerHTML = '';
    featuredSlides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.classList.toggle('is-active', index === featuredIndex);
        dot.setAttribute('aria-label', `Go to image ${index + 1}`);
        dot.addEventListener('click', () => {
            setFeaturedSlide(index);
            restartFeaturedTimer();
        });
        dotsContainer.appendChild(dot);
    });
}

function clearLatestOrderReference() {
    try {
        window.localStorage.removeItem(ORDER_REFERENCE_STORAGE_KEY);
    } catch {
        // Ignore storage failures.
    }

    document.cookie = `${ORDER_REFERENCE_COOKIE_KEY}=; max-age=0; path=/; SameSite=Lax`;
}

function saveLatestOrderReference(orderReference) {
    try {
        window.localStorage.setItem(ORDER_REFERENCE_STORAGE_KEY, JSON.stringify(orderReference));
    } catch {
        // Ignore storage failures.
    }

    if (orderReference?.orderNumber) {
        const maxAgeSeconds = 60 * 60 * 24 * 30;
        document.cookie = `${ORDER_REFERENCE_COOKIE_KEY}=${encodeURIComponent(orderReference.orderNumber)}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
    }
}

function loadLatestOrderReference() {
    try {
        const raw = window.localStorage.getItem(ORDER_REFERENCE_STORAGE_KEY);
        const localReference = raw ? JSON.parse(raw) : null;
        if (localReference?.orderNumber) {
            return localReference;
        }
    } catch {
        // Ignore storage failures.
    }

    const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${ORDER_REFERENCE_COOKIE_KEY}=([^;]*)`));
    if (!cookieMatch) {
        return null;
    }

    return {
        orderNumber: decodeURIComponent(cookieMatch[1])
    };
}

function canResumeSavedOrder(orderReference) {
    return Boolean(
        orderReference?.paymentStatus === 'pending'
        && orderReference.orderNumber
        && orderReference.email
        && orderReference.finish
        && orderReference.firstName
        && orderReference.lastName
        && orderReference.street1
        && orderReference.city
        && orderReference.state
        && orderReference.zipCode
    );
}

function getPendingOrderReference() {
    const savedReference = loadLatestOrderReference();
    return canResumeSavedOrder(savedReference) ? savedReference : null;
}

function setFieldValue(fieldName, value) {
    const field = orderForm?.querySelector(`[name="${fieldName}"]`);
    if (field) {
        field.value = value || '';
    }
}

function fillOrderFormFromSavedOrder(orderReference) {
    if (!orderForm) {
        return;
    }

    setFieldValue('firstName', orderReference.firstName);
    setFieldValue('lastName', orderReference.lastName);
    setFieldValue('email', orderReference.email);
    setFieldValue('phone', orderReference.phone);
    setFieldValue('street1', orderReference.street1);
    setFieldValue('street2', orderReference.street2);
    setFieldValue('city', orderReference.city);
    setFieldValue('state', orderReference.state);
    setFieldValue('zipCode', orderReference.zipCode);

    const finishValue = String(orderReference.price || '').trim();
    const matchingFinish = finishInputs.find((input) => input.value === finishValue)
        || finishInputs.find((input) => input.closest('.finish-card')?.querySelector('strong')?.textContent?.trim() === orderReference.finish);

    if (matchingFinish) {
        matchingFinish.checked = true;
    }

    updatePrice();
    applySavedPromo(orderReference.promoCode || '', orderReference.discount || '');
}

function updateSavedOrderPanel(orderReference) {
    if (savedOrderNumberDisplay) {
        savedOrderNumberDisplay.textContent = orderReference?.orderNumber || '';
    }
    if (savedOrderEmailDisplay) {
        savedOrderEmailDisplay.textContent = orderReference?.email || '';
    }

    if (savedOrderFinishDisplay) {
        savedOrderFinishDisplay.textContent = orderReference?.finish || '';
    }

    if (savedOrderPanel) {
        savedOrderPanel.hidden = !orderReference;
    }
}

function formatDiscountPercent(discountMultiplier) {
    const value = Number(discountMultiplier);
    if (!Number.isFinite(value) || value <= 0 || value >= 1) {
        return '';
    }

    return `${Math.round((1 - value) * 100)}% off`;
}

function calculateDiscountedPrice(basePrice, discountMultiplier) {
    const price = Number(basePrice);
    const multiplier = Number(discountMultiplier);
    if (!Number.isFinite(price) || !Number.isFinite(multiplier)) {
        return price;
    }

    return Math.round(price * multiplier * 100) / 100;
}

function updatePromoSummary() {
    if (!promoSummary) {
        return;
    }

    if (!activePromo?.promoCode || !activePromo?.discount) {
        promoSummary.hidden = true;
        if (promoSummaryCode) promoSummaryCode.textContent = '';
        if (promoSummaryDiscount) promoSummaryDiscount.textContent = '';
        if (promoSummaryPrice) promoSummaryPrice.textContent = '';
        return;
    }

    const basePrice = getSelectedFinish().price;
    const discountedPrice = calculateDiscountedPrice(basePrice, activePromo.discount);

    if (promoSummaryCode) {
        promoSummaryCode.textContent = activePromo.promoCode;
    }

    if (promoSummaryDiscount) {
        promoSummaryDiscount.textContent = formatDiscountPercent(activePromo.discount);
    }

    if (promoSummaryPrice) {
        promoSummaryPrice.textContent = `$${discountedPrice.toFixed(2)}`;
    }

    promoSummary.hidden = false;
}

function clearPromoState() {
    activePromo = null;
    if (promoStatus) {
        promoStatus.textContent = '';
    }
    updatePromoSummary();
}

function applySavedPromo(promoCode, discount) {
    if (!promoCode || !discount) {
        clearPromoState();
        if (promoCodeInput) {
            promoCodeInput.value = '';
        }
        return;
    }

    activePromo = {
        promoCode,
        discount
    };

    if (promoCodeInput) {
        promoCodeInput.value = promoCode;
    }

    if (promoStatus) {
        promoStatus.textContent = `Promo code ${promoCode} applied.`;
    }

    updatePromoSummary();
}

async function validatePromoCode() {
    const promoCode = String(promoCodeInput?.value || '').trim();
    if (!promoCode) {
        clearPromoState();
        if (promoStatus) {
            promoStatus.textContent = 'Enter a promo code to apply a discount.';
        }
        return;
    }

    if (promoStatus) {
        promoStatus.textContent = 'Checking promo code...';
    }

    const requestUrl = `${config.apiBaseUrl.replace(/\/$/, '')}/api/promo/validate`;
    const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ promoCode })
    });

    const result = await response.json();
    if (!response.ok || !result.success || !result.valid) {
        clearPromoState();
        throw new Error(result.message || 'Promo code could not be applied.');
    }

    activePromo = {
        promoCode: String(result.promoCode || promoCode).trim(),
        discount: String(result.discount || '').trim()
    };

    if (promoCodeInput) {
        promoCodeInput.value = activePromo.promoCode;
    }

    if (promoStatus) {
        promoStatus.textContent = result.message || `Promo code ${activePromo.promoCode} applied.`;
    }

    updatePromoSummary();
}

function showResumeOrderPrompt(orderReference) {
    if (!resumeOrderModal) {
        return;
    }

    if (resumePromptOrderNumber) {
        resumePromptOrderNumber.textContent = orderReference.orderNumber || '';
    }

    if (resumePromptEmail) {
        resumePromptEmail.textContent = orderReference.email || '';
    }

    resumeOrderModal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeResumeOrderPrompt() {
    if (!resumeOrderModal) {
        return;
    }

    resumeOrderModal.hidden = true;
    if (checkoutModal?.hidden !== false) {
        document.body.style.overflow = '';
    }
}

function resetCheckoutForNewOrder() {
    activeSavedOrder = null;
    updateSavedOrderPanel(null);
    orderForm?.reset();
    resetUploadPreviews();
    clearPromoState();
    updatePrice();
    setCheckoutStep(0);
    if (submitStatus) {
        submitStatus.textContent = '';
    }
    hideSubmitProgress();
    showOrderReference('');
}

function beginSavedOrderResume(orderReference) {
    activeSavedOrder = orderReference;
    fillOrderFormFromSavedOrder(orderReference);
    updateSavedOrderPanel(orderReference);
    showOrderReference(orderReference.orderNumber || '');
    closeResumeOrderPrompt();
    openCheckoutModal();
    setCheckoutStep(checkoutScreens.length - 1);

    if (submitStatus) {
        submitStatus.textContent = `Resuming Order Number ${orderReference.orderNumber}. Continue to Stripe when ready.`;
    }
}

function handleOpenCheckout() {
    const pendingOrder = getPendingOrderReference();
    if (pendingOrder) {
        showResumeOrderPrompt(pendingOrder);
        return;
    }

    resetCheckoutForNewOrder();
    openCheckoutModal();
}

function showOrderReference(orderNumber) {
    if (guidDisplay) {
        guidDisplay.textContent = orderNumber;
    }

    if (orderResult) {
        orderResult.hidden = !orderNumber;
    }
}

function setSubmitProgress(percent, label, note = '') {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    if (submitProgress) {
        submitProgress.hidden = false;
    }
    if (submitProgressLabel) {
        submitProgressLabel.textContent = label;
    }
    if (submitProgressPercent) {
        submitProgressPercent.textContent = `${safePercent}%`;
    }
    if (submitProgressFill) {
        submitProgressFill.style.width = `${safePercent}%`;
    }
    if (submitProgressNote) {
        submitProgressNote.textContent = note;
    }
}

function hideSubmitProgress() {
    if (submitProgress) {
        submitProgress.hidden = true;
    }
}

function setCheckoutProcessingState(isProcessing) {
    isCheckoutProcessing = isProcessing;

    if (checkoutModal) {
        checkoutModal.dataset.processing = isProcessing ? 'true' : 'false';
    }

    if (checkoutSubmitButton) {
        checkoutSubmitButton.disabled = isProcessing;
        checkoutSubmitButton.textContent = isProcessing ? 'Processing...' : 'Continue to checkout';
    }

    if (checkoutBackButton) {
        checkoutBackButton.disabled = isProcessing;
    }

    if (checkoutNextButton) {
        checkoutNextButton.disabled = isProcessing;
    }

    checkoutStepButtons.forEach((button) => {
        button.disabled = isProcessing;
    });

    if (openCheckoutButton) {
        openCheckoutButton.disabled = isProcessing;
    }

    updateCheckoutControls();
}

function setFeaturedSlide(index) {
    if (!featuredSlides.length) {
        return;
    }

    featuredIndex = (index + featuredSlides.length) % featuredSlides.length;
    featuredSlides.forEach((slide, slideIndex) => {
        slide.classList.toggle('is-active', slideIndex === featuredIndex);
    });

    if (dotsContainer) {
        Array.from(dotsContainer.children).forEach((dot, dotIndex) => {
            dot.classList.toggle('is-active', dotIndex === featuredIndex);
        });
    }
}

function nextFeaturedSlide() {
    setFeaturedSlide(featuredIndex + 1);
}

function previousFeaturedSlide() {
    setFeaturedSlide(featuredIndex - 1);
}

function startFeaturedTimer() {
    if (!featuredSlides.length) {
        return;
    }

    featuredIntervalId = window.setInterval(nextFeaturedSlide, 2000);
}

function restartFeaturedTimer() {
    if (featuredIntervalId) {
        window.clearInterval(featuredIntervalId);
    }

    startFeaturedTimer();
}

function setShowcaseCard(index) {
    if (!showcaseCards.length) {
        return;
    }

    showcaseIndex = (index + showcaseCards.length) % showcaseCards.length;
    showcaseCards.forEach((card, cardIndex) => {
        card.classList.toggle('is-active', cardIndex === showcaseIndex);
    });
}

function startShowcaseFader() {
    if (!showcaseCards.length) {
        return;
    }

    window.setInterval(() => {
        setShowcaseCard(showcaseIndex + 1);
    }, 2600);
}

function updatePrice() {
    const selected = finishInputs.find((input) => input.checked);
    const value = selected ? Number(selected.value) : 50;
    if (priceDisplay) {
        priceDisplay.textContent = `$${value}`;
    }

    if (reviewPrice) {
        reviewPrice.textContent = `$${value}`;
    }

    if (reviewFinish) {
        reviewFinish.textContent = getSelectedFinish().label;
    }

    updatePromoSummary();
}

function getSelectedFinish() {
    const selected = finishInputs.find((input) => input.checked);
    if (!selected) {
        return { label: 'Unpainted', price: 50 };
    }

    const label = selected.closest('.finish-card')?.querySelector('strong')?.textContent?.trim() || 'Unpainted';
    return {
        label,
        price: Number(selected.value)
    };
}

function syncReviewStep() {
    const finish = getSelectedFinish();
    if (reviewFinish) {
        reviewFinish.textContent = finish.label;
    }
    if (reviewPrice) {
        reviewPrice.textContent = `$${finish.price}`;
    }
}

function updateCheckoutControls() {
    checkoutStepButtons.forEach((button, index) => {
        button.classList.toggle('is-active', index === checkoutStepIndex);
        button.disabled = isCheckoutProcessing || Boolean(activeSavedOrder && index !== checkoutStepIndex);
    });

    checkoutScreens.forEach((screen, index) => {
        screen.classList.toggle('is-active', index === checkoutStepIndex);
    });

    if (checkoutBackButton) {
        checkoutBackButton.hidden = Boolean(activeSavedOrder) || checkoutStepIndex === 0;
    }

    if (checkoutNextButton) {
        checkoutNextButton.hidden = Boolean(activeSavedOrder) || checkoutStepIndex === checkoutScreens.length - 1;
    }
}

function validateCheckoutStep(index) {
    if (!orderForm) {
        return false;
    }

    if (index === 0) {
        const requiredFields = Array.from(orderForm.querySelectorAll('[name="firstName"], [name="lastName"], [name="email"], [name="street1"], [name="city"], [name="state"], [name="zipCode"]'));
        const invalidField = requiredFields.find((field) => !field.reportValidity());
        return !invalidField;
    }

    if (index === 1) {
        const missingUpload = uploadInputs.find((input) => !(input.files && input.files[0]));
        if (missingUpload) {
            missingUpload.reportValidity();
            submitStatus.textContent = 'Please upload Front, Back, Left, and Right photos before continuing.';
            return false;
        }
    }

    return true;
}

function setCheckoutStep(index) {
    const boundedIndex = Math.max(0, Math.min(index, checkoutScreens.length - 1));
    checkoutStepIndex = boundedIndex;
    if (checkoutStepIndex === checkoutScreens.length - 1) {
        syncReviewStep();
    }
    updateCheckoutControls();
}

function openCheckoutModal() {
    if (!checkoutModal) {
        return;
    }

    checkoutModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setCheckoutStep(checkoutStepIndex);
}

function closeCheckoutModal() {
    if (!checkoutModal || isCheckoutProcessing) {
        return;
    }

    checkoutModal.hidden = true;
    document.body.style.overflow = '';
}

function goToNextCheckoutStep() {
    if (isCheckoutProcessing) {
        return;
    }

    if (!validateCheckoutStep(checkoutStepIndex)) {
        return;
    }

    setCheckoutStep(checkoutStepIndex + 1);
}

function goToPreviousCheckoutStep() {
    if (isCheckoutProcessing) {
        return;
    }

    setCheckoutStep(checkoutStepIndex - 1);
}

function syncUploadProgress() {
    const completedFields = new Set();

    uploadInputs.forEach((input) => {
        const fieldName = input.dataset.fieldName;
        const card = input.closest('.upload-card');
        const hasFile = Boolean(input.files && input.files[0]);

        if (card) {
            card.classList.toggle('has-image', hasFile);
        }

        if (fieldName && hasFile) {
            completedFields.add(fieldName);
        }
    });

    if (uploadProgressCount) {
        uploadProgressCount.textContent = `${completedFields.size} of ${uploadInputs.length} uploaded`;
    }

    uploadProgressPills.forEach((pill) => {
        const fieldName = pill.dataset.uploadPill;
        pill.classList.toggle('is-complete', Boolean(fieldName && completedFields.has(fieldName)));
    });
}

function handleUploadPreview(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    const card = input.closest('.upload-card');
    const preview = card ? card.querySelector('.upload-card__preview') : null;

    if (!card || !preview) {
        syncUploadProgress();
        return;
    }

    if (!file) {
        if (preview.dataset.objectUrl) {
            URL.revokeObjectURL(preview.dataset.objectUrl);
            delete preview.dataset.objectUrl;
        }
        preview.removeAttribute('src');
        card.classList.remove('has-image');
        syncUploadProgress();
        return;
    }

    if (preview.dataset.objectUrl) {
        URL.revokeObjectURL(preview.dataset.objectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    preview.dataset.objectUrl = objectUrl;
    preview.src = objectUrl;
    card.classList.add('has-image');
    syncUploadProgress();
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(`Could not read file ${file.name}.`));
        reader.readAsDataURL(file);
    });
}

function fileToBase64(file) {
    return readFileAsDataUrl(file).then((result) => {
        const [, base64 = ''] = result.split(',');
        return base64;
    });
}

function loadImageElement(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not load image for compression.'));
        image.src = source;
    });
}

async function compressImageFile(file) {
    if (!file.type.startsWith('image/')) {
        return {
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            content: await fileToBase64(file)
        };
    }

    const originalDataUrl = await readFileAsDataUrl(file);
    const [, originalBase64 = ''] = originalDataUrl.split(',');

    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
        return {
            fileName: file.name,
            mimeType: file.type,
            content: originalBase64
        };
    }

    try {
        const image = await loadImageElement(originalDataUrl);
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const targetWidth = Math.max(1, Math.round(image.width * scale));
        const targetHeight = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not prepare image compression canvas.');
        }

        context.drawImage(image, 0, 0, targetWidth, targetHeight);

        const outputMimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = outputMimeType === 'image/png' ? undefined : 0.82;
        const compressedDataUrl = canvas.toDataURL(outputMimeType, quality);
        const [, base64 = ''] = compressedDataUrl.split(',');
        const extension = outputMimeType === 'image/png' ? '.png' : '.jpg';

        if (!base64) {
            throw new Error('Compressed image output was empty.');
        }

        return {
            fileName: file.name.replace(/\.[^.]+$/, '') + extension,
            mimeType: outputMimeType,
            content: base64
        };
    } catch {
        return {
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            content: originalBase64
        };
    }
}

async function buildSubmissionPayload() {
    if (!orderForm) {
        throw new Error('Order form not found.');
    }

    const formData = new FormData(orderForm);
    const honeypot = String(formData.get('company') || '').trim();
    if (honeypot) {
        throw new Error('Submission blocked.');
    }

    const finish = getSelectedFinish();
    const files = {};
    const activeInputs = uploadInputs.filter((input) => input.files && input.files[0] && input.dataset.fieldName);
    if (activeInputs.length !== 4) {
        throw new Error('Please upload Front, Back, Left, and Right photos before submitting.');
    }

    const totalSteps = Math.max(activeInputs.length + 2, 3);
    let currentStep = 0;

    setSubmitProgress(8, 'Preparing your order...', 'Checking your order details and getting your uploads ready.');

    for (const input of activeInputs) {
        const file = input.files && input.files[0];
        const fieldName = input.dataset.fieldName;
        currentStep += 1;
        const stagePercent = 12 + ((currentStep - 1) / activeInputs.length) * 36;
        setSubmitProgress(stagePercent, `Optimizing ${input.dataset.previewLabel || fieldName} photo...`, 'Reducing upload size so your order submits faster.');
        files[fieldName] = await compressImageFile(file);
    }

    setSubmitProgress(52, 'Finalizing upload package...', 'Bundling your four photos and order details for secure transfer.');

    return {
        action: 'submitOrder',
        sheetName: config.sheetName,
        firstName: String(formData.get('firstName') || '').trim(),
        lastName: String(formData.get('lastName') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        street1: String(formData.get('street1') || '').trim(),
        street2: String(formData.get('street2') || '').trim(),
        city: String(formData.get('city') || '').trim(),
        state: String(formData.get('state') || '').trim(),
        zipCode: String(formData.get('zipCode') || '').trim(),
        honeypot: honeypot,
        finish: finish.label,
        price: finish.price,
        promoCode: activePromo?.promoCode || '',
        promoDiscount: activePromo?.discount || '',
        files
    };
}

async function postJson(payload) {
    if (!config.apiBaseUrl) {
        throw new Error('Add your Cloudflare Worker URL in config.js before using submit or lookup.');
    }

    const path = payload.action === 'lookupOrder' ? '/api/order/lookup' : '/api/order/create';
    const requestUrl = `${config.apiBaseUrl.replace(/\/$/, '')}${path}`;

    const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
    }

    return response.json();
}

async function createStripeCheckoutSession(order) {
    if (!config.apiBaseUrl) {
        throw new Error('Add your Cloudflare Worker URL in config.js before using Stripe checkout.');
    }

    const requestUrl = `${config.apiBaseUrl.replace(/\/$/, '')}/api/payment/create`;
    const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
            guid: order.guid,
            email: order.email,
            finish: order.finish,
            promoCode: order.promoCode || '',
            firstName: order.firstName,
            lastName: order.lastName,
            phone: order.phone,
            street1: order.street1,
            street2: order.street2,
            city: order.city,
            state: order.state,
            zipCode: order.zipCode
        })
    });

    const result = await response.json();
    if (!response.ok || !result.success || !result.checkoutUrl) {
        throw new Error(result.message || 'Stripe checkout session creation failed.');
    }

    return result;
}

function setLinkState(element, url) {
    if (!element) {
        return;
    }

    if (url) {
        element.href = url;
        element.hidden = false;
    } else {
        element.href = '#';
        element.hidden = true;
    }
}

function setTrackingQr(url) {
    if (!trackingQr || !trackingQrImage) {
        return;
    }

    if (!url) {
        trackingQr.hidden = true;
        trackingQrImage.removeAttribute('src');
        return;
    }

    trackingQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
    trackingQr.hidden = false;
}

function resetUploadPreviews() {
    uploadInputs.forEach((input) => {
        const card = input.closest('.upload-card');
        const preview = card?.querySelector('.upload-card__preview');
        if (preview) {
            if (preview.dataset.objectUrl) {
                URL.revokeObjectURL(preview.dataset.objectUrl);
                delete preview.dataset.objectUrl;
            }
            preview.removeAttribute('src');
        }
        card?.classList.remove('has-image');
    });
    syncUploadProgress();
}

async function handleOrderSubmit(event) {
    event.preventDefault();
    if (!submitStatus || isCheckoutProcessing) {
        return;
    }

    if (activeSavedOrder) {
        setCheckoutProcessingState(true);
        setSubmitProgress(20, 'Loading saved order...', 'Using your existing order details and Order Number.');

        try {
            showOrderReference(activeSavedOrder.orderNumber || '');
            updateSavedOrderPanel(activeSavedOrder);
            const checkoutSession = await createStripeCheckoutSession({
                guid: activeSavedOrder.orderNumber,
                email: activeSavedOrder.email,
                finish: activeSavedOrder.finish,
                promoCode: activeSavedOrder.promoCode || '',
                firstName: activeSavedOrder.firstName,
                lastName: activeSavedOrder.lastName,
                phone: activeSavedOrder.phone,
                street1: activeSavedOrder.street1,
                street2: activeSavedOrder.street2,
                city: activeSavedOrder.city,
                state: activeSavedOrder.state,
                zipCode: activeSavedOrder.zipCode
            });

            setSubmitProgress(100, 'Secure checkout ready.', 'Redirecting you back to Stripe with your saved order now.');
            submitStatus.textContent = `Resuming Order Number ${activeSavedOrder.orderNumber}. Redirecting to Stripe...`;
            window.location.href = checkoutSession.checkoutUrl;
        } catch (error) {
            setSubmitProgress(100, 'Resume stopped.', 'We could not continue this saved order into Stripe right now.');
            submitStatus.textContent = error instanceof Error ? error.message : 'Could not resume saved order.';
            setCheckoutProcessingState(false);
        }

        return;
    }

    if (!validateCheckoutStep(0) || !validateCheckoutStep(1)) {
        if (!validateCheckoutStep(0)) {
            setCheckoutStep(0);
        } else {
            setCheckoutStep(1);
        }
        return;
    }

    submitStatus.textContent = 'Starting your order...';
    if (orderResult) {
        orderResult.hidden = true;
    }
    setCheckoutProcessingState(true);
    setSubmitProgress(0, 'Starting...', 'Opening a secure order session.');

    try {
        const payload = await buildSubmissionPayload();
        setSubmitProgress(68, 'Uploading photos and order details...', 'Sending your order to the secure order system.');
        const result = await postJson(payload);
        if (!result.success) {
            throw new Error(result.message || 'Order submission failed.');
        }

        const orderNumber = result.guid || '';
        showOrderReference(orderNumber);
        saveLatestOrderReference({
            orderNumber,
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            phone: payload.phone,
            street1: payload.street1,
            street2: payload.street2,
            city: payload.city,
            state: payload.state,
            zipCode: payload.zipCode,
            finish: payload.finish,
            price: payload.price,
            promoCode: activePromo?.promoCode || '',
            discount: activePromo?.discount || '',
            createdAt: result.createdAt || '',
            paymentStatus: 'pending'
        });

        setSubmitProgress(84, 'Order created successfully.', 'Your order number is ready. Preparing secure checkout next.');
        const checkoutSession = await createStripeCheckoutSession({
            guid: orderNumber,
            email: payload.email,
            finish: payload.finish,
            promoCode: activePromo?.promoCode || '',
            firstName: payload.firstName,
            lastName: payload.lastName,
            phone: payload.phone,
            street1: payload.street1,
            street2: payload.street2,
            city: payload.city,
            state: payload.state,
            zipCode: payload.zipCode
        });

        setSubmitProgress(95, 'Preparing secure Stripe checkout...', 'Passing your order into Stripe with your customer details prefilled.');
        setSubmitProgress(100, 'Secure checkout ready.', 'Redirecting you to Stripe now.');
        submitStatus.textContent = `Order Number ${orderNumber} created. A confirmation email has been sent if available.`;

        submitStatus.textContent = 'Order received. Redirecting to secure Stripe checkout...';
        window.location.href = checkoutSession.checkoutUrl;
    } catch (error) {
        setSubmitProgress(100, 'Submission stopped.', 'Your order was not completed. Please review the message below and try again.');
        submitStatus.textContent = error instanceof Error ? error.message : 'Order submission failed.';
        setCheckoutProcessingState(false);
    }
}

async function handleLookupSubmit(event) {
    event.preventDefault();
    if (!lookupForm || !lookupStatus) {
        return;
    }

    lookupStatus.textContent = 'Retrieving order...';
    if (lookupResult) {
        lookupResult.hidden = true;
    }

    try {
        const formData = new FormData(lookupForm);
        const result = await postJson({
            action: 'lookupOrder',
            sheetName: config.sheetName,
            guid: String(formData.get('guid') || '').trim(),
            email: String(formData.get('lookupEmail') || '').trim()
        });

        if (!result.success) {
            throw new Error(result.message || 'Order not found.');
        }

        lookupStatus.textContent = result.message || 'Order found.';
        if (lookupOrderStatus) {
            lookupOrderStatus.textContent = result.order?.status || 'Submitted';
        }
        if (lookupFinish) {
            lookupFinish.textContent = result.order?.finish || '';
        }
        if (lookupPrice) {
            lookupPrice.textContent = result.order?.price ? `$${result.order.price}` : '';
        }
        if (lookupUpdated) {
            lookupUpdated.textContent = result.order?.lastUpdated || result.order?.createdAt || '';
        }

        setLinkState(trackingLink, result.order?.trackingUrl || '');
        setLinkState(shippingLabelLink, result.order?.shippingLabelUrl || '');
        setTrackingQr(result.order?.trackingUrl || '');

        if (lookupResult) {
            lookupResult.hidden = false;
        }
    } catch (error) {
        lookupStatus.textContent = error instanceof Error ? error.message : 'Order lookup failed.';
    }
}

if (featuredCarousel && featuredSlides.length) {
    renderFeaturedDots();
    setFeaturedSlide(0);
    startFeaturedTimer();

    prevButton?.addEventListener('click', () => {
        previousFeaturedSlide();
        restartFeaturedTimer();
    });

    nextButton?.addEventListener('click', () => {
        nextFeaturedSlide();
        restartFeaturedTimer();
    });

    featuredCarousel.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });

    featuredCarousel.addEventListener('touchend', (event) => {
        touchEndX = event.changedTouches[0].clientX;
        const delta = touchEndX - touchStartX;
        if (Math.abs(delta) < 30) {
            return;
        }

        if (delta < 0) {
            nextFeaturedSlide();
        } else {
            previousFeaturedSlide();
        }

        restartFeaturedTimer();
    }, { passive: true });
}

finishInputs.forEach((input) => {
    input.addEventListener('change', updatePrice);
});
updatePrice();

uploadInputs.forEach((input) => {
    input.addEventListener('change', handleUploadPreview);
});
syncUploadProgress();

applyPromoButton?.addEventListener('click', async () => {
    try {
        await validatePromoCode();
    } catch (error) {
        if (promoStatus) {
            promoStatus.textContent = error instanceof Error ? error.message : 'Promo code could not be applied.';
        }
    }
});

promoCodeInput?.addEventListener('input', () => {
    if (!promoCodeInput?.value.trim()) {
        clearPromoState();
    }
});

const latestOrderReference = loadLatestOrderReference();
if (latestOrderReference?.orderNumber) {
    showOrderReference(latestOrderReference.orderNumber);
}

orderForm?.addEventListener('submit', handleOrderSubmit);
lookupForm?.addEventListener('submit', handleLookupSubmit);

openCheckoutButton?.addEventListener('click', handleOpenCheckout);
resumeOrderBackdrop?.addEventListener('click', closeResumeOrderPrompt);
resumeSavedOrderButton?.addEventListener('click', () => {
    const pendingOrder = getPendingOrderReference();
    if (pendingOrder) {
        beginSavedOrderResume(pendingOrder);
    } else {
        closeResumeOrderPrompt();
        resetCheckoutForNewOrder();
        openCheckoutModal();
    }
});
startFreshOrderButton?.addEventListener('click', () => {
    clearLatestOrderReference();
    closeResumeOrderPrompt();
    resetCheckoutForNewOrder();
    openCheckoutModal();
});
checkoutCloseButtons.forEach((button) => {
    button.addEventListener('click', closeCheckoutModal);
});
checkoutNextButton?.addEventListener('click', goToNextCheckoutStep);
checkoutBackButton?.addEventListener('click', goToPreviousCheckoutStep);
checkoutStepButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
        if (isCheckoutProcessing) {
            return;
        }

        if (index <= checkoutStepIndex) {
            setCheckoutStep(index);
            return;
        }

        if (validateCheckoutStep(checkoutStepIndex)) {
            setCheckoutStep(index);
        }
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && checkoutModal && !checkoutModal.hidden && !isCheckoutProcessing) {
        closeCheckoutModal();
    }
});

updateCheckoutControls();

setShowcaseCard(0);
startShowcaseFader();
