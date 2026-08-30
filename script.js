/* script.js
   Responsible for:
   - wiring media manifest -> DOM (single point of media replacement)
   - GSAP animations + ScrollTrigger
   - navbar scroll behavior
   - overlay menu accessibility
   - modal announcement behavior
   - lazy-loading/background wiring for cards and split media
   - newsletter form basic handling
*/

/* Global helpers */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

document.addEventListener('DOMContentLoaded', () => {
  // Basic DOM refs
  const header = $('#siteHeader');
  const hero = $('#hero');
  const heroVideoEl = $('#heroVideo');
  const announceModal = $('#announceModal');
  const announceClose = $('#announceClose');
  const overlay = $('#overlayMenu');
  const hamburger = $('#hamburger');
  const overlayClose = $('#overlayClose');
  const bookBtn = $('#bookBtn');
  const yearEl = $('#year');
  const newsletterForm = $('#newsletterForm');
  const cards = $$('.card');

  // Fill year
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // 1. Wire media manifest into DOM
  function applyMediaManifest() {
    if (typeof media !== 'object') return;

    // Video poster
    const heroPosterKey = 'heroPoster';
    if (media[heroPosterKey]) {
      // set poster on video and on announcement img (if present)
      heroVideoEl.setAttribute('poster', media[heroPosterKey]);
      const announceImg = $('#announceModal img[data-media-key="heroPoster"]');
      if (announceImg) announceImg.src = media[heroPosterKey];
    }

    // Video source
    if (media.heroVideo) {
      // Create source element (replace any existing)
      let src = heroVideoEl.querySelector('source');
      if (src) src.remove();
      const sourceEl = document.createElement('source');
      sourceEl.setAttribute('src', media.heroVideo);
      sourceEl.setAttribute('type', 'video/mp4');
      sourceEl.setAttribute('data-media-key', 'heroVideo');
      heroVideoEl.appendChild(sourceEl);

      // Try to play (some browsers restrict autoplay unless muted; we set muted attribute)
      heroVideoEl.load();
      heroVideoEl.play().catch(() => {
        // failing autoplay is fine — poster is visible
      });
    }

    // For all elements with data-media-key for images/backgrounds
    const elWithMediaKey = $$('[data-media-key]');
    elWithMediaKey.forEach(el => {
      const key = el.dataset.mediaKey;
      if (!key || !(key in media)) return;

      const val = media[key];

      // If element is <img>
      if (el.tagName.toLowerCase() === 'img') {
        el.src = val;
        el.loading = 'lazy';
        return;
      }

      // If element is a div meant to be background
      if (el.tagName.toLowerCase() === 'div' || el.tagName.toLowerCase() === 'article') {
        // If val is array, pick first (for grid containers it may be handled elsewhere)
        if (Array.isArray(val)) {
          el.style.backgroundImage = `url("${val[0]}")`;
        } else {
          el.style.backgroundImage = `url("${val}")`;
        }
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        return;
      }

      // If element is a <source> inside <video> handled above
      if (el.tagName.toLowerCase() === 'source') {
        el.src = val;
        return;
      }
    });
  }

  applyMediaManifest();

  // Populate gallery grid from media.galleryGrid
  function populateGallery() {
    const galleryContainer = document.querySelector('#galleryGrid .grid');
    if (!galleryContainer) return;
    if (!Array.isArray(media.galleryGrid)) return;
    galleryContainer.innerHTML = '';
    media.galleryGrid.forEach((src, idx) => {
      const img = document.createElement('img');
      img.setAttribute('data-src', src);
      img.setAttribute('alt', `Moksha gallery ${idx+1}`);
      img.loading = 'lazy';
      img.src = src;
      img.tabIndex = 0;
      img.dataset.index = idx;
      img.addEventListener('click', () => openLightbox(idx, 'gallery'));
      img.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(idx, 'gallery'); } });
      galleryContainer.appendChild(img);
    });
  }

  // Bind click & keyboard accessibility events for the hardcoded menu images
  function initMenuImages() {
    const menuImages = $$('.menu-images.grid img');
    if (menuImages.length === 0) return;
    menuImages.forEach((img, idx) => {
      img.tabIndex = 0;
      img.dataset.index = idx;
      img.addEventListener('click', () => openLightbox(idx, 'menu'));
      img.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter' || e.key === ' ') { 
          e.preventDefault(); 
          openLightbox(idx, 'menu'); 
        } 
      });
    });
  }

  // Lightbox
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  let currentLightboxIndex = -1;
  let currentLightboxSource = 'gallery';

  function openLightbox(index, source) {
    let arr = [];
    if (source === 'menu') {
      arr = $$('.menu-images.grid img').map(img => img.src);
    } else {
      arr = media.galleryGrid;
    }
    if (!lightbox || !Array.isArray(arr) || arr.length === 0) return;
    const src = arr[index];
    if (!src) return;
    currentLightboxIndex = index;
    currentLightboxSource = source === 'menu' ? 'menu' : 'gallery';
    lightboxImg.src = src;
    lightboxImg.alt = `${currentLightboxSource === 'menu' ? 'Menu' : 'Gallery'} image ${index+1}`;
    lightboxCaption.textContent = lightboxImg.alt;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (window.gsap) gsap.fromTo(lightboxImg, {autoAlpha:0, y:10}, {autoAlpha:1, y:0, duration:0.35, ease:'power3.out'});
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImg.src = '';
    currentLightboxIndex = -1;
    currentLightboxSource = 'gallery';
    document.body.style.overflow = '';
  }

  function showNext() {
    if (currentLightboxIndex < 0) return;
    const arr = currentLightboxSource === 'menu' 
      ? $$('.menu-images.grid img').map(img => img.src) 
      : media.galleryGrid;
    if (!arr || arr.length === 0) return;
    const next = (currentLightboxIndex + 1) % arr.length;
    openLightbox(next, currentLightboxSource);
  }

  function showPrev() {
    if (currentLightboxIndex < 0) return;
    const arr = currentLightboxSource === 'menu' 
      ? $$('.menu-images.grid img').map(img => img.src) 
      : media.galleryGrid;
    if (!arr || arr.length === 0) return;
    const prev = (currentLightboxIndex - 1 + arr.length) % arr.length;
    openLightbox(prev, currentLightboxSource);
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
  if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });
  if (lightbox) lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  // Keyboard navigation for lightbox
  document.addEventListener('keydown', (e) => {
    if (!lightbox || lightbox.getAttribute('aria-hidden') === 'true') return;
    if (e.key === 'ArrowRight') { showNext(); }
    if (e.key === 'ArrowLeft') { showPrev(); }
    if (e.key === 'Escape') { closeLightbox(); }
  });

  // Populate gallery and initialize menu images
  populateGallery();
  initMenuImages();

  // 2. Announcement modal: reveal once on load (dismissible).
  function showAnnouncement() {
    if (!announceModal) return;
    announceModal.setAttribute('aria-hidden', 'false');
    announceModal.style.opacity = 0;
    announceModal.style.transform = 'translateY(10px)';
    announceModal.style.transition = 'all 350ms ease';
    requestAnimationFrame(() => {
      announceModal.style.opacity = 1;
      announceModal.style.transform = 'translateY(0)';
    });
  }
  setTimeout(showAnnouncement, 900);

  if (announceClose) {
    announceClose.addEventListener('click', () => {
      announceModal.setAttribute('aria-hidden', 'true');
      announceModal.style.opacity = 0;
      setTimeout(() => {
        announceModal.style.display = 'none';
      }, 300);
    });
  }

  // 3. Overlay menu open/close + accessibility
  function setOverlayState(isOpen) {
    if (!overlay || !hamburger) return;

    overlay.classList.toggle('is-open', isOpen);
    overlay.setAttribute('aria-hidden', String(!isOpen));
    hamburger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';

    if (isOpen) {
      gsap.fromTo(overlay, {autoAlpha:0}, {autoAlpha:1, duration:0.35, ease: 'power3.out'});
      const links = $$('nav.overlay-nav a', overlay);
      gsap.fromTo(links, {y: 18, autoAlpha: 0}, {y:0, autoAlpha:1, stagger:0.06, duration:0.45, ease: "power3.out"});
      const firstLink = overlay.querySelector('nav.overlay-nav a');
      if (firstLink) firstLink.focus();
    }
  }

  function openOverlay() {
    setOverlayState(true);
  }

  function closeOverlay() {
    setOverlayState(false);
    if (hamburger) hamburger.focus();
  }

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      const open = overlay && overlay.getAttribute('aria-hidden') === 'false';
      if (open) closeOverlay(); else openOverlay();
    });
  }

  if (overlayClose) {
    overlayClose.addEventListener('click', (e) => {
      e.preventDefault();
      closeOverlay();
    });
  }

  if (overlay) {
    Array.from(overlay.querySelectorAll('nav.overlay-nav a')).forEach(a => {
      a.addEventListener('click', (event) => {
        event.preventDefault();
        closeOverlay();
        const targetId = a.getAttribute('href');
        if (targetId && targetId.startsWith('#')) {
          const target = document.querySelector(targetId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });
  }

  if (bookBtn) {
    bookBtn.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.href = 'tel:+919459752111';
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (overlay.getAttribute('aria-hidden') === 'false') closeOverlay();
      if (announceModal && announceModal.getAttribute('aria-hidden') === 'false') {
        announceModal.setAttribute('aria-hidden','true');
      }
    }
  });

  // 4. Navbar transition when scrolling past hero
  function handleHeaderOnScroll() {
    const triggerPoint = hero.offsetHeight - 80;
    if (window.scrollY > triggerPoint) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  handleHeaderOnScroll();
  window.addEventListener('scroll', handleHeaderOnScroll, {passive:true});

  // 5. GSAP animations (staggered reveals, parallax, fade-up)
  function initAnimations() {
    if (!window.gsap || !window.ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);

    const heroLines = $$('.hero-headline .line');
    gsap.from(heroLines, {
      y: 28,
      autoAlpha: 0,
      stagger: 0.12,
      duration: 0.8,
      ease: 'power3.out',
      delay: 0.25
    });

    gsap.from('.hero-sub, .hero-cta', {
      y: 18,
      autoAlpha: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: 'power3.out',
      delay: 0.6
    });

    gsap.to('.hero-video', {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        scrub: true
      }
    });

    $$('.split').forEach((section) => {
      const image = section.querySelector('.split-media');
      const copy = section.querySelector('.split-copy, .split .light');
      if (image) {
        gsap.from(image, {
          y: 40,
          autoAlpha: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none reverse'
          }
        });
      }
      if (copy) {
        gsap.from(copy, {
          y: 28,
          autoAlpha: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            toggleActions: 'play none none reverse'
          }
        });
      }

      if (image) {
        gsap.to(image, {
          backgroundPosition: '50% 35%',
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            scrub: true
          }
        });
      }
    });

    gsap.from('.cards .card', {
      autoAlpha: 0,
      y: 20,
      scale: 0.98,
      duration: 0.9,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.cards',
        start: 'top 85%'
      }
    });

    gsap.from('.about-media, .about-copy, .contact-panel', {
      y: 30,
      autoAlpha: 0,
      duration: 0.9,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.about',
        start: 'top 85%'
      }
    });

    gsap.to('.contact-media', {
      yPercent: 10,
      ease: 'none',
      scrollTrigger: {
        trigger: '#contact',
        scrub: true
      }
    });
  }

  if (window.gsap && window.ScrollTrigger) initAnimations();
  else {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (window.gsap && window.ScrollTrigger) {
        clearInterval(t);
        initAnimations();
      }
      if (tries > 25) clearInterval(t);
    }, 150);
  }

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const label = card.querySelector('.card-title')?.textContent?.trim();
      if (label && label.toLowerCase().includes('gallery')) {
        document.querySelector('#gallery')?.scrollIntoView({behavior:'smooth'});
      } else if (label && label.toLowerCase().includes('events')) {
        const el = document.querySelector('#events');
        if (el) el.scrollIntoView({behavior:'smooth'});
        else alert('Events coming soon — check back for seasonal gatherings.');
      } else if (label && label.toLowerCase().includes('reserv')) {
        document.querySelector('#contact')?.scrollIntoView({behavior:'smooth'});
      }
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#newsletterEmail')?.value?.trim();
      if (!email) {
        alert('Please enter a valid email address.');
        return;
      }
      newsletterForm.querySelector('button')?.setAttribute('disabled','');
      setTimeout(() => {
        alert('Thanks! You are subscribed (demo).');
        newsletterForm.reset();
        newsletterForm.querySelector('button')?.removeAttribute('disabled');
      }, 600);
    });
  }

  document.addEventListener('focus', (e) => {
    if (overlay.getAttribute('aria-hidden') === 'false' && !overlay.contains(e.target)) {
      const first = overlay.querySelector('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
      if (first) first.focus();
    }
  }, true);

  handleHeaderOnScroll();

  /* Small IntersectionObserver fallback to toggle "is-visible" on elements that benefit from the CSS reveal utility.
     This is non-destructive and only adds the class; GSAP animations already present will take precedence when used. */
  (function() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      document.querySelectorAll('.reveal, .reveal-up, .card, .menu-images img, .gallery-grid img').forEach(el => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // keep observing to allow reverse on scroll-up; if you prefer one-time reveal, call obs.unobserve(entry.target);
        } else {
          // remove so elements can re-animate when scrolled back into view
          entry.target.classList.remove('is-visible');
        }
      });
    }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

    document.querySelectorAll('.reveal, .reveal-up, .card, .menu-images img, .gallery-grid img').forEach(el => io.observe(el));
  })();

});