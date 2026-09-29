import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/');
    } catch {
      toast.error('Identifiants invalides');
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={submit} className="login-card space-y-4">
        <div className="text-center space-y-1">
          <div className="login-logo">
            <img src="/logo.png" alt="Logo atelier" />
          </div>
          <div className="login-badge">Atelier couture</div>
          <div className="login-title">Cartexia · Atelier</div>
          <div className="login-sub">Portail production · présence · rapports</div>
        </div>
        <input
          className="form-control"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nom d'utilisateur"
        />
        <input
          className="form-control"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
        />
        <button className="w-full btn btn-primary">Se connecter</button>
        <p className="text-sm text-center text-slate-600">
          Pas encore de compte ? <Link to="/register" className="text-indigo-600 hover:underline">Créer un compte</Link>
        </p>
      </form>
    </div>
  );
}
