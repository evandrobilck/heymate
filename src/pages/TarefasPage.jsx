import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTasks } from '../contexts/TasksContext'
import TaskListItem from '../components/TaskListItem'
import AddTaskForm from '../components/AddTaskForm'

export default function TarefasPage() {
  const { t } = useTranslation()
  const { tasks } = useTasks()
  const [showForm, setShowForm] = useState(false)

  const pendingTasks = tasks.filter((task) => !task.completed)
  const doneTasks = tasks.filter((task) => task.completed)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{t('nav.tasks')}</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          + {t('tasksPage.addTask')}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">{t('tasksPage.todoTitle')}</h2>
        {pendingTasks.length === 0 && <p className="text-sm text-gray-400">{t('tasksPage.noPending')}</p>}
        <ul className="space-y-2">
          {pendingTasks.map((task) => (
            <TaskListItem key={task.id} task={task} />
          ))}
        </ul>
      </div>

      {doneTasks.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">{t('tasksPage.doneTitle')}</h2>
          <ul className="space-y-2 opacity-60">
            {doneTasks.map((task) => (
              <TaskListItem key={task.id} task={task} />
            ))}
          </ul>
        </div>
      )}

      {showForm && <AddTaskForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
