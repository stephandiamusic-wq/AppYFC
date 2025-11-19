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

  async function handleLogout() {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Erreur de déconnexion:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // Écran de chargement (Spinner)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A237E]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  // Cas 1 : Pas connecté -> Login
  if (!session) {
    return <Login />
  }

  // Cas 2 : Connecté mais profil vide -> Onboarding
  if (profile && (!profile.job_title || profile.job_title === '')) {
    return <Onboarding session={session} onComplete={() => fetchProfile(session.user.id)} />
  }

  // Cas 3 : Tout est prêt -> Le Dashboard
  return (
    <div className="min-h-screen bg-[#1A237E] text-gray-900 font-sans selection:bg-pink-500 selection:text-white">
      {/* Navbar Simplifiée */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-pink-500 p-2 rounded-lg shadow-lg shadow-pink-500/20">
                <span className="text-white font-bold text-xl">YFC</span>
              </div>
              <span className="font-bold text-xl text-white tracking-tight">YouFastCom</span>
            </div>
            {session && (
              <button
                onClick={handleLogout}
                className="text-sm text-blue-100 hover:text-white font-medium transition-colors bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full"
              >
                Déconnexion
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="py-8">
        <Dashboard session={session} profile={profile} onProfileUpdate={() => fetchProfile(session.user.id)} />
      </main>
      <Toaster position="bottom-center" />
    </div>
  )
}

export default App