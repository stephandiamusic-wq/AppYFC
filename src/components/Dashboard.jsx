import { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import ProfileSwitcher from './ProfileSwitcher'

export default function Dashboard({ session, profile, onProfileUpdate }) {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [results, setResults] = useState(null)

  // État pour les boutons "Copié"
  const [copiedState, setCopiedState] = useState({})

  // État pour les plateformes
  const [platforms, setPlatforms] = useState({
    linkedin: true,
    facebook: true,
    twitter: true,
    instagram: true
  })

  const isAnyPlatformSelected = Object.values(platforms).some(Boolean)

  const togglePlatform = (key) => {
    setPlatforms(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Modification du texte généré
  const handleResultEdit = (platform, newText) => {
    setResults(prev => ({ ...prev, [platform]: newText }))
  }

  // Copie avec feedback visuel
  const handleCopy = (text, platform) => {
    navigator.clipboard.writeText(text)
    toast.success('Texte copié !', { duration: 2000, position: 'bottom-center' })
    setCopiedState(prev => ({ ...prev, [platform]: true }))
    setTimeout(() => setCopiedState(prev => ({ ...prev, [platform]: false })), 2000)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImage(file)
      setPreview(URL.createObjectURL(file))
      setResults(null)
      toast.success('Photo ajoutée !', { icon: '📸' })
    }
  }

  // Compression d'image optimisée pour mobile
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 1000
          const scaleSize = MAX_WIDTH / img.width
          const newWidth = (scaleSize < 1) ? MAX_WIDTH : img.width
          const newHeight = (scaleSize < 1) ? (img.height * scaleSize) : img.height

          canvas.width = newWidth
          canvas.height = newHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, newWidth, newHeight)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
          resolve(dataUrl)
        }
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleGenerate = async (posture) => {
    if (!image) return toast.error("Il faut d'abord une photo !")
    if (!isAnyPlatformSelected) return toast.error("Sélectionnez au moins un réseau !")

    const activePlatforms = Object.keys(platforms).filter(k => platforms[k])

    setLoading(true)
    setResults(null)

    try {
      setLoadingStep("Compression de l'image...")
      const base64Image = await compressImage(image)

      setLoadingStep("Analyse de la scène...")

      const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          imageBase64: base64Image,
          posture: posture,
          description: description,
          targetPlatforms: activePlatforms
        })
      })

      setLoadingStep("Rédaction des posts...")

      const result = await response.json()
      let content = result.data

      if (typeof content === 'string') {
        content = content.replace(/```json/g, '').replace(/```/g, '')
        try { content = JSON.parse(content) } catch (e) { console.error(e) }
      }

      setResults(content)
      toast.success("C'est prêt !", { duration: 4000, icon: '✨' })

      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)

    } catch (error) {
      console.error(error)
      toast.error("Erreur de connexion. Vérifiez votre réseau.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 pb-32">
      <Toaster />

      {/* En-tête Simplifié avec le nouveau Switcher */}
      <div className="flex flex-col items-center justify-center mb-8 relative z-10">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Nouveau Post</h2>
        <ProfileSwitcher
          session={session}
          currentProfile={profile}
          onUpdate={onProfileUpdate}
        />
      </div>

      {/* Zone Photo */}
      <div className="mb-6 transition-all duration-300">
        {!preview ? (
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-blue-200 dark:border-gray-700 rounded-2xl cursor-pointer bg-blue-50/50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-gray-800 transition active:scale-95">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-4xl mb-2">📸</span>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Ajouter une photo</p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
          </label>
        ) : (
          <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700 group">
            <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
              <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-100 transform hover:scale-105 transition">
                Changer
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
              <button
                onClick={() => { setPreview(null); setImage(null); setResults(null); }}
                className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-red-600 transform hover:scale-105 transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Description / Contexte */}
      <div className="mb-6">
        <textarea
          rows="2"
          placeholder="Ajouter un contexte ? (ex: Victoire 3-0, Inauguration école...)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-blue-500/50 text-gray-900 dark:text-white placeholder-gray-400 resize-none shadow-inner text-sm transition"
        ></textarea>
      </div>

      {/* Sélecteur de Plateformes */}
      <div className="mb-8 overflow-x-auto pb-2 no-scrollbar">
        <div className="flex gap-2">
          {[
            { id: 'linkedin', label: 'LinkedIn', color: 'bg-[#0077b5]' },
            { id: 'facebook', label: 'Facebook', color: 'bg-[#1877f2]' },
            { id: 'twitter', label: 'X (Twitter)', color: 'bg-black' },
            { id: 'instagram', label: 'Insta', color: 'bg-pink-600' },
          ].map((net) => (
            <button
              key={net.id}
              onClick={() => togglePlatform(net.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center border ${platforms[net.id]
                  ? `${net.color} text-white border-transparent shadow-md transform scale-105`
                  : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'
                }`}
            >
              {platforms[net.id] && <span className="mr-1">✓</span>}
              {net.label}
            </button>
          ))}
        </div>
        {!isAnyPlatformSelected && <p className="text-xs text-red-500 mt-2 font-medium">Sélectionnez au moins un réseau.</p>}
      </div>

      {/* Boutons Postures */}
      <div className="grid grid-cols-1 gap-3 mb-8">
        {[
          { id: 'incarné', icon: '👤', title: "L'Incarné (Je)", desc: "Personnel & Authentique", color: "hover:border-blue-500" },
          { id: 'institution', icon: '🏛️', title: "L'Institution (Nous)", desc: "Officiel & Fédérateur", color: "hover:border-indigo-500" },
          { id: 'visionnaire', icon: '🚀', title: "Le Visionnaire (Futur)", desc: "Inspirant & Dynamique", color: "hover:border-purple-500" },
        ].map((pos) => (
          <button
            key={pos.id}
            onClick={() => handleGenerate(pos.id)}
            disabled={loading || !image || !isAnyPlatformSelected}
            className={`relative bg-white dark:bg-gray-800 border-2 border-transparent ${pos.color} p-4 rounded-2xl shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center justify-between`}
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">{pos.icon}</div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">{pos.title}</h3>
                <p className="text-xs text-gray-500">{pos.desc}</p>
              </div>
            </div>
            <div className="text-gray-300">➔</div>
          </button>
        ))}
      </div>

      {/* Indicateur de Chargement Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="animate-spin text-4xl mb-4">✨</div>
          <p className="text-gray-800 dark:text-white font-bold animate-pulse">{loadingStep}</p>
        </div>
      )}

      {/* Résultats */}
      {results && typeof results === 'object' && (
        <div id="results-section" className="space-y-6 animate-fade-in-up pt-4 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>✍️</span> Vos brouillons
          </h3>

          {Object.entries(results).map(([key, val]) => (
            platforms[key] && val && (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className={`px-4 py-3 flex justify-between items-center ${key === 'linkedin' ? 'bg-[#0077b5]' :
                    key === 'facebook' ? 'bg-[#1877f2]' :
                      key === 'twitter' ? 'bg-black' :
                        'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}>
                  <span className="text-white font-bold text-sm capitalize">{key}</span>
                  <button
                    onClick={() => handleCopy(val, key)}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition ${copiedState[key]
                        ? 'bg-green-500 text-white scale-105'
                        : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                  >
                    {copiedState[key] ? '✓ COPIÉ' : 'COPIER'}
                  </button>
                </div>
                <div className="p-0">
                  <textarea
                    value={val}
                    onChange={(e) => handleResultEdit(key, e.target.value)}
                    className="w-full h-40 p-4 bg-transparent text-gray-800 dark:text-gray-200 text-sm leading-relaxed resize-y outline-none focus:bg-gray-50 dark:focus:bg-gray-700/50 transition"
                  />
                </div>
              </div>
            )
          ))}
          <div className="h-8"></div>
        </div>
      )}
    </div>
  )
}