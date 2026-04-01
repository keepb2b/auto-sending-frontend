import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { 
  MdBusiness, MdEmail, MdCheckCircle, MdPending, 
  MdSchedule, MdSend,
  MdLightbulb,
  MdCampaign, MdBarChart
} from 'react-icons/md'
import { FaChartLine } from 'react-icons/fa'
import DataLoadingLayer from '../components/DataLoadingLayer'

function Dashboard() {
  const [stats, setStats] = useState({
    total: 0, new: 0, sent: 0, replied: 0, formSent: 0
  })
  const [campaigns, setCampaigns] = useState([])
  const [recentCompanies, setRecentCompanies] = useState([])
  const [templates, setTemplates] = useState([])
  // Email control state
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [targetStatus, setTargetStatus] = useState('新規')
  const [sendLoading, setSendLoading] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        await fetchAllData()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  const fetchAllData = async () => {
    const errPart = (label, reason) => {
      const d = reason?.response?.data?.detail
      const msg = typeof d === 'string' ? d : reason?.message || String(reason)
      return `${label}: ${msg}`
    }
    try {
      const settled = await Promise.allSettled([
        axios.get('/api/companies'),
        axios.get('/api/campaigns'),
        axios.get('/api/templates'),
      ])
      const errs = []
      let companies = []
      let campaignsList = []
      let tmpl = []

      if (settled[0].status === 'fulfilled') {
        companies = Array.isArray(settled[0].value.data) ? settled[0].value.data : []
      } else {
        errs.push(errPart('企業', settled[0].reason))
      }
      if (settled[1].status === 'fulfilled') {
        campaignsList = Array.isArray(settled[1].value.data) ? settled[1].value.data : []
      } else {
        errs.push(errPart('キャンペーン', settled[1].reason))
      }
      if (settled[2].status === 'fulfilled') {
        tmpl = Array.isArray(settled[2].value.data) ? settled[2].value.data : []
      } else {
        errs.push(errPart('テンプレート', settled[2].reason))
      }

      setLoadError(errs.length ? errs.join(' / ') : null)
      const emailSent = companies.filter(c => c.email_status === '送信成功' || c.email_status === '送信失敗').length
      
      setStats({
        total: companies.length,
        new: companies.filter(c => c.status === '新規').length,
        sent: emailSent,
        replied: companies.filter(c => c.status === '返信あり').length,
        formSent: companies.filter(c => c.status === 'フォーム送信済み').length
      })

      setCampaigns(campaignsList)
      setTemplates(tmpl)
      if (tmpl.length > 0 && !selectedTemplateId) setSelectedTemplateId(String(tmpl[0].id))

      const sorted = [...companies].sort((a, b) => 
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      )
      setRecentCompanies(sorted.slice(0, 5))
    } catch (error) {
      console.error('データ取得エラー:', error)
      const msg =
        error.response?.data?.detail ||
        error.message ||
        'API からデータを取得できませんでした。バックエンドと Supabase（DATABASE_URL）を確認してください。'
      setLoadError(typeof msg === 'string' ? msg : 'データ取得に失敗しました')
    }
  }

  const handleSendEmails = async () => {
    if (!selectedTemplateId) { alert('テンプレートを選択してください'); return }
    if (!window.confirm(`「${targetStatus}」ステータスの企業にメールを送信しますか？`)) return
    setSendLoading(true)
    setSendResult(null)
    try {
      const t = templates.find((x) => String(x.id) === String(selectedTemplateId))
      const payload = { target_status: targetStatus }
      if (t && String(t.subject || '').trim() && String(t.body || '').trim()) {
        payload.subject = t.subject
        payload.body = t.body
      } else {
        payload.template_id = parseInt(selectedTemplateId, 10)
      }
      const res = await axios.post('/api/send-emails-bulk', payload)
      setSendResult(res.data)
      fetchAllData()
    } catch (err) {
      setSendResult({ error: err.response?.data?.detail || '送信に失敗しました' })
    } finally {
      setSendLoading(false)
    }
  }

  const getConversionRate = () => {
    if (stats.sent === 0) return 0
    return ((stats.replied / stats.sent) * 100).toFixed(1)
  }

  const getPendingCampaigns = () => {
    return campaigns.filter(c => c.status === '送信待ち').length
  }

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
      <div className={`page-data-shell${loading ? ' page-data-shell--busy' : ''}`}>
        {loading && <DataLoadingLayer />}
        <div
          className={
            loading
              ? 'page-data-shell__content page-data-shell__content--behind'
              : 'page-data-shell__content'
          }
        >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}} className="animate-fade-in-down">
        <h2 style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <MdBarChart size={28} /> ダッシュボード
        </h2>
        <div style={{fontSize: '14px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <MdSchedule size={18} />
          {new Date().toLocaleDateString('ja-JP', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'long'
          })}
        </div>
      </div>
      
      <div className="stats">
        <div className="stat-card hover-lift animate-bounce-in delay-100" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
            <MdBusiness size={24} style={{opacity: 0.95}} />
            <h3 style={{color: 'rgba(255,255,255,0.95)', fontSize: '14px'}}>総企業数</h3>
          </div>
          <div className="number" style={{color: 'white'}}>{stats.total}</div>
          <div style={{fontSize: '12px', marginTop: '10px', opacity: 0.9}}>
            登録済み企業
          </div>
        </div>
        <div className="stat-card hover-lift animate-bounce-in delay-200" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
            <MdPending size={24} style={{opacity: 0.95}} />
            <h3 style={{color: 'rgba(255,255,255,0.95)', fontSize: '14px'}}>新規</h3>
          </div>
          <div className="number" style={{color: 'white'}}>{stats.new}</div>
          <div style={{fontSize: '12px', marginTop: '10px', opacity: 0.9}}>
            未アプローチ
          </div>
        </div>
        <div className="stat-card hover-lift animate-bounce-in delay-300" style={{background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: 'white'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
            <MdSend size={24} style={{opacity: 0.95}} />
            <h3 style={{color: 'rgba(255,255,255,0.95)', fontSize: '14px'}}>送信済み</h3>
          </div>
          <div className="number" style={{color: 'white'}}>{stats.sent}</div>
          <div style={{fontSize: '12px', marginTop: '10px', opacity: 0.9}}>
            メール送信完了
          </div>
        </div>
        <div className="stat-card hover-lift animate-bounce-in delay-400" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
            <MdCheckCircle size={24} style={{opacity: 0.95}} />
            <h3 style={{color: 'rgba(255,255,255,0.95)', fontSize: '14px'}}>返信あり</h3>
          </div>
          <div className="number" style={{color: 'white'}}>{stats.replied}</div>
          <div style={{fontSize: '12px', marginTop: '10px', opacity: 0.9}}>
            反応率: {getConversionRate()}%
          </div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
        <div className="card hover-tilt animate-fade-in-left delay-500">
          <h3 style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <MdCampaign size={22} className="icon-hover-spin" /> キャンペーン状況
          </h3>
          <div style={{display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '10px'}}>
            <span>送信待ち</span>
            <strong style={{color: '#f5576c'}}>{getPendingCampaigns()}件</strong>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '10px'}}>
            <span>送信済み</span>
            <strong style={{color: '#43e97b'}}>{campaigns.filter(c => c.status === '送信済み').length}件</strong>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f8f9fa', borderRadius: '8px'}}>
            <span>テンプレート数</span>
            <strong style={{color: '#667eea'}}>{templates.length}件</strong>
          </div>
        </div>

        <div className="card hover-slide-up animate-fade-in-right delay-500">
          <h3 style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <FaChartLine size={20} className="icon-hover-pulse" /> 営業進捗
          </h3>
          <div style={{marginBottom: '15px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
              <span style={{fontSize: '14px'}}>アプローチ率</span>
              <span style={{fontSize: '14px', fontWeight: 'bold'}}>
                {stats.total > 0 ? ((stats.sent + stats.formSent) / stats.total * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div style={{background: '#e0e0e0', height: '10px', borderRadius: '5px', overflow: 'hidden'}}>
              <div style={{
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                height: '100%',
                width: `${stats.total > 0 ? ((stats.sent + stats.formSent) / stats.total * 100) : 0}%`,
                transition: 'width 0.3s'
              }}></div>
            </div>
          </div>
          <div style={{marginBottom: '15px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
              <span style={{fontSize: '14px'}}>返信率</span>
              <span style={{fontSize: '14px', fontWeight: 'bold'}}>
                {getConversionRate()}%
              </span>
            </div>
            <div style={{background: '#e0e0e0', height: '10px', borderRadius: '5px', overflow: 'hidden'}}>
              <div style={{
                background: 'linear-gradient(90deg, #43e97b, #38f9d7)',
                height: '100%',
                width: `${getConversionRate()}%`,
                transition: 'width 0.3s'
              }}></div>
            </div>
          </div>
          <div style={{padding: '10px', background: '#fff3cd', borderRadius: '5px', fontSize: '13px', color: '#856404', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <MdLightbulb size={18} />
            返信率を上げるには、テンプレートの改善とフォローアップが重要です
          </div>
        </div>
      </div>

      <div className="card hover-flip animate-slide-in-up delay-600">
        <h3 style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <MdBusiness size={22} className="icon-hover-bounce" /> 最近追加された企業
        </h3>
        {recentCompanies.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>会社名</th>
                <th>メール</th>
                <th>ステータス</th>
                <th>登録日</th>
              </tr>
            </thead>
            <tbody>
              {recentCompanies.map(company => (
                <tr key={company.id}>
                  <td>{company.company_name}</td>
                  <td>{company.email || '-'}</td>
                  <td>
                    <span className={`status-badge ${
                      company.status === '新規' ? 'status-new' :
                      company.status === 'メール送信済み' ? 'status-sent' :
                      'status-replied'
                    }`}>
                      {company.status}
                    </span>
                  </td>
                  <td>{company.created_at ? new Date(company.created_at).toLocaleDateString('ja-JP') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{textAlign: 'center', color: '#999', padding: '20px'}}>
            企業データがありません
          </p>
        )}
      </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
