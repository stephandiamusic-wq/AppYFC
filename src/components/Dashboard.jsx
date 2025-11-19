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

  // État pour savoir quel bouton "Publier" est en train de charger
  const [publishingState, setPublishingState] = useState({})

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

  // --- NOUVELLE FONCTION DE PUBLICATION ---
  const handlePublish = async (text, platform) => {
    if (!confirm(`Voulez-vous vraiment publier ce message sur ${platform} maintenant ?`)) return

    // Active le chargement pour CE bouton spécifique
    setPublishingState(prev => ({ ...prev, [platform]: true }))
    const toastId = toast.loading(`Publication sur ${platform}...`)

    try {
      // On compresse l'image à nouveau pour l'envoi (ou on pourrait stocker la version compressée)
      let imageToSend = null
      if (image) {
        imageToSend = await compressImage(image)
      }

      // Envoi au Webhook de PUBLICATION (Attention : Nouvelle URL dans .env)
      // Si vous n'avez pas encore la variable PUBLISH, utilisez l'ancienne pour tester
      const webhookUrl = import.meta.env.VITE_N8N_PUBLISH_WEBHOOK_URL || import.meta.env.VITE_N8N_WEBHOOK_URL

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish', // Pour dire à n8n "C'est une publi, pas une génération"
          userId: session.user.id,
          platform: platform,
          content: text,
          imageBase64: imageToSend
        })
      })

      if (response.ok) {
        toast.success(`Posté avec succès sur ${platform} !`, { id: toastId })
      } else {
        throw new Error("Erreur serveur")
      }

    } catch (error) {
      console.error(error)
      toast.error("Échec de la publication via n8n.", { id: toastId })
    } finally {
      setPublishingState(prev => ({ ...prev, [platform]: false }))
    }
  }
  // ----------------------------------------

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
    <div className="w-full max-w-4xl mx-auto p-4 pb-32 space-y-6">
      <Toaster />

      {/* En-tête avec Switcher */}
      <div className="flex flex-col items-center justify-center mb-8 relative z-10">
        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Nouveau Post</h2>
        <ProfileSwitcher
          session={session}
          currentProfile={profile}
          onUpdate={onProfileUpdate}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Carte Photo */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/20">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">📸</span>
            Votre visuel
          </h3>

          <div className="transition-all duration-300">
            {!preview ? (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-blue-200 rounded-2xl cursor-pointer bg-blue-50/50 hover:bg-blue-50 transition active:scale-95 group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="bg-white p-4 rounded-full shadow-md mb-3 group-hover:scale-110 transition">
                    <span className="text-3xl">➕</span>
                  </div>
                  <p className="text-sm font-semibold text-blue-600">Ajouter une photo</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
            ) : (
              <div className="relative rounded-2xl overflow-hidden shadow-lg group">
                <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                  <label className="cursor-pointer bg-white text-black px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-100 transform hover:scale-105 transition shadow-lg">
                    Changer
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                  <button
                    onClick={() => { setPreview(null); setImage(null); setResults(null); }}
                    className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-red-600 transform hover:scale-105 transition shadow-lg"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Carte Contexte & Plateformes */}
        <div className="space-y-6">
          {/* Contexte */}
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/20">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-purple-100 text-purple-600 p-2 rounded-lg">📝</span>
              Contexte
            </h3>
            <textarea
              rows="3"
              placeholder="Ex: Victoire 3-0 contre l'équipe locale, inauguration de la nouvelle école..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-transparent focus:border-pink-500 focus:ring-2 focus:ring-pink-200 text-gray-900 placeholder-gray-400 resize-none transition"
            ></textarea>
          </div>

          {/* Plateformes */}
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/20">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-pink-100 text-pink-600 p-2 rounded-lg">🌐</span>
              Réseaux
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'linkedin', label: 'LinkedIn', color: 'bg-[#0077b5]' },
                { id: 'facebook', label: 'Facebook', color: 'bg-[#1877f2]' },
                { id: 'twitter', label: 'X (Twitter)', color: 'bg-black' },
                { id: 'instagram', label: 'Instagram', color: 'bg-pink-600' },
              ].map((net) => (
                <button
                  key={net.id}
                  onClick={() => togglePlatform(net.id)}
                  className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center border-2 ${platforms[net.id]
                    ? `${net.color} text-white border-transparent shadow-md transform scale-[1.02]`
                    : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200'
                    }`}
                >
                  {platforms[net.id] && <span className="mr-2">✓</span>}
                  {net.label}
                </button>
              ))}
            </div>
            {!isAnyPlatformSelected && <p className="text-xs text-red-500 mt-2 font-medium">Sélectionnez au moins un réseau.</p>}
          </div>
        </div>
      </div>

      {/* Carte Postures (Large) */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/20">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="bg-orange-100 text-orange-600 p-2 rounded-lg">🎭</span>
          Choisissez votre ton
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'incarné', icon: '👤', title: "L'Incarné", desc: "Je parle (Authentique)", color: "hover:border-blue-500 hover:bg-blue-50" },
            { id: 'institution', icon: '🏛️', title: "L'Institution", desc: "Nous parlons (Officiel)", color: "hover:border-indigo-500 hover:bg-indigo-50" },
            { id: 'visionnaire', icon: '🚀', title: "Le Visionnaire", desc: "J'inspire (Futur)", color: "hover:border-purple-500 hover:bg-purple-50" },
          ].map((pos) => (
            <button
              key={pos.id}
              onClick={() => handleGenerate(pos.id)}
              disabled={loading || !image || !isAnyPlatformSelected}
              className={`group relative border-2 border-gray-100 ${pos.color} p-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-left`}
            >
              <div className="flex flex-col gap-2">
                <div className="text-3xl mb-2">{pos.icon}</div>
                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{pos.title}</h3>
                <p className="text-xs text-gray-500">{pos.desc}</p>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">➔</div>
            </button>
          ))}
        </div>
      </div>

      {/* Indicateur de Chargement Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-[#1A237E]/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-white/20 border-t-pink-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
          </div>
          <p className="text-white font-bold mt-6 text-lg animate-pulse">{loadingStep}</p>
        </div>
      )}

      {/* Résultats */}
      {results && typeof results === 'object' && (
        <div id="results-section" className="space-y-6 animate-fade-in-up pt-8">
          <h3 className="text-2xl font-bold text-white flex items-center gap-2 justify-center">
            <span>✍️</span> Vos brouillons sont prêts
          </h3>

          <div className="grid grid-cols-1 gap-6">
            {Object.entries(results).map(([key, val]) => (
              platforms[key] && val && (
                <div key={key} className="bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-white/10">
                  <div className={`px-6 py-4 flex justify-between items-center ${key === 'linkedin' ? 'bg-[#0077b5]' :
                    key === 'facebook' ? 'bg-[#1877f2]' :
                      key === 'twitter' ? 'bg-black' :
                        'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg capitalize">{key}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(val, key)}
                        className={`text-xs font-bold px-4 py-2 rounded-full transition shadow-lg ${copiedState[key]
                          ? 'bg-green-500 text-white scale-105'
                          : 'bg-white text-gray-900 hover:bg-gray-100'
                          }`}
                      >
                        {copiedState[key] ? '✓ COPIÉ' : 'COPIER LE TEXTE'}
                      </button>
                      <button
                        onClick={() => handlePublish(val, key)}
                        disabled={publishingState[key]}
                        className={`text-xs font-bold px-4 py-2 rounded-full transition shadow-lg border border-white/30 ${publishingState[key]
                          ? 'bg-white/50 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-gray-100'
                          }`}
                      >
                        {publishingState[key] ? '⏳ ENVOI...' : '🚀 PUBLIER'}
                      </button>
                    </div>
                  </div>
                  <div className="p-6 bg-gray-50">
                    <textarea
                      value={val}
                      onChange={(e) => handleResultEdit(key, e.target.value)}
                      className="w-full h-48 p-4 bg-white border border-gray-200 rounded-xl text-gray-800 text-base leading-relaxed resize-y outline-none focus:ring-2 focus:ring-blue-500/50 transition shadow-sm"
                    />
                  </div>
                </div>
              )
            ))}
          </div>
          <div className="h-12"></div>
        </div>
      )}
    </div>
  )
}