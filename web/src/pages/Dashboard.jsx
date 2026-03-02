import { Link } from 'react-router-dom'
import { Activity, Users, Calendar, BarChart3, LayoutGrid } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = ADMIN_ROLES.includes(user?.role)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        <section className="mb-10">
          <h2 className="font-['Plus_Jakarta_Sans',system-ui,sans-serif] text-[1.75rem] font-bold text-[#042f2e] m-0 mb-2">
            Bem-vindo, {user?.nome}!
          </h2>
          <p className="text-base text-[#64748b] m-0">
            Painel de administração do sistema de Jogos Escolares.
          </p>
        </section>

        <section className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          <Link
            to="/app/categorias"
            className="block no-underline cursor-pointer bg-white rounded-[16px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#f1f5f9] transition-all hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] hover:border-[#e2e8f0]"
          >
            <LayoutGrid size={28} className="mb-4 text-[#0f766e]" />
            <h3 className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-1">
              Categorias
            </h3>
            <p className="text-[0.875rem] text-[#64748b] m-0">
              Conjuntos de modalidades
            </p>
          </Link>
          <Link
            to="/app/modalidades"
            className="block no-underline cursor-pointer bg-white rounded-[16px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#f1f5f9] transition-all hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] hover:border-[#e2e8f0]"
          >
            <Activity size={28} className="mb-4 text-[#0f766e]" />
            <h3 className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-1">
              Modalidades
            </h3>
            <p className="text-[0.875rem] text-[#64748b] m-0">
              Gerencie as modalidades esportivas
            </p>
          </Link>
          {isAdmin ? (
            <Link
              to="/app/usuarios"
              className="block no-underline cursor-pointer bg-white rounded-[16px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#f1f5f9] transition-all hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] hover:border-[#e2e8f0]"
            >
              <Users size={28} className="mb-4 text-[#0f766e]" />
              <h3 className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-1">
                Usuários
              </h3>
              <p className="text-[0.875rem] text-[#64748b] m-0">
                Gerencie os usuários do sistema
              </p>
            </Link>
          ) : (
            <div className="bg-white rounded-[16px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#f1f5f9] transition-all cursor-default hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] hover:border-[#e2e8f0]">
              <Users size={28} className="mb-4 text-[#0f766e]" />
              <h3 className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-1">
                Equipes
              </h3>
              <p className="text-[0.875rem] text-[#64748b] m-0">
                Cadastre escolas e atletas
              </p>
            </div>
          )}
          <div className="bg-white rounded-[16px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#f1f5f9] transition-all cursor-default hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] hover:border-[#e2e8f0]">
            <Calendar size={28} className="mb-4 text-[#0f766e]" />
            <h3 className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-1">
              Calendário
            </h3>
            <p className="text-[0.875rem] text-[#64748b] m-0">
              Organize jogos e eventos
            </p>
          </div>
          <div className="bg-white rounded-[16px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#f1f5f9] transition-all cursor-default hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] hover:border-[#e2e8f0]">
            <BarChart3 size={28} className="mb-4 text-[#0f766e]" />
            <h3 className="text-[1.125rem] font-semibold text-[#334155] m-0 mb-1">
              Resultados
            </h3>
            <p className="text-[0.875rem] text-[#64748b] m-0">
              Acompanhe classificações e placares
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
