import { useState } from 'react'
import UsersList from '../components/catalogos/UsersList'
import UserModal from '../components/catalogos/UserModal'

export default function Usuarios() {
  const [modalOpen, setModalOpen] = useState(false)
  const [userSelecionado, setUserSelecionado] = useState(null)

  const handleNewUser = () => {
    setUserSelecionado(null)
    setModalOpen(true)
  }

  const handleEditUser = (user) => {
    setUserSelecionado(user)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setUserSelecionado(null)
  }

  const handleModalSuccess = () => {
    setModalOpen(false)
    setUserSelecionado(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.5rem] font-bold text-[#042f2e] m-0 tracking-[-0.02em]">
          Usuários
        </h1>
        <p className="text-[0.9375rem] text-[#64748b] m-0">
          Gerencie os usuários do sistema (apenas administradores)
        </p>
      </header>

      <div className="flex-1">
        <UsersList
          onNewUser={handleNewUser}
          onEditUser={handleEditUser}
        />
      </div>

      <UserModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        user={userSelecionado}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
