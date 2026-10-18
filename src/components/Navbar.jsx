import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / Título */}
          <div className="flex items-center gap-3">
            <span className="bg-white text-slate-900 font-black px-2.5 py-1 rounded text-sm tracking-wider">BS</span>
            <span className="font-semibold text-base tracking-tight text-white">Sistema de Créditos</span>
          </div>

          {/* Links Desktop */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/solicitudes" className="text-slate-300 hover:text-white transition-colors">Solicitudes</Link>
            <Link to="/evaluacion" className="text-slate-300 hover:text-white transition-colors">Evaluación</Link>
            <Link to="/creditos" className="text-slate-300 hover:text-white transition-colors">Créditos</Link>
            <button className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-md border border-slate-700">Cerrar Sesión</button>
          </div>

          {/* Botón Hamburguesa Móvil */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-300 hover:text-white p-2 focus:outline-none">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menú Desplegable Móvil */}
      {isOpen && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 pt-2 pb-4 space-y-2 text-sm font-medium">
          <Link to="/solicitudes" onClick={() => setIsOpen(false)} className="block py-2 text-slate-300 hover:text-white">Solicitudes</Link>
          <Link to="/evaluacion" onClick={() => setIsOpen(false)} className="block py-2 text-slate-300 hover:text-white">Evaluación</Link>
          <Link to="/creditos" onClick={() => setIsOpen(false)} className="block py-2 text-slate-300 hover:text-white">Créditos</Link>
          <button className="w-full text-left py-2 text-rose-400">Cerrar Sesión</button>
        </div>
      )}
    </nav>
  );
}