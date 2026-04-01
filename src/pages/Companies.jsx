import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { 
  MdBusiness, MdSearch, MdFilterList, MdRefresh,
  MdEmail, MdLanguage, MdDescription, MdCheckCircle,
  MdPending, MdInfo, MdArrowForward, MdAutorenew
} from 'react-icons/md'
import DataLoadingLayer from '../components/DataLoadingLayer'
import { DEFAULT_SUBJECT, DEFAULT_BODY } from '../emailBulkDefaults'

function Companies() {
  const [companies, setCompanies] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedCompanies, setSelectedCompanies] = useState([])
  const [scrapeKeywords, setScrapeKeywords] = useState('')
  const [scrapeLoading, setScrapeLoading] = useState(false)
  const [scrapeResult, setScrapeResult] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const location = useLocation()

  useEffect(() => {
    fetchCompanies(false)
    const interval = setInterval(() => fetchCompanies(true), 5000)
    return () => clearInterval(interval)
  }, [filterStatus, location.pathname])

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when search/filter changes
  }, [searchTerm, filterStatus])

  const fetchCompanies = async (silentPoll = false) => {
    try {
      if (!silentPoll) {
        setLoading(true)
        setLoadError(null)
      }
      const url = filterStatus ? `/api/companies?status=${encodeURIComponent(filterStatus)}` : '/api/companies'
      const response = await axios.get(url)
      setCompanies(response.data)
      if (!silentPoll) setSelectedCompanies([])
    } catch (error) {
      console.error('企業取得エラー:', error)
      if (!silentPoll) {
        const msg =
          error.response?.data?.detail ||
          error.message ||
          '企業データを API から取得できませんでした。'
        setLoadError(typeof msg === 'string' ? msg : '取得に失敗しました')
      }
    } finally {
      if (!silentPoll) setLoading(false)
    }
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCompanies(currentCompanies.map(c => c.id))
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
      fetchCompanies(false)
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  const handleScrape = async () => {
    const keywords = scrapeKeywords.split('\n').map(k => k.trim()).filter(k => k)
    if (keywords.length === 0) {
      alert('キーワードを入力してください')
      return
    }
    setScrapeLoading(true)
    setScrapeResult(null)
    setUploadResult(null)
    try {
      // Step 1: Scrape and save to CSV
      const scrapeRes = await axios.post('/api/scrape', { keywords, results_per_keyword: 20 })
      setScrapeResult(scrapeRes.data)
      fetchCompanies(false)

      // Step 2: Auto-upload CSV to PostgreSQL
      if (scrapeRes.data && !scrapeRes.data.error) {
        setUploadLoading(true)
        try {
          const uploadRes = await axios.post('/api/upload-csv')
          setUploadResult(uploadRes.data)
        } catch (uploadErr) {
          setUploadResult({ error: uploadErr.response?.data?.detail || 'DBアップロードに失敗しました' })
        } finally {
          setUploadLoading(false)
        }
      }
    } catch (error) {
      setScrapeResult({ error: error.response?.data?.detail || 'スクレイピングに失敗しました' })
    } finally {
      setScrapeLoading(false)
    }
  }

  const handleUpload = async () => {
    setUploadLoading(true)
    setUploadResult(null)
    try {
      const response = await axios.post('/api/upload-csv')
      setUploadResult(response.data)
    } catch (error) {
      setUploadResult({ error: error.response?.data?.detail || 'アップロードに失敗しました' })
    } finally {
      setUploadLoading(false)
    }
  }

  
  const getStatusClass = (status) => {
    switch(status) {
      case '新規': return 'status-new'
      case 'メール送信済み': return 'status-sent'
      case 'フォーム送信済み': return 'status-sent'
      case '返信あり': return 'status-replied'
      default: return 'status-new'
    }
  }

  const filteredCompanies = companies.filter(company => 
    company.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.email && company.email.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Pagination logic
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCompanies = filteredCompanies.slice(startIndex, endIndex)

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
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
          <MdBusiness size={28} /> 企業リスト（自動収集）
        </h2>
        <div style={{fontSize: '14px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <MdRefresh size={18} className="rotating" /> 自動更新中
        </div>
      </div>

      <div className="card hover-rotate-lift animate-fade-in-left delay-100" style={{marginBottom: '20px'}}>
        <div style={{display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap'}}>
          <div style={{flex: 1, minWidth: '200px', position: 'relative'}}>
            <MdSearch size={20} className="icon-hover-spin" style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999'}} />
            <input
              type="text"
              placeholder="企業名・メールで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{width: '100%', padding: '10px 10px 10px 40px', borderRadius: '4px', border: '1px solid #ddd'}}
            />
          </div>
          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <MdFilterList size={20} style={{color: '#666'}} />
            <label>ステータス:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{padding: '10px', borderRadius: '4px', border: '1px solid #ddd'}}
            >
              <option value="">すべて</option>
              <option value="新規">新規</option>
              <option value="メール送信済み">メール送信済み</option>
              <option value="フォーム送信済み">フォーム送信済み</option>
              <option value="返信あり">返信あり</option>
            </select>
          </div>
          <div style={{padding: '10px 20px', background: '#667eea', color: 'white', borderRadius: '4px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <MdBusiness size={18} />
            {filteredCompanies.length}件
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <label style={{fontSize: '14px'}}>表示件数:</label>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              style={{padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '14px'}}
            >
              <option value={5}>5件</option>
              <option value={10}>10件</option>
              <option value={20}>20件</option>
              <option value={50}>50件</option>
              <option value={100}>100件</option>
            </select>
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

      <div className="card hover-tilt animate-slide-in-up delay-200">
        {/* Pagination Info */}
        <div style={{marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f5f5f5', borderRadius: '5px'}}>
          <div style={{fontSize: '14px', color: '#666'}}>
            {filteredCompanies.length > 0 ? (
              <>
                {startIndex + 1} - {Math.min(endIndex, filteredCompanies.length)} 件目を表示 (全 {filteredCompanies.length} 件)
              </>
            ) : (
              '0 件'
            )}
          </div>
          <div style={{fontSize: '14px', color: '#666'}}>
            ページ {currentPage} / {totalPages || 1}
          </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr style={{ whiteSpace: 'nowrap' }}>
              <th style={{width: '40px'}}>
                <input
                  type="checkbox"
                  checked={selectedCompanies.length === currentCompanies.length && currentCompanies.length > 0}
                  onChange={handleSelectAll}
                  style={{cursor: 'pointer', width: '18px', height: '18px'}}
                />
              </th>
              <th>ID</th>
              <th>会社名</th>
              <th>メール</th>
              <th>電話</th>
              <th>Webサイト</th>
              <th>フォームURL</th>
              <th>住所</th>
              <th>ステータス</th>
              <th>メール送信状態</th>
              <th>登録日</th>
            </tr>
          </thead>
          <tbody>
            {currentCompanies.length > 0 ? (
              currentCompanies.map((company, index) => (
                <tr key={company.id} style={{background: selectedCompanies.includes(company.id) ? '#f0f8ff' : 'transparent'}}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => handleSelectOne(company.id)}
                      style={{cursor: 'pointer', width: '18px', height: '18px'}}
                    />
                  </td>
                  <td>{startIndex + index + 1}</td>
                  <td style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <MdBusiness size={16} style={{color: '#667eea'}} />
                    <strong>{company.company_name}</strong>
                  </td>
                  <td>
                    {company.email ? (
                      <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <MdEmail size={16} style={{color: '#43e97b'}} />
                        {company.email}
                      </span>
                    ) : (
                      <span style={{color: '#999'}}>-</span>
                    )}
                  </td>
                  <td>
                    {company.phone ? (
                      <span style={{fontSize: '14px'}}>{company.phone}</span>
                    ) : (
                      <span style={{color: '#999'}}>-</span>
                    )}
                  </td>
                  <td>
                    {company.website ? (
                      <a href={company.website} target="_blank" rel="noopener noreferrer" style={{color: '#667eea', display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <MdLanguage size={16} /> 開く
                      </a>
                    ) : (
                      <span style={{color: '#999'}}>-</span>
                    )}
                  </td>
                  <td>
                    {company.form_url ? (
                      <a href={company.form_url} target="_blank" rel="noopener noreferrer" style={{color: '#667eea', display: 'flex', alignItems: 'center', gap: '5px'}}>
                        <MdDescription size={16} /> フォーム
                      </a>
                    ) : (
                      <span style={{color: '#999'}}>-</span>
                    )}
                  </td>
                  <td style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px'}}>
                    {company.address || <span style={{color: '#999'}}>-</span>}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(company.status)}`}>
                      {company.status}
                    </span>
                  </td>
                  <td>
                    {company.email_status ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        background: company.email_status === '送信成功' ? '#d4edda' : 
                                   company.email_status === '送信失敗' ? '#f8d7da' : '#e2e8f0',
                        color: company.email_status === '送信成功' ? '#155724' : 
                               company.email_status === '送信失敗' ? '#721c24' : '#64748b'
                      }}>
                        {company.email_status === '送信成功' && <MdCheckCircle size={16} />}
                        {company.email_status === '送信失敗' && '❌'}
                        {company.email_status}
                      </span>
                    ) : (
                      <span style={{color: '#999', fontSize: '13px'}}>未送信</span>
                    )}
                  </td>
                  <td>{company.created_at ? new Date(company.created_at).toLocaleDateString('ja-JP') : '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                  {searchTerm ? '検索結果がありません' : '企業データがありません。自動収集を待つか、scraper.pyを実行してください。'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination Controls */}
        {filteredCompanies.length > 0 && totalPages > 1 && (
          <div style={{marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}}>
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: currentPage === 1 ? '#f5f5f5' : 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              ≪ 最初
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: currentPage === 1 ? '#f5f5f5' : 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              ‹ 前へ
            </button>
            
            {/* Page numbers */}
            <div style={{display: 'flex', gap: '5px'}}>
              {[...Array(totalPages)].map((_, index) => {
                const pageNum = index + 1
                // Show first page, last page, current page, and pages around current
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        background: currentPage === pageNum ? '#667eea' : 'white',
                        color: currentPage === pageNum ? 'white' : '#333',
                        cursor: 'pointer',
                        fontWeight: currentPage === pageNum ? 'bold' : 'normal',
                        fontSize: '14px',
                        minWidth: '40px'
                      }}
                    >
                      {pageNum}
                    </button>
                  )
                } else if (
                  pageNum === currentPage - 3 ||
                  pageNum === currentPage + 3
                ) {
                  return <span key={pageNum} style={{padding: '8px 4px'}}>...</span>
                }
                return null
              })}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: currentPage === totalPages ? '#f5f5f5' : 'white',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              次へ ›
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: currentPage === totalPages ? '#f5f5f5' : 'white',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              最後 ≫
            </button>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  )
}

export default Companies
