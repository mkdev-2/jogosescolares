/**
 * Componente que renderiza o ícone da modalidade pelo nome.
 * Usa lucide-react e react-icons. Usado em listas, selects e formulários.
 */
import { Zap, Trophy, Target, Award, Medal } from 'lucide-react'
import { MdSportsMartialArts, MdSportsKabaddi, MdSportsMma, MdSportsGymnastics, MdDirectionsBike, MdOutlineSurfing } from 'react-icons/md'
import { GiKimono, GiContortionist, GiVolleyballBall } from 'react-icons/gi'
import { FaChess, FaTableTennis, FaBasketballBall } from 'react-icons/fa'
import { GrSwim } from 'react-icons/gr'
import { PiSoccerBall } from 'react-icons/pi'
import { TbSkateboarding } from 'react-icons/tb'

const ICONE_MAP = {
  Zap,
  Medal,
  Award,
  Trophy,
  Target,
  MdSportsMartialArts,
  MdSportsKabaddi,
  GiKimono,
  MdSportsMma,
  FaChess,
  MdSportsGymnastics,
  GiContortionist,
  MdDirectionsBike,
  GrSwim,
  FaTableTennis,
  GiVolleyballBall,
  FaBasketballBall,
  PiSoccerBall,
  MdOutlineSurfing,
  TbSkateboarding,
}

export const MODALIDADE_ICONES = Object.keys(ICONE_MAP)

export default function ModalidadeIcon({ icone = 'Zap', size = 20, className = '' }) {
  const key = icone === 'Activity' ? 'Zap' : icone
  const IconComponent = ICONE_MAP[key] || Zap
  return <IconComponent size={size} className={className} />
}
