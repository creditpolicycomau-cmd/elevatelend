/**
 * ElevateLend — Main JavaScript
 * Business loan comparison site shared functionality.
 * Vanilla ES6+, no frameworks.
 */

'use strict';

/* ==========================================================================
   0.  DOM-READY BOOTSTRAP
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  MobileNav.init();
  SmoothScroll.init();
  StickyHeader.init();
  AnimatedCounters.init();
  ScrollAnimations.init();
  FAQAccordion.init();
  TestimonialCarousel.init();
  CookieConsent.init();
  BackToTop.init();
});

/* ==========================================================================
   1.  MOBILE NAVIGATION TOGGLE
   ========================================================================== */

const MobileNav = (() => {
  let toggle = null;
  let nav = null;
  let overlay = null;
  const ACTIVE = 'is-open';

  function init() {
    toggle = document.querySelector('.nav-toggle, .hamburger, [data-nav-toggle]');
    nav = document.querySelector('.main-nav, .nav-menu, [data-nav-menu]');
    if (!toggle || !nav) return;

    // Create overlay backdrop if it does not already exist
    overlay = document.querySelector('.nav-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.classList.add('nav-overlay');
      document.body.appendChild(overlay);
    }

    toggle.addEventListener('click', handleToggle);
    overlay.addEventListener('click', close);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains(ACTIVE)) close();
    });

    // Close when a nav link is clicked (single-page sections)
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', close);
    });
  }

  function handleToggle(e) {
    e.preventDefault();
    const isOpen = nav.classList.toggle(ACTIVE);
    toggle.classList.toggle(ACTIVE, isOpen);
    overlay.classList.toggle(ACTIVE, isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('nav-open', isOpen);
  }

  function close() {
    nav.classList.remove(ACTIVE);
    toggle.classList.remove(ACTIVE);
    overlay.classList.remove(ACTIVE);
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  return { init };
})();

/* ==========================================================================
   2.  SMOOTH SCROLLING FOR ANCHOR LINKS
   ========================================================================== */

const SmoothScroll = (() => {
  function init() {
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;

      const id = anchor.getAttribute('href');
      if (id === '#' || id === '#0') return;

      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();

      const header = document.querySelector('.site-header, header');
      const headerOffset = header ? header.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 16;

      window.scrollTo({ top, behavior: 'smooth' });

      // Update URL without triggering scroll
      if (history.pushState) {
        history.pushState(null, '', id);
      }
    });
  }

  return { init };
})();

/* ==========================================================================
   3.  STICKY HEADER (SHRINK ON SCROLL, ADD SHADOW)
   ========================================================================== */

const StickyHeader = (() => {
  const SHRINK_CLASS = 'header--shrunk';
  const SHADOW_CLASS = 'header--shadow';
  const HIDDEN_CLASS = 'header--hidden';
  const SCROLL_THRESHOLD = 80;
  const HIDE_THRESHOLD = 400;

  let header = null;
  let lastScrollY = 0;
  let ticking = false;

  function init() {
    header = document.querySelector('.site-header, header');
    if (!header) return;

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial state
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  function update() {
    ticking = false;
    const scrollY = window.scrollY;

    // Shrink and shadow after threshold
    const scrolled = scrollY > SCROLL_THRESHOLD;
    header.classList.toggle(SHRINK_CLASS, scrolled);
    header.classList.toggle(SHADOW_CLASS, scrolled);

    // Hide on scroll-down, show on scroll-up (only after HIDE_THRESHOLD)
    if (scrollY > HIDE_THRESHOLD) {
      if (scrollY > lastScrollY) {
        header.classList.add(HIDDEN_CLASS);
      } else {
        header.classList.remove(HIDDEN_CLASS);
      }
    } else {
      header.classList.remove(HIDDEN_CLASS);
    }

    lastScrollY = scrollY;
  }

  return { init };
})();

/* ==========================================================================
   4.  ANIMATED COUNTERS
   ========================================================================== */

const AnimatedCounters = (() => {
  const DURATION = 2000; // ms
  const FPS = 60;
  const SELECTOR = '[data-counter], .counter, .stat-number';

  function init() {
    const counters = document.querySelectorAll(SELECTOR);
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    counters.forEach((el) => observer.observe(el));
  }

  /**
   * Parse the target value from data-counter attribute or text content.
   * Supports formats: "2.4", "$2.4B+", "93%", "15,000", "10K+"
   */
  function parseTarget(el) {
    const raw = el.dataset.counter || el.textContent.trim();

    // Extract prefix (e.g. "$"), suffix (e.g. "B+", "%", "K+", "+"), and number
    const match = raw.match(/^([^0-9]*?)([\d,]+\.?\d*)(.*?)$/);
    if (!match) return null;

    const prefix = match[1];
    const number = parseFloat(match[2].replace(/,/g, ''));
    const suffix = match[3];
    const hasDecimal = match[2].includes('.');
    const decimals = hasDecimal ? (match[2].split('.')[1] || '').length : 0;
    const useCommas = match[2].includes(',');

    return { prefix, number, suffix, decimals, useCommas };
  }

  function formatNumber(value, decimals, useCommas) {
    let str = decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toString();
    if (useCommas) {
      const parts = str.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      str = parts.join('.');
    }
    return str;
  }

  function animateCounter(el) {
    const parsed = parseTarget(el);
    if (!parsed) return;

    const { prefix, number, suffix, decimals, useCommas } = parsed;
    const totalFrames = Math.round((DURATION / 1000) * FPS);
    let frame = 0;

    // Ease-out quad
    const ease = (t) => t * (2 - t);

    function step() {
      frame++;
      const progress = ease(frame / totalFrames);
      const current = progress * number;
      el.textContent = prefix + formatNumber(current, decimals, useCommas) + suffix;

      if (frame < totalFrames) {
        requestAnimationFrame(step);
      } else {
        el.textContent = prefix + formatNumber(number, decimals, useCommas) + suffix;
      }
    }

    el.textContent = prefix + formatNumber(0, decimals, useCommas) + suffix;
    requestAnimationFrame(step);
  }

  return { init };
})();

/* ==========================================================================
   5.  INTERSECTION OBSERVER — FADE-IN ON SCROLL
   ========================================================================== */

const ScrollAnimations = (() => {
  const SELECTOR = '.fade-in, .slide-up, .slide-left, .slide-right, [data-animate]';
  const VISIBLE_CLASS = 'is-visible';

  function init() {
    const elements = document.querySelectorAll(SELECTOR);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = parseInt(entry.target.dataset.animateDelay, 10) || 0;
            if (delay > 0) {
              setTimeout(() => entry.target.classList.add(VISIBLE_CLASS), delay);
            } else {
              entry.target.classList.add(VISIBLE_CLASS);
            }
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    elements.forEach((el) => observer.observe(el));
  }

  return { init };
})();

/* ==========================================================================
   6.  FAQ ACCORDION
   ========================================================================== */

const FAQAccordion = (() => {
  const ACTIVE = 'is-active';

  function init() {
    const containers = document.querySelectorAll('.faq, .accordion, [data-accordion]');
    containers.forEach(setupAccordion);

    // Also handle standalone items not inside a container
    document
      .querySelectorAll('.faq-item, .accordion-item, [data-accordion-item]')
      .forEach((item) => {
        if (!item.closest('.faq, .accordion, [data-accordion]')) {
          bindItem(item, false);
        }
      });
  }

  function setupAccordion(container) {
    const allowMultiple = container.hasAttribute('data-allow-multiple');
    const items = container.querySelectorAll(
      '.faq-item, .accordion-item, [data-accordion-item]'
    );

    items.forEach((item) => bindItem(item, !allowMultiple, container));
  }

  function bindItem(item, closeOthers, container) {
    const trigger = item.querySelector(
      '.faq-question, .accordion-header, .accordion-trigger, [data-accordion-trigger]'
    );
    const body = item.querySelector(
      '.faq-answer, .accordion-body, .accordion-content, [data-accordion-content]'
    );

    if (!trigger || !body) return;

    // Ensure ARIA attributes
    const id = body.id || `accordion-panel-${Math.random().toString(36).slice(2, 8)}`;
    body.id = id;
    trigger.setAttribute('aria-controls', id);
    trigger.setAttribute('aria-expanded', item.classList.contains(ACTIVE) ? 'true' : 'false');
    body.setAttribute('role', 'region');

    // Set initial max-height if already active
    if (item.classList.contains(ACTIVE)) {
      body.style.maxHeight = body.scrollHeight + 'px';
    }

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains(ACTIVE);

      // Close siblings if single-open mode
      if (closeOthers && container && !isOpen) {
        container
          .querySelectorAll(`.${ACTIVE}`)
          .forEach((sibling) => collapseItem(sibling));
      }

      if (isOpen) {
        collapseItem(item);
      } else {
        expandItem(item);
      }
    });
  }

  function expandItem(item) {
    const body = item.querySelector(
      '.faq-answer, .accordion-body, .accordion-content, [data-accordion-content]'
    );
    const trigger = item.querySelector(
      '.faq-question, .accordion-header, .accordion-trigger, [data-accordion-trigger]'
    );
    if (!body) return;

    item.classList.add(ACTIVE);
    body.style.maxHeight = body.scrollHeight + 'px';
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }

  function collapseItem(item) {
    const body = item.querySelector(
      '.faq-answer, .accordion-body, .accordion-content, [data-accordion-content]'
    );
    const trigger = item.querySelector(
      '.faq-question, .accordion-header, .accordion-trigger, [data-accordion-trigger]'
    );
    if (!body) return;

    item.classList.remove(ACTIVE);
    body.style.maxHeight = '0';
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  return { init };
})();

/* ==========================================================================
   7.  TESTIMONIAL CAROUSEL / SLIDER
   ========================================================================== */

const TestimonialCarousel = (() => {
  const AUTO_INTERVAL = 6000; // ms between auto-advance
  const TRANSITION_MS = 500;
  const ACTIVE = 'is-active';

  /** Track each carousel instance */
  const instances = [];

  function init() {
    const carousels = document.querySelectorAll(
      '.testimonial-carousel, .carousel, [data-carousel]'
    );
    carousels.forEach(setup);
  }

  function setup(container) {
    const track = container.querySelector(
      '.carousel-track, .testimonial-track, [data-carousel-track]'
    );
    const slides = container.querySelectorAll(
      '.carousel-slide, .testimonial-slide, .testimonial-card, [data-carousel-slide]'
    );

    if (!slides.length) return;

    const state = {
      container,
      track,
      slides: Array.from(slides),
      current: 0,
      count: slides.length,
      autoTimer: null,
      paused: false,
    };

    instances.push(state);

    // Build controls
    buildControls(state);
    buildDots(state);

    // Set initial slide
    goTo(state, 0, true);

    // Auto-rotate
    startAuto(state);

    // Pause on hover or focus
    container.addEventListener('mouseenter', () => pauseAuto(state));
    container.addEventListener('mouseleave', () => resumeAuto(state));
    container.addEventListener('focusin', () => pauseAuto(state));
    container.addEventListener('focusout', () => resumeAuto(state));

    // Swipe support
    addSwipe(state);
  }

  function buildControls(state) {
    const { container } = state;

    // Skip if controls already exist
    if (container.querySelector('.carousel-prev, [data-carousel-prev]')) {
      const prev = container.querySelector('.carousel-prev, [data-carousel-prev]');
      const next = container.querySelector('.carousel-next, [data-carousel-next]');
      if (prev) prev.addEventListener('click', () => prev_(state));
      if (next) next.addEventListener('click', () => next_(state));
      return;
    }

    const prev = document.createElement('button');
    prev.className = 'carousel-prev';
    prev.setAttribute('aria-label', 'Previous testimonial');
    prev.innerHTML = '<span aria-hidden="true">&lsaquo;</span>';
    prev.addEventListener('click', () => prev_(state));

    const next = document.createElement('button');
    next.className = 'carousel-next';
    next.setAttribute('aria-label', 'Next testimonial');
    next.innerHTML = '<span aria-hidden="true">&rsaquo;</span>';
    next.addEventListener('click', () => next_(state));

    container.appendChild(prev);
    container.appendChild(next);
  }

  function buildDots(state) {
    const { container, count } = state;
    if (count <= 1) return;

    // Skip if dots already exist
    if (container.querySelector('.carousel-dots, [data-carousel-dots]')) {
      const existing = container.querySelectorAll('.carousel-dot, [data-carousel-dot]');
      existing.forEach((dot, i) => dot.addEventListener('click', () => goTo(state, i)));
      state.dots = Array.from(existing);
      return;
    }

    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'carousel-dots';
    dotsWrap.setAttribute('role', 'tablist');
    dotsWrap.setAttribute('aria-label', 'Testimonial navigation');

    state.dots = [];

    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
      dot.addEventListener('click', () => goTo(state, i));
      dotsWrap.appendChild(dot);
      state.dots.push(dot);
    }

    container.appendChild(dotsWrap);
  }

  function goTo(state, index, instant = false) {
    const { slides, dots, count } = state;
    state.current = ((index % count) + count) % count;

    slides.forEach((slide, i) => {
      slide.classList.toggle(ACTIVE, i === state.current);
      slide.setAttribute('aria-hidden', i !== state.current ? 'true' : 'false');

      if (!instant) {
        slide.style.transition = `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms ease`;
      } else {
        slide.style.transition = 'none';
      }
    });

    if (dots) {
      dots.forEach((dot, i) => {
        dot.classList.toggle(ACTIVE, i === state.current);
        dot.setAttribute('aria-selected', i === state.current ? 'true' : 'false');
      });
    }

    // If using a track-based layout, translate the track
    if (state.track) {
      const offset = -(state.current * 100);
      state.track.style.transition = instant ? 'none' : `transform ${TRANSITION_MS}ms ease`;
      state.track.style.transform = `translateX(${offset}%)`;
    }
  }

  function next_(state) {
    goTo(state, state.current + 1);
    restartAuto(state);
  }

  function prev_(state) {
    goTo(state, state.current - 1);
    restartAuto(state);
  }

  function startAuto(state) {
    if (state.count <= 1) return;
    state.autoTimer = setInterval(() => {
      if (!state.paused) goTo(state, state.current + 1);
    }, AUTO_INTERVAL);
  }

  function pauseAuto(state) {
    state.paused = true;
  }

  function resumeAuto(state) {
    state.paused = false;
  }

  function restartAuto(state) {
    clearInterval(state.autoTimer);
    state.paused = false;
    startAuto(state);
  }

  function addSwipe(state) {
    let startX = 0;
    let startY = 0;
    let distX = 0;

    state.container.addEventListener('touchstart', (e) => {
      startX = e.changedTouches[0].clientX;
      startY = e.changedTouches[0].clientY;
    }, { passive: true });

    state.container.addEventListener('touchend', (e) => {
      distX = e.changedTouches[0].clientX - startX;
      const distY = Math.abs(e.changedTouches[0].clientY - startY);

      // Only count horizontal swipes (ignore vertical scroll)
      if (Math.abs(distX) > 50 && distY < 100) {
        if (distX < 0) {
          next_(state);
        } else {
          prev_(state);
        }
      }
    }, { passive: true });
  }

  return { init };
})();

/* ==========================================================================
   8.  FORM VALIDATION HELPERS
   ========================================================================== */

const FormValidation = (() => {
  const ERROR_CLASS = 'field-error';
  const SUCCESS_CLASS = 'field-success';
  const MSG_CLASS = 'field-message';

  const validators = {
    required: (value) => (value.trim().length > 0 ? '' : 'This field is required.'),

    email: (value) => {
      if (!value.trim()) return '';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Please enter a valid email address.';
    },

    phone: (value) => {
      if (!value.trim()) return '';
      const digits = value.replace(/[\s\-().+]/g, '');
      return digits.length >= 8 && digits.length <= 15
        ? ''
        : 'Please enter a valid phone number.';
    },

    abn: (value) => {
      if (!value.trim()) return '';
      const digits = value.replace(/\s/g, '');
      return /^\d{11}$/.test(digits) ? '' : 'ABN must be 11 digits.';
    },

    minLength: (value, length) =>
      value.trim().length >= length ? '' : `Must be at least ${length} characters.`,

    maxLength: (value, length) =>
      value.trim().length <= length ? '' : `Must be no more than ${length} characters.`,

    number: (value) => {
      if (!value.trim()) return '';
      return !isNaN(parseFloat(value)) && isFinite(value) ? '' : 'Please enter a valid number.';
    },

    min: (value, min) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= min ? '' : `Value must be at least ${min}.`;
    },

    max: (value, max) => {
      const num = parseFloat(value);
      return !isNaN(num) && num <= max ? '' : `Value must be no more than ${max}.`;
    },

    match: (value, otherFieldId) => {
      const other = document.getElementById(otherFieldId);
      return other && value === other.value ? '' : 'Fields do not match.';
    },
  };

  /**
   * Validate a single field based on data attributes.
   * Supports: data-validate="required email" data-min-length="2" etc.
   */
  function validateField(field) {
    const rules = (field.dataset.validate || '').split(/\s+/).filter(Boolean);
    const value = field.value || '';
    let error = '';

    for (const rule of rules) {
      if (validators[rule]) {
        error = validators[rule](value);
      } else if (rule.startsWith('minLength:')) {
        error = validators.minLength(value, parseInt(rule.split(':')[1], 10));
      } else if (rule.startsWith('maxLength:')) {
        error = validators.maxLength(value, parseInt(rule.split(':')[1], 10));
      } else if (rule.startsWith('min:')) {
        error = validators.min(value, parseFloat(rule.split(':')[1]));
      } else if (rule.startsWith('max:')) {
        error = validators.max(value, parseFloat(rule.split(':')[1]));
      } else if (rule.startsWith('match:')) {
        error = validators.match(value, rule.split(':')[1]);
      }
      if (error) break;
    }

    // data-min-length / data-max-length shorthand
    if (!error && field.dataset.minLength) {
      error = validators.minLength(value, parseInt(field.dataset.minLength, 10));
    }
    if (!error && field.dataset.maxLength) {
      error = validators.maxLength(value, parseInt(field.dataset.maxLength, 10));
    }

    setFieldState(field, error);
    return error;
  }

  function setFieldState(field, error) {
    const wrapper = field.closest('.form-group, .field-group, .form-field') || field.parentElement;
    let msg = wrapper.querySelector(`.${MSG_CLASS}`);

    if (error) {
      field.classList.add(ERROR_CLASS);
      field.classList.remove(SUCCESS_CLASS);
      if (!msg) {
        msg = document.createElement('span');
        msg.className = MSG_CLASS;
        msg.setAttribute('role', 'alert');
        wrapper.appendChild(msg);
      }
      msg.textContent = error;
      field.setAttribute('aria-invalid', 'true');
    } else {
      field.classList.remove(ERROR_CLASS);
      field.classList.add(SUCCESS_CLASS);
      if (msg) msg.textContent = '';
      field.setAttribute('aria-invalid', 'false');
    }
  }

  /**
   * Attach live validation to a form.
   * Usage: FormValidation.attach('#my-form');
   */
  function attach(formSelector) {
    const form = typeof formSelector === 'string'
      ? document.querySelector(formSelector)
      : formSelector;
    if (!form) return;

    const fields = form.querySelectorAll('[data-validate]');

    fields.forEach((field) => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        // Only clear errors on input, full re-validate on blur
        if (field.classList.contains(ERROR_CLASS)) {
          validateField(field);
        }
      });
    });

    form.addEventListener('submit', (e) => {
      let hasErrors = false;
      fields.forEach((field) => {
        const error = validateField(field);
        if (error) hasErrors = true;
      });

      if (hasErrors) {
        e.preventDefault();
        // Focus the first field with an error
        const firstError = form.querySelector(`.${ERROR_CLASS}`);
        if (firstError) firstError.focus();
      }
    });
  }

  /**
   * Format a currency input with commas as the user types.
   * Attach to input via: FormValidation.currencyInput('#loan-amount');
   */
  function currencyInput(selector) {
    const input = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!input) return;

    input.addEventListener('input', () => {
      let raw = input.value.replace(/[^0-9.]/g, '');
      const parts = raw.split('.');
      if (parts.length > 2) {
        raw = parts[0] + '.' + parts.slice(1).join('');
      }
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      input.value = parts.length > 1 ? parts[0] + '.' + (parts[1] || '').slice(0, 2) : parts[0];
    });
  }

  // Auto-attach validation to any form with [data-validate-form]
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-validate-form]').forEach(attach);
  });

  return { attach, validateField, currencyInput, validators };
})();

/* ==========================================================================
   9.  COOKIE CONSENT BANNER
   ========================================================================== */

const CookieConsent = (() => {
  const STORAGE_KEY = 'elevatelend_cookie_consent';
  const BANNER_ID = 'cookie-consent';

  function init() {
    // Skip if consent was already given
    if (getConsent()) return;

    // Use an existing banner in the DOM, or create one
    let banner = document.getElementById(BANNER_ID);
    if (!banner) {
      banner = createBanner();
    }

    // Reveal after a short delay so it does not flash on load
    setTimeout(() => banner.classList.add('is-visible'), 800);
  }

  function createBanner() {
    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.className = 'cookie-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');

    banner.innerHTML = `
      <div class="cookie-consent__inner">
        <p class="cookie-consent__text">
          We use cookies to improve your experience and analyse site traffic.
          By continuing, you agree to our
          <a href="/privacy" class="cookie-consent__link">Privacy Policy</a>.
        </p>
        <div class="cookie-consent__actions">
          <button class="cookie-consent__btn cookie-consent__btn--accept" data-consent="accept">Accept</button>
          <button class="cookie-consent__btn cookie-consent__btn--decline" data-consent="decline">Decline</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    banner.querySelector('[data-consent="accept"]').addEventListener('click', () => {
      setConsent('accepted');
      dismiss(banner);
    });

    banner.querySelector('[data-consent="decline"]').addEventListener('click', () => {
      setConsent('declined');
      dismiss(banner);
    });

    return banner;
  }

  function dismiss(banner) {
    banner.classList.remove('is-visible');
    banner.classList.add('is-dismissed');
    setTimeout(() => banner.remove(), 500);
  }

  function getConsent() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function setConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // localStorage not available — fail silently
    }
  }

  /** Public: check if user has accepted cookies */
  function hasAccepted() {
    return getConsent() === 'accepted';
  }

  return { init, hasAccepted };
})();

/* ==========================================================================
   10. BACK TO TOP BUTTON
   ========================================================================== */

const BackToTop = (() => {
  const VISIBLE_CLASS = 'is-visible';
  const SCROLL_THRESHOLD = 600;
  let btn = null;
  let ticking = false;

  function init() {
    btn = document.querySelector('.back-to-top, [data-back-to-top]');

    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'back-to-top';
      btn.setAttribute('aria-label', 'Back to top');
      btn.innerHTML = '<span aria-hidden="true">&uarr;</span>';
      document.body.appendChild(btn);
    }

    btn.addEventListener('click', scrollToTop);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // set initial state
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      btn.classList.toggle(VISIBLE_CLASS, window.scrollY > SCROLL_THRESHOLD);
    });
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    btn.blur();
  }

  return { init };
})();

/* ==========================================================================
   UTILITY: DEBOUNCE & THROTTLE  (used internally, exported for pages)
   ========================================================================== */

function debounce(fn, wait = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, limit = 100) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/* ==========================================================================
   EXPORTS — make modules available to page-specific scripts
   ========================================================================== */

window.ElevateLend = {
  MobileNav,
  SmoothScroll,
  StickyHeader,
  AnimatedCounters,
  ScrollAnimations,
  FAQAccordion,
  TestimonialCarousel,
  FormValidation,
  CookieConsent,
  BackToTop,
  debounce,
  throttle,
};
