import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import CadastroEscola from './pages/CadastroEscola'
import Dashboard from './pages/Dashboard'
import Modalidades from './pages/Modalidades'
import Categorias from './pages/Categorias'
import Usuarios from './pages/Usuarios'
import Configuracoes from './pages/Configuracoes'
import Administrativo from './pages/Administrativo'
import Gestao from './pages/Gestao'
import Atividades from './pages/Atividades'
import CadastroEstudanteAtleta from './pages/CadastroEstudanteAtleta'
import ProfessoresTecnicos from './pages/ProfessoresTecnicos'
import Equipes from './pages/Equipes'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/cadastro" element={<CadastroEscola />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<Dashboard />} />
            <Route path="/app/gestao" element={<Gestao />} />
            <Route path="/app/atividades" element={<Atividades />} />
            <Route path="/app/estudantes-atletas" element={<CadastroEstudanteAtleta />} />
            <Route path="/app/professores-tecnicos" element={<ProfessoresTecnicos />} />
            <Route path="/app/equipes" element={<Equipes />} />
            <Route path="/app/modalidades" element={<Modalidades />} />
            <Route path="/app/categorias" element={<Categorias />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/app/administrativo" element={<Administrativo />} />
            <Route path="/app/usuarios" element={<Usuarios />} />
            <Route path="/app/configuracoes" element={<Configuracoes />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
