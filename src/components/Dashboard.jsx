import { useState } from 'react'

export default function Dashboard({ session, profile }) {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  
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

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImage(file)
      setPreview(URL.createObjectURL(file))
      setResults(null)
    }
  }

  // --- NOUVEAU : Fonction de compression intelligente ---
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          // On crée un canvas pour redimensionner
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 800 // On limite la largeur à 800px (suffisant pour l'IA)
          const scaleSize = MAX_WIDTH / img.width
          
          // Si l'image est plus petite que 800px, on garde la taille originale
          const newWidth = (scaleSize < 1) ? MAX_WIDTH : img.width
          const newHeight = (scaleSize < 1) ? (img.height * scaleSize) : img.height

          canvas.width = newWidth
          canvas.height = newHeight

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, newWidth, newHeight)

          // On exporte en JPEG qualité 70% (très léger)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
          resolve(dataUrl) // C'est déjà du Base64
        }
      }
      reader.onerror = (error) => reject(error)
    })
  }
  // ----------------------------------------------------

  const handleGenerate = async (posture) => {
    if (!image) return alert("Veuillez d'abord choisir une image !")
    if (!isAnyPlatformSelected) return alert("Sélectionnez au moins une plateforme !")

    const activePlatforms = Object.keys(platforms).filter(k => platforms[k])

    setLoading(true)
    setResults(null)

    try {
      // Utilisation de la nouvelle fonction de compression
      const base64Image = await compressImage(image)
      
      const response = await fetch(import.meta.env.VITE_N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          imageBase64: base64Image, // On envoie l'image légère
          posture: posture,
          description: description,
          targetPlatforms: activePlatforms
        })
      })

      const result = await response.json()
      let content = result.data

      if (typeof content === 'string') {
        content = content.replace(/```json/g, '').replace(/```/g, '')
        try { content = JSON.parse(content) } catch (e) { console.error(e) }
      }
      
      setResults(content)

    } catch (error) {
      console.error(error)
      alert("Erreur : L'image est peut-être trop lourde ou la connexion a échoué.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 pb-20">
      
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Nouveau Post</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Postez en tant que <span className="font-semibold text-blue-600">{profile?.job_title || '...'}</span>
        </p>
      </div>

      {/* Zone Photo */}
      <div className="mb-6">
        {!preview ? (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-3 group-hover:scale-110 transition">
                <span className="text-4xl">📸</span>
              </div>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400 font-medium">Cliquez pour ajouter une photo</p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
          </label>
        ) : (
          <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
            <img src={preview} alt="Preview" className="w-full h-64 object-cover" />
            <button onClick={() => { setPreview(null); setImage(null); setResults(null); }} className="absolute top-3 right-3 bg-black/60 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm transition">✕</button>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 ml-1">
          Contexte (Optionnel)
        </label>
        <textarea
          rows="2"
          placeholder="Ex: Inauguration, victoire sportive..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition resize-none shadow-sm"
        ></textarea>
      </div>

      {/* Sélecteur de Plateformes + Avertissement */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3 ml-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Choisir les plateformes cibles
          </label>
          {!isAnyPlatformSelected && (
            <span className="text-xs font-bold text-red-500 animate-pulse bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
              ⚠️ Sélectionnez au moins un réseau
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {/* LinkedIn */}
          <button 
            onClick={() => togglePlatform('linkedin')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition border flex items-center space-x-2 ${platforms.linkedin ? 'bg-[#0077b5] text-white border-transparent shadow-md' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-300 dark:border-gray-600 grayscale opacity-60'}`}
          >
            <span>LinkedIn</span>{platforms.linkedin && <span>✓</span>}
          </button>

          {/* Facebook */}
          <button 
            onClick={() => togglePlatform('facebook')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition border flex items-center space-x-2 ${platforms.facebook ? 'bg-[#1877f2] text-white border-transparent shadow-md' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-300 dark:border-gray-600 grayscale opacity-60'}`}
          >
            <span>Facebook</span>{platforms.facebook && <span>✓</span>}
          </button>

          {/* Twitter */}
          <button 
            onClick={() => togglePlatform('twitter')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition border flex items-center space-x-2 ${platforms.twitter ? 'bg-black text-white border-transparent shadow-md' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-300 dark:border-gray-600 grayscale opacity-60'}`}
          >
            <span>X (Twitter)</span>{platforms.twitter && <span>✓</span>}
          </button>

          {/* Instagram */}
          <button 
            onClick={() => togglePlatform('instagram')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition border flex items-center space-x-2 ${platforms.instagram ? 'bg-gradient-to-r from-purple-500 to-orange-500 text-white border-transparent shadow-md' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-300 dark:border-gray-600 grayscale opacity-60'}`}
          >
            <span>Instagram</span>{platforms.instagram && <span>✓</span>}
          </button>
        </div>
      </div>

      {/* Boutons Postures */}
      <div className="grid grid-cols-1 gap-4 mb-10">
        <button 
          onClick={() => handleGenerate('incarné')} 
          disabled={loading || !image || !isAnyPlatformSelected} 
          className="group relative bg-white dark:bg-gray-800 hover:border-blue-500 border-2 border-transparent p-4 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 p-3 rounded-lg text-xl">👤</div>
              <div><h3 className="font-bold text-gray-900 dark:text-white">L'Incarné (Je)</h3><p className="text-xs text-gray-500">Parlez avec votre cœur.</p></div>
            </div>
            <div className="text-gray-300 group-hover:text-blue-500 transition">➔</div>
          </div>
        </button>

        <button 
          onClick={() => handleGenerate('institution')} 
          disabled={loading || !image || !isAnyPlatformSelected} 
          className="group relative bg-white dark:bg-gray-800 hover:border-indigo-500 border-2 border-transparent p-4 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 p-3 rounded-lg text-xl">🏛️</div>
              <div><h3 className="font-bold text-gray-900 dark:text-white">L'Institution (Nous)</h3><p className="text-xs text-gray-500">La voix officielle.</p></div>
            </div>
            <div className="text-gray-300 group-hover:text-indigo-500 transition">➔</div>
          </div>
        </button>

        <button 
          onClick={() => handleGenerate('visionnaire')} 
          disabled={loading || !image || !isAnyPlatformSelected} 
          className="group relative bg-white dark:bg-gray-800 hover:border-purple-500 border-2 border-transparent p-4 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 p-3 rounded-lg text-xl">🚀</div>
              <div><h3 className="font-bold text-gray-900 dark:text-white">Le Visionnaire (Futur)</h3><p className="text-xs text-gray-500">Inspirez et projetez.</p></div>
            </div>
            <div className="text-gray-300 group-hover:text-purple-500 transition">➔</div>
          </div>
        </button>
      </div>

      {/* Chargement */}
      {loading && (
        <div className="text-center py-8 animate-pulse">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">L'IA analyse votre image...</p>
        </div>
      )}

      {/* Résultats */}
      {results && typeof results === 'object' && (
        <div className="space-y-8 animate-fade-in-up">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-2xl">✨</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Vos brouillons sont prêts</h3>
          </div>
          
          {platforms.linkedin && results.linkedin && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="bg-[#0077b5] px-4 py-2 flex justify-between items-center">
                <span className="text-white font-bold text-sm">LinkedIn</span>
                <button onClick={() => navigator.clipboard.writeText(results.linkedin)} className="text-white text-xs hover:underline opacity-80">Copier</button>
              </div>
              <div className="p-6"><p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">{results.linkedin}</p></div>
            </div>
          )}

          {platforms.facebook && results.facebook && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="bg-[#1877f2] px-4 py-2 flex justify-between items-center">
                <span className="text-white font-bold text-sm">Facebook</span>
                <button onClick={() => navigator.clipboard.writeText(results.facebook)} className="text-white text-xs hover:underline opacity-80">Copier</button>
              </div>
              <div className="p-6"><p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">{results.facebook}</p></div>
            </div>
          )}
          
          {platforms.twitter && results.twitter && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="bg-black px-4 py-2 flex justify-between items-center">
                <span className="text-white font-bold text-sm">X (Twitter)</span>
                <button onClick={() => navigator.clipboard.writeText(results.twitter)} className="text-white text-xs hover:underline opacity-80">Copier</button>
              </div>
              <div className="p-6"><p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">{results.twitter}</p></div>
            </div>
          )}

          {platforms.instagram && results.instagram && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 px-4 py-2 flex justify-between items-center">
                <span className="text-white font-bold text-sm">Instagram</span>
                <button onClick={() => navigator.clipboard.writeText(results.instagram)} className="text-white text-xs hover:underline opacity-80">Copier</button>
              </div>
              <div className="p-6"><p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed font-sans">{results.instagram}</p></div>
            </div>
          )}

           <div className="mt-12 text-center">
            <button onClick={() => { setResults(null); setImage(null); setPreview(null); setDescription(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-gray-500 hover:text-blue-600 font-medium flex items-center justify-center mx-auto space-x-2">
              <span>🔄</span><span>Générer un autre post</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
