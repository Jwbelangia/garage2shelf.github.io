const featuredCarousel = document.querySelector('[data-carousel="featured"]');
const featuredSlides = featuredCarousel ? Array.from(featuredCarousel.querySelectorAll('.mini-gallery__slide')) : [];
const dotsContainer = document.querySelector('[data-dots="featured"]');
const prevButton = document.querySelector('[data-action="prev"][data-target="featured"]');
const nextButton = document.querySelector('[data-action="next"][data-target="featured"]');
const openCheckoutButton = document.getElementById('openCheckoutButton');
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
const submitStatus = document.getElementById('submitStatus');
const submitProgress = document.getElementById('submitProgress');
const submitProgressLabel = document.getElementById('submitProgressLabel');
const submitProgressPercent = document.getElementById('submitProgressPercent');
const submitProgressFill = document.getElementById('submitProgressFill');
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

let featuredIndex = 0;
let featuredIntervalId = null;
let showcaseIndex = 0;
let touchStartX = 0;
let touchEndX = 0;
let checkoutStepIndex = 0;
let isCheckoutProcessing = false;

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

function setSubmitProgress(percent, label) {
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
    const value = selected ? Number(selected.value) : 40;
    if (priceDisplay) {
        priceDisplay.textContent = `$${value}`;
    }

    if (reviewPrice) {
        reviewPrice.textContent = `$${value}`;
    }

    if (reviewFinish) {
        reviewFinish.textContent = getSelectedFinish().label;
    }
}

function getSelectedFinish() {
    const selected = finishInputs.find((input) => input.checked);
    if (!selected) {
        return { label: 'Unpainted', price: 40 };
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
    });

    checkoutScreens.forEach((screen, index) => {
        screen.classList.toggle('is-active', index === checkoutStepIndex);
    });

    if (checkoutBackButton) {
        checkoutBackButton.hidden = checkoutStepIndex === 0;
    }

    if (checkoutNextButton) {
        checkoutNextButton.hidden = checkoutStepIndex === checkoutScreens.length - 1;
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

function handleUploadPreview(event) {
    const input = event.currentTarget;
    const file = input.files && input.files[0];
    const card = input.closest('.upload-card');
    const preview = card ? card.querySelector('.upload-card__preview') : null;

    if (!file || !card || !preview) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        preview.src = String(reader.result);
        card.classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result);
            const [, base64 = ''] = result.split(',');
            resolve(base64);
        };
        reader.onerror = () => reject(new Error(`Could not read file ${file.name}.`));
        reader.readAsDataURL(file);
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

    const sourceDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(`Could not read file ${file.name}.`));
        reader.readAsDataURL(file);
    });

    const image = await loadImageElement(sourceDataUrl);
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

    return {
        fileName: file.name.replace(/\.[^.]+$/, '') + extension,
        mimeType: outputMimeType,
        content: base64
    };
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

    setSubmitProgress(5, 'Preparing your order...');

    for (const input of activeInputs) {
        const file = input.files && input.files[0];
        const fieldName = input.dataset.fieldName;
        currentStep += 1;
        setSubmitProgress((currentStep / totalSteps) * 100, `Compressing ${input.dataset.previewLabel || fieldName} photo...`);
        files[fieldName] = await compressImageFile(file);
    }

    setSubmitProgress(((totalSteps - 1) / totalSteps) * 100, 'Preparing upload...');

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
            preview.removeAttribute('src');
        }
        card?.classList.remove('has-image');
    });
}

async function handleOrderSubmit(event) {
    event.preventDefault();
    if (!submitStatus || isCheckoutProcessing) {
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

    submitStatus.textContent = 'Starting your order submission...';
    if (orderResult) {
        orderResult.hidden = true;
    }
    setCheckoutProcessingState(true);
    setSubmitProgress(0, 'Starting...');

    try {
        const payload = await buildSubmissionPayload();
        setSubmitProgress(92, 'Uploading photos and order details...');
        const result = await postJson(payload);
        if (!result.success) {
            throw new Error(result.message || 'Order submission failed.');
        }

        setSubmitProgress(100, 'Order submitted successfully.');
        submitStatus.textContent = result.message || 'Order submitted successfully.';
        if (guidDisplay) {
            guidDisplay.textContent = result.guid || '';
        }

        if (orderResult) {
            orderResult.hidden = !result.guid;
        }

        submitStatus.textContent = 'Order received. Stripe checkout will hook into this final step through the Worker next.';
        orderForm.reset();
        updatePrice();
        resetUploadPreviews();
        setCheckoutStep(0);
        setCheckoutProcessingState(false);
        window.setTimeout(hideSubmitProgress, 1200);
        window.setTimeout(closeCheckoutModal, 1500);
    } catch (error) {
        setSubmitProgress(100, 'Submission stopped.');
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

orderForm?.addEventListener('submit', handleOrderSubmit);
lookupForm?.addEventListener('submit', handleLookupSubmit);

openCheckoutButton?.addEventListener('click', openCheckoutModal);
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
