/**
 * Página Minha Conta (Meu Perfil)
 * Perfil do usuário logado com edição de perfil e alteração de senha, no modelo UserProfile.
 */

import { useState, useEffect, useRef } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Alert,
  Space,
  Descriptions,
  Typography,
  Tabs,
  Avatar,
} from 'antd'
import { User, Mail, Lock, Save, Edit, X, Camera, Trash2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/authService'
import { uploadFotoPerfil, fetchStorageBlob } from '../services/storageService'

const { Title, Text } = Typography

function formatCpf(cpf) {
  if (!cpf) return '—'
  const s = String(cpf).replace(/\D/g, '')
  if (s.length !== 11) return cpf
  return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  DIRETOR: 'Diretor',
  COORDENADOR: 'Coordenador',
  MESARIO: 'Mesário',
}

const MAX_PHOTO_SIZE_MB = 5

export default function MinhaConta() {
  const { user, refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState('perfil')
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()

  const [photoPreview, setPhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(null)
  const [avatarBlobUrl, setAvatarBlobUrl] = useState(null)
  const avatarBlobRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        nome: user.nome || '',
        email: user.email || '',
      })
      setCurrentPhotoUrl(user.foto_url || null)
    }
  }, [user, profileForm])

  useEffect(() => {
    if (!currentPhotoUrl || photoPreview) {
      if (avatarBlobRef.current) {
        URL.revokeObjectURL(avatarBlobRef.current)
        avatarBlobRef.current = null
      }
      setAvatarBlobUrl(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const blob = await fetchStorageBlob(currentPhotoUrl)
        if (cancelled) return
        const u = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(u)
          return
        }
        if (avatarBlobRef.current) {
          URL.revokeObjectURL(avatarBlobRef.current)
        }
        avatarBlobRef.current = u
        setAvatarBlobUrl(u)
      } catch {
        if (!cancelled) setAvatarBlobUrl(null)
      }
    })()
    return () => {
      cancelled = true
      if (avatarBlobRef.current) {
        URL.revokeObjectURL(avatarBlobRef.current)
        avatarBlobRef.current = null
      }
    }
  }, [currentPhotoUrl, photoPreview])

  const handleSaveProfile = async (values) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const hasChanges = values.nome !== user.nome || values.email !== (user.email || '')
      if (!hasChanges) {
        setError('Nenhuma alteração foi feita')
        setLoading(false)
        return
      }
      await authService.updateMe({
        nome: values.nome?.trim(),
        email: values.email?.trim() || null,
      })
      await refreshUser()
      setSuccess('Perfil atualizado com sucesso!')
      setIsEditingProfile(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Erro ao atualizar perfil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (values) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await authService.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      setSuccess('Senha alterada com sucesso!')
      passwordForm.resetFields()
      setIsChangingPassword(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Erro ao alterar senha. Verifique se a senha atual está correta.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelProfile = () => {
    profileForm.setFieldsValue({
      nome: user.nome || '',
      email: user.email || '',
    })
    setIsEditingProfile(false)
    setError(null)
  }

  const handleCancelPassword = () => {
    passwordForm.resetFields()
    setIsChangingPassword(false)
    setError(null)
  }

  const validateImageFile = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem.')
      return false
    }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      setError(`A imagem deve ter no máximo ${MAX_PHOTO_SIZE_MB}MB.`)
      return false
    }
    return true
  }

  const handlePhotoSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!validateImageFile(file)) return
    try {
      const reader = new FileReader()
      reader.onload = (e) => setPhotoPreview(e.target.result)
      reader.readAsDataURL(file)
      await uploadProfilePhoto(file)
    } catch (err) {
      setError('Erro ao processar a foto. Tente novamente.')
    }
  }

  const uploadProfilePhoto = async (file) => {
    if (!file) return
    setUploadingPhoto(true)
    setError(null)
    setSuccess(null)
    try {
      const imageUrl = await uploadFotoPerfil(file)
      await authService.updateMe({ foto_url: imageUrl })
      setCurrentPhotoUrl(imageUrl)
      setPhotoPreview(null)
      await refreshUser()
      setSuccess('Foto de perfil atualizada com sucesso!')
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Erro ao fazer upload da foto. Tente novamente.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const removeProfilePhoto = async () => {
    if (!currentPhotoUrl) return
    setUploadingPhoto(true)
    setError(null)
    setSuccess(null)
    try {
      await authService.updateMe({ foto_url: null })
      setCurrentPhotoUrl(null)
      setPhotoPreview(null)
      await refreshUser()
      setSuccess('Foto de perfil removida com sucesso!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Erro ao remover foto. Tente novamente.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const tabItems = [
    { key: 'perfil', label: 'Editar Perfil', icon: <User size={16} /> },
    { key: 'senha', label: 'Alterar Senha', icon: <Lock size={16} /> },
  ]

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Text type="secondary">Carregando informações do usuário...</Text>
      </div>
    )
  }

  const avatarSrc = photoPreview || avatarBlobUrl

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#042f2e] mb-2">Meu Perfil</h1>
          <p className="text-[#64748b]">
            Gerencie suas informações pessoais e segurança da conta
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 24 }}
          />
        )}
        {success && (
          <Alert
            message={success}
            type="success"
            showIcon
            closable
            onClose={() => setSuccess(null)}
            style={{ marginBottom: 24 }}
          />
        )}

        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems.map((item) => ({
              key: item.key,
              label: (
                <span className="flex items-center gap-2">
                  {item.icon}
                  {item.label}
                </span>
              ),
            }))}
            style={{ marginBottom: 24 }}
          />

          {activeTab === 'perfil' && (
            <Form
              form={profileForm}
              layout="vertical"
              onFinish={handleSaveProfile}
              initialValues={{ nome: user.nome || '', email: user.email || '' }}
            >
              <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <div style={{ marginBottom: 16 }}>
                  <Title level={4}>Foto de Perfil</Title>
                  <Text type="secondary">Atualize sua foto de perfil</Text>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <Avatar
                    size={120}
                    src={avatarSrc}
                    style={{
                      backgroundColor: avatarSrc ? 'transparent' : '#0f766e',
                      border: '3px solid #d9d9d9',
                      cursor: 'default',
                    }}
                  >
                    {!avatarSrc && (user?.nome?.charAt(0)?.toUpperCase() || 'U')}
                  </Avatar>
                  <Space direction="vertical" size="small">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      style={{ display: 'none' }}
                    />
                    <Space>
                      <Button
                        type="primary"
                        icon={<Camera size={16} />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        loading={uploadingPhoto}
                        className="bg-[#0f766e] hover:bg-[#0d9488]"
                      >
                        {uploadingPhoto ? 'Enviando...' : 'Alterar Foto'}
                      </Button>
                      {currentPhotoUrl && (
                        <Button
                          danger
                          icon={<Trash2 size={16} />}
                          onClick={removeProfilePhoto}
                          disabled={uploadingPhoto}
                        >
                          Remover Foto
                        </Button>
                      )}
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Formatos aceitos: JPG, PNG, GIF (máx. {MAX_PHOTO_SIZE_MB}MB)
                    </Text>
                  </Space>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <Title level={4}>Informações Pessoais</Title>
                <Text type="secondary">Atualize suas informações de perfil</Text>
              </div>

              {isEditingProfile ? (
                <>
                  <Form.Item
                    label="Nome completo"
                    name="nome"
                    rules={[
                      { required: true, message: 'Nome é obrigatório' },
                      { min: 3, message: 'Nome deve ter no mínimo 3 caracteres' },
                    ]}
                  >
                    <Input
                      prefix={<User size={16} style={{ color: '#94a3b8' }} />}
                      placeholder="Seu nome completo"
                      size="large"
                      disabled={loading}
                    />
                  </Form.Item>
                  <Form.Item
                    label="Email"
                    name="email"
                    rules={[
                      { required: true, message: 'Email é obrigatório' },
                      { type: 'email', message: 'Email inválido' },
                    ]}
                  >
                    <Input
                      prefix={<Mail size={16} style={{ color: '#94a3b8' }} />}
                      placeholder="seu@email.com"
                      size="large"
                      disabled={loading}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        icon={<Save size={16} />}
                        htmlType="submit"
                        loading={loading}
                        disabled={loading}
                        className="bg-[#0f766e] hover:bg-[#0d9488]"
                      >
                        Salvar Alterações
                      </Button>
                      <Button icon={<X size={16} />} onClick={handleCancelProfile} disabled={loading}>
                        Cancelar
                      </Button>
                    </Space>
                  </Form.Item>
                </>
              ) : (
                <>
                  <div
                    style={{
                      marginBottom: 16,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Title level={5}>Dados do Perfil</Title>
                    <Button
                      type="primary"
                      icon={<Edit size={14} />}
                      onClick={() => setIsEditingProfile(true)}
                      size="small"
                      className="bg-[#0f766e] hover:bg-[#0d9488]"
                    >
                      Editar
                    </Button>
                  </div>
                  <Descriptions column={1} bordered>
                    <Descriptions.Item label="Nome">{user.nome || 'Não informado'}</Descriptions.Item>
                    <Descriptions.Item label="CPF">{formatCpf(user.cpf) || 'Não informado'}</Descriptions.Item>
                    <Descriptions.Item label="Email">{user.email || 'Não informado'}</Descriptions.Item>
                    <Descriptions.Item label="Perfil">{ROLE_LABELS[user.role] || user.role}</Descriptions.Item>
                    {user.escola_nome && (
                      <Descriptions.Item label="Escola">{user.escola_nome}</Descriptions.Item>
                    )}
                  </Descriptions>
                </>
              )}
            </Form>
          )}

          {activeTab === 'senha' && (
            <>
              <div style={{ marginBottom: 24 }}>
                <Title level={4}>Alterar Senha</Title>
                <Text type="secondary">
                  Para sua segurança, informe sua senha atual e escolha uma nova senha
                </Text>
              </div>

              {isChangingPassword ? (
                <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
                  <Form.Item
                    label="Senha Atual"
                    name="currentPassword"
                    rules={[{ required: true, message: 'Senha atual é obrigatória' }]}
                  >
                    <Input.Password
                      prefix={<Lock size={16} style={{ color: '#94a3b8' }} />}
                      placeholder="Digite sua senha atual"
                      size="large"
                      disabled={loading}
                    />
                  </Form.Item>
                  <Form.Item
                    label="Nova Senha"
                    name="newPassword"
                    rules={[
                      { required: true, message: 'Nova senha é obrigatória' },
                      { min: 6, message: 'A senha deve ter no mínimo 6 caracteres' },
                    ]}
                    help="A senha deve ter no mínimo 6 caracteres"
                  >
                    <Input.Password
                      prefix={<Lock size={16} style={{ color: '#94a3b8' }} />}
                      placeholder="Digite sua nova senha (mín. 6 caracteres)"
                      size="large"
                      disabled={loading}
                    />
                  </Form.Item>
                  <Form.Item
                    label="Confirmar Nova Senha"
                    name="confirmPassword"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: 'Confirmação de senha é obrigatória' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                          return Promise.reject(new Error('As senhas não coincidem'))
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={<Lock size={16} style={{ color: '#94a3b8' }} />}
                      placeholder="Digite novamente sua nova senha"
                      size="large"
                      disabled={loading}
                    />
                  </Form.Item>
                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        icon={<Save size={16} />}
                        htmlType="submit"
                        loading={loading}
                        disabled={loading}
                        className="bg-[#0f766e] hover:bg-[#0d9488]"
                      >
                        Alterar Senha
                      </Button>
                      <Button icon={<X size={16} />} onClick={handleCancelPassword} disabled={loading}>
                        Cancelar
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              ) : (
                <>
                  <Alert
                    message="Alterar Senha"
                    description="Para alterar sua senha, clique no botão abaixo e preencha o formulário."
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                    action={
                      <Button
                        type="primary"
                        icon={<Lock size={16} />}
                        onClick={() => setIsChangingPassword(true)}
                        className="bg-[#0f766e] hover:bg-[#0d9488]"
                      >
                        Alterar Senha
                      </Button>
                    }
                  />
                  <Card size="small" title="Dicas de Segurança">
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      <li>Use pelo menos 6 caracteres</li>
                      <li>Combine letras, números e símbolos</li>
                      <li>Não compartilhe sua senha com ninguém</li>
                      <li>Altere sua senha regularmente</li>
                    </ul>
                  </Card>
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  )
}
