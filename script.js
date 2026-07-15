/* =============================================================
   POPELIER · Pipoca Gourmet — script.js
   Front-end only. Sem dependências. Compatível com GitHub Pages.
   ============================================================= */
(() => {
  'use strict';

  /* ---------- Dados ---------- */
  const WHATS_NUMBER = '5561981783474';

  const SIZES = {
    '500':  { label: '500 ml', price: 25.90 },
    '1000': { label: '1 litro', price: 41.90 }
  };

  const TOPPINGS = [
    { name: 'Kinder Bueno', price: 8.00 },
    { name: "M&M's",        price: 5.00 },
    { name: 'Oreo',         price: 5.00 }
  ];

  const PRODUCTS = [
    {
      id: 'ninho',
      name: 'Popelier Ninho',
      calda: 'Ninho',
      caldaKey: 'ninho',
      desc: 'Pipoca gourmet dourada envolvida em calda cremosa de Ninho.',
      image: 'images/product-ninho-pour.png',
      badge: 'Clássico'
    },
    {
      id: 'avela',
      name: 'Popelier Avelã',
      calda: 'Avelã',
      caldaKey: 'avela',
      desc: 'Pipoca gourmet dourada envolvida em creme de avelã.',
      image: 'images/editorial-avela-pour.png',
      badge: 'Indulgente'
    },
    {
      id: 'mix',
      name: 'Mix Popelier',
      calda: 'Ninho',
      caldaKey: 'mix',
      desc: 'Combinação especial com caldas selecionadas.',
      image: 'images/product-mix-top.png',
      badge: 'Favorito'
    }
  ];

  /* ---------- Utilitários ---------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const money = (v) => 'R$ ' + v.toFixed(2).replace('.', ',');
  const uid = () => 'i-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const state = {
    cart: [],
    builder: {
      size: '500',
      calda: 'Ninho',
      toppings: [],
      qty: 1,
      obs: ''
    },
    pd: {
      productId: null,
      size: '500',
      calda: 'Ninho',
      toppings: [],
      qty: 1,
      obs: ''
    }
  };

  /* ---------- Persistência ---------- */
  const STORAGE_KEY = 'popelier.cart.v1';
  const loadCart = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  };
  const saveCart = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart)); } catch {}
  };

  /* ---------- Render produtos ---------- */
  function renderProducts() {
    const grid = $('#product-grid');
    if (!grid) return;
    grid.innerHTML = PRODUCTS.map(p => `
      <article class="product-card" data-calda="${p.caldaKey}">
        <div class="product-media">
          ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
          <img src="${p.image}" alt="${p.name} — ${p.desc}" loading="lazy" />
        </div>
        <div class="product-body">
          <h3>${p.name}</h3>
          <p class="product-desc">${p.desc}</p>
          <p class="product-price">a partir de R$ 25,90<span class="product-price-strike">500 ml — personalizável</span></p>
          <div class="product-actions">
            <button class="btn btn-primary" data-product="${p.id}">Quero esse</button>
          </div>
        </div>
      </article>
    `).join('');

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-product]');
      if (!btn) return;
      openProductDrawer(btn.dataset.product);
    });
  }

  /* ---------- Filtros ---------- */
  function bindFilters() {
    const filters = $$('.filter');
    filters.forEach(btn => {
      btn.addEventListener('click', () => {
        filters.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-selected', 'false'); });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        const f = btn.dataset.filter;
        $$('.product-card').forEach(card => {
          const match = (f === 'todos') || (card.dataset.calda === f) || (f !== 'ninho' && f !== 'avela');
          const show = f === 'todos' ? true : (card.dataset.calda === f);
          card.classList.toggle('is-hidden', !show);
        });
      });
    });
  }

  /* ---------- Menu mobile ---------- */
  function bindMenu() {
    const toggle = $('#menu-toggle');
    const nav = $('.nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('#nav-list a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Builder ---------- */
  function readBuilderState() {
    state.builder.size = $('input[name="b-size"]:checked')?.value || '500';
    state.builder.calda = $('input[name="b-calda"]:checked')?.value || 'Ninho';
    state.builder.toppings = $$('input[name="b-topping"]:checked').map(el => ({
      name: el.value,
      price: parseFloat(el.dataset.price || '0')
    }));
    const qtyEl = $('#b-qty');
    let qty = parseInt(qtyEl?.value || '1', 10);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    if (qtyEl) qtyEl.value = String(qty);
    state.builder.qty = qty;
    state.builder.obs = ($('#b-obs')?.value || '').trim();
  }

  function calcUnit(size, toppings) {
    const base = SIZES[size].price;
    const add = toppings.reduce((a, t) => a + t.price, 0);
    return { base, add, unit: base + add };
  }

  function renderBuilder() {
    readBuilderState();
    const { size, calda, toppings, qty } = state.builder;
    const { base, add, unit } = calcUnit(size, toppings);
    const total = unit * qty;

    $('#s-size').textContent = SIZES[size].label;
    $('#s-calda').textContent = calda;
    $('#s-toppings').textContent = toppings.length ? toppings.map(t => t.name).join(', ') : 'Nenhum';
    $('#s-base').textContent = money(base);
    $('#s-add').textContent = money(add);
    $('#s-qty').textContent = String(qty);

    const totalEl = $('#s-total');
    totalEl.textContent = money(total);
    totalEl.classList.remove('bump'); void totalEl.offsetWidth; totalEl.classList.add('bump');

    updateWhatsBuilderLink();
  }

  function bindBuilder() {
    const section = $('#montador');
    if (!section) return;
    section.addEventListener('change', renderBuilder);
    section.addEventListener('input', (e) => {
      if (e.target.id === 'b-qty' || e.target.id === 'b-obs') renderBuilder();
    });
    $('[data-qty-dec]', section).addEventListener('click', () => {
      const el = $('#b-qty'); el.value = String(Math.max(1, (parseInt(el.value, 10) || 1) - 1));
      renderBuilder();
    });
    $('[data-qty-inc]', section).addEventListener('click', () => {
      const el = $('#b-qty'); el.value = String(Math.max(1, (parseInt(el.value, 10) || 1) + 1));
      renderBuilder();
    });

    $('#btn-add-cart').addEventListener('click', () => {
      readBuilderState();
      const item = buildCartItem({
        name: 'Popelier ' + state.builder.calda,
        size: state.builder.size,
        calda: state.builder.calda,
        toppings: state.builder.toppings,
        qty: state.builder.qty,
        obs: state.builder.obs
      });
      addToCart(item);
      showToast('Adicionado ao carrinho!');
      openCart();
    });
  }

  function updateWhatsBuilderLink() {
    const link = $('#btn-whats-builder');
    if (!link) return;
    const { size, calda, toppings, qty, obs } = state.builder;
    const { base, add, unit } = calcUnit(size, toppings);
    const total = unit * qty;

    const lines = [
      'Olá, Popelier! Vim pelo site e gostaria de fazer um pedido:',
      '',
      `• ${qty}x Popelier ${calda}`,
      `  Tamanho: ${SIZES[size].label}`,
      `  Calda: ${calda}`,
      `  Adicionais: ${toppings.length ? toppings.map(t => `${t.name} (${money(t.price)})`).join(', ') : 'Nenhum'}`,
      `  Preço base: ${money(base)}`,
      `  Total dos adicionais: ${money(add)}`,
      qty > 1 ? `  Valor unitário: ${money(unit)}` : null,
      `  Total: ${money(total)}`,
      obs ? `  Observações: ${obs}` : null,
      '',
      'Gostaria de confirmar a disponibilidade e combinar data, endereço, forma de pagamento e possíveis personalizações. Obrigada!'
    ].filter(Boolean);

    link.href = `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  /* ---------- Product drawer ---------- */
  function openProductDrawer(productId) {
    const p = PRODUCTS.find(x => x.id === productId);
    if (!p) return;
    state.pd = {
      productId: p.id,
      size: '500',
      calda: p.calda,
      toppings: [],
      qty: 1,
      obs: ''
    };
    $('#pd-title').textContent = `Personalize sua ${p.name}`;
    $('#pd-desc').textContent = p.desc;
    $('#pd-image').src = p.image;
    $('#pd-image').alt = p.name;
    $('input[name="pd-size"][value="500"]').checked = true;
    const caldaRadio = $(`input[name="pd-calda"][value="${p.calda}"]`);
    if (caldaRadio) caldaRadio.checked = true;
    $$('input[name="pd-topping"]').forEach(el => (el.checked = false));
    $('#pd-qty').value = '1';
    $('#pd-obs').value = '';
    renderPdSummary();
    openDrawer('#product-drawer');
  }

  function readPdState() {
    state.pd.size = $('input[name="pd-size"]:checked')?.value || '500';
    state.pd.calda = $('input[name="pd-calda"]:checked')?.value || 'Ninho';
    state.pd.toppings = $$('input[name="pd-topping"]:checked').map(el => ({
      name: el.value,
      price: parseFloat(el.dataset.price || '0')
    }));
    let qty = parseInt($('#pd-qty').value, 10);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    $('#pd-qty').value = String(qty);
    state.pd.qty = qty;
    state.pd.obs = ($('#pd-obs')?.value || '').trim();
  }
  function renderPdSummary() {
    readPdState();
    const { size, toppings, qty } = state.pd;
    const { unit } = calcUnit(size, toppings);
    const total = unit * qty;
    $('#pd-add').textContent = `Adicionar — ${money(total)}`;
  }

  function bindPd() {
    const drawer = $('#product-drawer');
    if (!drawer) return;
    drawer.addEventListener('change', renderPdSummary);
    drawer.addEventListener('input', (e) => {
      if (e.target.id === 'pd-qty' || e.target.id === 'pd-obs') renderPdSummary();
    });
    $('[data-pd-qty-dec]', drawer).addEventListener('click', () => {
      const el = $('#pd-qty'); el.value = String(Math.max(1, (parseInt(el.value, 10) || 1) - 1));
      renderPdSummary();
    });
    $('[data-pd-qty-inc]', drawer).addEventListener('click', () => {
      const el = $('#pd-qty'); el.value = String(Math.max(1, (parseInt(el.value, 10) || 1) + 1));
      renderPdSummary();
    });
    $('#pd-add').addEventListener('click', () => {
      readPdState();
      const p = PRODUCTS.find(x => x.id === state.pd.productId);
      const name = p ? p.name : ('Popelier ' + state.pd.calda);
      addToCart(buildCartItem({
        name,
        size: state.pd.size,
        calda: state.pd.calda,
        toppings: state.pd.toppings,
        qty: state.pd.qty,
        obs: state.pd.obs
      }));
      closeDrawer('#product-drawer');
      showToast('Adicionado ao carrinho!');
      openCart();
    });
  }

  /* ---------- Cart ---------- */
  function buildCartItem({ name, size, calda, toppings, qty, obs }) {
    const { base, add, unit } = calcUnit(size, toppings);
    return {
      id: uid(),
      name,
      size,
      sizeLabel: SIZES[size].label,
      calda,
      toppings: toppings.map(t => ({ name: t.name, price: t.price })),
      qty,
      obs,
      base,
      add,
      unit,
      total: unit * qty
    };
  }

  function addToCart(item) {
    state.cart.push(item);
    saveCart();
    renderCart();
  }
  function updateQty(id, delta) {
    const it = state.cart.find(x => x.id === id);
    if (!it) return;
    it.qty = Math.max(1, it.qty + delta);
    it.total = it.unit * it.qty;
    saveCart(); renderCart();
  }
  function removeItem(id) {
    state.cart = state.cart.filter(x => x.id !== id);
    saveCart(); renderCart();
  }
  function clearCart() {
    state.cart = [];
    saveCart(); renderCart();
  }

  function renderCart() {
    const list = $('#cart-list');
    const empty = $('#cart-empty');
    const foot = $('#cart-foot');
    const count = $('#cart-count');
    const toggle = $('#cart-toggle');
    const subtotalEl = $('#cart-subtotal');

    const totalItems = state.cart.reduce((a, i) => a + i.qty, 0);
    const subtotal = state.cart.reduce((a, i) => a + i.total, 0);

    count.textContent = String(totalItems);
    toggle.dataset.empty = totalItems === 0 ? 'true' : 'false';

    if (state.cart.length === 0) {
      empty.style.display = '';
      list.innerHTML = '';
      foot.hidden = true;
    } else {
      empty.style.display = 'none';
      foot.hidden = false;
      list.innerHTML = state.cart.map(it => `
        <li class="cart-item" data-id="${it.id}">
          <div>
            <p class="ci-name">${escapeHtml(it.name)}</p>
            <p class="ci-meta">
              ${it.sizeLabel} · Calda ${escapeHtml(it.calda)} ·
              ${it.toppings.length ? escapeHtml(it.toppings.map(t => t.name).join(', ')) : 'Sem adicionais'}
              · Unitário ${money(it.unit)}
            </p>
            ${it.obs ? `<p class="ci-obs">Obs.: ${escapeHtml(it.obs)}</p>` : ''}
          </div>
          <div class="ci-row">
            <div class="ci-qty" role="group" aria-label="Alterar quantidade">
              <button type="button" data-dec aria-label="Diminuir">−</button>
              <span aria-live="polite">${it.qty}</span>
              <button type="button" data-inc aria-label="Aumentar">+</button>
            </div>
            <div style="display:flex; align-items:center; gap:14px;">
              <span class="ci-total">${money(it.total)}</span>
              <button type="button" class="ci-remove" data-remove aria-label="Remover item">Remover</button>
            </div>
          </div>
        </li>
      `).join('');

      list.addEventListener('click', cartListHandler);
    }

    subtotalEl.textContent = money(subtotal);
    updateCheckoutLink();
  }
  // avoid double-binding
  let cartListBound = false;
  function bindCartOnce() {
    if (cartListBound) return;
    cartListBound = true;
  }

  function cartListHandler(e) {
    const item = e.target.closest('.cart-item');
    if (!item) return;
    const id = item.dataset.id;
    if (e.target.closest('[data-dec]')) updateQty(id, -1);
    else if (e.target.closest('[data-inc]')) updateQty(id, +1);
    else if (e.target.closest('[data-remove]')) removeItem(id);
  }

  function updateCheckoutLink() {
    const link = $('#btn-checkout');
    if (!link) return;

    if (state.cart.length === 0) {
      link.href = `https://wa.me/${WHATS_NUMBER}`;
      return;
    }

    const lines = ['Olá, Popelier! Vim pelo site e gostaria de fazer o pedido:', ''];
    let subtotal = 0;
    state.cart.forEach((it, idx) => {
      subtotal += it.total;
      lines.push(`${idx + 1}) ${it.qty}x ${it.name}`);
      lines.push(`   Tamanho: ${it.sizeLabel}`);
      lines.push(`   Calda: ${it.calda}`);
      lines.push(`   Adicionais: ${it.toppings.length ? it.toppings.map(t => `${t.name} (${money(t.price)})`).join(', ') : 'Nenhum'}`);
      lines.push(`   Preço base: ${money(it.base)}`);
      lines.push(`   Total dos adicionais: ${money(it.add)}`);
      lines.push(`   Valor unitário: ${money(it.unit)}`);
      if (it.qty > 1) lines.push(`   Total do item: ${money(it.total)}`);
      if (it.obs) lines.push(`   Observações: ${it.obs}`);
      lines.push('');
    });
    lines.push(`Subtotal: ${money(subtotal)}`);
    lines.push('');
    lines.push('Gostaria de confirmar a disponibilidade e combinar data, endereço, forma de pagamento e possíveis personalizações. Obrigada!');
    link.href = `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  function openCart() { openDrawer('#cart-drawer'); }

  /* ---------- Drawers ---------- */
  function openDrawer(sel) {
    const d = $(sel);
    if (!d) return;
    d.hidden = false;
    document.body.classList.add('no-scroll');
    // focus first control
    setTimeout(() => {
      const focusable = d.querySelector('button, input, textarea, a');
      focusable?.focus();
    }, 100);
  }
  function closeDrawer(sel) {
    const d = $(sel);
    if (!d) return;
    d.hidden = true;
    // release body scroll only if no drawer open
    if (!$('.drawer:not([hidden])')) document.body.classList.remove('no-scroll');
  }

  function bindDrawers() {
    $('#cart-toggle').addEventListener('click', openCart);
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-drawer-close]')) {
        const d = e.target.closest('.drawer');
        if (d) closeDrawer('#' + d.id);
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.drawer:not([hidden])').forEach(d => closeDrawer('#' + d.id));
      }
    });
    $('#btn-clear-cart').addEventListener('click', () => {
      if (state.cart.length === 0) return;
      clearCart();
      showToast('Carrinho limpo');
    });

    // "Escolher 500 / 1 litro" from sizes section opens builder pre-filled
    $$('[data-open-builder]').forEach(btn => {
      btn.addEventListener('click', () => {
        const size = btn.dataset.size;
        const r = $(`input[name="b-size"][value="${size}"]`);
        if (r) r.checked = true;
        renderBuilder();
        document.getElementById('montador').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ---------- FAQ ---------- */
  function bindFaq() {
    $$('.faq-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function showToast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2200);
  }

  /* ---------- Reveal on scroll ---------- */
  function bindReveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window) || els.length === 0) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ---------- Generic WhatsApp buttons ---------- */
  function bindGenericWhats() {
    const msg = encodeURIComponent(
      'Olá, Popelier! Vim pelo site e gostaria de fazer um pedido. ' +
      'Poderia me ajudar com as opções, disponibilidade e combinar data, endereço, forma de pagamento e possíveis personalizações?'
    );
    $$('[data-whats-generic]').forEach(a => {
      a.href = `https://wa.me/${WHATS_NUMBER}?text=${msg}`;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ---------- Helpers ---------- */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ---------- Init ---------- */
  function init() {
    state.cart = loadCart();
    renderProducts();
    bindFilters();
    bindMenu();
    bindBuilder();
    bindPd();
    bindDrawers();
    bindFaq();
    bindReveal();
    bindGenericWhats();
    renderBuilder();
    renderCart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
