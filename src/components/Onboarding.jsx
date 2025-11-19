import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Onboarding({ session, onComplete }) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        job_title: '',
        org_name: '',
        default_tone: 'Formel'
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase
            .from('profiles')
            .update({
                job_title: formData.job_title,
                org_name: formData.org_name,
                default_tone: formData.default_tone,
                updated_at: new Date(),
            })
            .eq('id', session.user.id)

        if (error) {
            alert('Erreur lors de la sauvegarde : ' + error.message)
        } else {
            onComplete() // Dit à l'App que c'est fini
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Initialisation</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Configurez votre identité pour que l'IA s'adapte à vous.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Titre / Fonction */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Votre Titre</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Maire, PDG, Président..."
                            value={formData.job_title}
                            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Organisation */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Organisation</label>
                        <input
                            type="text"
                            required
                            placeholder="Ex: Ville de Paris, TechCorp..."
                            value={formData.org_name}
                            onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Ton par défaut */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ton par défaut</label>
                        <select
                            value={formData.default_tone}
                            onChange={(e) => setFormData({ ...formData, default_tone: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="Formel">Formel (Institutionnel)</option>
                            <option value="Direct">Direct (Efficace)</option>
                            <option value="Chaleureux">Chaleureux (Proche)</option>
                            <option value="Neutre">Neutre</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                    >
                        {loading ? 'Configuration...' : 'Valider mon profil'}
                    </button>
                </form>
            </div>
        </div>
    )
}