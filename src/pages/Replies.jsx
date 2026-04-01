import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import {
  MdEmail, MdRefresh, MdCheckCircle, MdMarkEmailRead,
  MdBusiness, MdSchedule, MdInbox, MdSearch
} from 'react-icons/md'
import DataLoadingLayer from '../components/DataLoadingLayer'

function isReplyRead(r) {
  const v = r?.read
  return v === true || v === 'true' || v === 't' || v === 1
}

function replyBodyPreview(r) {
  if (!r) return ''
  const b = r.body_preview ?? r.body
  return b != null ? String(b) : ''
}

function Replies() {
  const [replies, setReplies] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [checking, setChecking] = useState(false)
  const [selectedReply, setSelectedReply] = useState(null)

  const location = useLocation()

  useEffect(() => {
    fetchReplies(false)
    const interval = setInterval(() => fetchReplies(true), 60000)
    return () => clearInterval(interval)
  }, [location.pathname])

  const fetchReplies = async (silentPoll = false) => {
    try {
      if (!silentPoll) {
        setListLoading(true)
        setLoadError(null)
      }
      const res = await axios.get('/api/replies')
      setReplies(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      console.error('Failed to fetch replies:', e)
      if (!silentPoll) {
        const msg = e.response?.data?.detail || e.message || '返信データを API から取得できませんでした。'
        setLoadError(typeof msg === 'string' ? msg : '取得に失敗しました')
      }
    } finally {
      if (!silentPoll) setListLoading(false)
    }
  }

  const checkReplies = async () => {
    setChecking(true)
    try {
      await axios.post('/api/replies/check')
      await fetchReplies(false)
    } catch (e) {
      alert('返信チェックに失敗しました。SMTP設定を確認してください。')
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
            subtitle="API 経由でデータベースから取得しています"
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Reply list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MdEmail size={18} /> 返信一覧
          </div>
          {listLoading && replies.length === 0 ? (
            <div style={{ minHeight: 220 }} aria-hidden />
          ) : replies.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              <MdInbox size={48} style={{ opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
              返信がありません。「返信を確認」ボタンを押してください。
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {replies.map(reply => (
                <div
                  key={reply.id}
                  onClick={() => { setSelectedReply(reply); markRead(reply.id) }}
                  style={{
                    padding: '15px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: selectedReply?.id === reply.id ? '#eff6ff' : !isReplyRead(reply) ? '#fefce8' : 'white',
                    borderLeft: !isReplyRead(reply) ? '4px solid #f59e0b' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: !isReplyRead(reply) ? 'bold' : 'normal', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MdBusiness size={14} style={{ color: '#667eea' }} />
                      {reply.company_name}
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
              ))}
            </div>
          )}
        </div>

        {/* Reply detail */}
        <div className="card">
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
                  <strong>企業名:</strong> {selectedReply.company_name}
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
              <div style={{ padding: '15px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', lineHeight: '1.6', color: '#374151', minHeight: '150px' }}>
                {replyBodyPreview(selectedReply) || '(本文なし)'}
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
