class Carousel {
    constructor(element) {
        this.element = element;
        this.slides = element.querySelectorAll('.carousel-slide');
        this.currentSlide = 0;
        this.autoPlayInterval = null;
        this.isTransitioning = false;
        this.touchStartX = 0;
        this.touchEndX = 0;
        
        this.init();
    }
    
    init() {
        this.addControls();
        this.addIndicators();
        this.updateSlides();
        this.startAutoPlay();
        this.addHoverPause();
        this.addTouchSupport();
        this.addKeyboardSupport();
    }
    
    addControls() {
        const prevButton = document.createElement('button');
        const nextButton = document.createElement('button');
        
        prevButton.className = 'carousel-control prev';
        nextButton.className = 'carousel-control next';
        
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        
        prevButton.addEventListener('click', () => this.prevSlide());
        nextButton.addEventListener('click', () => this.nextSlide());
        
        this.element.appendChild(prevButton);
        this.element.appendChild(nextButton);
    }
    
    addIndicators() {
        const indicators = document.createElement('div');
        indicators.className = 'carousel-indicators';
        
        this.slides.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.addEventListener('click', () => this.goToSlide(index));
            indicators.appendChild(dot);
        });
        
        this.element.appendChild(indicators);
        this.updateIndicators();
    }
    
    updateIndicators() {
        const dots = this.element.querySelectorAll('.carousel-indicators span');
        dots.forEach((dot, index) => {
            dot.className = index === this.currentSlide ? 'active' : '';
        });
    }
    
    nextSlide() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.currentSlide = (this.currentSlide + 1) % this.slides.length;
        this.updateSlides();
    }
    
    prevSlide() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
        this.updateSlides();
    }
    
    goToSlide(index) {
        if (this.isTransitioning || index === this.currentSlide) return;
        this.isTransitioning = true;
        this.currentSlide = index;
        this.updateSlides();
    }
    
    updateSlides() {
        this.slides.forEach((slide, index) => {
            const offset = 100 * (index - this.currentSlide);
            slide.style.transform = `translateX(${offset}%)`;
            slide.style.transition = 'transform 0.5s ease-in-out';
            
            slide.addEventListener('transitionend', () => {
                this.isTransitioning = false;
            }, { once: true });
        });
        
        this.updateIndicators();
    }
    
    startAutoPlay() {
        this.autoPlayInterval = setInterval(() => this.nextSlide(), 5000);
    }
    
    addHoverPause() {
        this.element.addEventListener('mouseenter', () => {
            clearInterval(this.autoPlayInterval);
        });
        
        this.element.addEventListener('mouseleave', () => {
            this.startAutoPlay();
        });
    }
    
    addTouchSupport() {
        this.element.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
        });
        
        this.element.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].clientX;
            this.handleSwipe();
        });
    }
    
    handleSwipe() {
        const difference = this.touchStartX - this.touchEndX;
        if (Math.abs(difference) > 50) {
            if (difference > 0) {
                this.nextSlide();
            } else {
                this.prevSlide();
            }
        }
    }
    
    addKeyboardSupport() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prevSlide();
            } else if (e.key === 'ArrowRight') {
                this.nextSlide();
            }
        });
    }
} 