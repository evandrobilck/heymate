import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Avatar from './Avatar'
import { formatDate } from '../utils/formatDate'

export default function MemberListItem({
  member,
  isPast = false,
  canManage = false,
  onMarkAsLeft,
  onMakeAdmin,
  onEditJoinedAt,
}) {
  const { t, i18n } = useTranslation()
  const [editingDate, setEditingDate] = useState(false)
  const [dateValue, setDateValue] = useState(member.joinedAt)

  function handleSaveDate(event) {
    event.preventDefault()
    if (dateValue) onEditJoinedAt(member.id, dateValue)
    setEditingDate(false)
  }

  function handleCancelDate() {
    setDateValue(member.joinedAt)
    setEditingDate(false)
  }

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

        {editingDate ? (
          <form onSubmit={handleSaveDate} className="mt-1 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-purple-500"
            />
            <button type="submit" className="text-xs font-medium text-purple-600">
              {t('vaultPage.save')}
            </button>
            <button type="button" onClick={handleCancelDate} className="text-xs font-medium text-gray-400">
              {t('vaultPage.cancel')}
            </button>
          </form>
        ) : (
          <p className="text-xs text-gray-500">
            {isPast
              ? t('housePage.period', {
                  start: formatDate(member.joinedAt, i18n.language),
                  end: formatDate(member.leftAt, i18n.language),
                })
              : t('housePage.since', { date: formatDate(member.joinedAt, i18n.language) })}
            {canManage && !isPast && (
              <button
                type="button"
                onClick={() => setEditingDate(true)}
                className="ml-2 text-xs font-medium text-purple-600 hover:text-purple-700"
              >
                {t('housePage.editJoinDate')}
              </button>
            )}
          </p>
        )}
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
