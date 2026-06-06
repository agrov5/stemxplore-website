import { useState, useEffect } from 'react'
import styles from './PDDayBanner.module.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

function getDaysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((target - now) / 86400000)
}

export default function PDDayBanner({ onBookClick }) {
  const [nextPD, setNextPD] = useState(null)

  useEffect(() => {
    fetch(`${BACKEND}/api/website/pd-days`)
      .then(r => r.json())
      .then(days => {
        const today = new Date().toISOString().slice(0, 10)
        const relevant = days
          .filter(d => d.date >= today && getDaysUntil(d.date) <= 7)
          .sort((a, b) => a.date.localeCompare(b.date))
        if (relevant.length > 0) setNextPD(relevant[0])
      })
      .catch(() => {})
  }, [])

  if (!nextPD) return null

  const diff = getDaysUntil(nextPD.date)
  const label =
    diff === 0 ? "Today is a PD Day!" :
    diff === 1 ? "PD Day is Tomorrow!" :
    `PD Day in ${diff} Days!`

  const fmt = new Date(nextPD.date + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className={styles.banner}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.badge}>{label}</span>
          <p className={styles.text}>
            <strong>{fmt}</strong> — No school? Make it a STEM day! Book a free demo class now.
          </p>
        </div>
        <a href="#contact" className={styles.cta} onClick={onBookClick}>
          Book a Free Demo Class →
        </a>
      </div>
    </div>
  )
}
