import { useState, useEffect } from 'react'
import styles from './Programs.module.css'
import legoImg from '../assets/lego-rob.webp'
import ev3Img from '../assets/ev3-robot.webp'
import scratchImg from '../assets/scratch-coding.webp'
import quarkyImg from '../assets/quarky-creator.webp'
import aiKidsImg from '../assets/ai-for-kids.webp'
import quarkyInnoImg from '../assets/quarky-innovator.webp'
import appDevImg from '../assets/app-dev.webp'

const FALLBACK_PROGRAMS = [
  {
    img: legoImg,
    badge: 'Beginner · Ages 5+',
    title: 'Lego Robotics',
    desc: 'Build and program LEGO robots in a fun, hands-on environment. Perfect for young learners discovering how engineering and coding work together.',
    highlights: ['LEGO bricks & sensors', 'Block-based programming', '24 hrs · Beginner'],
    color: '#1a5fa8',
  },
  {
    img: ev3Img,
    badge: 'Intermediate · Ages 9+',
    title: 'EV3 Robotics',
    desc: 'Advance to MINDSTORMS EV3 — sensors, motors, and real programming challenges that replicate competition-grade robotics.',
    highlights: ['EV3 MINDSTORMS kits', 'Sensor & motor control', '24 hrs · Intermediate'],
    color: '#c0155a',
  },
  {
    img: scratchImg,
    badge: 'Beginner · Ages 5+',
    title: 'Scratch Coding',
    desc: 'Introduce programming logic through Scratch — drag-and-drop animations, games, and interactive stories that make code click.',
    highlights: ['Visual block coding', 'Games & animations', '24 hrs · Beginner'],
    color: '#f9c929',
  },
  {
    img: quarkyImg,
    badge: 'Beginner · Ages 5+',
    title: 'Quarky Creator',
    desc: 'Use the Quarky microcontroller to design circuits, write code, and build creative projects with LEDs, buzzers, and sensors.',
    highlights: ['Quarky microcontroller', 'Physical computing', '24 hrs · Beginner'],
    color: '#10B981',
  },
  {
    img: aiKidsImg,
    badge: 'Intermediate · Ages 9+',
    title: 'AI for Kids',
    desc: 'Demystify artificial intelligence — students train ML models, explore computer vision, and build AI-powered projects.',
    highlights: ['Machine learning basics', 'Image recognition', '24 hrs · Intermediate'],
    color: '#1a5fa8',
  },
  {
    img: quarkyInnoImg,
    badge: 'Beginner · Ages 5+',
    title: 'Quarky Innovator',
    desc: 'The next step after Creator — tackle more complex Quarky challenges involving automation, IoT concepts, and innovation sprints.',
    highlights: ['Advanced Quarky projects', 'Automation & IoT', '24 hrs · Beginner'],
    color: '#c0155a',
  },
  {
    img: appDevImg,
    badge: 'Intermediate · Ages 9+',
    title: 'App Development',
    desc: 'Design and build real mobile applications. Students learn UI/UX principles, logic flows, and publish working apps.',
    highlights: ['Mobile app design', 'UI/UX fundamentals', '24 hrs · Intermediate'],
    color: '#f9c929',
  },
]

function normalizePrograms(data) {
  return data.map(p => ({
    img: p.image_url || null,
    badge: p.badge || '',
    title: p.title,
    desc: p.description || '',
    highlights: Array.isArray(p.highlights) ? p.highlights : [],
    color: p.color || '#1a5fa8',
  }))
}

export default function Programs() {
  const [programs, setPrograms] = useState(FALLBACK_PROGRAMS)
  const [count, setCount] = useState(FALLBACK_PROGRAMS.length)

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
    fetch(`${backendUrl}/api/website/programs`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPrograms(normalizePrograms(data))
          setCount(data.length)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <section id="programs" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>What We Offer</p>
          <h2 className={styles.heading}>{count} Specialized Course{count !== 1 ? 's' : ''} for Every Learner</h2>
          <p className={styles.sub}>
            From first LEGO builds to AI and app development — 24-hour hands-on courses for every skill level and age group.
          </p>
        </div>

        <div className={styles.grid}>
          {programs.map(p => (
            <div key={p.title} className={styles.card} style={{ '--accent': p.color }}>
              <div className={styles.imgWrap}>
                {p.img ? (
                  <img src={p.img} alt={p.title} className={styles.courseImg} loading="lazy" />
                ) : (
                  <div className={styles.courseImg} style={{ background: `${p.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '2rem' }}>📚</span>
                  </div>
                )}
                {p.badge && <span className={styles.badge}>{p.badge}</span>}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{p.title}</h3>
                <p className={styles.cardDesc}>{p.desc}</p>
                {p.highlights.length > 0 && (
                  <ul className={styles.highlights}>
                    {p.highlights.map(h => (
                      <li key={h}>
                        <span className={styles.check}>✓</span> {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.cta}>
          <a href="#contact" className={styles.ctaBtn}>Book a Free Demo Session →</a>
        </div>
      </div>
    </section>
  )
}
