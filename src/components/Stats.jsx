import { useEffect, useRef, useState } from 'react'
import styles from './Stats.module.css'

const STATS = [
  { value: 1000, suffix: '+', label: 'Students Trained' },
  { value: 10, suffix: '+', label: 'Years Experience' },
  { value: 10, suffix: '+', label: 'Courses Offered' },
  { value: 4, suffix: ' Age Groups', label: 'Served' },
]

function Counter({ target, suffix, active }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return
    let start = 0
    const step = Math.ceil(target / 60)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(start)
    }, 25)
    return () => clearInterval(timer)
  }, [active, target])

  return <span>{count}{suffix}</span>
}

export default function Stats() {
  const ref = useRef(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true) },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className={styles.stats} ref={ref}>
      <div className={styles.inner}>
        {STATS.map(s => (
          <div key={s.label} className={styles.stat}>
            <div className={styles.number}>
              <Counter target={s.value} suffix={s.suffix} active={active} />
            </div>
            <div className={styles.label}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
