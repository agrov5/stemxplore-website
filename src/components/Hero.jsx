import styles from './Hero.module.css'
import heroRobot from '../assets/hero-robot.png'

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <div className={styles.left}>
          <h1 className={styles.heading}>Robotics &amp; Coding Club</h1>
          <p className={styles.sub}>
            <strong>Explore, Create, Innovate:</strong> Unleash the Future with Robotics and Coding!
          </p>
          <div className={styles.actions}>
            <a href="#contact" className={styles.btnStudent}>Are you a Student?</a>
            <a href="#contact" className={styles.btnInstructor}>Are you Instructor?</a>
          </div>
        </div>
        <div className={styles.right}>
          <img src={heroRobot} alt="Student building a robot" className={styles.heroImg} />
        </div>
      </div>
    </section>
  )
}
