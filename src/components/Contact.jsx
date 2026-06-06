import { useState } from 'react'
import styles from './Contact.module.css'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

const PROGRAMS = [
  'Lego Robotics (Ages 5+)',
  'EV3 Robotics (Ages 9+)',
  'Scratch Coding (Ages 5+)',
  'Quarky Creator (Ages 5+)',
  'AI for Kids (Ages 9+)',
  'Quarky Innovator (Ages 5+)',
  'App Development (Ages 9+)',
]

export default function Contact() {
  const [form, setForm] = useState({
    parent_name: '', child_name: '', child_age: '', email: '', phone: '', program: '', message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.parent_name || !form.child_name || !form.phone) {
      setError('Please fill in Parent Name, Child Name, and Phone Number.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${BACKEND}/api/website/book-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          child_age: Number(form.child_age) || 0,
        }),
      })
      if (!res.ok) throw new Error('Request failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please call us at +1 (613) 298-7836 to book.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="contact" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <p className={styles.eyebrow}>Get in Touch</p>
          <h2 className={styles.heading}>Ready to Start Your STEM Journey?</h2>
          <p className={styles.sub}>
            Book a free demo session or reach out to speak with one of our instructors. We'd love to find the perfect program for your child.
          </p>

        </div>

        <div className={styles.right}>
          <div className={styles.formCard}>
            <h3 className={styles.formTitle}>Book a Free Demo</h3>

            {submitted ? (
              <div className={styles.successBox}>
                <div className={styles.successIcon}>✓</div>
                <h4>Booking Received!</h4>
                <p>We'll be in touch shortly to confirm your free demo class. Can't wait to meet your family!</p>
                <button className={styles.submitAlt} onClick={() => { setSubmitted(false); setForm({ parent_name: '', child_name: '', child_age: '', email: '', phone: '', program: '', message: '' }) }}>
                  Book Another
                </button>
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Parent Name *</label>
                    <input type="text" placeholder="Jane Smith" value={form.parent_name} onChange={set('parent_name')} />
                  </div>
                  <div className={styles.field}>
                    <label>Child's Name *</label>
                    <input type="text" placeholder="Alex Smith" value={form.child_name} onChange={set('child_name')} />
                  </div>
                </div>
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Child's Age</label>
                    <input type="number" placeholder="e.g. 8" min="2" max="18" value={form.child_age} onChange={set('child_age')} />
                  </div>
                  <div className={styles.field}>
                    <label>Phone Number *</label>
                    <input type="tel" placeholder="+1 (555) 000-0000" value={form.phone} onChange={set('phone')} />
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Email Address</label>
                  <input type="email" placeholder="jane@example.com" value={form.email} onChange={set('email')} />
                </div>
                <div className={styles.field}>
                  <label>Interested Program</label>
                  <select value={form.program} onChange={set('program')}>
                    <option value="">Select a program…</option>
                    {PROGRAMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Message (optional)</label>
                  <textarea placeholder="Tell us about your child's interests…" rows={3} value={form.message} onChange={set('message')} />
                </div>
                {error && <p className={styles.errorMsg}>{error}</p>}
                <button type="submit" className={styles.submit} disabled={submitting}>
                  {submitting ? 'Sending…' : 'Book My Free Demo →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
