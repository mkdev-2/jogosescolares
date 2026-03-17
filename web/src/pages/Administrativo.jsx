import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Settings, ClipboardList, IdCard } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Usuarios from './Usuarios'
import Configuracoes from './Configuracoes'
import UsuariosPendentes from './UsuariosPendentes'
import Credenciais from './Credenciais'
import Midias from './noticias/Midias'
import { Image } from 'lucide-react'

const ALL_TABS = [
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'usuarios-pendentes', label: 'Solicitações de Adesão', icon: ClipboardList, adminOnly: true },
  { id: 'credenciais', label: 'Credenciais', icon: IdCard, adminOnly: true },
  { id: 'configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
]

export default function Administrativo() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role)
  const TABS = ALL_TABS.filter((t) => !t.adminOnly || isAdmin)
  const TAB_IDS = TABS.map((t) => t.id)
  const tabFromUrl = searchParams.get('tab') || 'usuarios'
  const [activeTab, setActiveTab] = useState(TAB_IDS.includes(tabFromUrl) ? tabFromUrl : 'usuarios')

  useEffect(() => {
    const t = searchParams.get('tab') || 'usuarios'
    if (TAB_IDS.includes(t)) setActiveTab(t)
    else setActiveTab('usuarios')
  }, [searchParams, TAB_IDS])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          Administrativo
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          Centralize o controle de usuários e configurações em um único painel.
        </p>
      </header>

      <div className="bg-white rounded-[12px] border border-[#f1f5f9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="flex gap-0 p-2 border-b border-[#f1f5f9]">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearchParams(tab.id === 'usuarios' ? {} : { tab: tab.id })
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-[10px] font-medium text-[0.9375rem] transition-colors border-0 cursor-pointer ${isActive
                    ? 'bg-[#f1f5f9] text-[#0f766e]'
                    : 'bg-transparent text-[#1e293b] hover:bg-[#f8fafc]'
                  }`}
              >
                <Icon size={20} className={isActive ? 'text-[#0f766e]' : 'text-[#1e293b]'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="p-6">
          {activeTab === 'usuarios' && <Usuarios embedded />}
          {activeTab === 'usuarios-pendentes' && <UsuariosPendentes embedded />}
          {activeTab === 'credenciais' && <Credenciais embedded />}
          {activeTab === 'configuracoes' && <Configuracoes embedded />}
        </div>
      </div>
    </div>
  )
}
