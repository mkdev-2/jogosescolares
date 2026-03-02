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
            <Route path="/app/modalidades" element={<Modalidades />} />
            <Route path="/app/categorias" element={<Categorias />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/app/usuarios" element={<Usuarios />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
