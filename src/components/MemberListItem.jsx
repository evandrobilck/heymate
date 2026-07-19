import { useTranslation } from 'react-i18next'
import Avatar from './Avatar'
import { formatDate } from '../utils/formatDate'

export default function MemberListItem({ member, isPast = false, canManage = false, onMarkAsLeft, onMakeAdmin }) {
  const { t, i18n } = useTranslation()

  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar name={member.name} avatarUrl={member.avatarUrl} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-900">{member.name}</p>
          {member.role === 'admin' && (
            <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
              {t('housePage.admin')}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {isPast
            ? t('housePage.period', {
                start: formatDate(member.joinedAt, i18n.language),
                end: formatDate(member.leftAt, i18n.language),
              })
            : t('housePage.since', { date: formatDate(member.joinedAt, i18n.language) })}
        </p>
      </div>
      {canManage && member.role !== 'admin' && (
        <button
          type="button"
          onClick={() => onMakeAdmin(member.id)}
          className="shrink-0 text-xs font-medium text-gray-400 hover:text-purple-600"
        >
          {t('housePage.makeAdmin')}
        </button>
      )}
      {canManage && (
        <button
          type="button"
          onClick={() => onMarkAsLeft(member.id)}
          className="shrink-0 text-xs font-medium text-gray-400 hover:text-red-600"
        >
          {t('housePage.remove')}
        </button>
      )}
    </li>
  )
}
