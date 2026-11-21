/* Law firm landing page: motion, navigation, slider, practice window, forms and the admin live preview. */
(() => {
    'use strict';

    const CFG = window.SITE || {};
    const root = document.documentElement;
    const body = document.body;
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

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
        const header = $('.header-main');
        const offset = el.classList.contains('s-hero') ? 0 : (header ? header.offsetHeight - 8 : 70);
        scrollToY(el.getBoundingClientRect().top + window.scrollY - offset);
    };

    /* ---------- Mobile menu ---------- */
    const burger = $('.burger');
    const openMenu = () => {
        body.classList.add('menu-open');
        burger?.setAttribute('aria-expanded', 'true');
        burger?.setAttribute('aria-label', 'Close menu');
        lenis?.stop();
    };
    const closeMenu = () => {
        if (!body.classList.contains('menu-open')) return;
        body.classList.remove('menu-open');
        burger?.setAttribute('aria-expanded', 'false');
        burger?.setAttribute('aria-label', 'Open menu');
        lenis?.start();
    };
    burger?.addEventListener('click', () => body.classList.contains('menu-open') ? closeMenu() : openMenu());
    addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    addEventListener('resize', () => { if (innerWidth > 1024) closeMenu(); });

    /* ---------- In-page links ---------- */
    const selectIssue = title => {
        if (!title) return;
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
        if (!a || a.target === '_blank' || e.defaultPrevented) return;
        const href = a.getAttribute('href');
        if (!href || !href.includes('#') || href === '#') return;
        const url = new URL(a.href, location.href);
        if (url.pathname !== location.pathname || url.search !== location.search) return;

        const id = decodeURIComponent(url.hash.slice(1));
        const target = id === 'top' ? body : document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        a.closest('dialog')?.close();
        closeMenu();
        if (a.dataset.issue) selectIssue(a.dataset.issue);
        if (id === 'top') scrollToY(0); else scrollToEl(target);
        if (id !== 'top' && history.replaceState) history.replaceState(null, '', '#' + id);
    });

    /* ---------- Preloader & page ready ---------- */
    const heroReveal = () => $$('.s-hero [data-reveal], .s-hero [data-split]').forEach(el => el.classList.add('is-in'));
    const ready = () => {
        if (body.classList.contains('is-ready')) return;
        body.classList.add('is-ready');
        heroReveal();
    };
    const preloader = $('.preloader');
    if (preloader && !root.classList.contains('skip-preloader')) {
        const started = performance.now();
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            setTimeout(() => {
                preloader.classList.add('is-done');
                setTimeout(ready, 280);
                setTimeout(() => preloader.remove(), 1400);
            }, Math.max(0, 1250 - (performance.now() - started)));
        };
        if (document.readyState === 'complete') finish();
        else addEventListener('load', finish, { once: true });
        setTimeout(finish, 3800);
    } else {
        preloader?.remove();
        requestAnimationFrame(ready);
    }
    try { sessionStorage.setItem(window.VISIT_KEY || 'visited', '1'); } catch (e) { /* private mode */ }

    /* ---------- Header, progress bar, back to top ---------- */
    const header = $('.site-header');
    const progress = $('.scroll-progress');
    const toTop = $('.to-top');
    const mobileBar = $('.mobile-bar');
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
        const y = window.scrollY;
        const docH = root.scrollHeight; // read before any class changes below
        if (header) {
            header.classList.toggle('is-solid', y > 30 || !header.hasAttribute('data-transparent'));
            if (header.hasAttribute('data-autohide')) {
                const hide = y > lastY && y > 320 && !body.classList.contains('menu-open');
                if (Math.abs(y - lastY) > 4) header.classList.toggle('is-hidden', hide);
            }
        }
        const max = Math.max(1, docH - innerHeight);
        const p = Math.min(1, y / max);
        if (progress) progress.style.transform = `scaleX(${p})`;
        if (toTop) {
            toTop.classList.toggle('is-visible', y > 700);
            toTop.style.setProperty('--p', p.toFixed(3));
        }
        if (mobileBar) mobileBar.classList.toggle('is-visible', y > 260);
        lastY = y;
        ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    /* ---------- Active menu link ---------- */
    const navLinks = $$('.nav a, .mnav-links a').filter(a => (a.getAttribute('href') || '').startsWith('#'));
    const linkMap = new Map();
    navLinks.forEach(a => {
        const section = document.getElementById(a.getAttribute('href').slice(1));
        if (!section) return;
        if (!linkMap.has(section)) linkMap.set(section, []);
        linkMap.get(section).push(a);
    });
    if (linkMap.size && 'IntersectionObserver' in window) {
        const navObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                navLinks.forEach(l => l.classList.remove('is-active'));
                (linkMap.get(entry.target) || []).forEach(l => l.classList.add('is-active'));
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        linkMap.forEach((_, section) => navObserver.observe(section));
    }

    /* ---------- Split headings into words ---------- */
    const splitWords = el => {
        let index = 0;
        const walk = node => {
            Array.from(node.childNodes).forEach(child => {
                if (child.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach(part => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const w = document.createElement('span');
                        const wi = document.createElement('span');
                        w.className = 'w';
                        wi.className = 'wi';
                        wi.textContent = part;
                        wi.style.setProperty('--wi', index++);
                        w.appendChild(wi);
                        frag.appendChild(w);
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === 1 && child.tagName !== 'BR') {
                    walk(child);
                }
            });
        };
        walk(el);
        el.classList.add('is-split');
    };
    if (body.classList.contains('fx-reveal') && !reduceMotion) $$('[data-split]').forEach(splitWords);

    /* ---------- Reveal on scroll ---------- */
    const revealTargets = $$('[data-reveal], [data-split], .step').filter(el => !el.closest('.s-hero'));
    if ('IntersectionObserver' in window && body.classList.contains('fx-reveal') && !reduceMotion) {
        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                (watchers.get(entry.target) || [entry.target]).forEach(el => el.classList.add('is-in'));
                io.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
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
        const format = n => Math.round(n).toLocaleString('en-US');
        const run = el => {
            const end = parseFloat(el.dataset.count) || 0;
            const start = performance.now();
            const duration = 2200;
            const tick = now => {
                const t = Math.min(1, (now - start) / duration);
                const text = format(end * (1 - Math.pow(1 - t, 4)));
                if (el.textContent !== text) el.textContent = text;
                if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };
        const countIO = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                countIO.unobserve(entry.target);
                run(entry.target);
            });
        }, { threshold: 0.6 });
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
                const speed = parseFloat(el.dataset.parallax) || 0.15;
                const offset = (box.top + box.height / 2 - innerHeight / 2) * -speed;
                el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
            });
            pending = false;
        };
        addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
        addEventListener('resize', update);
        update();
    }

    /* ---------- Spotlight cards & magnetic buttons ---------- */
    $$('[data-spotlight]').forEach(card => {
        card.addEventListener('pointermove', e => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - r.left}px`);
            card.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
    });
    if (finePointer && !reduceMotion) {
        $$('.btn-gold, .round-btn, .icon-btn, .fab').forEach(el => {
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left - r.width / 2) * 0.16;
                const y = (e.clientY - r.top - r.height / 2) * 0.24;
                el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            });
            el.addEventListener('pointerleave', () => { el.style.transform = ''; });
        });
    }

    /* ---------- Custom cursor ---------- */
    const cursor = $('.cursor');
    if (cursor && finePointer && !reduceMotion && body.classList.contains('fx-cursor')) {
        const dot = $('.cursor-dot', cursor);
        const ring = $('.cursor-ring', cursor);
        let mx = -100, my = -100, rx = -100, ry = -100;
        addEventListener('pointermove', e => {
            mx = e.clientX; my = e.clientY;
            dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
            cursor.classList.remove('is-hidden');
        }, { passive: true });
        document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
        document.addEventListener('pointerover', e => {
            cursor.classList.toggle('is-hover', !!e.target.closest('a, button, summary, label, input, select, textarea, [data-spotlight]'));
        });
        const follow = () => {
            rx += (mx - rx) * 0.17;
            ry += (my - ry) * 0.17;
            ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
            if (Math.abs(mx - rx) + Math.abs(my - ry) > .2) requestAnimationFrame(follow); else following = false;
        };
        let following = false;
        addEventListener('pointermove', () => { if (!following) { following = true; requestAnimationFrame(follow); } }, { passive: true });
    } else {
        cursor?.remove();
    }

    /* ---------- Hero video ---------- */
    const video = $('.hero-video');
    if (video && innerWidth >= 768 && !reduceMotion) {
        video.src = video.dataset.src;
        video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
        video.play().catch(() => {});
    }

    /* ---------- Practice area window ---------- */
    const modal = $('#practice-modal');
    let practices = [];
    try { practices = JSON.parse($('#practice-data')?.textContent || '[]'); } catch (e) { practices = []; }
    if (modal) {
        const checkIcon = $('[data-check-icon]')?.innerHTML || '';
        const open = index => {
            const p = practices[index];
            if (!p) return;
            $('[data-p="title"]', modal).textContent = p.title;
            $('[data-p="summary"]', modal).textContent = p.summary;
            $('[data-p="icon"]', modal).innerHTML = p.icon;
            const list = $('[data-p="points"]', modal);
            list.innerHTML = '';
            p.points.forEach(point => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="tick">${checkIcon}</span>`;
                li.appendChild(document.createTextNode(point));
                list.appendChild(li);
            });
            list.hidden = !p.points.length;
            const media = $('.pmodal-media', modal);
            media.hidden = !p.image;
            $('.pmodal-grid', modal).classList.toggle('has-media', !!p.image);
            if (p.image) $('img', media).src = p.image;
            $('[data-issue]', modal).dataset.issue = p.title;
            modal.showModal();
            lenis?.stop();
        };
        $$('[data-practice]').forEach(link => link.addEventListener('click', e => { e.preventDefault(); open(+link.dataset.practice); }));
        modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) modal.close(); });
        modal.addEventListener('close', () => lenis?.start());
    }

    /* ---------- Testimonials ---------- */
    $$('[data-slider]').forEach(slider => {
        const section = slider.closest('section') || slider;
        const slides = $$('.testi-slide', slider);
        if (slides.length < 2) return;
        const dots = $$('[data-go]', section);
        const current = $('.testi-current', section);
        const bar = $('.testi-progress', section);
        const interval = parseInt(slider.dataset.interval, 10) || 7000;
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
            dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
            if (current) current.textContent = String(index + 1).padStart(2, '0');
            schedule();
        };
        $('[data-prev]', section)?.addEventListener('click', () => go(index - 1));
        $('[data-next]', section)?.addEventListener('click', () => go(index + 1));
        dots.forEach(d => d.addEventListener('click', () => go(+d.dataset.go)));
        slider.addEventListener('pointerenter', () => { paused = true; schedule(); });
        slider.addEventListener('pointerleave', () => { paused = false; schedule(); });

        let startX = null;
        slider.addEventListener('pointerdown', e => { startX = e.clientX; });
        slider.addEventListener('pointerup', e => {
            if (startX === null) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
            startX = null;
        });
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: 0.3 }).observe(slider);
        } else {
            visible = true;
            schedule();
        }
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
        if (!summary || !answer) return;
        summary.addEventListener('click', e => {
            if (reduceMotion || !answer.animate) return;
            e.preventDefault();
            if (item.open) {
                const anim = answer.animate([{ height: answer.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
                anim.onfinish = () => { item.open = false; };
            } else {
                $$('.faq-item[open]', item.parentElement).forEach(other => { if (other !== item) $('summary', other).click(); });
                item.open = true;
                const h = answer.offsetHeight;
                answer.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
            }
        });
    });

    /* ---------- Fit the large footer name to the width ---------- */
    const fitText = () => $$('[data-fit]').forEach(el => {
        el.style.fontSize = '100px';
        const available = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) * 2;
        el.style.fontSize = Math.max(40, (100 * available) / el.scrollWidth) + 'px';
    });
    fitText();
    document.fonts?.ready.then(fitText);
    let resizeTimer;
    addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitText, 150); });

    /* ---------- Consultation forms ---------- */
    const humanSize = bytes => bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
    const setError = (form, name, message) => {
        const input = form.elements[name];
        const field = (input && input.closest ? input.closest('.field') : null) || $(`[data-for="${name}"]`, form)?.closest('.field');
        if (!field) return;
        field.classList.add('has-error');
        const box = $('.field-error', field);
        if (box) box.textContent = message;
    };
    const clearErrors = form => {
        $$('.has-error', form).forEach(f => f.classList.remove('has-error'));
        $$('.field-error', form).forEach(b => { b.textContent = ''; });
    };

    $$('form.js-inquiry').forEach(form => {
        const status = $('.form-status', form);
        const submit = $('button[type="submit"]', form);
        const success = $('.form-success', form);
        const file = $('input[type="file"]', form);
        const zone = file?.closest('.dropzone');
        const zoneName = zone ? $('.dz-name', zone) : null;
        const zoneDefault = zoneName?.textContent || '';

        const resetFile = () => {
            if (!file) return;
            file.value = '';
            zone.classList.remove('has-file');
            if (zoneName) zoneName.textContent = zoneDefault;
        };
        file?.addEventListener('change', () => {
            const f = file.files[0];
            const field = file.closest('.field');
            field?.classList.remove('has-error');
            if (!f) { resetFile(); return; }
            if (CFG.maxUpload && f.size > CFG.maxUpload) {
                resetFile();
                setError(form, 'attachment', `This file is too large (max ${humanSize(CFG.maxUpload)}).`);
                return;
            }
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
        $('[data-reset]', form)?.addEventListener('click', () => {
            success.hidden = true;
            form.classList.remove('is-sent');
            $('input:not([type="hidden"])', form)?.focus();
        });

        form.addEventListener('submit', async e => {
            e.preventDefault();
            clearErrors(form);
            if (status) { status.textContent = ''; status.classList.remove('is-error'); }

            let first = null;
            $$('[required]', form).forEach(input => {
                if (!input.value.trim()) { setError(form, input.name, 'This field is required.'); first = first || input; }
            });
            const email = form.elements.email;
            if (email && email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
                setError(form, 'email', 'Please enter a valid email address.');
                first = first || email;
            }
            const phone = form.elements.phone;
            if (phone && phone.value.trim() && phone.value.replace(/\D/g, '').length < 6) {
                setError(form, 'phone', 'Please enter a valid phone number.');
                first = first || phone;
            }
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
            if (msg.type === 'theme-vars') {
                Object.entries(msg.vars || {}).forEach(([k, v]) => root.style.setProperty(k, v));
                fitText();
            } else if (msg.type === 'theme-fonts' && msg.href) {
                let link = $('#preview-fonts');
                if (!link) { link = document.createElement('link'); link.id = 'preview-fonts'; link.rel = 'stylesheet'; document.head.appendChild(link); }
                link.href = msg.href;
                document.fonts?.ready.then(fitText);
            } else if (msg.type === 'body-class') {
                Object.entries(msg.classes || {}).forEach(([cls, on]) => body.classList.toggle(cls, !!on));
            } else if (msg.type === 'scroll-to') {
                const el = $(`[data-section="${msg.id}"]`);
                if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (msg.offset || 0), behavior: msg.smooth ? 'smooth' : 'auto' });
            }
        });
        // Links never leave the preview.
        document.addEventListener('click', e => {
            const a = e.target.closest('a[href]');
            if (a && !(a.getAttribute('href') || '').startsWith('#')) e.preventDefault();
        }, true);
        $$('form').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); e.stopImmediatePropagation(); }, true));
        window.parent.postMessage({ type: 'preview-ready' }, location.origin);
    }
})();
