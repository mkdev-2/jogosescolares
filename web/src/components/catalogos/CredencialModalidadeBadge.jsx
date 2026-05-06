/**
 * Badge de modalidade na credencial (preview em Mídias e captura para PDF).
 * Somente o nome da modalidade, sem ícone.
 */
export function credencialModalidadeMetrics(layoutFontSize) {
  const fontSize = Math.max(
    8,
    Math.min(11, Math.round((layoutFontSize ?? 20) * 0.48)),
  )
  return { fontSize }
}

const PAD_X = { left: 12, right: 12 }
/** Igual em cima e embaixo — evita sensação de “margem grande” só no topo */
const PAD_Y = 6

export default function CredencialModalidadeBadge({ esporteNome, layoutFontSize }) {
  const { fontSize } = credencialModalidadeMetrics(layoutFontSize)

  return (
    <div
      className="rounded-full bg-white border border-slate-200/90 shadow-md max-w-full min-w-0"
      style={{
        boxSizing: 'border-box',
        fontFamily: "'Sora', ui-sans-serif, system-ui, sans-serif",
        display: 'inline-flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${PAD_Y}px ${PAD_X.right}px ${PAD_Y}px ${PAD_X.left}px`,
        overflow: 'visible',
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          color: '#042f2e',
          textTransform: 'uppercase',
          textAlign: 'center',
          /* Caixa de linha próxima ao corpo das maiúsculas; line-height alto “empurra” o texto para baixo dentro do pill */
          lineHeight: 1,
          margin: 0,
          padding: 0,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          display: 'block',
          /* Acentos circunflexos ainda entram; sobe um pouco o glifo para ficar óptico ao centro do badge */
          transform: 'translateY(-0.07em)',
        }}
      >
        {esporteNome || '–'}
      </span>
    </div>
  )
}
