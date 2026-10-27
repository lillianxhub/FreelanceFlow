import {
  FiBarChart2,
  FiBriefcase,
  FiClock,
  FiHome,
  FiUsers,
  FiColumns,
  FiDollarSign,
  FiShield,
} from 'react-icons/fi'

export const workspaceLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: FiHome },
  { to: '/task-board', label: 'Task Board', icon: FiColumns },
  { to: '/projects', label: 'Projects', icon: FiBriefcase },
  { to: '/time-tracker', label: 'Time tracker', icon: FiClock },
  { to: '/clients', label: 'Clients', icon: FiUsers },
  { to: '/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/finance', label: 'Finance', icon: FiDollarSign },
]

export const adminLink = { to: '/admin', label: 'Admin', icon: FiShield }
