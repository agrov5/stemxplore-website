import { Star, Award, Users, Globe } from 'lucide-react'
import styles from './Trainer.module.css'
import trainerImg from '../assets/trainer.webp'

export default function Trainer() {
  return (
    <section id="team" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Meet the Team</p>
          <h2 className={styles.heading}>Expert Instructors, Proven Results</h2>
        </div>

        <div className={styles.card}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>
              <img src={trainerImg} alt="Nikhil K" className={styles.trainerImg} />
            </div>
            <div className={styles.ratingBadge}>
              <Star size={14} fill="#f9c929" color="#f9c929" />
              <span>4.3 Rating</span>
            </div>
          </div>

          <div className={styles.info}>
            <h3 className={styles.name}>Nikhil K</h3>
            <p className={styles.role}>Lead Trainer & Curriculum Director</p>

            <p className={styles.bio}>
              With over 10 years in educational technology, Nikhil brings deep expertise in robotics
              engineering, STEM facilitation, and curriculum design. He has served as Head of Robotics
              and Curriculum Lead, mentored award-winning international competition teams, and trained
              over 1,000 students across the globe.
            </p>

            <div className={styles.badges}>
              <div className={styles.badge}>
                <Award size={16} />
                Award-Winning Coach
              </div>
              <div className={styles.badge}>
                <Users size={16} />
                1,000+ Students Trained
              </div>
              <div className={styles.badge}>
                <Globe size={16} />
                International Experience
              </div>
              <div className={styles.badge}>
                <Star size={16} />
                10+ Years in Ed-Tech
              </div>
            </div>
          </div>
        </div>

        <div className={styles.cta}>
          <p>Want to learn from our expert instructors?</p>
          <a href="#contact" className={styles.ctaBtn}>Book a Free Counseling Session</a>
        </div>
      </div>
    </section>
  )
}
