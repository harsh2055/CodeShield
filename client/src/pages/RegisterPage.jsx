// client/src/pages/RegisterPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logoImg from '../assets/logo.png';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      const details = err.response?.data?.details;
      setError(
        details?.[0]?.message ||
        err.response?.data?.error ||
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C] px-6 relative overflow-hidden node-line">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#8083ff]/10 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#4edea3]/5 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] p-8 glass-panel rounded-xl glow-accent relative z-10">
        {/* Logo and title */}
        <div className="flex items-center gap-3 mb-6">
          <img src={logoImg} alt="CodeShield Logo" className="w-8 h-8 animate-pulse" />
          <span className="font-headline-sm text-lg font-bold text-[#c0c1ff] tracking-tight">CodeShield</span>
        </div>

        <h1 className="text-xl font-bold text-white mb-1">Create an account</h1>
        <p className="text-xs text-[#908fa0] uppercase tracking-wider mb-6">Start explaining code with AI</p>

        {error && (
          <div className="mb-4 bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] rounded-lg p-3 text-xs leading-relaxed">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-label-caps text-[#908fa0] uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
              required
              autoFocus
              className="w-full bg-[#1c1b1d] text-white border border-[#1E1E22] focus:border-[#c0c1ff] rounded-lg px-3 py-2 text-xs focus:outline-none transition-all duration-150"
            />
          </div>

          <div>
            <label className="block text-[11px] font-label-caps text-[#908fa0] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="w-full bg-[#1c1b1d] text-white border border-[#1E1E22] focus:border-[#c0c1ff] rounded-lg px-3 py-2 text-xs focus:outline-none transition-all duration-150"
            />
          </div>

          <div>
            <label className="block text-[11px] font-label-caps text-[#908fa0] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Min. 8 characters"
              required
              className="w-full bg-[#1c1b1d] text-white border border-[#1E1E22] focus:border-[#c0c1ff] rounded-lg px-3 py-2 text-xs focus:outline-none transition-all duration-150"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-2.5 bg-[#8083ff] hover:bg-[#c0c1ff] text-white hover:text-black font-semibold rounded-lg text-xs tracking-wider transition-all duration-150 active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(128,131,255,0.2)] disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-[13px] text-[#908fa0] text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[#c0c1ff] hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
