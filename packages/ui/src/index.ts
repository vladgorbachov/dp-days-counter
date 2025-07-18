// Types
export interface DPDays {
  [date: string]: number;
}

export interface AppSettings {
  theme: 'light' | 'dark';
}

export interface CalendarDay {
  date: string;
  day: number;
  isToday: boolean;
  hasHours: boolean;
  hours: number;
}

// Theme types
export interface ThemeColors {
  bg: string;
  surface: string;
  primary: string;
  primaryVariant: string;
  secondary: string;
  textPrimary: string;
  textSecondary: string;
  error: string;
  card: string;
  border: string;
  hours: string;
  headerBg: string;
  statsBg: string;
  statsText: string;
}

export interface Theme {
  name: 'light' | 'dark';
  colors: ThemeColors;
}

// UI Component types
export interface CalendarProps {
  currentDate: Date;
  dpDays: DPDays;
  onDayClick: (dateString: string, event: MouseEvent) => void;
}

export interface ModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (hours: number) => void;
  dateString: string;
  currentHours: number;
}

export interface SidebarProps {
  isVisible: boolean;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onCheckUpdates: () => void;
} 