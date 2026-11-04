import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ReporteDiaModal } from '../modals/ReporteDiaModal';
import { GuiaModal } from '../modals/GuiaModal';
import { ConexionesModal } from '../modals/ConexionesModal';
import { DirectivosModal } from '../modals/DirectivosModal';

interface LayoutProps {
  children: React.ReactNode;
  activeSede?: string;
  onRefreshData?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeSede = 'huancayo',
  onRefreshData,
}) => {
  const [modalReporte, setModalReporte] = useState<boolean>(false);
  const [modalGuia, setModalGuia] = useState<boolean>(false);
  const [modalConexiones, setModalConexiones] = useState<boolean>(false);
  const [modalDirectivos, setModalDirectivos] = useState<boolean>(false);

  return (
    <div className="app-container">
      <Sidebar
        onOpenReporte={() => setModalReporte(true)}
        onOpenGuia={() => setModalGuia(true)}
        onOpenConexiones={() => setModalConexiones(true)}
        onOpenDirectivos={() => setModalDirectivos(true)}
      />

      <main className="main-viewport">{children}</main>

      {/* Modales globales de la aplicación */}
      <ReporteDiaModal
        isOpen={modalReporte}
        onClose={() => setModalReporte(false)}
        sedeActual={activeSede}
      />

      <GuiaModal
        isOpen={modalGuia}
        onClose={() => setModalGuia(false)}
      />

      <ConexionesModal
        isOpen={modalConexiones}
        onClose={() => setModalConexiones(false)}
        onActualizado={onRefreshData}
      />

      <DirectivosModal
        isOpen={modalDirectivos}
        onClose={() => setModalDirectivos(false)}
      />
    </div>
  );
};
