import { Phone, MessageCircle, Calendar } from 'lucide-react'
import styles from './Contact.module.css'

export default function Contact() {
  return (
    <section id="contact" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <p className={styles.eyebrow}>Get in Touch</p>
          <h2 className={styles.heading}>Ready to Start Your STEM Journey?</h2>
          <p className={styles.sub}>
            Book a free demo session or reach out to speak with one of our instructors. We'd love to find the perfect program for your child.
          </p>

          <div className={styles.contacts}>
            <a href="tel:+16132987836" className={styles.contactItem}>
              <div className={styles.contactIcon}><Phone size={20} /></div>
              <div>
                <div className={styles.contactLabel}>Call Us</div>
                <div className={styles.contactValue}>+1 (613) 298-7836</div>
              </div>
            </a>
            <a href="https://wa.me/16132987836" target="_blank" rel="noopener noreferrer" className={styles.contactItem}>
              <div className={styles.contactIcon} style={{ '--ic': '#25D366' }}><MessageCircle size={20} /></div>
              <div>
                <div className={styles.contactLabel}>WhatsApp</div>
                <div className={styles.contactValue}>+1 (613) 298-7836</div>
              </div>
            </a>
            <a href="https://stemxplore.ca" target="_blank" rel="noopener noreferrer" className={styles.contactItem}>
              <div className={styles.contactIcon} style={{ '--ic': 'var(--accent)' }}><Calendar size={20} /></div>
              <div>
                <div className={styles.contactLabel}>Book Online</div>
                <div className={styles.contactValue}>stemxplore.ca</div>
              </div>
            </a>
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.formCard}>
            <h3 className={styles.formTitle}>Book a Free Demo</h3>
            <form className={styles.form} onSubmit={e => e.preventDefault()}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label>Parent Name</label>
                  <input type="text" placeholder="Jane Smith" />
                </div>
                <div className={styles.field}>
                  <label>Child's Age</label>
                  <input type="number" placeholder="e.g. 8" min="2" max="18" />
                </div>
              </div>
              <div className={styles.field}>
                <label>Email Address</label>
                <input type="email" placeholder="jane@example.com" />
              </div>
              <div className={styles.field}>
                <label>Phone Number</label>
                <input type="tel" placeholder="+1 (555) 000-0000" />
              </div>
              <div className={styles.field}>
                <label>Interested Program</label>
                <select>
                  <option value="">Select a program...</option>
                  <option>Little Builders (Ages 2+)</option>
                  <option>Junior Coders (Ages 5+)</option>
                  <option>Tech Explorers (Ages 9+)</option>
                  <option>Competition Prep</option>
                  <option>Project Management</option>
                  <option>Instructor Training</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>Message (optional)</label>
                <textarea placeholder="Tell us about your child's interests..." rows={3} />
              </div>
              <button type="submit" className={styles.submit}>
                Book My Free Demo →
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
