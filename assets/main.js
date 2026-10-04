/* AISPACE — redesign 2026. Vanilla JS, без залежностей. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  /* ---------- Header, прогрес скролу, мобільна CTA ---------- */
  const header = $('#header');
  const progressBar = $('.scroll-progress');
  const hero = $('.hero');
  const mobileCta = $('[data-mobile-cta]');
  const ctaSection = $('#cta');
  let ctaInView = false;

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    const max = root.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    if (mobileCta && hero) {
      mobileCta.classList.toggle('is-shown', y > hero.offsetHeight * 0.75 && !ctaInView);
    }
  }

  if (ctaSection) {
    new IntersectionObserver(([entry]) => {
      ctaInView = entry.isIntersecting;
      onScroll();
    }, { rootMargin: '0px 0px -20% 0px' }).observe(ctaSection);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Мобільне меню ---------- */
  const navToggle = $('.nav-toggle');
  const navList = $('#site-nav');

  function setMenu(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Закрити меню' : 'Меню');
    navList.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
  }

  navToggle.addEventListener('click', () => setMenu(navToggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', navList).forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      navToggle.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!header.contains(e.target)) setMenu(false);
  });

  /* ---------- Активний пункт навігації ---------- */
  const navLinks = $$('.nav-links a[href^="#"]');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.dataset.nav || entry.target.id;
      navLinks.forEach((link) => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((section) => sectionObserver.observe(section));

  /* ---------- Поява елементів при скролі ---------- */
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-reveal-demo], [data-steps]').forEach((el) => revealObserver.observe(el));

  /* ---------- Hero: шари реагують на курсор і розходяться при скролі ---------- */
  const scene = $('.scene');
  if (scene && hero && !reduceMotion) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let tSpread = 1, spread = 1;
    let running = false;

    const frame = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      spread += (tSpread - spread) * 0.1;
      scene.style.setProperty('--mx', cx.toFixed(4));
      scene.style.setProperty('--my', cy.toFixed(4));
      scene.style.setProperty('--spread', spread.toFixed(4));
      if (Math.abs(tx - cx) + Math.abs(ty - cy) + Math.abs(tSpread - spread) > 0.0015) {
        requestAnimationFrame(frame);
      } else {
        running = false;
      }
    };
    const kick = () => {
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    };

    if (finePointer) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
        ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
        kick();
      });
      hero.addEventListener('pointerleave', () => {
        tx = 0;
        ty = 0;
        kick();
      });
    }

    window.addEventListener('scroll', () => {
      const h = hero.offsetHeight || 1;
      if (window.scrollY > h * 1.2) return;
      tSpread = 1 + clamp(window.scrollY / h, 0, 1) * (window.innerWidth < 640 ? 0.5 : 1.4);
      kick();
    }, { passive: true });
  }

  /* ---------- Анатомія системи: закріплена секція з прогресом ---------- */
  const anatomy = $('.anatomy');
  if (anatomy) {
    const steps = $$('.anat-step', anatomy);
    const plates = $$('[data-plate]', anatomy);
    const wide = window.matchMedia('(min-width: 1001px)');
    let ticking = false;
    let current = -2;

    const setActive = (index) => {
      if (index === current) return;
      current = index;
      steps.forEach((el, k) => el.classList.toggle('is-active', index < 0 || k === index));
      plates.forEach((el, k) => el.classList.toggle('is-active', k === index));
    };

    const update = () => {
      ticking = false;
      if (!wide.matches || reduceMotion) {
        anatomy.style.removeProperty('--p');
        setActive(-1);
        return;
      }
      const rect = anatomy.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 1;
      anatomy.style.setProperty('--p', p.toFixed(4));
      setActive(Math.min(steps.length - 1, Math.floor(p * steps.length * 0.9999)));
    };

    const requestUpdate = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    steps.forEach((btn, k) => {
      btn.addEventListener('click', () => {
        if (!wide.matches || reduceMotion) return;
        const total = anatomy.offsetHeight - window.innerHeight;
        const top = anatomy.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + total * ((k + 0.5) / steps.length), behavior: 'smooth' });
      });
    });

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    update();
  }

  /* ---------- Лічильники ---------- */
  const formatNumber = (n) => Math.round(n).toLocaleString('uk-UA');
  const counters = $$('[data-count]');
  if (!reduceMotion) {
    counters.forEach((el) => { el.textContent = '0'; });
    const countObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        const el = entry.target;
        const end = Number(el.dataset.count);
        const duration = end > 100 ? 1800 : 1300;
        const t0 = performance.now();
        const step = (t) => {
          const k = clamp((t - t0) / duration, 0, 1);
          el.textContent = formatNumber(end * (1 - Math.pow(1 - k, 4)));
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => countObserver.observe(el));
  }

  /* ---------- Демо AI Guard: стрічка повідомлень з тригерами ---------- */
  const guard = $('[data-guard]');
  if (guard) {
    const feed = $('[data-guard-feed]', guard);
    const toast = $('[data-guard-toast]', guard);
    const toastText = $('[data-guard-toast-text]', guard);
    const messages = [
      { who: 'Клієнт', text: 'Добрий день, хочу уточнити статус замовлення' },
      { who: 'Оператор', text: 'Звісно, зараз перевірю. Дякую за очікування', tag: 'ввічливість ✓' },
      { who: 'Клієнт', text: 'Звертаюсь утретє. Якщо не вирішите — піду до конкурентів', flag: 'Ризик відтоку', toast: 'Ризик відтоку · потрібна реакція' },
      { who: 'Оператор', text: 'Розумію ваше розчарування, вирішимо це сьогодні', tag: 'емпатія ✓' },
      { who: 'Учень', text: 'Здається, я взагалі нічого не розумію на уроках', flag: 'Ризик відтоку', toast: 'Учень втрачає мотивацію' },
      { who: 'Викладач', text: 'Давай розберемо разом, що саме викликає труднощі', tag: 'підтримка ✓' },
      { who: 'Клієнт', text: 'Ваш менеджер розмовляв зі мною неприпустимо', flag: 'Етика спілкування', toast: 'Скарга на етику спілкування' }
    ];
    let index = 0;
    let timer = null;
    let toastTimer = null;

    const buildMessage = (m) => {
      const li = document.createElement('li');
      li.className = `msg${m.flag ? ' is-flag' : ''}`;
      const who = document.createElement('span');
      who.className = 'msg-who';
      who.textContent = m.who;
      const text = document.createElement('span');
      text.className = 'msg-text';
      text.textContent = m.text;
      li.append(who, text);
      if (m.flag || m.tag) {
        const tag = document.createElement('span');
        tag.className = m.flag ? 'tag tag-signal' : 'tag tag-ghost';
        tag.textContent = m.flag ? `гарячий тригер · ${m.flag}` : m.tag;
        li.append(tag);
      }
      return li;
    };

    const push = () => {
      const m = messages[index % messages.length];
      index += 1;
      const li = buildMessage(m);
      feed.prepend(li);
      requestAnimationFrame(() => requestAnimationFrame(() => li.classList.add('is-in')));
      while (feed.children.length > 3) feed.lastElementChild.remove();
      if (m.flag) {
        toastText.textContent = m.toast;
        toast.classList.add('is-shown');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 2600);
      }
    };

    // Стартовий стан, щоб демо не було порожнім
    messages.slice(0, 3).reverse().forEach((m) => {
      const li = buildMessage(m);
      li.classList.add('is-in');
      feed.append(li);
    });
    index = 3;

    if (!reduceMotion) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !timer) {
          timer = setInterval(push, 2600);
        } else if (!entry.isIntersecting && timer) {
          clearInterval(timer);
          timer = null;
        }
      }, { threshold: 0.3 }).observe(guard);
    }
  }

  /* ---------- Сітка покриття: ручний контроль vs AISPACE ---------- */
  const coverage = $('[data-coverage]');
  if (coverage) {
    const cellsBox = $('[data-cells]', coverage);
    const valueEl = $('[data-cov-value]', coverage);
    const labelEl = $('[data-cov-label]', coverage);
    const modeButtons = $$('[data-mode]', coverage);
    const checked = new Set([3, 17, 22, 38, 45, 51, 66, 72, 89, 94]); // ~10% вибіркової перевірки
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 100; i += 1) {
      const cell = document.createElement('span');
      cell.className = `cell${checked.has(i) ? ' is-checked' : ''}`;
      cell.style.setProperty('--r', String(Math.floor(i / 10)));
      fragment.append(cell);
    }
    cellsBox.append(fragment);

    let userTouched = false;
    let valueAnim = 0;
    const animateValue = (from, to) => {
      cancelAnimationFrame(valueAnim);
      if (reduceMotion) {
        valueEl.textContent = String(to);
        return;
      }
      const t0 = performance.now();
      const step = (t) => {
        const k = clamp((t - t0) / 1100, 0, 1);
        valueEl.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
        if (k < 1) valueAnim = requestAnimationFrame(step);
      };
      valueAnim = requestAnimationFrame(step);
    };

    const setMode = (mode) => {
      const ai = mode === 'ai';
      if (coverage.classList.contains('is-ai') === ai) return;
      coverage.classList.toggle('is-ai', ai);
      modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
      animateValue(ai ? 10 : 100, ai ? 100 : 10);
      labelEl.textContent = ai
        ? 'розмов проаналізовано за вашими стандартами. Сліпої зони немає'
        : 'перевірено вибірково. Решта 90% — сліпа зона';
    };

    modeButtons.forEach((b) => b.addEventListener('click', () => {
      userTouched = true;
      setMode(b.dataset.mode);
    }));

    // Одноразова демонстрація, коли блок з'являється на екрані
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      setTimeout(() => {
        if (!userTouched) setMode('ai');
      }, 1400);
    }, { threshold: 0.55 }).observe(coverage);
  }

  /* ---------- Конструктор критеріїв (демо) ---------- */
  const builder = $('[data-builder]');
  if (builder) {
    const list = $('[data-builder-list]', builder);
    const totalEl = $('[data-builder-total]', builder);
    const captionEl = $('[data-builder-caption]', builder);
    // w — вага критерію, s — приклад оцінки 0–10
    const presets = {
      sales: [
        { name: 'Уточнюючі запитання та причини сумнівів', w: 2, s: 8 },
        { name: 'Опрацювання заперечень', w: 2, s: 6 },
        { name: 'Дотримання скрипту', w: 1, s: 9 },
        { name: 'Пропозиція наступного кроку', w: 1, s: 10 }
      ],
      support: [
        { name: 'Дотримання стандартів сервісу', w: 1, s: 9 },
        { name: 'Утримання клієнта', w: 2, s: 8 },
        { name: 'Етика та тон спілкування', w: 2, s: 10 },
        { name: 'Вирішення звернення', w: 1, s: 6 }
      ],
      lesson: [
        { name: 'Структурований урок з логічним потоком', w: 2, s: 9 },
        { name: 'CCQ та ефективні питання', w: 2, s: 7 },
        { name: 'Уникнення граматичних помилок', w: 1, s: 8 },
        { name: 'Зворотний зв\'язок студенту', w: 1, s: 5 }
      ],
      complaint: [
        { name: 'Визнання проблеми клієнта', w: 1, s: 9 },
        { name: 'Етика та тон спілкування', w: 2, s: 8 },
        { name: 'Пропозиція рішення', w: 2, s: 6 },
        { name: 'Фіксація наступного кроку', w: 1, s: 4 }
      ]
    };
    let cat = 'sales';
    let scale = 'points';

    const render = () => {
      const items = presets[cat];
      list.textContent = '';
      let sum = 0;
      let max = 0;
      items.forEach((item, k) => {
        const row = document.createElement('div');
        row.className = 'b-item';
        row.style.setProperty('--k', String(k));
        const name = document.createElement('span');
        name.className = 'b-name';
        name.textContent = item.name;
        if (item.w > 1) {
          const weight = document.createElement('span');
          weight.className = 'b-weight';
          weight.textContent = `вага ×${item.w}`;
          name.append(weight);
        }
        const score = document.createElement('span');
        score.className = 'b-score';
        if (scale === 'points') {
          score.textContent = `${item.s}/10`;
          sum += item.s * item.w;
          max += 10 * item.w;
        } else {
          const yes = item.s >= 7;
          score.textContent = yes ? '✓ Так' : '✕ Ні';
          score.classList.add(yes ? 'is-yes' : 'is-no');
          sum += (yes ? 1 : 0) * item.w;
          max += item.w;
        }
        row.append(name, score);
        if (scale === 'points') {
          const bar = document.createElement('div');
          bar.className = `bar${item.s < 7 ? ' is-mid' : ''}`;
          const fill = document.createElement('i');
          fill.style.setProperty('--v', String(item.s * 10));
          bar.append(fill);
          row.append(bar);
        }
        list.append(row);
      });
      totalEl.textContent = `${Math.round((sum / max) * 100)}%`;
      captionEl.textContent = scale === 'points' ? 'Зважена оцінка розмови' : 'Виконано критеріїв (з урахуванням ваги)';
    };

    $$('[data-cat]', builder).forEach((btn) => btn.addEventListener('click', () => {
      cat = btn.dataset.cat;
      $$('[data-cat]', builder).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    }));
    $$('[data-scale]', builder).forEach((btn) => btn.addEventListener('click', () => {
      scale = btn.dataset.scale;
      $$('[data-scale]', builder).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      render();
    }));
    render();
  }

  /* ---------- Spotlight-рамки ---------- */
  if (finePointer && !reduceMotion) {
    $$('.spot').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--sx', `${e.clientX - r.left}px`);
        el.style.setProperty('--sy', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- Рік у футері ---------- */
  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Форма заявки ---------- */
  // Той самий Google Apps Script, що й на поточному сайті
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxNxNQlk2bR3En06WaIhVcsWWBjI0dEQ7LN5rjHuZWmaG6Banv9WjdbQJJXdUpP9uYI/exec';
  const form = $('#contactForm');
  const success = $('#form-success');

  if (form && success) {
    const alertBox = $('[data-form-alert]', form);
    const submitBtn = $('button[type="submit"]', form);
    const submitHtml = submitBtn.innerHTML;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneRe = /^\+\d{10,15}$/;

    // Нормалізація під формат, який приймає Apps Script: +380XXXXXXXXX
    const normalizePhone = (value) => {
      let v = value.replace(/[^\d+]/g, '');
      if (v.startsWith('+')) v = '+' + v.slice(1).replace(/\+/g, '');
      else if (v.startsWith('380')) v = '+' + v;
      else if (v.startsWith('80')) v = '+3' + v;
      else if (v.startsWith('0')) v = '+38' + v;
      else if (v) v = '+' + v;
      return v;
    };

    const rules = {
      name: (v) => v.trim().length >= 2,
      phone: (v) => phoneRe.test(normalizePhone(v)),
      email: (v) => emailRe.test(v.trim()),
      company: (v) => v.trim().length >= 1,
      industry: (v) => v !== ''
    };

    const validateField = (name) => {
      const input = form.elements[name];
      const ok = rules[name](input.value);
      const field = input.closest('.field');
      field.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      if (!ok) input.setAttribute('aria-describedby', `${name}-error`);
      else input.removeAttribute('aria-describedby');
      return ok;
    };

    Object.keys(rules).forEach((name) => {
      const input = form.elements[name];
      input.addEventListener('blur', () => {
        if (input.value !== '') validateField(name);
      });
      input.addEventListener(name === 'industry' ? 'change' : 'input', () => {
        if (input.closest('.field').classList.contains('is-invalid')) validateField(name);
      });
    });

    form.elements.phone.addEventListener('blur', (e) => {
      const normalized = normalizePhone(e.target.value);
      if (normalized) e.target.value = normalized;
    });

    const setLoading = (loading) => {
      submitBtn.disabled = loading;
      submitBtn.innerHTML = loading ? '<span class="spinner" aria-hidden="true"></span>Надсилаємо…' : submitHtml;
    };

    const showSuccess = () => {
      form.hidden = true;
      success.classList.add('is-shown');
      success.focus({ preventScroll: true });
      success.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.classList.remove('is-shown');

      const invalid = Object.keys(rules).filter((name) => !validateField(name));
      if (invalid.length) {
        form.elements[invalid[0]].focus();
        return;
      }

      // Пастка для ботів: людина це поле не бачить
      if (form.elements.website.value) {
        showSuccess();
        return;
      }

      const payload = {
        fullName: form.elements.name.value.trim(),
        phone: normalizePhone(form.elements.phone.value),
        email: form.elements.email.value.trim(),
        company: form.elements.company.value.trim(),
        industry: form.elements.industry.value,
        comment: form.elements.message.value.trim()
      };

      setLoading(true);
      try {
        // no-cors: відповідь Apps Script непрозора, тому помилкою вважаємо лише мережевий збій
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        showSuccess();
      } catch (err) {
        alertBox.innerHTML = 'Не вдалося надіслати заявку. Перевірте з\'єднання та спробуйте ще раз або напишіть нам на <a href="mailto:aispace.integration@gmail.com">aispace.integration@gmail.com</a>.';
        alertBox.classList.add('is-shown');
      } finally {
        setLoading(false);
      }
    });

    $('[data-form-reset]', success).addEventListener('click', () => {
      form.reset();
      $$('.field', form).forEach((f) => f.classList.remove('is-invalid'));
      success.classList.remove('is-shown');
      form.hidden = false;
      form.elements.name.focus();
    });
  }
})();
