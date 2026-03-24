'use client'

import { useEffect, useState, use } from 'react'
import { motion } from 'framer-motion'

const API_BASE_URL = 'http://192.168.1.15:8170'
const DENSITE_HUILE_OLIVE = 0.916

type TrackingData = {
  nomPrenom: string
  dateCreation?: string
  quantiteOlive?: number
  quantiteOliveNet?: number
  quantiteHuile?: number
  kattou3?: number
  prixFinal?: number
  statusHuile: 'En cours' | 'Prêt'
}

type Lang = 'ar' | 'fr'

export default function TrackingTunisieFinal({ params }: { params: Promise<{ token: string }> }) {
  // Correction Next.js 15 : On "unwrappe" les params avec use()
  const resolvedParams = use(params)
  const token = resolvedParams.token

  const [lang, setLang] = useState<Lang>('ar')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TrackingData | null>(null)
  const [blocked, setBlocked] = useState(false)

  const isArabic = lang === 'ar'

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return
      try {
        setLoading(true)
        setBlocked(false)
        const res = await fetch(`${API_BASE_URL}/clients/public-tracking/${token}`, { cache: 'no-store' })

        if (!res.ok) {
          setBlocked(true)
          return
        }

        const json = await res.json()
        if (!json || !json.nomPrenom) {
          setBlocked(true)
          return
        }
        setData(json)
      } catch (e) {
        setBlocked(true)
      } finally {
        setLoading(false)
      }
    }
    void fetchData()
  }, [token])

  // --- CALCULS DIRECTS (Plus de useMemo pour éviter les erreurs de build) ---
  const getStatusInfo = () => {
    if (!data) return { msg: '', icon: '⏳', percent: 0 }
    
    const oliveNet = Number(data.quantiteOliveNet ?? 0)
    const huileKg = Number(data.quantiteHuile ?? 0)

    if (data.statusHuile === 'Prêt') {
      return {
        msg: isArabic ? 'زيتك حاظر، تنجم تجي تهزو' : 'Votre huile est prête, vous pouvez passer.',
        icon: '✅',
        percent: 100,
      }
    }
    if (oliveNet > 0 && huileKg === 0) {
      return {
        msg: isArabic ? 'الزيت متاعك مازال في طور الإنجاز' : 'Votre commande est en cours de préparation.',
        icon: '⏳',
        percent: 65,
      }
    }
    if (oliveNet === 0) {
      return {
        msg: isArabic ? 'تم تسجيل الطلب و بش يتم التثبّت' : 'Commande enregistrée, vérification en cours.',
        icon: '📋',
        percent: 15,
      }
    }
    return {
      msg: isArabic ? 'الزيت متاعك مازال ما حضرش' : 'Traitement en cours, revenez plus tard.',
      icon: '⚙️',
      percent: 40,
    }
  }

  const getStats = () => {
    const huileKg = Number(data?.quantiteHuile ?? 0)
    const litres = huileKg > 0 ? huileKg / DENSITE_HUILE_OLIVE : 0
    const nbGalba = litres / 10 
    return { huileKg, litres, nbGalba }
  }

  const statusInfo = getStatusInfo()
  const stats = getStats()

  const format2 = (v?: number) => (v === undefined || isNaN(v) ? '--' : v.toFixed(1))
  const format = (v?: number) => (v === undefined || isNaN(v) ? '--' : v.toFixed(2))
  const format3 = (v?: number) => (v === undefined || isNaN(v) ? '--' : v.toFixed(3))

  if (loading) {
    return (
      <div className="page-container" dir="rtl">
        <style jsx>{`.page-container { min-height: 100vh; background: #f4f7f4; display: flex; align-items: center; justify-content: center; font-family: 'Cairo', sans-serif; }`}</style>
        <div className="loading-box">
          <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>⏳</div>
          <div>{isArabic ? 'جاري تحميل المعطيات...' : 'Chargement...'}</div>
        </div>
      </div>
    )
  }

  if (blocked || !data) {
    return (
      <div dir="rtl" className="page-container">
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
          .page-container { min-height: 100vh; background: #f4f7f4; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: 'Cairo', sans-serif; }
          .blocked-card { max-width: 500px; width: 100%; background: white; border-radius: 30px; padding: 30px; text-align: center; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08); }
        `}</style>
        <div className="blocked-card">
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔒</div>
          <div style={{ color: '#b91c1c', fontWeight: 900, fontSize: '1.4rem' }}>{isArabic ? 'تم غلق رابط المتابعة' : 'Lien de suivi clôturé'}</div>
          <p style={{ color: '#475569', marginTop: 15 }}>
            {isArabic 
              ? 'الرابط هذا موش صالح، يا إما تسكّر، يا إما الحريف خلّص و الطلب تسكّر نهائياً.' 
              : "Ce lien n'est plus valide. La commande est clôturée ou payée."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container" dir={isArabic ? 'rtl' : 'ltr'}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Inter:wght@400;700&display=swap');
        .page-container { min-height: 100vh; background: linear-gradient(180deg, #f4f7f4 0%, #eef6ef 100%); padding: 20px; font-family: ${isArabic ? "'Cairo', sans-serif" : "'Inter', sans-serif"}; display: flex; flex-direction: column; align-items: center; }
        .card { width: 100%; max-width: 520px; background: white; border-radius: 30px; padding: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.08); position: relative; }
        .lang-switch { width: 100%; max-width: 520px; display: flex; justify-content: flex-end; margin-bottom: 10px; }
        .lang-btn { background: #e2e8f0; border: none; padding: 6px 15px; border-radius: 12px; cursor: pointer; font-size: 0.75rem; font-weight: bold; }
        .status-msg { font-weight: 900; color: #064e3b; font-size: 1.15rem; text-align: center; margin: 15px 0; line-height: 1.8; }
        .progress-bar-bg { width: 100%; height: 12px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin-top: 8px; }
        .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #16a34a, #22c55e); border-radius: 999px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
        .stat-item { background: #f8fafc; padding: 15px; border-radius: 20px; text-align: center; border: 1px solid #f1f5f9; }
        .stat-label { font-size: 0.78rem; color: #64748b; display: block; margin-bottom: 5px; }
        .stat-value { font-size: 1rem; font-weight: 700; color: #1e293b; }
        .oil-card { margin: 18px 0; padding: 18px; background: #fffbeb; border-radius: 22px; border: 1px solid #fde68a; text-align: center; }
        .oil-main { font-size: 1.05rem; font-weight: 800; color: #1f2937; line-height: 1.9; }
        .price-section { background: #064e3b; color: white; padding: 18px; border-radius: 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 18px; }
        .loading-box { background: white; padding: 30px; border-radius: 24px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.08); width: 100%; max-width: 420px; }
      `}</style>

      <div className="lang-switch">
        <button className="lang-btn" onClick={() => setLang(isArabic ? 'fr' : 'ar')}>
          {isArabic ? 'Passer en Français' : 'تغيير للغة العربية'}
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem' }}>{statusInfo.icon}</div>
          <h2 style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '10px 0 0' }}>
            {isArabic ? `مرحباً بك سي ${data.nomPrenom}` : `Bienvenue Mr. ${data.nomPrenom}`}
          </h2>
          <div className="status-msg">{statusInfo.msg}</div>
        </div>

        <div style={{ margin: '18px 0 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: 8 }}>
            <span>{isArabic ? 'تقدّم الطلب' : 'Progression'}</span>
            <span>{statusInfo.percent}%</span>
          </div>
          <div className="progress-bar-bg">
            <motion.div 
              className="progress-bar-fill" 
              initial={{ width: 0 }} 
              animate={{ width: `${statusInfo.percent}%` }} 
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">{isArabic ? 'وزن الزيتون الخام' : 'Olive Brut'}</span>
            <span className="stat-value">{format2(data.quantiteOlive)} {isArabic ? 'كغ' : 'kg'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{isArabic ? 'وزن الزيتون الصافي' : 'Olive Net'}</span>
            <span className="stat-value">{format2(data.quantiteOliveNet)} {isArabic ? 'كغ' : 'kg'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{isArabic ? 'القطوع' : 'Kattou3'}</span>
            <span className="stat-value" style={{ color: '#d97706' }}>{format2(data.kattou3)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{isArabic ? 'كمية الزيت' : 'Huile'}</span>
            <span className="stat-value">{format2(stats.huileKg)} {isArabic ? 'كغ' : 'kg'}</span>
          </div>
        </div>

        {stats.huileKg > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="oil-card">
            <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>🛢️</div>
            <div className="oil-main">
              {format2(stats.litres)} {isArabic ? 'لتر' : 'Litres'}
              <span style={{ color: '#94a3b8', margin: '0 10px' }}>≈</span>
              {format(stats.nbGalba)} {isArabic ? 'قالبة' : 'Galba'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 6 }}>
              {isArabic ? 'الكمية التقريبية (قالبة = 10 لتر)' : 'Quantité approx. (1 Galba = 10L)'}
            </div>
          </motion.div>
        )}

        <div className="price-section">
          <span>{isArabic ? 'المبلغ الجملي:' : 'Total à payer:'}</span>
          <span style={{ fontSize: '1.25rem', fontWeight: '900' }}>
            {format3(data.prixFinal)} {isArabic ? 'د.ت' : 'TND'}
          </span>
        </div>

        <footer style={{ textAlign: 'center', marginTop: '20px', color: '#64748b', fontSize: '0.75rem' }}>
          {isArabic ? 'شكراً لثقتكم في معصرتنا' : 'Merci pour votre confiance'}
        </footer>
      </motion.div>
    </div>
  )
}