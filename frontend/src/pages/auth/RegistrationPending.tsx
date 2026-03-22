import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function RegistrationPending() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        
        {/* Icône de sablier ou attente */}
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Vérification en cours
        </h1>
        
        <p className="text-gray-600 mb-8">
          Bonjour <strong>{user?.prenom} {user?.nom}</strong>, votre compte est actuellement en cours d'examen par nos administrateurs.
          <br /><br />
          Pour garantir la sécurité de la plateforme, nous vérifions manuellement chaque profil de praticien. Vous aurez accès à toutes les fonctionnalités dès que votre compte sera validé.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
            Cette étape prend généralement moins de 24 heures.
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Retour à la page de connexion
          </button>
        </div>
      </div>
    </div>
  );
}
