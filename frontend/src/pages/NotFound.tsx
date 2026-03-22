import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      justifyContent: 'center', height: '100vh', textAlign: 'center',
      padding: '24px', backgroundColor: 'var(--bg-page)'
    }}>
      <h1 style={{ fontSize: '4rem', color: 'var(--blue-600)', marginBottom: '16px' }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Page non trouvée</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link to="/" className="btn btn-primary">
        Retourner à l'accueil
      </Link>
    </div>
  );
}
