import React, { useState } from 'react';
import { LayoutGrid, List, Search } from 'lucide-react';

interface ListaCardProps {
  titulo: string;
  placeholder: string;
  /** Recibe el texto de búsqueda y el modo; devuelve el contenido */
  children: (busqueda: string, modo: 'tarjetas' | 'tabla') => React.ReactNode;
}

/** Columna derecha: título, buscador y conmutador Tarjetas | Tabla. */
export const ListaCard: React.FC<ListaCardProps> = ({ titulo, placeholder, children }) => {
  const [busqueda, setBusqueda] = useState('');
  const [modo, setModo] = useState<'tarjetas' | 'tabla'>('tarjetas');

  return (
    <div className="card-itis-container">
      <header className="card-itis-header">
        <h3 className="card-itis-title">{titulo}</h3>
        <div className="card-itis-toolbar">
          <div className="search-iti-box">
            <Search size={14} />
            <input
              type="text"
              placeholder={placeholder}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="view-switch-modern">
            <button
              type="button"
              className={`btn-switch-tab${modo === 'tarjetas' ? ' active' : ''}`}
              onClick={() => setModo('tarjetas')}
            >
              <LayoutGrid size={13} />
              <span>Tarjetas</span>
            </button>
            <button
              type="button"
              className={`btn-switch-tab${modo === 'tabla' ? ' active' : ''}`}
              onClick={() => setModo('tabla')}
            >
              <List size={13} />
              <span>Tabla</span>
            </button>
          </div>
        </div>
      </header>
      {children(busqueda.trim().toLowerCase(), modo)}
    </div>
  );
};
