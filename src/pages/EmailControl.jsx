import { useState, useMemo } from 'react'
import axios from 'axios'
import { MdEmail, MdSend, MdAutorenew, MdAdd, MdClose } from 'react-icons/md'
import { DEFAULT_SUBJECT, DEFAULT_BODY } from '../emailBulkDefaults'

/** テンプレート変数。プレビュー用。送信時は {{company_name}} を DB の企業ごとに差し替え（{{service_name}}{{user_name}} は API で渡した値）。 */
function applyTemplate(text, v) {
  if (!text) return ''
  const c = v.company_name ?? ''
  const s = v.service_name ?? ''
  const u = v.user_name ?? ''
  return text
    .replace(/\{\{company_name\}\}/g, c)
    .replace(/\{\{service_name\}\}/g, s)
    .replace(/\{\{user_name\}\}/g, u)
    .replace(/【会社名】/g, c)
    .replace(/【サービス名】/g, s)
    .replace(/◯◯/g, u)
}

function extractTemplate(display, v) {
  let t = display
  const pairs = [
    ['company_name', v.company_name],
    ['service_name', v.service_name],
    ['user_name', v.user_name],
  ].filter(([, val]) => typeof val === 'string' && val.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
  for (const [key, val] of pairs) {
    t = t.split(val).join(`{{${key}}}`)
  }
  return t
}

/** プレビュー専用（入力なし）。送信時は DB の各企業の company_name などに置き換わる */
const PREVIEW_COMPANY_HINT = '（送信時：DBの会社名）'

function EmailControl() {
  const [sendLoading, setSendLoading] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  const [serviceName, setServiceName] = useState('')
  const [userName, setUserName] = useState('')
  const [tmplSubjectTemplate, setTmplSubjectTemplate] = useState(DEFAULT_SUBJECT)
  const [tmplBodyTemplate, setTmplBodyTemplate] = useState(DEFAULT_BODY)

  const [showModal, setShowModal] = useState(false)

  const previewVars = useMemo(
    () => ({
      company_name: PREVIEW_COMPANY_HINT,
      service_name: serviceName,
      user_name: userName,
    }),
    [serviceName, userName]
  )
  const previewSubject = useMemo(
    () => applyTemplate(tmplSubjectTemplate, previewVars),
    [tmplSubjectTemplate, previewVars]
  )
  const previewBody = useMemo(
    () => applyTemplate(tmplBodyTemplate, previewVars),
    [tmplBodyTemplate, previewVars]
  )

  const handleSendNow = async () => {
    const subject = (tmplSubjectTemplate || '').trim()
    const body = (tmplBodyTemplate || '').trim()
    if (!subject || !body) {
      setSendResult({ error: '件名と本文を入力してください（変数は {{company_name}} など）。' })
      return
    }
    if (
      !window.confirm(
        'データベースから対象企業を取得し、企業数ぶんループして、各社のメールアドレスへこのテンプレート（変数を企業ごとに差し替え）を SMTP で1件ずつ送信します。よろしいですか？'
      )
    )
      return
    setSendLoading(true)
    setSendResult(null)
    try {
      const res = await axios.post('/api/send-emails-bulk', {
        target_status: '新規',
        subject,
        body,
        service_name: serviceName,
        user_name: userName,
      })
      setSendResult(res.data)
    } catch (err) {
      setSendResult({ error: err.response?.data?.detail || '送信に失敗しました' })
    } finally {
      setSendLoading(false)
    }
  }

  const inputStyle = { padding: '9px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px', width: '100%' }
  const labelStyle = { display: 'block', fontSize: '13px', color: '#555', marginBottom: '5px', fontWeight: '500' }
  const previewReadonly = { ...inputStyle, background: '#f8fafc', color: '#334155' }

  return (
    <div>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }} className="animate-fade-in-down">
        <MdEmail size={28} /> メール送信コントロール
      </h2>

      <div className="card animate-fade-in-left delay-100" style={{ marginBottom: '20px', borderLeft: '4px solid #f59e0b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <MdSend size={20} /> 今すぐ送信
          </h3>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <MdAdd size={16} /> 件名・本文を編集
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>件名プレビュー</label>
          <input readOnly value={previewSubject} style={previewReadonly} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>本文プレビュー</label>
          <textarea readOnly value={previewBody} rows={10} style={{ ...previewReadonly, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={handleSendNow}
            disabled={sendLoading}
            style={{
              padding: '10px 28px',
              background: sendLoading ? '#aaa' : '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: sendLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            {sendLoading ? (
              <>
                <MdAutorenew size={18} className="rotating" /> 送信中…
              </>
            ) : (
              <>
                <MdEmail size={18} /> 今すぐ一括送信
              </>
            )}
          </button>
        </div>
        {sendResult && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 16px',
              borderRadius: '4px',
              background: sendResult.error ? '#ffeaea' : '#eaffea',
              color: sendResult.error ? '#c0392b' : '#27ae60',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {sendResult.error
              ? `❌ ${sendResult.error}`
              : sendResult.total != null
                ? `✅ DBから対象 ${sendResult.total}社：送信成功 ${sendResult.sent} / 失敗 ${sendResult.failed}${sendResult.via ? `（${sendResult.via}）` : ''}`
                : `✅ ${sendResult.sent}件送信完了 / ${sendResult.failed}件失敗${sendResult.via ? `（${sendResult.via}）` : ''}`}
          </div>
        )}
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <MdEmail size={20} /> 件名・本文（変数付き）
              </h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                <MdClose size={24} />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>サービス名</label>
                  <input
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    style={inputStyle}
                    placeholder="例:"
                  />
                </div>
                <div>
                  <label style={labelStyle}>ユーザー名</label>
                  <input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    style={inputStyle}
                    placeholder="例: 田中"
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>件名（変数可）</label>
                <input
                  value={previewSubject}
                  onChange={(e) => setTmplSubjectTemplate(extractTemplate(e.target.value, previewVars))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>本文（変数可）</label>
                <textarea
                  value={previewBody}
                  onChange={(e) => setTmplBodyTemplate(extractTemplate(e.target.value, previewVars))}
                  rows={16}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailControl
