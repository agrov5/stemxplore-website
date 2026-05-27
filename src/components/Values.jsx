import { Lightbulb, BookOpen, Shield, Globe, Smile, Users } from 'lucide-react'
import styles from './Values.module.css'

const VALUES = [
  { icon: <Lightbulb size={24} />, title: 'Innovation', desc: 'Creative problem-solving for real-world challenges through applied STEM.', color: '#f9c929' },
  { icon: <BookOpen size={24} />, title: 'Education', desc: 'Interactive, foundational STEM instruction that builds lasting knowledge.', color: '#1a5fa8' },
  { icon: <Shield size={24} />, title: 'Empowerment', desc: 'Building confidence and skills so every student believes they can succeed.', color: '#10B981' },
  { icon: <Globe size={24} />, title: 'Community', desc: 'An inclusive, supportive environment where every learner belongs and thrives.', color: '#2d7ed4' },
  { icon: <Smile size={24} />, title: 'Fun', desc: 'Making learning genuinely enjoyable and memorable for children of all ages.', color: '#c0155a' },
  { icon: <Users size={24} />, title: 'Collaboration', desc: 'Leveraging collective creativity to build skills and achieve shared goals.', color: '#10B981' },
]

export default function Values() {
  return (
    <section id="values" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Core Values</p>
          <h2 className={styles.heading}>The Principles That Drive Us</h2>
          <p className={styles.sub}>
            Six values shape everything we do — from how we design curriculum to how we welcome every student through the door.
          </p>
        </div>

        <div className={styles.grid}>
          {VALUES.map(v => (
            <div key={v.title} className={styles.item} style={{ '--c': v.color }}>
              <div className={styles.icon}>{v.icon}</div>
              <h3 className={styles.title}>{v.title}</h3>
              <p className={styles.desc}>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
