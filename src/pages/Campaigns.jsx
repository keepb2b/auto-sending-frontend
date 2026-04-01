import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { 
  MdEmail, MdSchedule, MdCheckCircle, 
  MdPending, MdRefresh, MdFilterList,
  MdBusiness, MdDrafts
} from 'react-icons/md'
import DataLoadingLayer from '../components/DataLoadingLayer'

function Campaigns() {
  const [companies, setCompanies] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedCompanies, setSelectedCompanies] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const location = useLocation()

  useEffect(() => {
    fetchData(false)
    const interval = setInterval(() => fetchData(true), 30000)
    return () => clearInterval(interval)
  }, [location.pathname])

  const fetchData = async (silentPoll = false) => {
    try {
      if (!silentPoll) {
        setLoading(true)
        setLoadError(null)
      }
      const response = await axios.get('/api/companies')
      setCompanies(response.data)
      if (!silentPoll) setSelectedCompanies([])
    } catch (error) {
      console.error('データ取得エラー:', error)
      if (!silentPoll) {
        const msg =
          error.response?.data?.detail ||
          error.message ||
          '送信履歴用の企業データを API から取得できませんでした。'
        setLoadError(typeof msg === 'string' ? msg : '取得に失敗しました')
      }
    } finally {
      if (!silentPoll) setLoading(false)
    }
  }

  const getStatusClass = (status) => {
    switch(status) {
      case '送信成功': return 'status-sent'
      case '送信失敗': return 'status-new'
      case 'メール送信済み': return 'status-sent'
      default: return 'status-new'
    }
  }

  // Filter companies that have email addresses
  const companiesWithEmail = companies.filter(c => c.email && c.email !== '')
  
  const filteredCompanies = filterStatus 
    ? companiesWithEmail.filter(c => c.email_status === filterStatus)
    : companiesWithEmail

  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage)
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const stats = {
    total: companiesWithEmail.length,
    success: companiesWithEmail.filter(c => c.email_status === '送信成功').length,
    failed: companiesWithEmail.filter(c => c.email_status === '送信失敗').length,
    pending: companiesWithEmail.filter(c => !c.email_status || c.email_status === '').length
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCompanies(filteredCompanies.map(c => c.id))
    } else {
      setSelectedCompanies([])
    }
  }

  const handleSelectOne = (id) => {
    if (selectedCompanies.includes(id)) {
      setSelectedCompanies(selectedCompanies.filter(cid => cid !== id))
    } else {
      setSelectedCompanies([...selectedCompanies, id])
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedCompanies.length === 0) {
      alert('削除する企業を選択してください')
      return
    }

    if (!window.confirm(`${selectedCompanies.length}件の企業を削除しますか？`)) {
      return
    }

    try {
      for (const id of selectedCompanies) {
        await axios.delete(`/api/companies/${id}`)
      }
      fetchData(false)
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    }
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
      <div
        className={`page-data-shell${
          loading && companies.length === 0 ? ' page-data-shell--busy' : ''
        }`}
      >
        {loading && companies.length === 0 && <DataLoadingLayer />}
        <div
          className={
            loading && companies.length === 0
              ? 'page-data-shell__content page-data-shell__content--behind'
              : 'page-data-shell__content'
          }
        >
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}} className="animate-fade-in-down">
        <h2 style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <MdEmail size={28} /> 送信履歴（自動送信）
        </h2>
        <div style={{fontSize: '14px', color: '#666', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
          <MdRefresh size={18} className="rotating" /> 自動更新中
        </div>
      </div>

      <div className="stats" style={{marginBottom: '20px'}}>
        <div className="stat-card hover-lift animate-rotate-in delay-100" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
            <MdEmail size={24} style={{opacity: 0.95}} />
            <h3 style={{color: 'rgba(255,255,255,0.95)', fontSize: '14px'}}>総メール数</h3>
          </div>
          <div className="number" style={{color: 'white'}}>{stats.total}</div>
          <div style={{fontSize: '12px', marginTop: '10px', opacity: 0.9}}>
            メールアドレス保有企業
          </div>
        </div>
        <div className="stat-card hover-lift animate-rotate-in delay-200" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
            <MdCheckCircle size={24} style={{opacity: 0.95}} />
            <h3 style={{color: 'rgba(255,255,255,0.95)', fontSize: '14px'}}>送信成功</h3>
          </div>
          <div className="number" style={{color: 'white'}}>{stats.success}</div>
          <div style={{fontSize: '12px', marginTop: '10px', opacity: 0.9}}>
            成功率: {stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="stat-card hover-lift animate-rotate-in delay-300" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
            <MdPending size={24} style={{opacity: 0.95}} />
            <h3 style={{color: 'rgba(255,255,255,0.95)', fontSize: '14px'}}>送信失敗</h3>
          </div>
          <div className="number" style={{color: 'white'}}>{stats.failed}</div>
          <div style={{fontSize: '12px', marginTop: '10px', opacity: 0.9}}>
            失敗率: {stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="stat-card hover-lift animate-rotate-in delay-400" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
            <MdSchedule size={24} style={{opacity: 0.95}} />
            <h3 style={{color: 'rgba(255,255,255,0.95)', fontSize: '14px'}}>未送信</h3>
          </div>
          <div className="number" style={{color: 'white'}}>{stats.pending}</div>
          <div style={{fontSize: '12px', marginTop: '10px', opacity: 0.9}}>
            送信待ち
          </div>
        </div>
      </div>

      <div className="card hover-flip animate-fade-in-left delay-500" style={{marginBottom: '20px'}}>
        <div style={{display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <MdFilterList size={20} className="icon-hover-bounce" style={{color: '#666'}} />
            <label>メール送信状態:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
              style={{padding: '10px', borderRadius: '4px', border: '1px solid #ddd'}}
            >
              <option value="">すべて</option>
              <option value="送信成功">送信成功</option>
              <option value="送信失敗">送信失敗</option>
              <option value="">未送信</option>
            </select>
          </div>
          <div style={{marginLeft: 'auto', padding: '10px 20px', background: '#667eea', color: 'white', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <MdDrafts size={18} />
            {filteredCompanies.length}件
          </div>
          {selectedCompanies.length > 0 && (
            <button
              onClick={handleDeleteSelected}
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
                gap: '8px'
              }}
            >
              🗑️ 選択削除 ({selectedCompanies.length})
            </button>
          )}
        </div>
      </div>

      <div className="card hover-neon animate-slide-in-up delay-600">
        {/* Pagination - above table */}
        {totalPages > 1 && (
          <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', padding: '10px 0 12px 0'}}>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}
              style={{padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569', cursor: 'pointer', marginRight: '8px'}}
            >
              <option value={10}>10件/ページ</option>
              <option value={20}>20件/ページ</option>
              <option value={50}>50件/ページ</option>
              <option value={100}>100件/ページ</option>
            </select>
            <span style={{fontSize: '13px', color: '#64748b', marginRight: '8px'}}>
              {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredCompanies.length)} / {filteredCompanies.length}件
            </span>
            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
              style={{width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', background: currentPage === 1 ? '#f8fafc' : 'white', color: currentPage === 1 ? '#cbd5e1' : '#475569', fontSize: '13px'}}
            >&#171;</button>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              style={{width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', background: currentPage === 1 ? '#f8fafc' : 'white', color: currentPage === 1 ? '#cbd5e1' : '#475569', fontSize: '13px'}}
            >&#8249;</button>
            {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
              const page = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i
              return (
                <button key={page} onClick={() => setCurrentPage(page)}
                  style={{width: '32px', height: '32px', borderRadius: '6px', border: currentPage === page ? 'none' : '1px solid #e2e8f0', cursor: 'pointer', background: currentPage === page ? '#667eea' : 'white', color: currentPage === page ? 'white' : '#475569', fontWeight: currentPage === page ? '700' : '400', fontSize: '13px'}}
                >{page}</button>
              )
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              style={{width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', background: currentPage === totalPages ? '#f8fafc' : 'white', color: currentPage === totalPages ? '#cbd5e1' : '#475569', fontSize: '13px'}}
            >&#8250;</button>
            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
              style={{width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', background: currentPage === totalPages ? '#f8fafc' : 'white', color: currentPage === totalPages ? '#cbd5e1' : '#475569', fontSize: '13px'}}
            >&#187;</button>
          </div>
        )}

        <table className="table">
          <thead>
            <tr>
              <th style={{width: '40px'}}>
                <input
                  type="checkbox"
                  checked={selectedCompanies.length === filteredCompanies.length && filteredCompanies.length > 0}
                  onChange={handleSelectAll}
                  style={{cursor: 'pointer', width: '18px', height: '18px'}}
                />
              </th>
              <th>ID</th>
              <th>企業名</th>
              <th>メールアドレス</th>
              <th>ステータス</th>
              <th>メール送信状態</th>
              <th>送信日時</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompanies.length === 0 ? (
              <tr>
                <td colSpan="7" style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                  送信履歴がありません。自動送信を待つか、キャンペーンを作成してください。
                </td>
              </tr>
            ) : paginatedCompanies.map((company, index) => (
                <tr key={company.id} style={{background: selectedCompanies.includes(company.id) ? '#f0f8ff' : 'transparent'}}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => handleSelectOne(company.id)}
                      style={{cursor: 'pointer', width: '18px', height: '18px'}}
                    />
                  </td>
                  <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <MdBusiness size={16} style={{color: '#667eea'}} />
                    <strong>{company.company_name}</strong>
                  </td>
                  <td>
                    <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                      <MdEmail size={16} style={{color: '#43e97b'}} />
                      {company.email}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(company.status)}`}>
                      {company.status}
                    </span>
                  </td>
                  <td>
                    {company.email_status === '送信成功' ? (
                      <span style={{display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '500', background: '#d4edda', color: '#155724'}}>
                        <MdCheckCircle size={16} /> 送信成功
                      </span>
                    ) : company.email_status === '送信失敗' ? (
                      <span style={{display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: '500', background: '#f8d7da', color: '#721c24'}}>
                        <MdPending size={16} /> 送信失敗
                      </span>
                    ) : (
                      <span style={{color: '#999', fontSize: '13px'}}>未送信</span>
                    )}
                  </td>
                  <td>
                    {company.last_contact ? (
                      <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <MdSchedule size={16} />
                        {new Date(company.last_contact).toLocaleString('ja-JP')}
                      </span>
                    ) : (
                      <span style={{color: '#999'}}>-</span>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>

        {/* Pagination */}
      </div>
        </div>
      </div>
    </div>
  )
}

export default Campaigns
