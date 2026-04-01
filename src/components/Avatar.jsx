import { MdPerson } from 'react-icons/md'

function Avatar({ name, size = 40, color = '#3b82f6' }) {
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: size * 0.4,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      border: '2px solid white'
    }}>
      {name ? initial : <MdPerson size={size * 0.6} />}
    </div>
  )
}

function adjustColor(color, amount) {
  return '#' + color.replace(/^#/, '').replace(/../g, color => 
    ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
  )
}

export default Avatar
