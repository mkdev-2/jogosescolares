/**
 * Página Relatórios
 * Concentra todos os relatórios gerenciais do sistema.
 * Cada relatório é exibido em uma aba separada, controlada via query param `?tab=`.
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tabs, Typography } from 'antd'
import { Trophy } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import RelatorioEscolasPorModalidade from '../components/relatorios/RelatorioEscolasPorModalidade'

const { Title, Text } = Typography

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

const Relatorios = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'escolas-modalidade')
  const [isMobile, setIsMobile] = useState(false)

  const isAdmin = ADMIN_ROLES.includes(user?.role)

  // Detectar mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Sincronizar aba com URL
  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl)
  }, [tabFromUrl])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const tabItems = [
    {
      key: 'escolas-modalidade',
      label: (
        <span className="flex items-center gap-1.5">
          <Trophy size={14} />
          {isMobile ? 'Escolas/Modal.' : 'Escolas por Modalidade'}
        </span>
      ),
      children: <RelatorioEscolasPorModalidade />,
      hidden: !isAdmin,
    },
  ].filter((t) => !t.hidden)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Title level={4} style={{ margin: 0, color: '#042f2e' }}>Relatórios</Title>
        <Text type="secondary" style={{ fontSize: '0.9375rem' }}>
          Relatórios gerenciais e estatísticas dos Jogos Escolares.
        </Text>
      </header>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        tabBarStyle={{ marginBottom: 0 }}
        size={isMobile ? 'small' : 'middle'}
      />
    </div>
  )
}

export default Relatorios
