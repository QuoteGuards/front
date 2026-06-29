import './Card.css'

const Card = ({ children, className = '', style }) => (
  <div className={['card', className].filter(Boolean).join(' ')} style={style}>
    {children}
  </div>
)

export default Card
