const $ = id => document.getElementById(id)
const form = document.querySelector('form'), tg = window.Telegram?.WebApp
let state, sent = false, emote = ''
try {
  state = JSON.parse(new URLSearchParams(location.hash.slice(1)).get('launch'))
  if (state?.v !== 1 || !Array.isArray(state.ammo) || (state.ammo.length < 1 || state.ammo.length > 32) || !state.choice ||
      !Number.isFinite(state.deadline) || !Number.isFinite(state.issuedAt) || state.deadline <= state.issuedAt ||
      state.deadline - state.issuedAt > 90000 || !Number.isInteger(state.round) ||
      ![state.gameId, state.sessionId].every(v => typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v)) ||
      !state.ammo.every(a => typeof a.key === 'string' && typeof a.name === 'string' && typeof a.description === 'string' && (a.left === null || Number.isInteger(a.left)))) throw Error()
  if (!tg || !tg.initData && !tg.platform || tg.platform === 'unknown') throw Error()
  tg.ready(); tg.expand()
  for (const emoji of ['', '😎', '🖕', '💀', '💩', '⚡', '😭', '😂']) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = emoji || '∅'
    b.setAttribute('aria-label', emoji || 'Ei emotea'); b.setAttribute('aria-pressed', String(!emoji))
    b.onclick = () => { emote = emoji; $('emotes').querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === b))) }
    $('emotes').append(b)
  }
  if (!state.ammo.some(a => a.key === state.choice.ammo && a.left !== 0)) state.choice.ammo = 'kuula'
  $('angle').value = state.choice.angle; $('power').value = state.choice.power
  $('direction').value = state.choice.angle < 90 ? '0' : '180'
  for (const ammo of state.ammo) {
    const b = document.createElement('button'); b.type = 'button'; b.disabled = ammo.left === 0
    b.textContent = `${ammo.name} · ${ammo.left ?? '∞'}`
    const description = document.createElement('small'); description.textContent = ammo.description; b.append(description)
    b.dataset.ammo = ammo.key; b.onclick = () => { state.choice.ammo = ammo.key; render(); $('ammoDialog').close() }; $('ammo').append(b)
  }
  $('openAmmo').onclick = () => $('ammoDialog').showModal()
  $('closeAmmo').onclick = () => $('ammoDialog').close()
  $('ammoDialog').addEventListener('click', e => { if (e.target === $('ammoDialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close() } })
  $('warning').textContent = state.buried ? 'Tankkisi on maan sisällä. Kaivurilla voit avata tilaa.' : ''
  const remaining = state.deadline - Date.now()
  const updateTime = () => {
    const seconds = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000))
    $('status').textContent = `Kierros ${state.round} · aikaa ${seconds} s · tuuli ${state.wind}`
    if (!seconds) { $('send').disabled = true; $('status').textContent += ' · Avaa uusi ohjain komennolla /tykki.' }
  }
  if (remaining > 120000) $('warning').textContent += ' Puhelimen kello voi olla väärässä. Host tarkistaa määräajan.'
  form.hidden = false; updateTime(); setInterval(updateTime, 500)
  function render() {
    const roller = state.choice.ammo === 'pyorija'
    $('aim').hidden = roller; $('roller').hidden = !roller; $('powerPanel').hidden = roller
    $('angleValue').textContent = `${$('angle').value}°`; $('powerValue').textContent = $('power').value
    const angle = Number($(roller ? 'direction' : 'angle').value)
    $('barrel').setAttribute('transform', `rotate(${-angle} 150 152)`)
    $('cannon').setAttribute('aria-label', `Tykin tähtäyssuunta ${angle} astetta`)
    document.querySelectorAll('[data-ammo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ammo === state.choice.ammo)))
    const ammo = state.ammo.find(a => a.key === state.choice.ammo)
    $('openAmmo').textContent = `${ammo?.name ?? 'Valitse ammus'} · ${ammo?.left ?? '∞'} ▾`
    $('review').textContent = `${ammo?.name ?? 'Valitse ammus'} · ${roller ? $('direction').selectedOptions[0].text : `${$('angle').value}° · voima ${$('power').value}`}`
  }
  form.oninput = render
  document.querySelectorAll('[data-adjust]').forEach(b => b.onclick = () => { const [id, delta] = b.dataset.adjust.split(':'); const input = $(id); input.value = Math.min(Number(input.max), Math.max(Number(input.min), Number(input.value) + Number(delta))); render() })
  form.onsubmit = e => {
    e.preventDefault(); if (sent || Date.now() >= state.deadline) return
    const roller = state.choice.ammo === 'pyorija'
    const payload = { v: 1, type: 'cannon.shot', gameId: state.gameId, round: state.round, sessionId: state.sessionId,
      ammo: state.choice.ammo, angle: Number($(roller ? 'direction' : 'angle').value), power: roller ? 70 : Number($('power').value), ...(emote ? { emote } : {}) }
    sent = true; $('send').disabled = true
    try { tg.sendData(JSON.stringify(payload)); $('status').textContent = 'Lähetetty. Tarkista hostin kuittaus Telegramista.' }
    catch { sent = false; $('send').disabled = false; $('status').textContent = 'Lähetys epäonnistui. Yritä uudelleen.' }
  }
  render()
} catch { $('status').textContent = 'Avaa ohjain botin uusimmasta laukauspainikkeesta. /tykki avaa uuden ohjaimen.'; form.hidden = true }
