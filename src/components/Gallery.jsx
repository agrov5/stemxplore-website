import { useState, useEffect } from 'react'
import styles from './Gallery.module.css'

export default function Gallery() {
  const [items, setItems] = useState([])
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || ''
    fetch(`${backendUrl}/api/website/gallery`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setItems(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (items.length === 0) return null

  return (
    <section id="gallery" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>In Action</p>
          <h2 className={styles.heading}>Our Gallery</h2>
          <p className={styles.sub}>Photos and videos from our workshops, competitions, and classroom sessions.</p>
        </div>

        <div className={styles.grid}>
          {items.map((item, i) => (
            <div key={item.id} className={`${styles.tile} ${i % 5 === 0 ? styles.wide : ''}`} onClick={() => setLightbox(item)}>
              {item.type === 'video' ? (
                <div className={styles.videoThumb}>
                  <div className={styles.playIcon}>▶</div>
                  {item.caption && <span className={styles.tileCaption}>{item.caption}</span>}
                </div>
              ) : (
                <>
                  <img src={item.url} alt={item.caption || 'Gallery'} className={styles.tileImg} loading="lazy" />
                  {item.caption && <span className={styles.tileCaption}>{item.caption}</span>}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {lightbox && (
        <div className={styles.overlay} onClick={() => setLightbox(null)}>
          <div className={styles.lightbox} onClick={e => e.stopPropagation()}>
            <button className={styles.close} onClick={() => setLightbox(null)}>✕</button>
            {lightbox.type === 'video' ? (
              <video src={lightbox.url} controls autoPlay className={styles.lightboxMedia} />
            ) : (
              <img src={lightbox.url} alt={lightbox.caption} className={styles.lightboxMedia} />
            )}
            {lightbox.caption && <p className={styles.lightboxCaption}>{lightbox.caption}</p>}
          </div>
        </div>
      )}
    </section>
  )
}
