import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { ConfigProvider } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import { AuthProvider } from './contexts/AuthContext'

const antdTheme = {
  token: {
    colorPrimary: '#0f766e',
    borderRadius: 8,
  },
  components: {
    Select: { zIndexPopup: 1200 },
    DatePicker: { zIndexPopup: 1200 },
  },
}

import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import CadastroEscola from './pages/CadastroEscola'
import Dashboard from './pages/Dashboard'
import Usuarios from './pages/Usuarios'
import Configuracoes from './pages/Configuracoes'
import Administrativo from './pages/Administrativo'
import Auditoria from './pages/Auditoria'
import Gestao from './pages/Gestao'
import Atividades from './pages/Atividades'
import CadastroEstudanteAtleta from './pages/CadastroEstudanteAtleta'
import ProfessoresTecnicos from './pages/ProfessoresTecnicos'
import Equipes from './pages/Equipes'
import MinhaConta from './pages/MinhaConta'
import CriarCampeonato from './pages/CriarCampeonato'
import CampeonatoDetalhe from './pages/CampeonatoDetalhe'
import Relatorios from './pages/Relatorios'
import Resultados from './pages/Resultados'
import ResultadoDetalhe from './pages/ResultadoDetalhe'

function App() {
  return (
    <ConfigProvider theme={antdTheme} locale={ptBR}>
      <Analytics />
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/cadastro" element={<CadastroEscola />} />
          <Route path="/login" element={<Login />} />
          <Route path="/resultados" element={<Resultados />} />
          <Route path="/resultados/:id" element={<ResultadoDetalhe />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<Dashboard />} />
            <Route path="/app/minha-conta" element={<MinhaConta />} />
            <Route path="/app/gestao" element={<Gestao />} />
            <Route path="/app/atividades" element={<Atividades />} />
            <Route path="/app/estudantes-atletas" element={<CadastroEstudanteAtleta />} />
            <Route path="/app/professores-tecnicos" element={<ProfessoresTecnicos />} />
            <Route path="/app/equipes" element={<Equipes />} />
            <Route path="/app/modalidades" element={<Navigate to="/app/atividades" replace />} />
            <Route path="/app/categorias" element={<Navigate to="/app/atividades" replace />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/app/administrativo" element={<Administrativo />} />
            <Route path="/app/usuarios" element={<Usuarios />} />
            <Route path="/app/configuracoes" element={<Configuracoes />} />
            <Route path="/app/auditoria" element={<Auditoria />} />
            <Route path="/app/criar-campeonato" element={<CriarCampeonato />} />
            <Route path="/app/campeonatos/:id" element={<CampeonatoDetalhe />} />
            <Route path="/app/relatorios" element={<Relatorios />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  )
}

export default App
