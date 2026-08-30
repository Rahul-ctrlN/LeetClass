(() => {
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('leetclass-theme') || 'light';
  root.dataset.theme = savedTheme;
  const actions = document.querySelector('.top-actions');
  const setTheme = theme => { root.dataset.theme = theme; localStorage.setItem('leetclass-theme', theme); themeButton.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); themeButton.textContent = theme === 'dark' ? '◐' : '◑'; };
  const themeButton = document.createElement('button'); themeButton.className='theme-toggle'; setTheme(savedTheme); themeButton.addEventListener('click',()=>setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark')); actions.prepend(themeButton);
  fetch('/api/auth/me').then(r=>r.json()).then(data=>{
    if (!data.authenticated) return location.replace('/login.html');
    const account = document.createElement('div'); account.className='account-menu'; account.innerHTML=`<button class="account-toggle" aria-expanded="false"><span class="avatar">${data.user.picture ? `<img src="${data.user.picture}" alt="">` : data.user.name.slice(0,1)}</span><span>${data.user.name}</span></button><div class="account-popover"><strong>${data.user.name}</strong><p>${data.user.email || ''}</p><button type="button">Log out</button></div>`;
    account.querySelector('.account-toggle').addEventListener('click',()=>account.classList.toggle('open'));
    account.querySelector('.account-popover button').addEventListener('click',async()=>{await fetch('/api/auth/logout',{method:'POST'});location.replace('/login.html');}); actions.append(account);
  }).catch(()=>location.replace('/login.html'));
  window.addEventListener('hashchange', () => { const view = location.hash.slice(1); if (['classroom','leaderboard','students'].includes(view)) history.replaceState({}, '', `/${view}`); });
  const detail = document.querySelector('#detailContent');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const badgeMarkup = badges => {
    if (!Array.isArray(badges)) return '<p class="unavailable">Badges unavailable for this profile.</p>';
    if (!badges.length) return '<p class="unavailable">No badges found.</p>';
    return `<div class="badge-grid">${badges.map(badge => `<article class="badge-card"><div class="badge-image">${badge.image ? `<img src="${escapeHtml(badge.image)}" alt="${escapeHtml(badge.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false">` : ''}<span class="badge-fallback"${badge.image ? ' hidden' : ''} aria-hidden="true"></span></div><strong>${escapeHtml(badge.name)}</strong>${badge.earnedDate ? `<small>${escapeHtml(badge.earnedDate)}</small>` : ''}</article>`).join('')}</div>`;
  };
  new MutationObserver(() => { if (!detail.children.length || detail.querySelector('.achievements-panel')) return; const student = state.students.find(item => item.id === state.activeId); const panel=document.createElement('section'); panel.className='panel achievements-panel'; panel.innerHTML=`<h2>Achievements</h2>${badgeMarkup(student?.statistics?.badges)}<h2>Activity</h2><div class="activity-unavailable"><span>Active days</span><strong>—</strong></div>`; detail.append(panel); }).observe(detail,{childList:true});
})();
