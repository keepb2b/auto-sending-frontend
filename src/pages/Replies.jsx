import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { isSupabaseRepliesConfigured, supabase } from '../lib/supabaseClient'
import {
  MdEmail, MdRefresh, MdCheckCircle, MdMarkEmailRead,
  MdBusiness, MdSchedule, MdInbox, MdSearch
} from 'react-icons/md'
import DataLoadingLayer from '../components/DataLoadingLayer'

function normalizeReplyEmail(e) {
  return String(e ?? '').trim().toLowerCase()
}

function isReplyRead(r) {
  const v = r?.read
  return v === true || v === 'true' || v === 't' || v === 1
}

function replyBodyPreview(r) {
  if (!r) return ''
  const b = r.body_preview ?? r.body
  return b != null ? String(b) : ''
}

function replyDisplayName(r) {
  if (!r) return ''
  const n = r.company_name != null ? String(r.company_name).trim() : ''
  if (n) return n
  const fe = r.from_email != null ? String(r.from_email).trim() : ''
  return fe || '企業未登録の送信元'
}

function mapSupabaseReplyRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map((r) => {
    const co = r.companies
    let company_name = ''
    if (co && typeof co === 'object') {
      company_name = String(
        (Array.isArray(co) ? co[0]?.company_name : co.company_name) ?? ''
      )
    }
    const { companies: _co, ...rest } = r
    void _co
    return { ...rest, company_name }
  })
}

function Replies() {
  const [replies, setReplies] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  /** null until first load; then direct DB + realtime, or API fallback */
  const [repliesSource, setRepliesSource] = useState(null)
  const [checking, setChecking] = useState(false)
  const [selectedReply, setSelectedReply] = useState(null)
  const [selectedReplies, setSelectedReplies] = useState([])
  const [replySearchTerm, setReplySearchTerm] = useState('')
  const selectAllRepliesRef = useRef(null)

  const location = useLocation()

  const filteredReplies = useMemo(() => {
    const q = replySearchTerm.trim().toLowerCase()
    if (!q) return replies
    return replies.filter((r) => {
      const name = replyDisplayName(r).toLowerCase()
      const subj = String(r.subject ?? '').toLowerCase()
      const em = String(r.from_email ?? '').toLowerCase()
      const prev = replyBodyPreview(r).toLowerCase()
      return (
        name.includes(q) ||
        subj.includes(q) ||
        em.includes(q) ||
        prev.includes(q)
      )
    })
  }, [replies, replySearchTerm])

  const filteredReplyIdSet = useMemo(
    () => new Set(filteredReplies.map((r) => r.id)),
    [filteredReplies]
  )
  const selectedCountInFiltered = selectedReplies.filter((id) =>
    filteredReplyIdSet.has(id)
  ).length
  const allFilteredSelected =
    filteredReplies.length > 0 &&
    selectedCountInFiltered === filteredReplies.length

  useEffect(() => {
    const el = selectAllRepliesRef.current
    if (!el) return
    const n = filteredReplies.length
    const sel = selectedCountInFiltered
    el.indeterminate = n > 0 && sel > 0 && sel < n
  }, [filteredReplies.length, selectedCountInFiltered])

  const fetchReplies = useCallback(async (silentPoll = false) => {
    try {
      if (!silentPoll) {
        setListLoading(true)
        setLoadError(null)
      }

      if (isSupabaseRepliesConfigured() && supabase) {
        const { data: sentOkRows, error: coErr } = await supabase
          .from('companies')
          .select('email')
          .eq('email_status', '送信成功')

        if (coErr && !silentPoll) {
          console.warn('Supabase companies (送信成功) fetch failed:', coErr.message)
        }

        const allowFromEmails = new Set(
          (sentOkRows ?? [])
            .map((row) => normalizeReplyEmail(row.email))
            .filter(Boolean)
        )

        const { data, error } = await supabase
          .from('replies')
          .select(
            'id, company_id, from_email, subject, body, received_at, read, message_id, companies ( company_name )'
          )
          .order('received_at', { ascending: false })

        if (!error && data != null) {
          const filtered = (data ?? []).filter((r) =>
            allowFromEmails.has(normalizeReplyEmail(r.from_email))
          )
          setRepliesSource('supabase')
          setReplies(mapSupabaseReplyRows(filtered))
          if (!silentPoll) setSelectedReplies([])
          return
        }
        if (error && !silentPoll) {
          console.warn('Supabase replies fetch failed, using API:', error.message)
        }
      }

      setRepliesSource('api')
      const res = await axios.get('/api/replies')
      setReplies(Array.isArray(res.data) ? res.data : [])
      if (!silentPoll) setSelectedReplies([])
    } catch (e) {
      console.error('Failed to fetch replies:', e)
      if (!silentPoll) {
        const msg = e.response?.data?.detail || e.message || '返信データを取得できませんでした。'
        setLoadError(typeof msg === 'string' ? msg : '取得に失敗しました')
      }
    } finally {
      if (!silentPoll) setListLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReplies(false)
  }, [location.pathname, fetchReplies])

  useEffect(() => {
    if (repliesSource !== 'supabase' || !supabase) return undefined

    const channel = supabase
      .channel('replies-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'replies' },
        () => {
          fetchReplies(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [repliesSource, fetchReplies])

  /** Every 60s: pull new mail from IMAP, then refresh list (no alerts; errors only in console). */
  useEffect(() => {
    const tick = async () => {
      try {
        await axios.post('/api/replies/check')
      } catch (e) {
        console.warn(
          'Periodic IMAP check failed:',
          e.response?.data?.detail || e.message
        )
      }
      await fetchReplies(true)
    }
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [fetchReplies])

  const checkReplies = async () => {
    setChecking(true)
    try {
      const res = await axios.post('/api/replies/check')
      await fetchReplies(false)
      const d = res.data
      if (d?.imported > 0) {
        alert(d.message || `新規 ${d.imported} 件を取り込みました（スキップ ${d.skipped ?? 0}）`)
      }
    } catch (e) {
      const detail = e.response?.data?.detail
      const hint =
        typeof detail === 'string'
          ? detail
          : 'IMAP（受信）設定: IMAP_HOST / IMAP_USER / IMAP_PASSWORD（未設定時は SMTP_USER / SMTP_PASSWORD）と DATABASE_URL を確認してください。'
      alert(`返信チェックに失敗しました。\n${hint}`)
    } finally {
      setChecking(false)
    }
  }

  const markRead = async (id) => {
    try {
      await axios.put(`/api/replies/${id}/read`)
      setReplies(replies.map(r => (r.id === id ? { ...r, read: true } : r)))
    } catch (e) {
      console.error('Failed to mark read:', e)
    }
  }

  const handleSelectAllReplies = (e) => {
    if (e.target.checked) {
      setSelectedReplies(filteredReplies.map((r) => r.id))
    } else {
      setSelectedReplies([])
    }
  }

  const handleSelectOneReply = (id) => {
    setSelectedReplies((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    )
  }

  const handleDeleteSelectedReplies = async () => {
    if (selectedReplies.length === 0) {
      alert('削除する返信を選択してください')
      return
    }
    if (!window.confirm(`${selectedReplies.length}件の返信を削除しますか？`)) {
      return
    }
    const ids = [...selectedReplies]
    const removed = new Set(ids)
    try {
      if (repliesSource === 'supabase' && supabase) {
        const { error } = await supabase.from('replies').delete().in('id', ids)
        if (error) throw error
      } else {
        for (const id of ids) {
          await axios.delete(`/api/replies/${id}`)
        }
      }
      setSelectedReply((sr) => (sr && removed.has(sr.id) ? null : sr))
      setSelectedReplies([])
      await fetchReplies(false)
    } catch (error) {
      console.error('返信削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  const unreadCount = replies.filter(r => !isReplyRead(r)).length

  return (
    <div>
      {loadError && (
        <div
          className="card"
          style={{
            marginBottom: '16px',
            borderLeft: '4px solid #ef4444',
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: '14px',
          }}
        >
          {loadError}
        </div>
      )}
      <div
        className={`page-data-shell${
          listLoading && replies.length === 0 ? ' page-data-shell--busy' : ''
        }`}
      >
        {listLoading && replies.length === 0 && (
          <DataLoadingLayer
            title="返信を読み込んでいます"
            subtitle={
              isSupabaseRepliesConfigured()
                ? 'Supabase のデータを表示します（更新はリアルタイム同期）'
                : 'API 経由でデータベースから取得しています'
            }
          />
        )}
        <div
          className={
            listLoading && replies.length === 0
              ? 'page-data-shell__content page-data-shell__content--behind'
              : 'page-data-shell__content'
          }
        >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MdInbox size={28} /> 返信受信箱
          {unreadCount > 0 && (
            <span style={{
              background: '#ef4444', color: 'white',
              borderRadius: '12px', padding: '2px 10px', fontSize: '13px'
            }}>
              {unreadCount} 未読
            </span>
          )}
        </h2>
        <button
          onClick={checkReplies}
          disabled={checking}
          style={{
            padding: '10px 20px', background: '#3b82f6', color: 'white',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'
          }}
        >
          <MdRefresh size={18} className={checking ? 'rotating' : ''} />
          {checking ? '確認中...' : '返信を確認'}
        </button>
      </div>

      <div className="stats" style={{ marginBottom: '20px' }}>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <MdInbox size={24} />
            <h3 style={{ color: 'white', fontSize: '14px' }}>総返信数</h3>
          </div>
          <div className="number" style={{ color: 'white' }}>{replies.length}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <MdEmail size={24} />
            <h3 style={{ color: 'white', fontSize: '14px' }}>未読</h3>
          </div>
          <div className="number" style={{ color: 'white' }}>{unreadCount}</div>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <MdCheckCircle size={24} />
            <h3 style={{ color: 'white', fontSize: '14px' }}>既読</h3>
          </div>
          <div className="number" style={{ color: 'white' }}>{replies.filter(r => isReplyRead(r)).length}</div>
        </div>
      </div>

      <div
        className="card hover-rotate-lift animate-fade-in-left delay-100"
        style={{ marginBottom: '20px' }}
      >
        <div
          style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <MdSearch
              size={20}
              className="icon-hover-spin"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#999',
              }}
            />
            <input
              type="text"
              placeholder="企業名・件名・本文・メールで検索..."
              value={replySearchTerm}
              onChange={(e) => setReplySearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 40px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            />
          </div>
          <div
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              borderRadius: '4px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <MdInbox size={18} />
            {filteredReplies.length}件
          </div>
          {selectedReplies.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelectedReplies}
              style={{
                padding: '10px 20px',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🗑️ 選択削除 ({selectedReplies.length})
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Reply list */}
        <div className="card" style={{ padding: 0, overflow: 'scroll', height:"308px", width:"668px" }}>
          <div
            style={{
              padding: '15px 20px',
              borderBottom: '1px solid #e2e8f0',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <input
              ref={selectAllRepliesRef}
              type="checkbox"
              checked={allFilteredSelected}
              onChange={handleSelectAllReplies}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
              title="表示中の一覧をすべて選択"
            />
            <MdEmail size={18} /> 返信一覧
          </div>
          {listLoading && replies.length === 0 ? (
            <div style={{ minHeight: 220 }} aria-hidden />
          ) : replies.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              <MdInbox size={48} style={{ opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
              返信がありません。IMAP から取り込むには「返信を確認」を押してください（DB に行があれば自動表示されます）。
            </div>
          ) : filteredReplies.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              <MdSearch size={40} style={{ opacity: 0.35, display: 'block', margin: '0 auto 10px' }} />
              検索に一致する返信がありません。
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {filteredReplies.map(reply => (
                <div
                  key={reply.id}
                  onClick={() => { setSelectedReply(reply); markRead(reply.id) }}
                  style={{
                    padding: '12px 20px 12px 12px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: '10px',
                    background:
                      selectedReplies.includes(reply.id)
                        ? '#f0f8ff'
                        : selectedReply?.id === reply.id
                          ? '#eff6ff'
                          : !isReplyRead(reply)
                            ? '#fefce8'
                            : 'white',
                    borderLeft: !isReplyRead(reply) ? '4px solid #f59e0b' : '4px solid transparent'
                  }}
                >
                  <div
                    role="presentation"
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '2px' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedReplies.includes(reply.id)}
                      onChange={() => handleSelectOneReply(reply.id)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: !isReplyRead(reply) ? 'bold' : 'normal', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MdBusiness size={14} style={{ color: '#667eea' }} />
                        {replyDisplayName(reply)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#999' }}>
                        {reply.received_at ? new Date(reply.received_at).toLocaleDateString('ja-JP') : '-'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151', marginBottom: '4px', fontWeight: !isReplyRead(reply) ? '600' : 'normal' }}>
                      {reply.subject}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {replyBodyPreview(reply)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply detail */}
        <div className="card" style={{height:"308px", width:"668px", overflow:"scroll"}}>
          {selectedReply ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', color: '#1e293b' }}>{selectedReply.subject}</h3>
                <span style={{
                  padding: '4px 10px', borderRadius: '12px', fontSize: '12px',
                  background: '#d4edda', color: '#155724'
                }}>
                  <MdMarkEmailRead size={14} /> 既読
                </span>
              </div>
              <div style={{ marginBottom: '15px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', fontSize: '13px' }}>
                <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MdBusiness size={14} style={{ color: '#667eea' }} />
                  <strong>企業名:</strong> {replyDisplayName(selectedReply)}
                  {!String(selectedReply.company_name || '').trim() && selectedReply.from_email && (
                    <span style={{ color: '#64748b', fontWeight: 'normal' }}>（DB未登録 · {selectedReply.from_email}）</span>
                  )}
                </div>
                <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MdEmail size={14} style={{ color: '#43e97b' }} />
                  <strong>送信元:</strong> {selectedReply.from_email}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MdSchedule size={14} style={{ color: '#f59e0b' }} />
                  <strong>受信日時:</strong> {selectedReply.received_at ? new Date(selectedReply.received_at).toLocaleString('ja-JP') : '-'}
                </div>
              </div>
              <div style={{ padding: '15px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', lineHeight: '1.6', color: '#374151', minHeight: '150px', whiteSpace: 'pre-wrap' }}>
                {selectedReply.body != null && String(selectedReply.body).trim()
                  ? String(selectedReply.body)
                  : replyBodyPreview(selectedReply) || '(本文なし)'}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: '60px 20px' }}>
              <MdSearch size={48} style={{ opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
              左の一覧から返信を選択してください
            </div>
          )}
        </div>
      </div>
        </div>
      </div>
    </div>
  )
}

export default Replies
