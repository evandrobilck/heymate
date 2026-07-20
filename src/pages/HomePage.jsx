import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import RoommateOfMonthCard from '../components/RoommateOfMonthCard'
import HomeCalendarCard from '../components/HomeCalendarCard'
import HomeBalanceCards from '../components/HomeBalanceCards'
import NextBillCard from '../components/NextBillCard'
import UpcomingTasksCard from '../components/UpcomingTasksCard'

export default function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { house } = useHouse()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {t('home.greeting', { name: user.name.split(' ')[0] })}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('home.house', { houseName: house.name })}</p>
      </div>

      <RoommateOfMonthCard />

      <div className="grid gap-4 md:grid-cols-2">
        <HomeCalendarCard />
        <HomeBalanceCards />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NextBillCard />
        <UpcomingTasksCard />
      </div>
    </div>
  )
}
