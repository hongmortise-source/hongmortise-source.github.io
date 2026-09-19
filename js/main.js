/* ==========================================================
   页面交互：打字机签名 / 问候时钟 / 联系方式弹窗 / 一键复制
   ========================================================== */
(function () {
  'use strict';

  /* ===================== 个人信息配置（改这里） ===================== */
  const CONFIG = {
    name: '飞鸟',
    // 打字机轮播的签名句，想换就改
    phrases: [
      '山高水阔，自由如风。',
      '代码写山河，热爱渡星海。',
      '愿做一只不被定义的飞鸟。',
    ],
    contacts: {
      wechat: {
        title: '微信联系',
        id: 'hwk893047',
        qr: 'assets/qr-wechat.png',
        toastName: '微信号',
        hint: '扫一扫二维码添加好友，或复制微信号去微信搜索',
      },
      qq: {
        title: 'QQ 联系',
        id: '3554532508',
        qr: 'assets/qr-qq.png',
        toastName: 'QQ 号',
        hint: '扫一扫二维码加 QQ，也可以发邮件到 3554532508@qq.com',
      },
    },
  };
  /* ================================================================ */

  const $ = (sel) => document.querySelector(sel);

  /* ---------- 打字机签名 ---------- */
  const typeEl = $('#typewriter');
  let phraseIdx = 0, charIdx = 0, deleting = false;

  function typeTick() {
    const phrase = CONFIG.phrases[phraseIdx];
    charIdx += deleting ? -1 : 1;
    typeEl.textContent = phrase.slice(0, charIdx);

    let delay = deleting ? 55 : 130;
    if (!deleting && charIdx === phrase.length) { delay = 2400; deleting = true; }
    else if (deleting && charIdx === 0) {
      deleting = false;
      phraseIdx = (phraseIdx + 1) % CONFIG.phrases.length;
      delay = 500;
    }
    setTimeout(typeTick, delay);
  }

  /* ---------- 问候 + 时钟 ---------- */
  const greetingEl = $('#greeting');
  const dateEl = $('#date');
  const timeEl = $('#time');
  const WEEK = '日一二三四五六';

  function tickClock() {
    const now = new Date();
    const h = now.getHours();
    greetingEl.textContent =
      h < 5 ? '凌晨好 🌙' : h < 9 ? '早上好 🌅' : h < 18 ? '上午好 ☀️' :
      h < 23 ? '晚上好 🌆' : '夜里好 🌙';
    dateEl.textContent = `${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${WEEK[now.getDay()]}`;
    timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
  }

  /* ---------- 联系方式弹窗 ---------- */
  const modal = $('#contactModal');
  const modalQr = $('#modalQr');
  const modalTitle = $('#modalTitle');
  const modalId = $('#modalId');
  const modalHint = $('#modalHint');
  const copyBtn = $('#copyBtn');
  const toast = $('#toast');
  let currentContact = null;
  let toastTimer = null;

  function openContact(key) {
    const c = CONFIG.contacts[key];
    if (!c) return;
    currentContact = c;
    modalQr.src = c.qr;
    modalQr.alt = c.title + '二维码';
    modalTitle.textContent = c.title;
    modalId.textContent = c.id;
    modalHint.textContent = c.hint;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeContact() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
  }

  async function copyContact() {
    if (!currentContact) return;
    const text = currentContact.id;
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // 兼容不支持 clipboard API 的环境（如 http 站点）
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast(`${currentContact.toastName}已复制 ✓`);
  }

  document.querySelectorAll('[data-contact]').forEach((el) =>
    el.addEventListener('click', () => openContact(el.dataset.contact)));
  document.querySelectorAll('[data-contact-link]').forEach((el) =>
    el.addEventListener('click', () => openContact(el.dataset.contactLink)));
  modal.querySelectorAll('[data-close]').forEach((el) =>
    el.addEventListener('click', closeContact));
  copyBtn.addEventListener('click', copyContact);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeContact();
  });

  /* ---------- 其它 ---------- */
  $('#scrollHint').addEventListener('click', () =>
    $('#projects').scrollIntoView({ behavior: 'smooth' }));
  $('#year').textContent = new Date().getFullYear();

  tickClock();
  setInterval(tickClock, 1000);
  setTimeout(typeTick, 600);
})();
