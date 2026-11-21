/* Demo 2 · Atelier — motion, navigation, practice index, horizontal process, forms and the admin live preview. */
(() => {
    'use strict';

    const CFG = window.SITE || {};
    const root = document.documentElement;
    const body = document.body;
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const lerp = (a, b, t) => a + (b - a) * t;

    /* ---------- Smooth scrolling ---------- */
    let lenis = null;
    if (CFG.smooth && window.Lenis && !reduceMotion) {
        lenis = new window.Lenis({ lerp: 0.14, wheelMultiplier: 1.05, smoothWheel: true, syncTouch: false });
        const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
    }
    const scrollToY = (y, immediate = false) => {
        if (lenis) lenis.scrollTo(y, { duration: 1, immediate });
        else window.scrollTo({ top: y, behavior: immediate || reduceMotion ? 'auto' : 'smooth' });
    };
    const scrollToEl = el => {
        const bar = $('.hd-bar');
        const offset = el.classList.contains('s-hero') ? 0 : (bar ? Math.min(bar.offsetHeight, 80) : 70);
        scrollToY(el.getBoundingClientRect().top + window.scrollY - offset);
    };

    /* ---------- Mobile menu ---------- */
    const burger = $('.burger');
    const openMenu = () => { body.classList.add('menu-open'); burger?.setAttribute('aria-expanded', 'true'); lenis?.stop(); };
    const closeMenu = () => {
        if (!body.classList.contains('menu-open')) return;
        body.classList.remove('menu-open');
        burger?.setAttribute('aria-expanded', 'false');
        lenis?.start();
    };
    burger?.addEventListener('click', () => body.classList.contains('menu-open') ? closeMenu() : openMenu());
    addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    addEventListener('resize', () => { if (innerWidth > 1180) closeMenu(); });

    /* ---------- In-page links ---------- */
    const selectIssue = title => {
        $$('select[name="legal_issue"]').forEach(select => {
            const option = Array.from(select.options).find(o => o.value === title || o.text === title);
            if (option) select.value = option.value;
        });
    };
    document.addEventListener('click', e => {
        const next = e.target.closest('[data-scroll-next]');
        if (next) {
            e.preventDefault();
            const section = next.closest('section')?.nextElementSibling;
            if (section) scrollToEl(section);
            return;
        }
        const a = e.target.closest('a[href]');
        if (!a || a.target === '_blank') return;
        const href = a.getAttribute('href');
        if (!href || !href.includes('#') || href === '#') return;
        const url = new URL(a.href, location.href);
        if (url.pathname !== location.pathname || url.search !== location.search) return;
        const id = decodeURIComponent(url.hash.slice(1));
        const target = id === 'top' ? body : document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        if (a.dataset.issue) selectIssue(a.dataset.issue);
        if (id === 'top') scrollToY(0); else scrollToEl(target);
        if (id !== 'top' && history.replaceState) history.replaceState(null, '', '#' + id);
    });

    /* ---------- Preloader: counter 0 → 100 ---------- */
    const heroReveal = () => $$('.s-hero [data-reveal], .s-hero [data-split]').forEach(el => el.classList.add('is-in'));
    const ready = () => {
        if (body.classList.contains('is-ready')) return;
        body.classList.add('is-ready');
        heroReveal();
    };
    const preloader = $('.preloader');
    if (preloader && !root.classList.contains('skip-preloader') && !reduceMotion) {
        const count = $('[data-count-up]', preloader);
        const line = $('.pl-line', preloader);
        const start = performance.now();
        let loaded = document.readyState === 'complete';
        addEventListener('load', () => { loaded = true; }, { once: true });
        const tick = now => {
            const elapsed = now - start;
            // Glide to 90% in ~1.1s, finish once the page has loaded (or after 3.5s).
            let p = Math.min(.9, elapsed / 1200);
            if (loaded || elapsed > 3500) p = Math.min(1, .9 + (elapsed - 1200) / 500);
            const eased = 1 - Math.pow(1 - Math.max(0, p), 3);
            count.textContent = Math.round(eased * 100);
            line.style.setProperty('--p', eased.toFixed(3));
            if (p < 1) requestAnimationFrame(tick);
            else setTimeout(() => {
                preloader.classList.add('is-done');
                setTimeout(ready, 350);
                setTimeout(() => preloader.remove(), 1300);
            }, 180);
        };
        requestAnimationFrame(tick);
    } else {
        preloader?.remove();
        requestAnimationFrame(ready);
    }
    try { sessionStorage.setItem(window.VISIT_KEY || 'visited', '1'); } catch (e) { /* private mode */ }

    /* ---------- Header, progress, back to top ---------- */
    const header = $('.hd');
    const progress = $('.scroll-progress');
    const toTop = $('.to-top');
    const mobileBar = $('.mobile-bar');
    let lastY = window.scrollY, ticking = false;
    const onScroll = () => {
        const y = window.scrollY;
        const docH = root.scrollHeight; // read before any class changes below
        if (header) {
            header.classList.toggle('is-solid', y > 40);
            if (header.hasAttribute('data-autohide') && Math.abs(y - lastY) > 4) {
                header.classList.toggle('is-hidden', y > lastY && y > 400 && !body.classList.contains('menu-open'));
            }
        }
        const p = Math.min(1, y / Math.max(1, docH - innerHeight));
        if (progress) progress.style.transform = `scaleX(${p})`;
        toTop?.classList.toggle('is-visible', y > 700);
        mobileBar?.classList.toggle('is-visible', y > 260);
        lastY = y;
        ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    /* ---------- Active menu link ---------- */
    const navLinks = $$('.hd-nav a, .mnav-links a').filter(a => (a.getAttribute('href') || '').startsWith('#'));
    const linkMap = new Map();
    navLinks.forEach(a => {
        const section = document.getElementById(a.getAttribute('href').slice(1));
        if (!section) return;
        if (!linkMap.has(section)) linkMap.set(section, []);
        linkMap.get(section).push(a);
    });
    if (linkMap.size && 'IntersectionObserver' in window) {
        const navObserver = new IntersectionObserver(entries => entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            navLinks.forEach(l => l.classList.remove('is-active'));
            (linkMap.get(entry.target) || []).forEach(l => l.classList.add('is-active'));
        }), { rootMargin: '-45% 0px -50% 0px' });
        linkMap.forEach((_, section) => navObserver.observe(section));
    }

    /* ---------- Split headings into words ---------- */
    const splitWords = el => {
        let index = 0;
        const walk = node => Array.from(node.childNodes).forEach(child => {
            if (child.nodeType === 3) {
                const frag = document.createDocumentFragment();
                child.textContent.split(/(\s+)/).forEach(part => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                    const w = document.createElement('span');
                    const wi = document.createElement('span');
                    w.className = 'w'; wi.className = 'wi';
                    wi.textContent = part;
                    wi.style.setProperty('--wi', index++);
                    w.appendChild(wi);
                    frag.appendChild(w);
                });
                child.replaceWith(frag);
            } else if (child.nodeType === 1 && child.tagName !== 'BR') walk(child);
        });
        walk(el);
        el.classList.add('is-split');
    };
    if (body.classList.contains('fx-reveal') && !reduceMotion) $$('[data-split]').forEach(splitWords);

    /* ---------- Reveal on scroll ---------- */
    const revealTargets = $$('[data-reveal], [data-split]').filter(el => !el.closest('.s-hero'));
    if ('IntersectionObserver' in window && body.classList.contains('fx-reveal') && !reduceMotion) {
        const io = new IntersectionObserver(entries => entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            (watchers.get(entry.target) || [entry.target]).forEach(el => el.classList.add('is-in'));
            io.unobserve(entry.target);
        }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        // Clip/curtain reveals start fully clipped, which IntersectionObserver treats as invisible:
        // watch their parent instead.
        const watchers = new Map();
        const watch = el => {
            const target = el.matches('[data-reveal="clip"], [data-reveal="curtain"]') ? el.parentElement : el;
            if (!watchers.has(target)) watchers.set(target, []);
            watchers.get(target).push(el);
            io.observe(target);
        };
        revealTargets.forEach(watch);
    } else {
        revealTargets.forEach(el => el.classList.add('is-in'));
    }

    /* ---------- Counters ---------- */
    const counters = $$('[data-count]');
    if (counters.length && 'IntersectionObserver' in window && !reduceMotion) {
        const run = el => {
            const end = parseFloat(el.dataset.count) || 0;
            const start = performance.now();
            const tick = now => {
                const t = Math.min(1, (now - start) / 2200);
                const text = Math.round(end * (1 - Math.pow(1 - t, 4))).toLocaleString('en-US');
                if (el.textContent !== text) el.textContent = text;
                if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };
        const countIO = new IntersectionObserver(entries => entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            countIO.unobserve(entry.target);
            run(entry.target);
        }), { threshold: 0.6 });
        counters.forEach(el => { el.textContent = '0'; countIO.observe(el); });
    }

    /* ---------- Parallax ---------- */
    const parallax = $$('[data-parallax]');
    if (parallax.length && body.classList.contains('fx-parallax') && !reduceMotion) {
        let pending = false;
        const update = () => {
            // Read every position first, then write, so the browser lays out once per frame.
            const boxes = parallax.map(el => (el.parentElement || el).getBoundingClientRect());
            parallax.forEach((el, i) => {
                const box = boxes[i];
                if (box.bottom < -200 || box.top > innerHeight + 200) return;
                const offset = (box.top + box.height / 2 - innerHeight / 2) * -(parseFloat(el.dataset.parallax) || 0.1);
                el.style.translate = `0 ${offset.toFixed(1)}px`;
            });
            pending = false;
        };
        addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
        update();
    }

    /* ---------- Cursor with labels ---------- */
    const cursor = $('.cursor');
    if (cursor && finePointer && !reduceMotion && body.classList.contains('fx-cursor')) {
        const dot = $('.cursor-dot', cursor);
        const label = $('[data-cursor-label]', cursor);
        let mx = -100, my = -100, x = -100, y = -100;
        addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; cursor.classList.remove('is-hidden'); }, { passive: true });
        document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
        document.addEventListener('pointerover', e => {
            const labelled = e.target.closest('[data-cursor]');
            cursor.classList.toggle('has-label', !!labelled);
            if (labelled) label.textContent = labelled.dataset.cursor;
            cursor.classList.toggle('is-link', !labelled && !!e.target.closest('a, button, summary, input, select, textarea, label'));
        });
        const follow = () => {
            x = lerp(x, mx, 0.22); y = lerp(y, my, 0.22);
            dot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            if (Math.abs(mx - x) + Math.abs(my - y) > .2) requestAnimationFrame(follow); else following = false;
        };
        let following = false;
        addEventListener('pointermove', () => { if (!following) { following = true; requestAnimationFrame(follow); } }, { passive: true });
    } else {
        cursor?.remove();
    }

    /* ---------- Photo that follows the cursor over rows with data-img ---------- */
    const imgRows = $$('[data-img]');
    if (imgRows.length && finePointer && !reduceMotion) {
        const box = document.createElement('div');
        box.className = 'hover-img';
        box.innerHTML = '<img alt="">';
        body.appendChild(box);
        const img = $('img', box);
        let tx = 0, ty = 0, cx = 0, cy = 0, active = false, raf = null;
        const loop = () => {
            const prevX = cx;
            cx = lerp(cx, tx, 0.12); cy = lerp(cy, ty, 0.12);
            const tilt = Math.max(-12, Math.min(12, (cx - prevX) * 0.6));
            box.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${tilt.toFixed(2)}deg)`;
            raf = active || Math.abs(cx - tx) > .5 ? requestAnimationFrame(loop) : null;
        };
        imgRows.forEach(row => {
            const target = row.matches('a') ? row : row.querySelector('.prow-head') || row;
            target.addEventListener('pointerenter', e => {
                if (row.classList.contains('is-open')) return;
                img.src = row.dataset.img;
                if (!active) { cx = tx = e.clientX + 120; cy = ty = e.clientY; }
                active = true;
                box.classList.add('is-on');
                if (!raf) raf = requestAnimationFrame(loop);
            });
            target.addEventListener('pointermove', e => { tx = e.clientX + 140; ty = e.clientY; });
            target.addEventListener('pointerleave', () => { active = false; box.classList.remove('is-on'); });
        });
        addEventListener('scroll', () => { if (active) { active = false; box.classList.remove('is-on'); } }, { passive: true });
    }

    /* ---------- Practice rows: open / close ---------- */
    const animateHeight = (el, open) => {
        const from = el.offsetHeight;
        el.style.height = open ? 'auto' : '0px';
        const to = el.offsetHeight;
        el.style.height = from + 'px';
        if (reduceMotion || !el.animate) { el.style.height = open ? 'auto' : '0px'; return; }
        const anim = el.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' });
        anim.onfinish = () => { el.style.height = open ? 'auto' : '0px'; };
    };
    $$('.prow').forEach(row => {
        const head = $('.prow-head', row);
        const content = $('.prow-body', row);
        head.addEventListener('click', () => {
            const open = head.getAttribute('aria-expanded') !== 'true';
            if (open) {
                $$('.prow.is-open', row.parentElement).forEach(other => {
                    if (other === row) return;
                    other.classList.remove('is-open');
                    $('.prow-head', other).setAttribute('aria-expanded', 'false');
                    animateHeight($('.prow-body', other), false);
                });
                $('.hover-img')?.classList.remove('is-on');
            }
            row.classList.toggle('is-open', open);
            head.setAttribute('aria-expanded', String(open));
            animateHeight(content, open);
        });
    });

    /* ---------- Process: pinned horizontal scroll on large screens ---------- */
    $$('.hscroll').forEach(section => {
        const sticky = $('[data-hscroll]', section);
        const track = $('[data-hs-track]', section);
        const bar = $('[data-hs-bar]', section);
        const index = $('[data-hs-index]', section);
        const cards = $$('.hs-card', track);
        let distance = 0;
        const enabled = () => innerWidth > 1024 && !reduceMotion;
        const setup = () => {
            if (!enabled()) {
                section.classList.remove('hs-active');
                section.style.height = '';
                track.style.transform = '';
                return;
            }
            section.classList.add('hs-active');
            // Travel until the last card sits as far from the right edge as the first sat from the left
            // (and clear of the side tab), so every card is shown in full.
            const pad = getComputedStyle(track.parentElement);
            const padLeft = parseFloat(pad.paddingLeft) || 0;
            const padRight = Math.max(parseFloat(pad.paddingRight) || 0, 72);
            distance = Math.max(0, padLeft + track.scrollWidth + padRight - document.documentElement.clientWidth);
            section.style.height = (sticky.offsetHeight + distance) + 'px';
            update();
        };
        const update = () => {
            if (!section.classList.contains('hs-active')) return;
            const rect = section.getBoundingClientRect();
            const total = section.offsetHeight - sticky.offsetHeight;
            const p = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
            track.style.transform = `translate3d(${(-distance * p).toFixed(1)}px, 0, 0)`;
            bar?.style.setProperty('--p', p.toFixed(3));
            const num = String(Math.min(cards.length, Math.floor(p * (cards.length - .01)) + 1)).padStart(2, '0');
            if (index && index.textContent !== num) index.textContent = num;
        };
        { let queued = false; window.addEventListener('scroll', () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; update(); }); }, { passive: true }); }
        addEventListener('resize', setup);
        document.fonts?.ready.then(setup);
        setup();
    });

    /* ---------- Testimonials ---------- */
    $$('[data-slider]').forEach(slider => {
        const slides = $$('.testi-slide', slider);
        if (slides.length < 2) return;
        const current = $('.testi-current', slider);
        const bar = $('.testi-progress', slider);
        const interval = parseInt(slider.dataset.interval, 10) || 8000;
        const autoplay = slider.dataset.autoplay === '1' && !reduceMotion;
        let index = 0, timer = null, paused = false, visible = false;
        const schedule = () => {
            clearTimeout(timer);
            if (bar) { bar.classList.remove('is-playing'); void bar.offsetWidth; }
            if (!autoplay || paused || !visible) return;
            bar?.classList.add('is-playing');
            timer = setTimeout(() => go(index + 1), interval);
        };
        const go = n => {
            index = (n + slides.length) % slides.length;
            slides.forEach((s, i) => { s.classList.toggle('is-active', i === index); s.setAttribute('aria-hidden', i === index ? 'false' : 'true'); });
            if (current) current.textContent = String(index + 1).padStart(2, '0');
            schedule();
        };
        $('[data-prev]', slider)?.addEventListener('click', () => go(index - 1));
        $('[data-next]', slider)?.addEventListener('click', () => go(index + 1));
        slider.addEventListener('pointerenter', () => { paused = true; schedule(); });
        slider.addEventListener('pointerleave', () => { paused = false; schedule(); });
        let startX = null;
        slider.addEventListener('pointerdown', e => { startX = e.clientX; });
        slider.addEventListener('pointerup', e => {
            if (startX !== null && Math.abs(e.clientX - startX) > 50) go(index + (e.clientX < startX ? 1 : -1));
            startX = null;
        });
        new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: 0.3 }).observe(slider);
    });

    /* ---------- Pause looping animations off screen ---------- */
    if ('IntersectionObserver' in window) {
        const offscreen = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('is-offscreen', !entry.isIntersecting)), { rootMargin: '120px 0px' });
        $$('main > section, body > footer, .site-footer, .ft').forEach(el => offscreen.observe(el));
    }

    /* ---------- No hover effects while the page is scrolling ---------- */
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
        let scrollIdle;
        addEventListener('scroll', () => {
            if (!body.classList.contains('is-scrolling')) body.classList.add('is-scrolling');
            clearTimeout(scrollIdle);
            scrollIdle = setTimeout(() => body.classList.remove('is-scrolling'), 160);
        }, { passive: true });
    }

    /* ---------- FAQ accordion ---------- */
    $$('.faq-item').forEach(item => {
        const summary = $('summary', item);
        const answer = $('.faq-a', item);
        summary.addEventListener('click', e => {
            if (reduceMotion || !answer.animate) return;
            e.preventDefault();
            if (item.open) {
                answer.animate([{ height: answer.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => { item.open = false; };
            } else {
                $$('.faq-item[open]', item.parentElement).forEach(other => { if (other !== item) $('summary', other).click(); });
                item.open = true;
                answer.animate([{ height: '0px', opacity: 0 }, { height: answer.offsetHeight + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
            }
        });
    });

    /* ---------- Magnetic round button ---------- */
    if (finePointer && !reduceMotion) {
        $$('.round-cta, .sq-btn').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                el.style.transform = `translate(${((e.clientX - r.left - r.width / 2) * .2).toFixed(1)}px, ${((e.clientY - r.top - r.height / 2) * .2).toFixed(1)}px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });
    }

    /* ---------- Consultation form ---------- */
    const humanSize = bytes => bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
    const setError = (form, name, message) => {
        const input = form.elements[name];
        const field = (input && input.closest ? input.closest('.field') : null) || $(`[data-for="${name}"]`, form)?.closest('.field');
        if (!field) return;
        field.classList.add('has-error');
        const box = $('.field-error', field);
        if (box) box.textContent = message;
    };
    $$('form.js-inquiry').forEach(form => {
        const status = $('.form-status', form);
        const submit = $('button[type="submit"]', form);
        const success = $('.form-success', form);
        const file = $('input[type="file"]', form);
        const zone = file?.closest('.dropzone');
        const zoneName = zone ? $('.dz-name', zone) : null;
        const zoneDefault = zoneName?.textContent || '';
        const resetFile = () => { if (!file) return; file.value = ''; zone.classList.remove('has-file'); if (zoneName) zoneName.textContent = zoneDefault; };
        file?.addEventListener('change', () => {
            const f = file.files[0];
            file.closest('.field')?.classList.remove('has-error');
            if (!f) { resetFile(); return; }
            if (CFG.maxUpload && f.size > CFG.maxUpload) { resetFile(); setError(form, 'attachment', `This file is too large (max ${humanSize(CFG.maxUpload)}).`); return; }
            zone.classList.add('has-file');
            zoneName.textContent = `${f.name} · ${humanSize(f.size)}`;
        });
        $('.dz-remove', form)?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); resetFile(); });
        if (zone) {
            ['dragenter', 'dragover'].forEach(t => zone.addEventListener(t, () => zone.classList.add('is-drag')));
            ['dragleave', 'drop'].forEach(t => zone.addEventListener(t, () => zone.classList.remove('is-drag')));
        }
        $$('input, select, textarea', form).forEach(input => input.addEventListener('input', () => {
            const field = input.closest('.field');
            if (field?.classList.contains('has-error')) { field.classList.remove('has-error'); const b = $('.field-error', field); if (b) b.textContent = ''; }
        }));
        $('[data-reset]', form)?.addEventListener('click', () => { success.hidden = true; form.classList.remove('is-sent'); });

        form.addEventListener('submit', async e => {
            e.preventDefault();
            $$('.has-error', form).forEach(f => f.classList.remove('has-error'));
            $$('.field-error', form).forEach(b => { b.textContent = ''; });
            if (status) { status.textContent = ''; status.classList.remove('is-error'); }
            let first = null;
            $$('[required]', form).forEach(input => { if (!input.value.trim()) { setError(form, input.name, 'This field is required.'); first = first || input; } });
            const email = form.elements.email;
            if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { setError(form, 'email', 'Please enter a valid email address.'); first = first || email; }
            const phone = form.elements.phone;
            if (phone && phone.value.trim() && phone.value.replace(/\D/g, '').length < 6) { setError(form, 'phone', 'Please enter a valid phone number.'); first = first || phone; }
            if (first) { first.focus(); return; }

            submit.classList.add('is-loading');
            submit.disabled = true;
            try {
                const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' } });
                const data = await res.json().catch(() => ({ ok: false, message: 'Something went wrong. Please try again or call us.' }));
                if (data.ok) {
                    const text = $('[data-success]', success);
                    if (text) text.textContent = text.dataset.success.replace('{ref}', data.ref || '');
                    form.reset();
                    resetFile();
                    success.hidden = false;
                    form.classList.add('is-sent');
                } else {
                    Object.entries(data.errors || {}).forEach(([name, msg]) => setError(form, name, msg));
                    if (status) { status.textContent = data.message || 'Please check the form and try again.'; status.classList.add('is-error'); }
                }
            } catch (err) {
                if (status) { status.textContent = 'We could not send your request. Please check your connection or call us.'; status.classList.add('is-error'); }
            } finally {
                submit.classList.remove('is-loading');
                submit.disabled = false;
            }
        });
    });

    /* ---------- Live preview inside the admin ---------- */
    if (CFG.preview && window.parent !== window) {
        addEventListener('message', e => {
            if (e.origin !== location.origin || !e.data) return;
            const msg = e.data;
            if (msg.type === 'theme-vars') Object.entries(msg.vars || {}).forEach(([k, v]) => root.style.setProperty(k, v));
            else if (msg.type === 'theme-fonts' && msg.href) {
                let link = $('#preview-fonts');
                if (!link) { link = document.createElement('link'); link.id = 'preview-fonts'; link.rel = 'stylesheet'; document.head.appendChild(link); }
                link.href = msg.href;
            } else if (msg.type === 'body-class') Object.entries(msg.classes || {}).forEach(([cls, on]) => body.classList.toggle(cls, !!on));
            else if (msg.type === 'scroll-to') {
                const el = $(`[data-section="${msg.id}"]`);
                if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'auto' });
            }
        });
        document.addEventListener('click', e => {
            const a = e.target.closest('a[href]');
            if (a && !(a.getAttribute('href') || '').startsWith('#')) e.preventDefault();
        }, true);
        $$('form').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); e.stopImmediatePropagation(); }, true));
        window.parent.postMessage({ type: 'preview-ready' }, location.origin);
    }
})();
