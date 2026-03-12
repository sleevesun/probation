;(function () {
  'use strict'

  const SCRIPT_TAG = document.currentScript
  const SUPABASE_URL = SCRIPT_TAG?.dataset?.supabaseUrl || ''
  const SUPABASE_KEY = SCRIPT_TAG?.dataset?.supabaseKey || ''
  const RAW_WEBHOOK_URL = (SCRIPT_TAG?.dataset?.webhook || '').trim()
  const STORAGE_KEY = '__cw_identity__'
  const TABLE = 'page_comments'
  const PREFIX = 'cw'
  const ONBOARDING_KEY = '__cw_onboarding_done__'
  const LOCAL_DB_KEY = '__cw_comments__'

  function getCleanPath() {
    return window.location.origin + window.location.pathname
  }

  function getPageLink() {
    return window.location.href
  }

  function timeAgo(dateStr) {
    const now = Date.now()
    const past = new Date(dateStr).getTime()
    const diff = Math.floor((now - past) / 1000)
    if (diff < 60) return '刚刚'
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前'
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前'
    if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前'
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  function escapeHtml(str) {
    const div = document.createElement('div')
    div.textContent = str || ''
    return div.innerHTML
  }

  function hasPlaceholderValue(value) {
    return !value || value.includes('YOUR_')
  }

  function isValidWebhookUrl(url) {
    if (!url || hasPlaceholderValue(url)) return false
    try {
      const parsed = new URL(url)
      return (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        Boolean(parsed.hostname)
      )
    } catch (_) {
      return false
    }
  }

  const SUPABASE_READY =
    SUPABASE_URL &&
    SUPABASE_KEY &&
    SUPABASE_URL.startsWith('http') &&
    !hasPlaceholderValue(SUPABASE_URL) &&
    !hasPlaceholderValue(SUPABASE_KEY)

  const WEBHOOK_READY = isValidWebhookUrl(RAW_WEBHOOK_URL)

  function buildNotificationText(input) {
    const shortContent =
      input.content.length > 120
        ? input.content.slice(0, 120) + '...'
        : input.content
    const typeText = input.parentId ? '二级回复' : '主评论'
    return [
      `[评论插件通知] ${typeText}已发布`,
      `发言人：${input.nickname}（${input.role}）`,
      `内容：${shortContent}`,
      `页面：${input.pageLink}`
    ].join('\n')
  }

  async function sendNotificationSafely(input) {
    if (!WEBHOOK_READY) {
      console.info('[评论插件] webhook 未配置或无效，已跳过通知发送。')
      return
    }
    const text = buildNotificationText(input)
    try {
      const res = await fetch(RAW_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: text
      })
      if (!res.ok) {
        console.warn('[评论插件] webhook 返回非成功状态，已忽略。', res.status)
      }
    } catch (error) {
      console.warn('[评论插件] webhook 发送失败，已静默忽略。', error)
    }
  }

  const supabaseDb = {
    async query(method, path, body) {
      const headers = {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: method === 'POST' ? 'return=representation' : undefined
      }
      Object.keys(headers).forEach((k) => {
        if (headers[k] === undefined) delete headers[k]
      })
      const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      })
      if (!res.ok) throw new Error('DB Error: ' + res.status)
      const text = await res.text()
      return text ? JSON.parse(text) : null
    },

    async fetchComments(pagePath) {
      return this.query(
        'GET',
        TABLE +
          '?page_path=eq.' +
          encodeURIComponent(pagePath) +
          '&is_done=eq.false&order=created_at.asc'
      )
    },

    async postComment(pagePath, nickname, role, content, parentId) {
      return this.query('POST', TABLE, {
        page_path: pagePath,
        nickname,
        role,
        content,
        parent_id: parentId || null
      })
    },

    async markDone(id) {
      return this.query(
        'PATCH',
        TABLE + '?or=(id.eq.' + id + ',parent_id.eq.' + id + ')',
        { is_done: true }
      )
    },

    async clearPage(pagePath) {
      return this.query(
        'PATCH',
        TABLE + '?page_path=eq.' + encodeURIComponent(pagePath),
        { is_done: true }
      )
    }
  }

  const localDb = {
    _read() {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_DB_KEY) || '[]')
      } catch (_) {
        return []
      }
    },
    _write(data) {
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(data))
    },
    async fetchComments(pagePath) {
      return this._read()
        .filter((c) => c.page_path === pagePath && !c.is_done)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
    },
    async postComment(pagePath, nickname, role, content, parentId) {
      const all = this._read()
      const item = {
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2),
        page_path: pagePath,
        nickname,
        role,
        content,
        parent_id: parentId || null,
        is_done: false,
        created_at: new Date().toISOString()
      }
      all.push(item)
      this._write(all)
      return [item]
    },
    async markDone(id) {
      const all = this._read()
      all.forEach((item) => {
        if (item.id === id || item.parent_id === id) item.is_done = true
      })
      this._write(all)
    },
    async clearPage(pagePath) {
      const all = this._read()
      all.forEach((item) => {
        if (item.page_path === pagePath) item.is_done = true
      })
      this._write(all)
    }
  }

  const db = SUPABASE_READY ? supabaseDb : localDb

  const identity = {
    data: null,
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) this.data = JSON.parse(raw)
      } catch (_) {}
      return this.data
    },
    save(nickname, role) {
      this.data = { nickname, role }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
    },
    get nickname() {
      return this.data?.nickname || ''
    },
    get role() {
      return this.data?.role || ''
    }
  }

  const ROLES = [
    { label: '产品', color: '#6366f1', bg: '#eef2ff' },
    { label: '前端', color: '#06b6d4', bg: '#ecfeff' },
    { label: '后端', color: '#f59e0b', bg: '#fffbeb' },
    { label: '业务', color: '#10b981', bg: '#ecfdf5' }
  ]

  function getRoleStyle(role) {
    return ROLES.find((r) => r.label === role) || ROLES[0]
  }

  function injectStyles() {
    const css = `
      .${PREFIX}-fab{position:fixed;bottom:28px;right:28px;z-index:2147483646;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;cursor:pointer;box-shadow:0 4px 14px rgba(99,102,241,.4);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
      .${PREFIX}-fab:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(99,102,241,.55)}
      .${PREFIX}-fab svg{width:24px;height:24px;fill:#fff}
      .${PREFIX}-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 5px;box-shadow:0 2px 6px rgba(239,68,68,.4)}
      .${PREFIX}-badge[data-count="0"]{display:none}
      .${PREFIX}-overlay{position:fixed;inset:0;background:rgba(0,0,0,.18);z-index:2147483646;opacity:0;transition:opacity .25s;pointer-events:none}
      .${PREFIX}-overlay.${PREFIX}-open{opacity:1;pointer-events:auto}
      .${PREFIX}-drawer{position:fixed;top:0;right:0;bottom:0;width:420px;max-width:92vw;background:#fff;z-index:2147483647;box-shadow:-4px 0 24px rgba(0,0,0,.12);transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;color:#1e293b}
      .${PREFIX}-drawer.${PREFIX}-open{transform:translateX(0)}
      .${PREFIX}-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid #f1f5f9}
      .${PREFIX}-header h3{margin:0;font-size:16px;font-weight:700;color:#0f172a}
      .${PREFIX}-btn-icon{width:32px;height:32px;border:none;background:transparent;cursor:pointer;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#94a3b8;transition:background .15s,color .15s}
      .${PREFIX}-btn-icon:hover{background:#f1f5f9;color:#475569}
      .${PREFIX}-identity{padding:24px 20px;display:flex;flex-direction:column;gap:16px}
      .${PREFIX}-identity label{font-size:13px;font-weight:600;color:#475569;margin-bottom:4px;display:block}
      .${PREFIX}-identity input,.${PREFIX}-identity select{width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;color:#1e293b;outline:none;transition:border-color .15s;box-sizing:border-box;font-family:inherit}
      .${PREFIX}-identity input:focus,.${PREFIX}-identity select:focus{border-color:#6366f1}
      .${PREFIX}-btn-primary{padding:10px 0;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .15s}
      .${PREFIX}-btn-primary:hover{opacity:.9}
      .${PREFIX}-btn-primary:disabled{opacity:.5;cursor:not-allowed}
      .${PREFIX}-user-bar{display:flex;align-items:center;gap:8px;padding:10px 20px;background:#f8fafc;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b}
      .${PREFIX}-user-bar strong{color:#1e293b;font-weight:600}
      .${PREFIX}-switch-id{font-size:12px;color:#6366f1;cursor:pointer;text-decoration:underline;background:none;border:none;padding:0;font-family:inherit}
      .${PREFIX}-switch-id:hover{color:#4f46e5}
      .${PREFIX}-role-tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;line-height:1.5}
      .${PREFIX}-list{flex:1;overflow-y:auto;padding:12px 20px}
      .${PREFIX}-empty{text-align:center;padding:48px 0;color:#94a3b8}
      .${PREFIX}-empty svg{width:48px;height:48px;margin-bottom:12px;opacity:.5}
      .${PREFIX}-item{padding:14px 0;border-bottom:1px solid #f1f5f9}
      .${PREFIX}-item:last-child{border-bottom:none}
      .${PREFIX}-item-header{display:flex;align-items:center;gap:8px;margin-bottom:6px}
      .${PREFIX}-item-name{font-weight:600;font-size:13px;color:#1e293b}
      .${PREFIX}-item-time{margin-left:auto;font-size:12px;color:#94a3b8}
      .${PREFIX}-item-content{font-size:14px;line-height:1.6;color:#334155;white-space:pre-wrap;word-break:break-word;margin-bottom:8px}
      .${PREFIX}-item-actions{display:flex;align-items:center;gap:8px}
      .${PREFIX}-btn-action{font-size:12px;padding:3px 10px;border:1px solid #e2e8f0;background:#fff;border-radius:5px;color:#64748b;cursor:pointer;transition:all .15s}
      .${PREFIX}-btn-action:hover{border-color:#6366f1;color:#6366f1;background:#eef2ff}
      .${PREFIX}-btn-done:hover{border-color:#10b981;color:#10b981;background:#ecfdf5}
      .${PREFIX}-replies{margin:10px 0 0 14px;padding-left:12px;border-left:2px solid #e2e8f0;display:flex;flex-direction:column;gap:10px}
      .${PREFIX}-reply-item{background:#f8fafc;border-radius:8px;padding:10px 10px 8px}
      .${PREFIX}-reply-item .${PREFIX}-item-content{font-size:13px;margin-bottom:6px}
      .${PREFIX}-input-area{padding:14px 20px 20px;border-top:1px solid #f1f5f9;background:#fff}
      .${PREFIX}-replying{display:none;align-items:center;justify-content:space-between;gap:10px;font-size:12px;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;border-radius:7px;padding:6px 8px;margin-bottom:8px}
      .${PREFIX}-replying button{border:none;background:transparent;color:#4338ca;text-decoration:underline;cursor:pointer;font-size:12px;padding:0}
      .${PREFIX}-input-area textarea{width:100%;min-height:72px;max-height:160px;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;color:#1e293b;resize:vertical;outline:none;transition:border-color .15s;box-sizing:border-box}
      .${PREFIX}-input-area textarea:focus{border-color:#6366f1}
      .${PREFIX}-input-footer{display:flex;justify-content:flex-end;margin-top:10px}
      .${PREFIX}-btn-send{padding:8px 20px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s}
      .${PREFIX}-btn-send:hover{opacity:.9}
      .${PREFIX}-btn-send:disabled{opacity:.5;cursor:not-allowed}
      .${PREFIX}-danger-zone{padding:12px 20px;border-top:1px solid #fef2f2;text-align:center}
      .${PREFIX}-btn-danger{font-size:12px;padding:5px 14px;border:1px solid #fecaca;background:#fff;border-radius:6px;color:#ef4444;cursor:pointer;transition:all .15s}
      .${PREFIX}-btn-danger:hover{background:#fef2f2;border-color:#ef4444}
      .${PREFIX}-loading{text-align:center;padding:32px 0;color:#94a3b8}
      @keyframes ${PREFIX}-spin{to{transform:rotate(360deg)}}
      .${PREFIX}-spinner{display:inline-block;width:24px;height:24px;border:2.5px solid #e2e8f0;border-top-color:#6366f1;border-radius:50%;animation:${PREFIX}-spin .6s linear infinite}
      .${PREFIX}-guide-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483645;opacity:0;transition:opacity .4s ease}
      .${PREFIX}-guide-overlay.${PREFIX}-guide-visible{opacity:1}
      .${PREFIX}-fab.${PREFIX}-guide-highlight{z-index:2147483647;animation:${PREFIX}-pulse 1.5s ease-in-out infinite;box-shadow:0 0 0 6px rgba(99,102,241,.25),0 4px 14px rgba(99,102,241,.5)}
      @keyframes ${PREFIX}-pulse{0%,100%{box-shadow:0 0 0 6px rgba(99,102,241,.25),0 4px 14px rgba(99,102,241,.5)}50%{box-shadow:0 0 0 14px rgba(99,102,241,.08),0 6px 24px rgba(99,102,241,.6)}}
      .${PREFIX}-guide-tip{position:fixed;bottom:30px;right:92px;z-index:2147483648;background:#fff;border-radius:12px;padding:18px 20px;width:260px;box-shadow:0 8px 32px rgba(0,0,0,.18);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;opacity:0;transform:translateX(12px);transition:opacity .4s ease,transform .4s ease}
      .${PREFIX}-guide-tip.${PREFIX}-guide-visible{opacity:1;transform:translateX(0)}
      .${PREFIX}-guide-tip::after{content:'';position:absolute;right:-8px;bottom:20px;width:16px;height:16px;background:#fff;transform:rotate(45deg);border-radius:2px;box-shadow:4px -4px 8px rgba(0,0,0,.06)}
      .${PREFIX}-guide-tip-icon{font-size:28px;margin-bottom:8px}
      .${PREFIX}-guide-tip-text{font-size:14px;line-height:1.65;color:#334155;margin-bottom:14px}
      .${PREFIX}-guide-tip-btn{display:block;width:100%;padding:8px 0;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .15s}
      .${PREFIX}-guide-tip-btn:hover{opacity:.9}
    `
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
  }

  const ICONS = {
    comment:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    empty:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',
    check: '✓'
  }

  let drawerEl
  let overlayEl
  let fabEl
  let badgeEl
  let listEl
  let isOpen = false
  let comments = []
  let replyTarget = null
  const expandedMainIds = new Set()

  function createFAB() {
    fabEl = document.createElement('button')
    fabEl.className = `${PREFIX}-fab`
    fabEl.innerHTML = ICONS.comment
    fabEl.title = '打开评论面板'
    badgeEl = document.createElement('span')
    badgeEl.className = `${PREFIX}-badge`
    badgeEl.dataset.count = '0'
    badgeEl.textContent = '0'
    fabEl.appendChild(badgeEl)
    fabEl.addEventListener('click', toggleDrawer)
    document.body.appendChild(fabEl)
  }

  function createOverlay() {
    overlayEl = document.createElement('div')
    overlayEl.className = `${PREFIX}-overlay`
    overlayEl.addEventListener('click', closeDrawer)
    document.body.appendChild(overlayEl)
  }

  function createDrawer() {
    drawerEl = document.createElement('div')
    drawerEl.className = `${PREFIX}-drawer`
    document.body.appendChild(drawerEl)
  }

  function toggleDrawer() {
    isOpen ? closeDrawer() : openDrawer()
  }

  function openDrawer() {
    isOpen = true
    overlayEl.classList.add(`${PREFIX}-open`)
    drawerEl.classList.add(`${PREFIX}-open`)
    renderDrawerContent()
  }

  function closeDrawer() {
    isOpen = false
    overlayEl.classList.remove(`${PREFIX}-open`)
    drawerEl.classList.remove(`${PREFIX}-open`)
  }

  function renderDrawerContent() {
    const id = identity.load()
    if (!id) renderIdentityForm()
    else renderMainPanel()
  }

  function renderIdentityForm() {
    drawerEl.innerHTML = `
      <div class="${PREFIX}-header">
        <h3>👋 欢迎使用评论插件</h3>
        <button class="${PREFIX}-btn-icon" data-action="close">${ICONS.close}</button>
      </div>
      <div class="${PREFIX}-identity">
        <div>
          <label>你的花名</label>
          <input type="text" id="${PREFIX}-nickname" placeholder="输入你的花名…" maxlength="20" autocomplete="off" />
        </div>
        <div>
          <label>你的角色</label>
          <select id="${PREFIX}-role">
            <option value="">请选择角色…</option>
            ${ROLES.map((r) => `<option value="${r.label}">${r.label}</option>`).join('')}
          </select>
        </div>
        <button class="${PREFIX}-btn-primary" id="${PREFIX}-save-id" disabled>确认进入</button>
      </div>
    `
    const nicknameInput = drawerEl.querySelector(`#${PREFIX}-nickname`)
    const roleSelect = drawerEl.querySelector(`#${PREFIX}-role`)
    const saveBtn = drawerEl.querySelector(`#${PREFIX}-save-id`)
    const closeBtn = drawerEl.querySelector('[data-action="close"]')

    function checkForm() {
      saveBtn.disabled = !(nicknameInput.value.trim() && roleSelect.value)
    }

    nicknameInput.addEventListener('input', checkForm)
    roleSelect.addEventListener('change', checkForm)
    closeBtn.addEventListener('click', closeDrawer)
    saveBtn.addEventListener('click', () => {
      identity.save(nicknameInput.value.trim(), roleSelect.value)
      renderMainPanel()
    })
  }

  function getMainComments() {
    return comments.filter((c) => !c.parent_id)
  }

  function getReplyMap() {
    const map = new Map()
    comments.forEach((c) => {
      if (!c.parent_id) return
      if (!map.has(c.parent_id)) map.set(c.parent_id, [])
      map.get(c.parent_id).push(c)
    })
    map.forEach((arr) => {
      arr.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })
    return map
  }

  function ensureExpandState() {
    getMainComments().forEach((main) => {
      if (!expandedMainIds.has(main.id)) expandedMainIds.add(main.id)
    })
  }

  function setReplyTarget(parentId, nickname) {
    replyTarget = { parentId, nickname }
    const textarea = drawerEl.querySelector(`#${PREFIX}-textarea`)
    const replying = drawerEl.querySelector(`#${PREFIX}-replying`)
    const replyingText = drawerEl.querySelector(`#${PREFIX}-replying-text`)
    const mention = `@${nickname} `
    if (replying && replyingText) {
      replying.style.display = 'flex'
      replyingText.textContent = `正在回复 ${nickname}`
    }
    if (textarea) {
      if (!textarea.value.trim()) textarea.value = mention
      else if (!textarea.value.includes(mention)) textarea.value = mention + textarea.value
      textarea.focus()
      textarea.dispatchEvent(new Event('input'))
    }
  }

  function clearReplyTarget() {
    replyTarget = null
    const replying = drawerEl.querySelector(`#${PREFIX}-replying`)
    if (replying) replying.style.display = 'none'
  }

  function bindCommentActions() {
    listEl.querySelectorAll('[data-action="reply-main"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setReplyTarget(btn.dataset.parentId, btn.dataset.nickname)
      })
    })
    listEl.querySelectorAll('[data-action="reply-child"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setReplyTarget(btn.dataset.parentId, btn.dataset.nickname)
      })
    })
    listEl.querySelectorAll('[data-action="toggle-replies"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.parentId
        if (expandedMainIds.has(id)) expandedMainIds.delete(id)
        else expandedMainIds.add(id)
        renderComments()
      })
    })
    listEl.querySelectorAll('[data-action="done-main"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.parentId
        btn.disabled = true
        btn.textContent = '处理中…'
        try {
          await db.markDone(id)
          if (replyTarget && replyTarget.parentId === id) clearReplyTarget()
          await loadComments()
        } catch (e) {
          alert('操作失败，请重试')
          console.error(e)
          btn.disabled = false
          btn.innerHTML = `${ICONS.check} 已完成`
        }
      })
    })
  }

  async function renderMainPanel() {
    const roleStyle = getRoleStyle(identity.role)
    drawerEl.innerHTML = `
      <div class="${PREFIX}-header">
        <h3>💬 页面讨论</h3>
        <button class="${PREFIX}-btn-icon" data-action="close">${ICONS.close}</button>
      </div>
      <div class="${PREFIX}-user-bar">
        <span>当前身份：</span>
        <strong>${escapeHtml(identity.nickname)}</strong>
        <span class="${PREFIX}-role-tag" style="color:${roleStyle.color};background:${roleStyle.bg}">${identity.role}</span>
        <button class="${PREFIX}-switch-id">切换</button>
      </div>
      <div class="${PREFIX}-list" id="${PREFIX}-list">
        <div class="${PREFIX}-loading"><div class="${PREFIX}-spinner"></div></div>
      </div>
      <div class="${PREFIX}-input-area">
        <div class="${PREFIX}-replying" id="${PREFIX}-replying">
          <span id="${PREFIX}-replying-text"></span>
          <button id="${PREFIX}-cancel-reply">取消回复</button>
        </div>
        <textarea id="${PREFIX}-textarea" placeholder="输入你的评论…" rows="3"></textarea>
        <div class="${PREFIX}-input-footer">
          <button class="${PREFIX}-btn-send" id="${PREFIX}-send" disabled>发送</button>
        </div>
      </div>
      <div class="${PREFIX}-danger-zone">
        <button class="${PREFIX}-btn-danger" id="${PREFIX}-clear">🗑 清空本页所有讨论</button>
      </div>
    `

    listEl = drawerEl.querySelector(`#${PREFIX}-list`)
    drawerEl.querySelector('[data-action="close"]').addEventListener('click', closeDrawer)
    drawerEl.querySelector(`.${PREFIX}-switch-id`).addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY)
      identity.data = null
      replyTarget = null
      renderIdentityForm()
    })

    const textarea = drawerEl.querySelector(`#${PREFIX}-textarea`)
    const sendBtn = drawerEl.querySelector(`#${PREFIX}-send`)

    drawerEl.querySelector(`#${PREFIX}-cancel-reply`).addEventListener('click', () => {
      clearReplyTarget()
    })

    textarea.addEventListener('input', () => {
      sendBtn.disabled = !textarea.value.trim()
    })

    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!sendBtn.disabled) sendBtn.click()
      }
    })

    sendBtn.addEventListener('click', async () => {
      const text = textarea.value.trim()
      if (!text) return
      sendBtn.disabled = true
      const parentId = replyTarget?.parentId || null
      try {
        await db.postComment(
          getCleanPath(),
          identity.nickname,
          identity.role,
          text,
          parentId
        )
        void sendNotificationSafely({
          nickname: identity.nickname,
          role: identity.role,
          content: text,
          pageLink: getPageLink(),
          parentId
        })
        textarea.value = ''
        clearReplyTarget()
        await loadComments()
        listEl.scrollTop = listEl.scrollHeight
      } catch (e) {
        alert('发送失败，请重试')
        console.error(e)
      }
      sendBtn.disabled = !textarea.value.trim()
    })

    drawerEl.querySelector(`#${PREFIX}-clear`).addEventListener('click', async () => {
      if (!confirm('确定要清空本页的所有讨论吗？\n此操作不可恢复。')) return
      try {
        await db.clearPage(getCleanPath())
        clearReplyTarget()
        await loadComments()
      } catch (e) {
        alert('清空失败，请重试')
        console.error(e)
      }
    })

    await loadComments()
  }

  async function loadComments() {
    try {
      comments = (await db.fetchComments(getCleanPath())) || []
    } catch (e) {
      console.error('拉取评论失败：', e)
      comments = []
    }
    ensureExpandState()
    renderComments()
    updateBadge()
  }

  function renderComments() {
    if (!listEl) return
    if (comments.length === 0) {
      listEl.innerHTML = `
        <div class="${PREFIX}-empty">
          ${ICONS.empty}
          <div>暂无评论，快来留下第一条讨论吧</div>
        </div>
      `
      return
    }

    const mains = getMainComments()
    const replyMap = getReplyMap()
    listEl.innerHTML = mains
      .map((main) => {
        const rs = getRoleStyle(main.role)
        const replies = replyMap.get(main.id) || []
        const expanded = expandedMainIds.has(main.id)
        const replyToggle =
          replies.length > 0
            ? `<button class="${PREFIX}-btn-action" data-action="toggle-replies" data-parent-id="${main.id}">${expanded ? '收起' : '展开'}回复（${replies.length}）</button>`
            : ''
        const replyHtml =
          replies.length > 0 && expanded
            ? `<div class="${PREFIX}-replies">${replies
                .map((reply) => {
                  const rr = getRoleStyle(reply.role)
                  return `
                    <div class="${PREFIX}-reply-item">
                      <div class="${PREFIX}-item-header">
                        <span class="${PREFIX}-item-name">${escapeHtml(reply.nickname)}</span>
                        <span class="${PREFIX}-role-tag" style="color:${rr.color};background:${rr.bg}">${escapeHtml(reply.role)}</span>
                        <span class="${PREFIX}-item-time">${timeAgo(reply.created_at)}</span>
                      </div>
                      <div class="${PREFIX}-item-content">${escapeHtml(reply.content)}</div>
                      <div class="${PREFIX}-item-actions">
                        <button class="${PREFIX}-btn-action" data-action="reply-child" data-parent-id="${main.id}" data-nickname="${escapeHtml(reply.nickname)}">回复</button>
                      </div>
                    </div>
                  `
                })
                .join('')}</div>`
            : ''

        return `
          <div class="${PREFIX}-item" data-id="${main.id}">
            <div class="${PREFIX}-item-header">
              <span class="${PREFIX}-item-name">${escapeHtml(main.nickname)}</span>
              <span class="${PREFIX}-role-tag" style="color:${rs.color};background:${rs.bg}">${escapeHtml(main.role)}</span>
              <span class="${PREFIX}-item-time">${timeAgo(main.created_at)}</span>
            </div>
            <div class="${PREFIX}-item-content">${escapeHtml(main.content)}</div>
            <div class="${PREFIX}-item-actions">
              <button class="${PREFIX}-btn-action" data-action="reply-main" data-parent-id="${main.id}" data-nickname="${escapeHtml(main.nickname)}">回复</button>
              ${replyToggle}
              <button class="${PREFIX}-btn-action ${PREFIX}-btn-done" data-action="done-main" data-parent-id="${main.id}">${ICONS.check} 已完成</button>
            </div>
            ${replyHtml}
          </div>
        `
      })
      .join('')

    bindCommentActions()
  }

  function updateBadge() {
    if (!badgeEl) return
    const count = comments.length
    badgeEl.textContent = count > 99 ? '99+' : String(count)
    badgeEl.dataset.count = String(count)
  }

  function shouldShowOnboarding() {
    try {
      return !localStorage.getItem(ONBOARDING_KEY)
    } catch (_) {
      return false
    }
  }

  function showOnboarding() {
    if (!shouldShowOnboarding()) return
    const guideOverlay = document.createElement('div')
    guideOverlay.className = `${PREFIX}-guide-overlay`
    const guideTip = document.createElement('div')
    guideTip.className = `${PREFIX}-guide-tip`
    guideTip.innerHTML = `
      <div class="${PREFIX}-guide-tip-icon">💬</div>
      <div class="${PREFIX}-guide-tip-text">如果对页面有问题或补充，可在此处进行评论，与团队异步协作。</div>
      <button class="${PREFIX}-guide-tip-btn">知道了</button>
    `
    fabEl.classList.add(`${PREFIX}-guide-highlight`)
    document.body.appendChild(guideOverlay)
    document.body.appendChild(guideTip)
    requestAnimationFrame(() => {
      guideOverlay.classList.add(`${PREFIX}-guide-visible`)
      guideTip.classList.add(`${PREFIX}-guide-visible`)
    })
    function dismissGuide() {
      guideOverlay.classList.remove(`${PREFIX}-guide-visible`)
      guideTip.classList.remove(`${PREFIX}-guide-visible`)
      fabEl.classList.remove(`${PREFIX}-guide-highlight`)
      setTimeout(() => {
        guideOverlay.remove()
        guideTip.remove()
      }, 400)
      try {
        localStorage.setItem(ONBOARDING_KEY, '1')
      } catch (_) {}
    }
    guideTip
      .querySelector(`.${PREFIX}-guide-tip-btn`)
      .addEventListener('click', dismissGuide)
    guideOverlay.addEventListener('click', dismissGuide)
  }

  async function init() {
    if (!SUPABASE_READY) {
      console.info(
        '[评论插件] 未检测到有效 Supabase 配置，已自动切换为本地模式（数据保存在 localStorage）。'
      )
    }
    if (!WEBHOOK_READY) {
      console.info('[评论插件] 未检测到有效 webhook 配置，通知将自动静默跳过。')
    }
    injectStyles()
    createOverlay()
    createDrawer()
    createFAB()
    showOnboarding()
    identity.load()
    try {
      comments = (await db.fetchComments(getCleanPath())) || []
      ensureExpandState()
      updateBadge()
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
