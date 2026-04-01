import { useState, useEffect } from 'react'
import axios from 'axios'
import { MdEmail, MdEdit, MdDelete, MdAdd, MdContentCopy } from 'react-icons/md'

function Templates() {
  const [templates, setTemplates] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: ''
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('/api/templates')
      setTemplates(response.data)
    } catch (error) {
      console.error('テンプレート取得エラー:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await axios.put(`/api/templates/${editingId}`, formData)
        alert('更新しました')
      } else {
        await axios.post('/api/templates', formData)
        alert('作成しました')
      }
      setShowModal(false)
      resetForm()
      fetchTemplates()
    } catch (error) {
      console.error('保存エラー:', error)
      alert('保存に失敗しました')
    }
  }

  const handleEdit = (template) => {
    setEditingId(template.id)
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('このテンプレートを削除しますか？')) {
      return
    }
    try {
      await axios.delete(`/api/templates/${id}`)
      fetchTemplates()
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      body: ''
    })
    setEditingId(null)
  }

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}} className="animate-fade-in-down">
        <h2 style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <MdEmail size={28} /> メールテンプレート
        </h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <MdAdd size={20} /> 新規作成
        </button>
      </div>

      <div className="card animate-fade-in-up" style={{marginBottom: '20px', background: '#e8f5e9', padding: '15px', borderLeft: '4px solid #4caf50'}}>
        <p style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
          <MdContentCopy size={18} />
          テンプレート内で <code style={{background: '#fff', padding: '2px 6px', borderRadius: '3px'}}>{'{{company_name}}'}</code> を使用すると、会社名が自動で差し込まれます。
        </p>
      </div>

      <div className="card animate-slide-in-up delay-100">
        {templates.map((template, index) => (
          <div key={template.id} className="card hover-tilt" style={{marginBottom: '15px', position: 'relative'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
              <div style={{flex: 1}}>
                <h3 style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#667eea'}}>
                  <MdEmail size={22} /> {template.name}
                </h3>
                <div style={{marginTop: '15px'}}>
                  <strong style={{color: '#666'}}>件名:</strong>
                  <div style={{marginTop: '5px', padding: '10px', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #e0e0e0'}}>
                    {template.subject}
                  </div>
                </div>
                <div style={{marginTop: '15px'}}>
                  <strong style={{color: '#666'}}>本文:</strong>
                  <pre style={{whiteSpace: 'pre-wrap', marginTop: '5px', background: '#f8f9fa', padding: '15px', borderRadius: '4px', border: '1px solid #e0e0e0', fontSize: '14px', lineHeight: '1.6'}}>
                    {template.body}
                  </pre>
                </div>
                <div style={{marginTop: '10px', fontSize: '12px', color: '#999'}}>
                  作成日: {new Date(template.created_at).toLocaleDateString('ja-JP')}
                </div>
              </div>
              <div style={{display: 'flex', gap: '8px', marginLeft: '15px'}}>
                <button
                  onClick={() => handleEdit(template)}
                  style={{
                    padding: '8px 12px',
                    background: '#2196f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '14px'
                  }}
                >
                  <MdEdit size={16} /> 編集
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  style={{
                    padding: '8px 12px',
                    background: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '14px'
                  }}
                >
                  <MdDelete size={16} /> 削除
                </button>
              </div>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <p style={{textAlign: 'center', color: '#999', padding: '40px'}}>
            テンプレートがありません。新規作成してください。
          </p>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'テンプレート編集' : 'テンプレート作成'}</h2>
              <button className="close-btn" onClick={() => {
                setShowModal(false)
                resetForm()
              }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>テンプレート名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="例: 初回営業メール"
                  required
                />
              </div>
              <div className="form-group">
                <label>件名 *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="例: {{company_name}}様へのご提案"
                  required
                />
              </div>
              <div className="form-group">
                <label>本文 *</label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({...formData, body: e.target.value})}
                  placeholder="例:&#10;{{company_name}}様&#10;&#10;お世話になっております。&#10;&#10;弊社のサービスについてご案内させていただきたく、ご連絡いたしました。&#10;&#10;よろしくお願いいたします。"
                  rows="12"
                  required
                  style={{fontFamily: 'inherit', fontSize: '14px'}}
                />
              </div>
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" className="btn btn-primary" style={{flex: 1}}>
                  {editingId ? '更新' : '作成'}
                </button>
                <button type="button" className="btn" onClick={() => {
                  setShowModal(false)
                  resetForm()
                }} style={{flex: 1, background: '#999'}}>
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Templates
