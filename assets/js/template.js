
      const headerContainer = document.querySelector('.header-container');
      if (headerContainer) {
        const headerMaskLayer = headerContainer.querySelector('.header-mask-layer');
        const headerPatterns = Array.from(headerContainer.querySelectorAll('.header-pattern'));
        const motionToggle = headerContainer.querySelector('.header-motion-toggle');
        let targetX = 50;
        let targetY = 50;
        let currentX = 50;
        let currentY = 50;
        let trailX = 50;
        let trailY = 50;
        let targetPatternX = 0;
        let targetPatternY = 0;
        let currentPatternX = 0;
        let currentPatternY = 0;
        let rafId = null;
        let isDragging = false;
        let maskRadius = 500;
        let motionEnabled = true;
        let isCircleAnimating = false;

        const isPortrait = () => window.innerHeight > window.innerWidth;

        const updateMaskRadius = () => {
          const raw = getComputedStyle(headerContainer).getPropertyValue('--spot-size');
          const parsed = Number.parseFloat(raw);
          maskRadius = Number.isFinite(parsed) ? parsed : 500;
        };

        const buildCapsulePath = (x1, y1, x2, y2, r) => {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const dist = Math.hypot(dx, dy);
          if (dist < 1) {
            const startX = x1 + r;
            return `M ${startX} ${y1} A ${r} ${r} 0 1 0 ${x1 - r} ${y1} A ${r} ${r} 0 1 0 ${startX} ${y1} Z`;
          }
          const angle = Math.atan2(dy, dx);
          const offsetX = Math.sin(angle) * r;
          const offsetY = -Math.cos(angle) * r;
          const p1aX = x1 + offsetX;
          const p1aY = y1 + offsetY;
          const p1bX = x1 - offsetX;
          const p1bY = y1 - offsetY;
          const p2aX = x2 + offsetX;
          const p2aY = y2 + offsetY;
          const p2bX = x2 - offsetX;
          const p2bY = y2 - offsetY;
          return [
            `M ${p1aX} ${p1aY}`,
            `L ${p2aX} ${p2aY}`,
            `A ${r} ${r} 0 0 1 ${p2bX} ${p2bY}`,
            `L ${p1bX} ${p1bY}`,
            `A ${r} ${r} 0 0 1 ${p1aX} ${p1aY}`,
            'Z'
          ].join(' ');
        };

        const buildPattern = (patternElement) => {
          if (!patternElement) {
            return;
          }
          const rows = 16;
          const cols = 30;
          const text = 'DAWEI';
          const fragment = document.createDocumentFragment();
          for (let i = 0; i < rows; i += 1) {
            const row = document.createElement('div');
            row.className = 'header-pattern-row';
            for (let j = 0; j < cols; j += 1) {
              const span = document.createElement('span');
              span.className = 'header-pattern-text';
              span.textContent = text;
              row.appendChild(span);
            }
            fragment.appendChild(row);
          }
          patternElement.innerHTML = '';
          patternElement.appendChild(fragment);
        };

        const animateSpotlight = () => {
          if (!motionEnabled) {
            rafId = null;
            return;
          }
          currentX += (targetX - currentX) * 0.18;
          currentY += (targetY - currentY) * 0.18;
          trailX += (currentX - trailX) * 0.08;
          trailY += (currentY - trailY) * 0.08;
          currentPatternX += (targetPatternX - currentPatternX) * 0.12;
          currentPatternY += (targetPatternY - currentPatternY) * 0.12;
          const bounds = headerContainer.getBoundingClientRect();
          const currentPxX = (currentX / 100) * bounds.width;
          const currentPxY = (currentY / 100) * bounds.height;
          const trailPxX = (trailX / 100) * bounds.width;
          const trailPxY = (trailY / 100) * bounds.height;
          if (headerMaskLayer) {
            const path = buildCapsulePath(currentPxX, currentPxY, trailPxX, trailPxY, maskRadius);
            headerMaskLayer.style.clipPath = `path('${path}')`;
            headerMaskLayer.style.webkitClipPath = `path('${path}')`;
          }
          headerPatterns.forEach((patternElement) => {
            patternElement.style.setProperty('--pattern-x', `${currentPatternX}px`);
            patternElement.style.setProperty('--pattern-y', `${currentPatternY}px`);
          });
          rafId = requestAnimationFrame(animateSpotlight);
        };

        const updateTarget = (event) => {
          if (!motionEnabled) {
            return;
          }
          const bounds = headerContainer.getBoundingClientRect();
          targetX = ((event.clientX - bounds.left) / bounds.width) * 100;
          targetY = ((event.clientY - bounds.top) / bounds.height) * 100;
          if (!isDragging) {
            const relativeX = (event.clientX - bounds.left - bounds.width / 2) / bounds.width;
            const relativeY = (event.clientY - bounds.top - bounds.height / 2) / bounds.height;
            targetPatternX = relativeX * 80;
            targetPatternY = relativeY * 60;
          } else {
            targetPatternX += event.movementX;
            targetPatternY += event.movementY;
          }
          headerContainer.classList.add('header-spotlight-active');
          if (!rafId) {
            rafId = requestAnimationFrame(animateSpotlight);
          }
        };

        const stopSpotlight = () => {
          headerContainer.classList.remove('header-spotlight-active');
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        };

        const setMotionEnabled = (enabled, centerPercent) => {
          if (isCircleAnimating) return;
          motionEnabled = enabled;
          if (enabled) {
            headerContainer.classList.remove('header-motion-off');
          }
          if (motionToggle) {
            motionToggle.setAttribute('aria-pressed', String(enabled));
            motionToggle.textContent = enabled ? 'Motion On' : 'Motion Off';
          }
          const bounds = headerContainer.getBoundingClientRect();
          // Close: always use current spotlight position so circle shrinks in place (no teleport)
          const closeX = currentX;
          const closeY = currentY;
          // Open: use click position; will sync spotlight state to this position when animation ends
          const openX = centerPercent ? centerPercent.x : 50;
          const openY = centerPercent ? centerPercent.y : 50;
          if (!enabled) {
            if (headerMaskLayer) {
              isCircleAnimating = true;
              headerMaskLayer.classList.add('header-mask-layer--circle');
              headerMaskLayer.style.opacity = '1';
              headerMaskLayer.style.clipPath = `circle(${maskRadius}px at ${closeX}% ${closeY}%)`;
              headerMaskLayer.style.webkitClipPath = headerMaskLayer.style.clipPath;
              stopSpotlight();
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  headerMaskLayer.style.clipPath = `circle(0 at ${closeX}% ${closeY}%)`;
                  headerMaskLayer.style.webkitClipPath = headerMaskLayer.style.clipPath;
                  const onCloseEnd = () => {
                    headerMaskLayer.removeEventListener('transitionend', onCloseEnd);
                    headerMaskLayer.classList.add('header-mask-layer--closing');
                    headerContainer.classList.add('header-motion-off');
                    headerMaskLayer.style.opacity = '0';
                    requestAnimationFrame(() => {
                      headerMaskLayer.classList.remove('header-mask-layer--circle', 'header-mask-layer--closing');
                      headerMaskLayer.style.opacity = '';
                      isCircleAnimating = false;
                    });
                  };
                  headerMaskLayer.addEventListener('transitionend', onCloseEnd);
                });
              });
            } else {
              stopSpotlight();
              headerContainer.classList.add('header-motion-off');
            }
          } else {
            if (headerMaskLayer) {
              isCircleAnimating = true;
              headerMaskLayer.classList.add('header-mask-layer--circle');
              headerMaskLayer.style.opacity = '1';
              headerMaskLayer.style.clipPath = `circle(0 at ${openX}% ${openY}%)`;
              headerMaskLayer.style.webkitClipPath = headerMaskLayer.style.clipPath;
              requestAnimationFrame(() => {
                headerMaskLayer.style.clipPath = `circle(${maskRadius}px at ${openX}% ${openY}%)`;
                headerMaskLayer.style.webkitClipPath = headerMaskLayer.style.clipPath;
                const onOpenEnd = () => {
                  headerMaskLayer.removeEventListener('transitionend', onOpenEnd);
                  headerMaskLayer.classList.remove('header-mask-layer--circle');
                  headerMaskLayer.style.opacity = '';
                  const cx = (openX / 100) * bounds.width;
                  const cy = (openY / 100) * bounds.height;
                  headerMaskLayer.style.clipPath = `path('${buildCapsulePath(cx, cy, cx, cy, maskRadius)}')`;
                  headerMaskLayer.style.webkitClipPath = headerMaskLayer.style.clipPath;
                  // Sync spotlight state to circle center so no jump when handing off to mouse follow
                  currentX = openX;
                  currentY = openY;
                  targetX = openX;
                  targetY = openY;
                  trailX = openX;
                  trailY = openY;
                  headerContainer.classList.add('header-spotlight-active');
                  if (!rafId) rafId = requestAnimationFrame(animateSpotlight);
                  isCircleAnimating = false;
                };
                headerMaskLayer.addEventListener('transitionend', onOpenEnd);
              });
            }
          }
        };

        const startDrag = () => {
          isDragging = true;
          headerContainer.classList.add('header-pattern-dragging');
        };

        const endDrag = () => {
          isDragging = false;
          headerContainer.classList.remove('header-pattern-dragging');
        };

        updateMaskRadius();
        headerPatterns.forEach((patternElement) => buildPattern(patternElement));
        headerContainer.addEventListener('mousemove', updateTarget);
        headerContainer.addEventListener('mouseenter', updateTarget);
        headerContainer.addEventListener('mouseleave', stopSpotlight);
        headerContainer.addEventListener('mousedown', startDrag);
        window.addEventListener('mouseup', endDrag);
        window.addEventListener('resize', updateMaskRadius);
        if (motionToggle) {
          motionToggle.addEventListener('click', (e) => {
            const bounds = headerContainer.getBoundingClientRect();
            const center = {
              x: ((e.clientX - bounds.left) / bounds.width) * 100,
              y: ((e.clientY - bounds.top) / bounds.height) * 100
            };
            setMotionEnabled(!motionEnabled, center);
          });
        }
        headerContainer.addEventListener('dblclick', (e) => {
          if (e.target.closest('.header-motion-controls')) return;
          const bounds = headerContainer.getBoundingClientRect();
          const center = {
            x: ((e.clientX - bounds.left) / bounds.width) * 100,
            y: ((e.clientY - bounds.top) / bounds.height) * 100
          };
          setMotionEnabled(!motionEnabled, center);
        });
        if (isPortrait()) {
          setMotionEnabled(false);
        }
      }

      (function worksCarousel() {
        const carousel = document.querySelector('.works-carousel');
        if (!carousel) return;
        const stage = carousel.querySelector('.works-carousel-stage');
        const track = carousel.querySelector('.works-carousel-track');
        const cards = Array.from(carousel.querySelectorAll('.works-card'));
        const prevBtn = carousel.querySelector('.works-carousel-prev');
        const nextBtn = carousel.querySelector('.works-carousel-next');
        const dotsEl = carousel.querySelector('.works-carousel-dots');
        const total = cards.length;
        let current = 0;
        const gap = 16;
        const isPortrait = () => window.innerHeight > window.innerWidth;
        let dragStartX = 0;
        let dragStartOffset = 0;
        let isDragging = false;
        let dragged = false;
        let justDragged = false;

        // Fixed card widths — never read from DOM to avoid transition timing issues
        // On mobile (portrait), abstract is hidden, so expanded = normal width
        const isMobile = window.innerWidth <= 768;
        const CARD_W = isMobile ? Math.min(window.innerWidth * 0.8, 340) : 480;
        const CARD_EXPANDED_W = isMobile ? CARD_W : 1060;

        function getCardWidth() {
          return CARD_W;
        }

        function circDist(i) {
          let d = ((i - current) % total + total) % total;
          if (d > total / 2) d -= total;
          return d;
        }

        function getVisualOrder() {
          const half = Math.floor(total / 2);
          const order = [];
          for (let offset = -half; offset < total - half; offset++) {
            order.push(((current + offset) % total + total) % total);
          }
          return order;
        }

        function applyVisualOrder() {
          const visualOrder = getVisualOrder();
          visualOrder.forEach((cardIdx, pos) => {
            cards[cardIdx].style.order = pos;
          });
        }

        // Use fixed widths: current card = expanded, others = collapsed
        function getBaseOffsetPx() {
          const containerWidth = stage.offsetWidth;
          if (!containerWidth) return 0;
          const visualOrder = getVisualOrder();
          let leftEdge = 0;
          let currentLeft = 0;
          let currentWidth = 0;
          for (let pos = 0; pos < visualOrder.length; pos++) {
            const idx = visualOrder[pos];
            const w = (idx === current) ? CARD_EXPANDED_W : CARD_W;
            if (idx === current) {
              currentLeft = leftEdge;
              currentWidth = w;
            }
            leftEdge += w + gap;
          }
          return containerWidth / 2 - (currentLeft + currentWidth / 2);
        }

        function applyTrackTransform(offsetPx) {
          track.style.transform = `translateX(${offsetPx}px)`;
        }

        function getCardClass(i) {
          const d = circDist(i);
          if (d === 0) return 'works-card--center';
          if (d === -1) return 'works-card--left-1';
          if (d === 1) return 'works-card--right-1';
          if (d === -2) return 'works-card--left-2';
          if (d === 2) return 'works-card--right-2';
          if (d < 0) return 'works-card--far';
          return 'works-card--far works-card--right-far';
        }

        function syncExpandToCurrent() {
          cards.forEach((c) => c.classList.remove('is-expanded'));
          if (cards[current]) cards[current].classList.add('is-expanded');
          onExpandChange();
        }

        function updateCardClasses() {
          cards.forEach((card, i) => {
            card.classList.remove('works-card--center', 'works-card--left-1', 'works-card--right-1', 'works-card--left-2', 'works-card--right-2', 'works-card--far', 'works-card--right-far');
            const cls = getCardClass(i);
            cls.split(' ').forEach(c => { if (c) card.classList.add(c); });
          });
          dotsEl.querySelectorAll('.works-carousel-dot').forEach((dot, i) => {
            dot.classList.toggle('is-active', i === current);
            dot.setAttribute('aria-selected', i === current);
          });
        }

        // Calculate offset to center a specific card, with a custom expanded card
        function calcOffset(centerIdx, expandedIdx) {
          const containerWidth = stage.offsetWidth;
          if (!containerWidth) return 0;
          const visualOrder = getVisualOrder();
          let leftEdge = 0;
          let targetLeft = 0;
          let targetWidth = 0;
          for (let pos = 0; pos < visualOrder.length; pos++) {
            const idx = visualOrder[pos];
            const w = (idx === expandedIdx) ? CARD_EXPANDED_W : CARD_W;
            if (idx === centerIdx) {
              targetLeft = leftEdge;
              targetWidth = w;
            }
            leftEdge += w + gap;
          }
          return containerWidth / 2 - (targetLeft + targetWidth / 2);
        }

        function updateCarousel() {
          if (isPortrait()) {
            track.style.transform = 'none';
            cards.forEach((c) => {
              c.classList.remove('works-card--center', 'works-card--left-1', 'works-card--right-1', 'works-card--left-2', 'works-card--right-2', 'works-card--far', 'works-card--right-far', 'is-expanded');
            });
            dotsEl.querySelectorAll('.works-carousel-dot').forEach((dot, i) => {
              dot.classList.toggle('is-active', i === current);
              dot.setAttribute('aria-selected', i === current);
            });
            onExpandChange();
            return;
          }
          syncExpandToCurrent();
          applyVisualOrder();
          applyTrackTransform(getBaseOffsetPx());
          updateCardClasses();
        }

        function go(step) {
          if (isPortrait()) return;
          const oldCurrent = current;
          current = (current + step + total) % total;

          // 1. Apply new state
          syncExpandToCurrent();
          applyVisualOrder();

          // 2. Snap: center OLD card using its pre-transition width (still visually expanded)
          track.classList.add('is-dragging');
          void track.offsetHeight;
          applyTrackTransform(calcOffset(oldCurrent, oldCurrent));
          void track.offsetHeight;

          // 3. Slide: transition to NEW card centered at its final expanded width
          track.classList.remove('is-dragging');
          applyTrackTransform(getBaseOffsetPx());
          updateCardClasses();
        }

        function buildDots() {
          dotsEl.innerHTML = '';
          for (let i = 0; i < total; i += 1) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'works-carousel-dot' + (i === current ? ' is-active' : '');
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-label', 'Slide ' + (i + 1));
            btn.setAttribute('aria-selected', i === current);
            btn.addEventListener('click', () => { current = i; updateCarousel(); });
            dotsEl.appendChild(btn);
          }
        }

        prevBtn.addEventListener('click', () => go(-1));
        nextBtn.addEventListener('click', () => go(1));

        stage.addEventListener('mousedown', (e) => {
          if (isPortrait()) return;
          if (e.target.closest('a') || e.target.closest('button')) return;
          isDragging = true;
          dragged = false;
          dragStartX = e.clientX;
          dragStartOffset = getBaseOffsetPx();
          track.classList.add('is-dragging');
        });

        window.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          const dx = e.clientX - dragStartX;
          if (Math.abs(dx) > 8) dragged = true;
          applyTrackTransform(dragStartOffset + dx);
        });

        window.addEventListener('mouseup', (e) => {
          if (!isDragging) return;
          isDragging = false;
          track.classList.remove('is-dragging');
          const dx = e.clientX - dragStartX;
          const cardWidth = getCardWidth();
          const threshold = cardWidth * 0.2;
          if (dragged && dx > threshold) go(-1);
          else if (dragged && dx < -threshold) go(1);
          else updateCarousel();
          if (dragged) {
            justDragged = true;
            setTimeout(() => { justDragged = false; }, 100);
          }
        });

        stage.addEventListener('touchstart', (e) => {
          if (isPortrait()) return;
          if (e.target.closest('a') || e.target.closest('button')) return;
          isDragging = true;
          dragged = false;
          dragStartX = e.touches[0].clientX;
          dragStartOffset = getBaseOffsetPx();
          track.classList.add('is-dragging');
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
          if (!isDragging || !e.touches.length) return;
          const dx = e.touches[0].clientX - dragStartX;
          if (Math.abs(dx) > 8) dragged = true;
          applyTrackTransform(dragStartOffset + dx);
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
          if (!isDragging) return;
          isDragging = false;
          track.classList.remove('is-dragging');
          const touch = e.changedTouches[0];
          if (!touch) return;
          const dx = touch.clientX - dragStartX;
          const cardWidth = getCardWidth();
          const threshold = cardWidth * 0.2;
          if (dragged && dx > threshold) go(-1);
          else if (dragged && dx < -threshold) go(1);
          else updateCarousel();
          if (dragged) {
            justDragged = true;
            setTimeout(() => { justDragged = false; }, 100);
          }
        });

        function collapseAll() {
          cards.forEach((c) => c.classList.remove('is-expanded'));
        }

        function onExpandChange() {
          const expanded = carousel.querySelector('.works-card.is-expanded');
          if (expanded) {
            document.addEventListener('mousedown', handleClickOutside);
          } else {
            document.removeEventListener('mousedown', handleClickOutside);
          }
        }

        function handleClickOutside(e) {
          const expanded = carousel.querySelector('.works-card.is-expanded');
          if (!expanded || expanded.contains(e.target)) return;
          expanded.classList.remove('is-expanded');
          onExpandChange();
          applyTrackTransform(getBaseOffsetPx());
        }

        cards.forEach((card) => {
          const inner = card.querySelector('.works-card-inner');
          const abstractEl = card.querySelector('.works-card-abstract');
          const abstract = card.getAttribute('data-abstract') || '[Abstract placeholder]';
          const closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.className = 'works-card-abstract-close';
          closeBtn.setAttribute('aria-label', 'Close');
          closeBtn.textContent = '×';
          const text = document.createElement('p');
          text.className = 'works-card-abstract-text';
          text.textContent = abstract;
          abstractEl.appendChild(closeBtn);
          abstractEl.appendChild(text);
          inner.addEventListener('click', (e) => {
            if (isPortrait()) return;
            if (e.target.closest('a')) return;
            if (justDragged) return;
            const idx = parseInt(card.getAttribute('data-index'), 10);
            if (idx !== current) {
              current = idx;
              updateCarousel();
            }
          });
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            card.classList.remove('is-expanded');
            onExpandChange();
            applyTrackTransform(getBaseOffsetPx());
          });
        });

        buildDots();
        updateCarousel();
        window.addEventListener('resize', updateCarousel);
        window.addEventListener('orientationchange', () => { setTimeout(updateCarousel, 100); });
      })();

      // 格式化star数量（例如：1234 -> "1.2k"）
      function formatStars(count) {
        if (count >= 1000) {
          return (count / 1000).toFixed(1) + 'k';
        }
        return count.toString();
      }

      // 获取GitHub star数量
      async function fetchGitHubStars(repo) {
        try {
          const response = await fetch(`https://api.github.com/repos/${repo}`, {
            headers: {
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          if (response.ok) {
            const data = await response.json();
            return data.stargazers_count;
          } else if (response.status === 404) {
            console.warn(`Repository ${repo} not found`);
          } else if (response.status === 403) {
            console.warn(`Rate limit exceeded for ${repo}`);
          } else {
            console.warn(`Failed to fetch ${repo}: ${response.status}`);
          }
        } catch (error) {
          console.error(`Error fetching stars for ${repo}:`, error);
        }
        return null;
      }

      // 更新所有GitHub star显示
      async function updateAllStars() {
        const starElements = document.querySelectorAll('.github-stars[data-github-repo]');
        if (starElements.length === 0) {
          console.log('No star elements found');
          return;
        }

        console.log(`Found ${starElements.length} star elements`);
        const repos = new Set();
        
        // 收集所有唯一的仓库
        starElements.forEach(el => {
          const repo = el.getAttribute('data-github-repo');
          if (repo) {
            repos.add(repo);
            console.log(`Found repo: ${repo}`);
          }
        });

        console.log(`Fetching stars for ${repos.size} unique repos`);
        
        // 批量获取star数量（添加延迟以避免速率限制）
        const results = [];
        for (const repo of repos) {
          const stars = await fetchGitHubStars(repo);
          results.push({ repo, stars });
          console.log(`Repo ${repo}: ${stars !== null ? stars : 'failed'} stars`);
          // 添加小延迟以避免触发GitHub API速率限制
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        // 更新所有对应的元素
        let updatedCount = 0;
        starElements.forEach(el => {
          const repo = el.getAttribute('data-github-repo');
          const result = results.find(r => r.repo === repo);
          if (result && result.stars !== null && result.stars !== undefined) {
            el.textContent = ` ⭐ ${formatStars(result.stars)}`;
            el.style.display = 'inline';
            updatedCount++;
          } else {
            el.style.display = 'inline';
          }
        });
        
        console.log(`Updated ${updatedCount} star displays`);
      }

      // 页面加载完成后获取star数量
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateAllStars);
      } else {
        // 延迟一点执行，确保DOM完全加载
        setTimeout(updateAllStars, 100);
      }

      // Portrait: toggle image on click (Representative works + Full pub)
      (function () {
        var portraitQuery = window.matchMedia('(orientation: portrait)');
        function isPortrait() {
          return portraitQuery.matches;
        }
        function onImageClick(e) {
          if (!isPortrait()) return;
          e.preventDefault();
          this.classList.toggle('img-revealed');
        }
        function clearRevealed() {
          document.querySelectorAll('.bigcard-img-wrap.img-revealed, .publication-image.img-revealed').forEach(function (el) {
            el.classList.remove('img-revealed');
          });
        }
        function init() {
          document.querySelectorAll('.bigcard-img-wrap').forEach(function (el) {
            el.addEventListener('click', onImageClick);
          });
          document.querySelectorAll('.publication-image').forEach(function (el) {
            el.addEventListener('click', onImageClick);
          });
          portraitQuery.addEventListener('change', function () {
            if (!portraitQuery.matches) clearRevealed();
          });
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', init);
        } else {
          init();
        }
      })();
     
