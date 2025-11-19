import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import toast from 'react-hot-toast'

export default function ProfileSwitcher({ session, currentProfile, onUpdate }) {
    const [isOpen, setIsOpen] = useState(false)
    const [identities, setIdentities] = useState([])
    const [loading, setLoading] = useState(false)

    // Formulaire de création
    const [showCreate, setShowCreate] = useState(false)
    const [newIdentity, setNewIdentity] = useState({ job_title: '', org_name: '' })

    // Charger les identités à l'ouverture
    useEffect(() => {
        if (isOpen) fetchIdentities()
    }, [isOpen])

    const fetchIdentities = async () => {
        const { data, error } = await supabase
            .from('identities')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

        if (error) console.error(error)
        else setIdentities(data || [])
    }

    // 1. Créer une nouvelle identité
    const handleCreate = async (e) => {
        e.preventDefault()
        if (!newIdentity.job_title || !newIdentity.org_name) return

        setLoading(true)
        const { error } = await supabase.from('identities').insert({
            user_id: session.user.id,
            job_title: newIdentity.job_title,
            org_name: newIdentity.org_name
        })

        if (error) {
            toast.error("Erreur lors de la création")
        } else {
            toast.success("Nouveau profil ajouté !")
            setNewIdentity({ job_title: '', org_name: '' })
            setShowCreate(false)
            fetchIdentities()
        }
        setLoading(false)
    }

    // 2. Basculer vers une identité
    const handleSwitch = async (identity) => {
        setLoading(true)
        const loadingToast = toast.loading("Changement d'identité...")

        // On met à jour le profil "Actif" (celui utilisé par n8n)
        const { error } = await supabase
            .from('profiles')
            .update({
                job_title: identity.job_title,
                org_name: identity.org_name
            })
            .eq('id', session.user.id)

        if (!error) {
            await onUpdate() // On force le Dashboard à se rafraîchir
            toast.success(`Vous êtes maintenant ${identity.job_title}`, { id: loadingToast })
            setIsOpen(false)
        } else {
            toast.error("Erreur lors du changement", { id: loadingToast })
        }
        setLoading(false)
    }

    // 3. Supprimer une identité
    const handleDelete = async (e, id) => {
        e.stopPropagation() // Empêche le clic de sélectionner le profil
        if (!confirm("Supprimer ce profil définitivement ?")) return

        const { error } = await supabase.from('identities').delete().eq('id', id)
        if (!error) {
            toast.success("Profil supprimé")
            fetchIdentities()
        }
    }

    return (
        <>
            {/* LE DÉCLENCHEUR (Bouton visible sur le Dashboard) */}
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition active:scale-95 group ml-2"
            >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <div className="text-left leading-tight">
                    <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Actif</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:underline decoration-blue-300 underline-offset-2">
                        {currentProfile?.job_title || 'Configurer'}
                    </div>
                </div>
                <span className="text-gray-400 text-xs ml-1">▼</span>
            </button>

            {/* LA MODALE (Fenêtre surgissante) */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Fond sombre (Backdrop) */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* Contenu de la fenêtre */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10 animate-fade-in-up">

                        {/* En-tête */}
                        <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Changer d'identité</h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl">&times;</button>
                        </div>

                        {/* Liste des profils */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {identities.length > 0 ? (
                                <div className="space-y-2">
                                    {identities.map((id) => {
                                        const isActive = currentProfile?.job_title === id.job_title && currentProfile?.org_name === id.org_name
                                        return (
                                            <div
                                                key={id.id}
                                                onClick={() => handleSwitch(id)}
                                                className={`relative group flex items-center justify-between p-3 rounded-xl cursor-pointer border-2 transition-all ${isActive
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                    }`}
                                            >
                                                <div>
                                                    <div className={`font-bold ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                                        {id.job_title}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{id.org_name}</div>
                                                </div>

                                                {isActive && <span className="text-blue-500 font-bold text-xl">✓</span>}

                                                {/* Bouton Supprimer (visible au survol) */}
                                                {!isActive && (
                                                    <button
                                                        onClick={(e) => handleDelete(e, id.id)}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-2 transition"
                                                        title="Supprimer ce profil"
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-400 text-sm">
                                    Aucun autre profil enregistré.
                                </div>
                            )}
                        </div>

                        {/* Pied de page : Création */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                            {!showCreate ? (
                                <button
                                    onClick={() => setShowCreate(true)}
                                    className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-blue-500 hover:text-blue-600 transition font-medium flex items-center justify-center gap-2"
                                >
                                    <span>➕</span> Créer un nouveau profil
                                </button>
                            ) : (
                                <form onSubmit={handleCreate} className="space-y-3 animate-fade-in">
                                    <input
                                        autoFocus
                                        placeholder="Titre (ex: Président d'Agglo)"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newIdentity.job_title}
                                        onChange={e => setNewIdentity({ ...newIdentity, job_title: e.target.value })}
                                        required
                                    />
                                    <input
                                        placeholder="Organisation (ex: Grand Paris)"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newIdentity.org_name}
                                        onChange={e => setNewIdentity({ ...newIdentity, org_name: e.target.value })}
                                        required
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreate(false)}
                                            className="flex-1 py-2 text-gray-500 hover:bg-gray-200 rounded-lg transition"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                        >
                                            {loading ? '...' : 'Sauvegarder'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </>
    )
}
