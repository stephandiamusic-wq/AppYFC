import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Toaster } from 'react-hot-toast'
import Login from './components/Login'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Vérifie la session au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // 2. Écoute les changements (connexion / déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fonction pour récupérer l'identité (Maire, PDG...)
  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Erreur profil:', error)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Erreur fetch:', error)
    } finally {
      setLoading(false)
    }
  }

  // Écran de chargement (Spinner)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Cas 1 : Pas connecté -> Login
  if (!session) {
    return <Login />
  }

  // Cas 2 : Connecté mais profil vide -> Onboarding
  // On vérifie si le job_title est vide
  if (profile && (!profile.job_title || profile.job_title === '')) {
    return <Onboarding session={session} onComplete={() => fetchProfile(session.user.id)} />
  }

  // Cas 3 : Tout est prêt -> Le Dashboard
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pt-6 px-4 transition-colors duration-300">

      {/* Barre de navigation simplifiée */}
      <div className="flex justify-between items-center max-w-2xl mx-auto mb-6">
        <div className="flex items-center space-x-2">
          <h1 className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">YouFastCom</h1>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Bêta
          </span>
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-red-500 hover:text-red-700 font-medium transition"
        >
          Déconnexion
        </button>
      </div>

      {/* Le cœur de l'application */}
      {/* Le cœur de l'application */}
      <Dashboard session={session} profile={profile} onProfileUpdate={() => fetchProfile(session.user.id)} />
      <Toaster position="bottom-center" />
    </div>
  )
}

export default App