const featuredCarousel = document.querySelector('[data-carousel="featured"]');
const featuredSlides = featuredCarousel ? Array.from(featuredCarousel.querySelectorAll('.mini-gallery__slide')) : [];
const dotsContainer = document.querySelector('[data-dots="featured"]');
const prevButton = document.querySelector('[data-action="prev"][data-target="featured"]');
const nextButton = document.querySelector('[data-action="next"][data-target="featured"]');
const finishInputs = Array.from(document.querySelectorAll('input[name="finish"]'));
const priceDisplay = document.getElementById('priceDisplay');
const uploadInputs = Array.from(document.querySelectorAll('.upload-card input[type="file"]'));
const showcaseCards = Array.from(document.querySelectorAll('.showcase-card'));

let featuredIndex = 0;
let featuredIntervalId = null;
let showcaseIndex = 0;
let touchStartX = 0;
let touchEndX = 0;

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
    const value = selected ? Number(selected.value) : 35;
    if (priceDisplay) {
        priceDisplay.textContent = `$${value}`;
    }
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

setShowcaseCard(0);
startShowcaseFader();
