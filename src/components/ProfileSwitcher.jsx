import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function ProfileSwitcher({ session, currentProfile, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [identities, setIdentities] = useState([])
  const [newIdentity, setNewIdentity] = useState({ job_title: '', org_name: '' })
  const [loading, setLoading] = useState(false)

  // Charger les identités enregistrées
  useEffect(() => {
    if (isOpen) fetchIdentities()
  }, [isOpen])

  const fetchIdentities = async () => {
    const { data } = await supabase.from('identities').select('*').order('created_at')
    setIdentities(data || [])
  }

  // 1. Créer une nouvelle identité
  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('identities').insert({
      user_id: session.user.id,
      job_title: newIdentity.job_title,
      org_name: newIdentity.org_name
    })
    if (!error) {
      setNewIdentity({ job_title: '', org_name: '' })
      fetchIdentities()
    }
    setLoading(false)
  }

  // 2. ACTIVER une identité (La magie opère ici)
  // On copie l'identité choisie dans le profil principal pour que n8n la voie
  const handleSwitch = async (identity) => {
    setLoading(true)
    
    // Mise à jour du profil actif
    const { error } = await supabase
      .from('profiles')
      .update({ 
        job_title: identity.job_title, 
        org_name: identity.org_name 
      })
      .eq('id', session.user.id)

    if (!error) {
      onUpdate() // Dit au Dashboard de se rafraîchir
      setIsOpen(false)
    }
    setLoading(false)
  }

  return (
    <div className="relative inline-block ml-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium underline decoration-dashed underline-offset-4"
      >
        (Changer)
      </button>

      {isOpen && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-fade-in">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Vos identités</h3>
          
          {/* Liste des identités */}
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {identities.map((id) => (
              <button
                key={id.id}
                onClick={() => handleSwitch(id)}
                disabled={loading}
                className={`w-full text-left p-2 rounded-lg text-xs transition ${
                  currentProfile.job_title === id.job_title && currentProfile.org_name === id.org_name
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="font-bold">{id.job_title}</div>
                <div className="opacity-75">{id.org_name}</div>
              </button>
            ))}
            {identities.length === 0 && <p className="text-xs text-gray-400 text-center">Aucune autre identité.</p>}
          </div>

          {/* Formulaire d'ajout */}
          <form onSubmit={handleCreate} className="border-t border-gray-100 dark:border-gray-700 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Ajouter un profil</p>
            <input 
              className="w-full mb-2 px-2 py-1 text-xs rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Titre (ex: PDG)"
              value={newIdentity.job_title}
              onChange={e => setNewIdentity({...newIdentity, job_title: e.target.value})}
              required
            />
            <input 
              className="w-full mb-2 px-2 py-1 text-xs rounded border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Org (ex: TechCorp)"
              value={newIdentity.org_name}
              onChange={e => setNewIdentity({...newIdentity, org_name: e.target.value})}
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gray-900 dark:bg-gray-600 text-white text-xs py-1.5 rounded hover:opacity-90"
            >
              + Créer
            </button>
          </form>

          <button onClick={() => setIsOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}
    </div>
  )
}
