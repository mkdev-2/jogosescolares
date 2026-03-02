import { Link } from 'react-router-dom'
import { Activity, Users, Calendar, BarChart3 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './Dashboard.css'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="dashboard">
      <div className="dashboard-main">
        <section className="welcome-section">
          <h2>Bem-vindo, {user?.nome}!</h2>
          <p>Painel de administração do sistema de Jogos Escolares.</p>
        </section>

        <section className="dashboard-cards">
          <Link to="/modalidades" className="card card-link">
            <Activity size={28} className="card-icon" />
            <h3>Modalidades</h3>
            <p>Gerencie as modalidades esportivas</p>
          </Link>
          <div className="card">
            <Users size={28} className="card-icon" />
            <h3>Equipes</h3>
            <p>Cadastre escolas e atletas</p>
          </div>
          <div className="card">
            <Calendar size={28} className="card-icon" />
            <h3>Calendário</h3>
            <p>Organize jogos e eventos</p>
          </div>
          <div className="card">
            <BarChart3 size={28} className="card-icon" />
            <h3>Resultados</h3>
            <p>Acompanhe classificações e placares</p>
          </div>
        </section>
      </div>
    </div>
  )
}
