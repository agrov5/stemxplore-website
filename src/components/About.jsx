import { Target, Eye, Lightbulb } from 'lucide-react'
import styles from './About.module.css'

export default function About() {
  return (
    <section id="about" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <p className={styles.eyebrow}>Who We Are</p>
          <h2 className={styles.heading}>Unleash the Future with Robotics and Coding</h2>
          <p className={styles.body}>
            STEMXplore is a hands-on robotics and coding education club dedicated to empowering children
            of all ages. We transform imagination into practical innovation by combining critical thinking,
            creative problem-solving, and 21st-century skills in an engaging, supportive environment.
          </p>
          <p className={styles.body}>
            From building your very first robot to competing in national championships, our programs are
            designed to grow with every student — nurturing the next generation of engineers, developers,
            and innovators.
          </p>
          <a href="https://stemxplore.ca" target="_blank" rel="noopener noreferrer" className={styles.link}>
            Learn more at stemxplore.ca →
          </a>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <div className={styles.iconWrap} style={{ '--c': 'var(--primary-light)' }}>
              <Target size={22} />
            </div>
            <h3>Our Mission</h3>
            <p>Equip children with the tools, knowledge, and inspiration to excel in robotics and coding — fostering curiosity and problem-solving through hands-on learning.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.iconWrap} style={{ '--c': 'var(--secondary)' }}>
              <Eye size={22} />
            </div>
            <h3>Our Vision</h3>
            <p>Develop confident young innovators who have every opportunity to become capable, creative leaders in our technology-driven world.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.iconWrap} style={{ '--c': 'var(--accent)' }}>
              <Lightbulb size={22} />
            </div>
            <h3>Our Approach</h3>
            <p>Real robotics kits. Real competitions. Real projects. We believe the best learning happens when students build, fail, iterate, and succeed.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
