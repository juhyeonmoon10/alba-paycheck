/* Progressive enhancement only: no storage, analytics or network requests. */
(() => {
  'use strict';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionToggle = document.querySelector('#motionToggle');
  let manuallyPaused = false;
  const motionAllowed = () => !media.matches && !manuallyPaused;
  const syncMotion = () => {
    root.classList.toggle('motion-enabled', motionAllowed());
    root.classList.toggle('motion-off', !motionAllowed());
    motionToggle.setAttribute('aria-pressed', String(!motionAllowed()));
    motionToggle.textContent = !motionAllowed() ? '움직임 꺼짐' : '움직임 끄기';
    motionToggle.title = media.matches ? '기기의 동작 줄이기 설정을 따르고 있어요.' : '화면 전환과 등장 효과 켜기 또는 끄기';
    document.getAnimations().forEach(animation => { if (!motionAllowed()) animation.finish(); });
  };
  motionToggle.hidden = false;
  motionToggle.addEventListener('click', () => {
    if (media.matches) { toast('기기의 동작 줄이기 설정을 따르고 있어요.'); return; }
    manuallyPaused = !manuallyPaused;
    syncMotion();
  });
  media.addEventListener('change', syncMotion);
  syncMotion();

  const flash = node => {
    if (!node || !motionAllowed() || !node.animate) return;
    node.animate([{ opacity: .55, transform: 'translateY(10px)' },{ opacity: 1, transform: 'translateY(0)' }], { duration: 420, easing: 'cubic-bezier(.2,.75,.25,1)' });
  };

  const revealTargets = document.querySelectorAll('.feature-card, .section-heading, .institution-card, .institution-list li, .faq-section details');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { rootMargin: '0px 0px 35px 0px', threshold: .08 });
    revealTargets.forEach((node, index) => {
      node.classList.add('reveal');
      node.style.setProperty('--reveal-delay', `${(index % 4) * 65}ms`);
      observer.observe(node);
    });
  }

  let scrollFrame = 0;
  const trackScroll = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      const max = root.scrollHeight - root.clientHeight;
      document.querySelector('#readingProgress').style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0})`;
      document.querySelector('.site-header').classList.toggle('is-scrolled', window.scrollY > 24);
      scrollFrame = 0;
    });
  };
  window.addEventListener('scroll', trackScroll, { passive: true });
  window.addEventListener('resize', trackScroll);
  trackScroll();

  const tabs = [...document.querySelectorAll('.tool-tab')];
  tabs.forEach((tab, index) => {
    tab.id = `tab-${tab.dataset.tab}`;
    tab.tabIndex = tab.classList.contains('active') ? 0 : -1;
    const panel = document.querySelector(`[data-panel="${tab.dataset.tab}"]`);
    panel.id = `panel-${tab.dataset.tab}`;
    tab.setAttribute('aria-controls', panel.id);
    panel.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => flash(panel));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      tabs[next].click();
      tabs[next].focus({ preventScroll: true });
    });
  });

  const previewSteps = [...document.querySelectorAll('[data-preview-step]')];
  const previewMessages = ['시급과 근무시간을 입력하는 단계예요.', '입력한 조건에서 확인할 항목을 살펴봐요.', '확인한 내용을 계약서 초안으로 보관해요.'];
  previewSteps.forEach((button, index) => button.addEventListener('click', () => {
    previewSteps.forEach((item, itemIndex) => {
      item.setAttribute('aria-pressed', String(itemIndex === index));
      item.closest('li').classList.toggle('done', itemIndex <= index);
    });
    const percent = [33, 67, 100][index];
    document.querySelector('.progress-number').textContent = percent + '%';
    document.querySelector('.progress-track span').style.width = percent + '%';
    document.querySelector('#previewHint').textContent = previewMessages[index];
    flash(document.querySelector('.progress-number'));
  }));

  const form = document.querySelector('#contractForm');
  const fields = [...form.querySelectorAll('[required]')];
  const bar = document.querySelector('#inputProgressBar');
  bar.setAttribute('aria-valuemax', String(fields.length));
  document.querySelector('#inputProgress').hidden = false;
  document.querySelector('#livePay').hidden = false;
  function syncInput() {
    const count = fields.filter(field => field.value.trim() !== '' && field.validity.valid).length;
    document.querySelector('#inputProgressText').textContent = `${count} / ${fields.length}`;
    bar.setAttribute('aria-valuenow', String(count));
    bar.firstElementChild.style.width = `${count / fields.length * 100}%`;
    document.querySelector('#inputProgressHint').textContent = count === fields.length ? '필수 정보가 채워졌어요. 아래에서 내 계약을 확인해 보세요.' : `${fields.length - count}개 항목을 더 입력하면 확인할 수 있어요.`;
    const wageFields = ['#hourlyWage', '#daysPerWeek', '#hoursPerDay'].map(selector => document.querySelector(selector));
    const valid = wageFields.every(field => field.value !== '' && field.validity.valid);
    document.querySelector('#livePayValue').textContent = valid ? won(expectedPay(...wageFields.map(field => Number(field.value))).total) : '시급·근무시간을 입력해 주세요';
  }
  const invalidateResult = () => {
    document.querySelector('#contractResult').hidden = true;
    document.querySelector('#contractPreview').hidden = true;
    syncInput();
  };
  form.addEventListener('input', invalidateResult);
  form.addEventListener('change', invalidateResult);
  document.querySelector('#loadExample').addEventListener('click', () => { invalidateResult(); flash(form); });
  document.querySelector('#resetContract').addEventListener('click', syncInput);
  form.addEventListener('submit', () => {
    if (!document.querySelector('#contractResult').hidden) {
      flash(document.querySelector('#contractResult'));
      document.querySelectorAll('.check-item').forEach((node, index) => {
        if (motionAllowed() && node.animate) node.animate([{ opacity: 0, transform: 'translateY(8px)' },{ opacity: 1, transform: 'translateY(0)' }], { duration: 320, delay: index * 45, fill: 'backwards' });
      });
    }
  });
  document.querySelector('#makeContract').addEventListener('click', () => flash(document.querySelector('#contractPreview')));
  document.querySelector('#wageForm').addEventListener('submit', () => flash(document.querySelector('#wageResult')));
  document.querySelector('#wageForm').addEventListener('input', () => { document.querySelector('#wageResult').hidden = true; });
  document.querySelector('#wageForm').addEventListener('change', () => { document.querySelector('#wageResult').hidden = true; });
  syncInput();
})();
