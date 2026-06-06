import styles from './Footer.module.css'
import logoImg from '../assets/logo.png'

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
)

const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="#060612"/>
  </svg>
)

const LinkedinIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
)

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <img src={logoImg} alt="STEMXplore" className={styles.logoImg} />
          </div>
          <p className={styles.tagline}>
            "Explore, Create, Innovate: Unleash the Future with Robotics and Coding!"
          </p>
          <div className={styles.socials}>
            <a href="https://www.facebook.com/profile.php?id=61558655160765" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FacebookIcon />
            </a>
            <a href="https://www.instagram.com/stemxplore10/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href="https://www.youtube.com/@stemxplore" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <YoutubeIcon />
            </a>
            <a href="https://stemxplore.ca" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <LinkedinIcon />
            </a>
          </div>
        </div>

        <div className={styles.links}>
          <div className={styles.col}>
            <h4>Programs</h4>
            <a href="#programs">Little Builders</a>
            <a href="#programs">Junior Coders</a>
            <a href="#programs">Tech Explorers</a>
            <a href="#programs">Competition Prep</a>
            <a href="#programs">Instructor Training</a>
          </div>
          <div className={styles.col}>
            <h4>Company</h4>
            <a href="#about">About Us</a>
            <a href="#values">Our Values</a>
            <a href="#team">Our Team</a>
            <a href="https://stemxplore.ca" target="_blank" rel="noopener noreferrer">Full Website</a>
          </div>
          <div className={styles.col}>
            <h4>Contact</h4>
            <a href="#contact">Book a Demo</a>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} STEMXplore. All rights reserved.</p>
        <div className={styles.legal}>
          <a href="https://stemxplore.ca/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <a href="https://stemxplore.ca/terms" target="_blank" rel="noopener noreferrer">Terms & Conditions</a>
          <a href="https://stemxplore.ca/refund-policy" target="_blank" rel="noopener noreferrer">Refund Policy</a>
        </div>
      </div>
    </footer>
  )
}
