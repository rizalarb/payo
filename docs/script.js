// PAYO Landing Page v2 · script.js
(function () {
  'use strict';

  // ===== Sticky nav scrolled state =====
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 8) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ===== Mobile menu toggle =====
  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');
  if (navToggle && navMobile) {
    navToggle.addEventListener('click', () => {
      const open = navMobile.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    navMobile.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        navMobile.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ===== Reveal on scroll (IntersectionObserver) =====
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-revealed'));
  }

  // ===== Smooth-close FAQ siblings =====
  document.querySelectorAll('.faq-item').forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        document.querySelectorAll('.faq-item').forEach((other) => {
          if (other !== item && other.open) other.open = false;
        });
      }
    });
  });

  // ===== Waitlist Form Submission =====
  const waitlistForm = document.getElementById('waitlistForm');
  if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(waitlistForm);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        company: formData.get('company') || '',
        business_type: formData.get('business_type') || '',
        timestamp: new Date().toISOString()
      };
      
      const submitBtn = waitlistForm.querySelector('.btn-submit');
      const originalText = submitBtn.innerHTML;
      
      // Show loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spin">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10"/>
        </svg>
        Joining...
      `;
      
      // Simulate API call (replace with actual endpoint later)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success state
      submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        You're on the list!
      `;
      submitBtn.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
      
      // Log data (replace with actual API call)
      console.log('[PAYO Waitlist]', data);
      
      // Reset form after delay
      setTimeout(() => {
        waitlistForm.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        submitBtn.style.background = '';
      }, 3000);
    });
  }

  // ===== CTA click telemetry =====
  document.querySelectorAll('[data-cta]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const label = btn.getAttribute('data-cta');
      console.log('[PAYO CTA]', label);
    });
  });
})();
