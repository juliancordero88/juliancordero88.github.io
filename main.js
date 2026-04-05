// ============================================================
// UNICORN DRIP COFFEE — main.js
// ============================================================

(function () {
  'use strict';

  // ── Nav scroll shadow ──────────────────────────────────────
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', function () {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    highlightActiveLink();
  }, { passive: true });

  // ── Mobile nav toggle ──────────────────────────────────────
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  navToggle.addEventListener('click', function () {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when a link is clicked
  navLinks.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', false);
    });
  });

  // ── Active nav link on scroll ──────────────────────────────
  const sections = document.querySelectorAll('section[id], footer[id]');
  const navLinkEls = document.querySelectorAll('.nav-link');

  function highlightActiveLink() {
    const scrollY = window.scrollY + 120;
    let current = '';

    sections.forEach(function (section) {
      if (section.offsetTop <= scrollY) {
        current = section.getAttribute('id');
      }
    });

    navLinkEls.forEach(function (link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      }
    });
  }

  // ── Waitlist modal ─────────────────────────────────────────
  const modalOverlay = document.getElementById('modalOverlay');

  window.openWaitlist = function () {
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeWaitlist = function () {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    const note = document.getElementById('modalNote');
    if (note) note.textContent = '';
  };

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.closeWaitlist();
  });

  // ── Form handlers ──────────────────────────────────────────
  window.handleWaitlist = function (e) {
    e.preventDefault();
    const form  = e.target;
    const email = form.querySelector('input[type="email"]').value;
    // In production: POST to your email service (Mailchimp, ConvertKit, etc.)
    // For now, open the modal with a thank-you note
    openWaitlist();
    const note = document.getElementById('modalNote');
    if (note) note.textContent = '✓ ' + email + ' has been added!';
    form.reset();
  };

  window.handleModalWaitlist = function (e) {
    e.preventDefault();
    const form  = e.target;
    const email = form.querySelector('input[type="email"]').value;
    const note  = document.getElementById('modalNote');
    // Simulate success (replace with real API call)
    note.textContent = '🦄 You\'re on the list! We\'ll be in touch soon.';
    form.reset();
  };

  window.handleContact = function (e) {
    e.preventDefault();
    const form  = e.target;
    const name  = form.querySelector('#contactName').value;
    const email = form.querySelector('#contactEmail').value;
    const msg   = form.querySelector('#contactMessage').value;
    const note  = document.getElementById('contactNote');
    // Build a mailto fallback (replace with real form endpoint)
    const mailto = 'mailto:hello@unicorndripcoffee.com'
      + '?subject=Message from ' + encodeURIComponent(name)
      + '&body=' + encodeURIComponent(msg + '\n\nFrom: ' + email);
    window.location.href = mailto;
    note.textContent = '✓ Opening your email client…';
    form.reset();
  };

  // ── Intersection Observer — fade-in on scroll ──────────────
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(
    '.product-card, .plan-card, .magic-item, .about-stat, .shop-cta-box'
  ).forEach(function (el) {
    el.classList.add('fade-in');
    observer.observe(el);
  });

})();
