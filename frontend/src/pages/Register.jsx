import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Username et mot de passe requis');
      return;
    }
    try {
      await register(username, password, role);
      navigate('/');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Inscription impossible';
      toast.error(msg);
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
          <div className="login-sub">Créer un compte</div>
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
        <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">Utilisateur</option>
          <option value="admin">Admin</option>
          <option value="chef_chaine">Chef de chaîne</option>
        </select>
        <button className="w-full btn btn-primary">S'inscrire</button>
        <p className="text-sm text-center text-slate-600">
          Déjà un compte ? <Link to="/login" className="text-indigo-600 hover:underline">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
