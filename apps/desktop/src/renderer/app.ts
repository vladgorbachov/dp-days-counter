// Global type declarations
declare global {
  interface Window {
    electronAPI: {
      loadDPHours: () => Promise<Record<string, number>>;
      saveDPHours: (data: Record<string, number>) => Promise<boolean>;
      loadSettings: () => Promise<any>;
      saveSettings: (data: any) => Promise<boolean>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
    };
  }
}

// Types
interface DPHours {
  [date: string]: number;
}

interface AppSettings {
  theme: 'light' | 'dark';
}

interface CalendarDay {
  date: string;
  day: number;
  isToday: boolean;
  hasHours: boolean;
  hours: number;
}

// Utility functions
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};

const getMonthInfo = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const firstDayIndex = firstDay.getDay();
  
  return {
    year,
    month,
    firstDay,
    lastDay,
    daysInMonth,
    firstDayIndex
  };
};

const validateHoursInput = (input: string): number | null => {
  const hours = parseInt(input);
  return Number.isInteger(hours) && hours >= 0 && hours <= 24 ? hours : null;
};

// Main application class
class DPHoursCounter {
  private currentDate: Date;
  private dpHours: DPHours;
  private settings: AppSettings;
  private selectedDate: string | null = null;
  private sidebarVisible = false;
  private sidebarHideTimer: number | null = null;

  constructor() {
    this.currentDate = new Date();
    this.dpHours = {};
    this.settings = { theme: 'dark' };
    
    this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    await this.loadData();
    this.setupEventListeners();
    this.renderCalendar();
    this.updateSummary();
    this.applyTheme();
  }

  private async loadData(): Promise<void> {
    try {
      this.dpHours = await window.electronAPI.loadDPHours();
      this.settings = await window.electronAPI.loadSettings();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private async saveData(): Promise<void> {
    try {
      await window.electronAPI.saveDPHours(this.dpHours);
      await window.electronAPI.saveSettings(this.settings);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  private setupEventListeners(): void {
    // Window controls
    document.getElementById('minimizeBtn')?.addEventListener('click', () => {
      window.electronAPI.minimizeWindow();
    });

    document.getElementById('maximizeBtn')?.addEventListener('click', () => {
      window.electronAPI.maximizeWindow();
    });

    document.getElementById('closeBtn')?.addEventListener('click', () => {
      window.electronAPI.closeWindow();
    });

    // Calendar navigation
    document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.renderCalendar();
      this.updateSummary();
    });

    document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.renderCalendar();
      this.updateSummary();
    });

    // Theme controls
    document.getElementById('lightThemeBtn')?.addEventListener('click', () => {
      this.setTheme('light');
    });

    document.getElementById('darkThemeBtn')?.addEventListener('click', () => {
      this.setTheme('dark');
    });

    // Update button
    document.getElementById('checkUpdatesBtn')?.addEventListener('click', () => {
      alert('You are using the latest version!');
    });

    // Sidebar controls
    const sidebarTrigger = document.getElementById('sidebarTrigger');
    const sidebar = document.getElementById('sidebar');

    sidebarTrigger?.addEventListener('mouseenter', () => {
      this.showSidebar();
    });

    sidebarTrigger?.addEventListener('mouseleave', () => {
      this.startSidebarHideTimer();
    });

    sidebar?.addEventListener('mouseenter', () => {
      this.stopSidebarHideTimer();
    });

    sidebar?.addEventListener('mouseleave', () => {
      this.startSidebarHideTimer();
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideModal();
      }
    });

    // Modal events
    this.setupModalEvents();
  }

  private setupModalEvents(): void {
    const modal = document.getElementById('hoursModal');
    const hoursInput = document.getElementById('hoursInput') as HTMLInputElement;
    const decreaseBtn = document.getElementById('decreaseBtn');
    const increaseBtn = document.getElementById('increaseBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    // Hours input validation
    hoursInput?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      target.value = target.value.replace(/[^0-9]/g, '');
    });

    // Decrease button
    decreaseBtn?.addEventListener('click', () => {
      const currentValue = parseInt(hoursInput.value) || 0;
      if (currentValue > 0) {
        hoursInput.value = (currentValue - 1).toString();
      }
    });

    // Increase button
    increaseBtn?.addEventListener('click', () => {
      const currentValue = parseInt(hoursInput.value) || 0;
      if (currentValue < 24) {
        hoursInput.value = (currentValue + 1).toString();
      }
    });

    // Save button
    saveBtn?.addEventListener('click', () => {
      this.saveHours();
    });

    // Cancel button
    cancelBtn?.addEventListener('click', () => {
      this.hideModal();
    });

    // Modal close button
    modalCloseBtn?.addEventListener('click', () => {
      this.hideModal();
    });

    // Keyboard events for modal
    hoursInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.saveHours();
      } else if (e.key === 'Escape') {
        this.hideModal();
      }
    });

    // Close modal when clicking outside
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideModal();
      }
    });
  }

  private renderCalendar(): void {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;

    calendarGrid.innerHTML = '';

    const monthInfo = getMonthInfo(this.currentDate);
    const { year, month, daysInMonth, firstDayIndex } = monthInfo;

    // Update month text
    const currentMonthText = document.getElementById('currentMonthText');
    if (currentMonthText) {
      currentMonthText.textContent = this.currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      }).toUpperCase();
    }

    const today = new Date();

    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyDay = this.createCalendarDayElement('');
      calendarGrid.appendChild(emptyDay);
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDate(new Date(year, month, day));
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const hours = this.dpHours[dateString] || 0;
      const hasHours = hours > 0;

      const dayElement = this.createCalendarDayElement(day.toString(), {
        date: dateString,
        day,
        isToday,
        hasHours,
        hours
      });

      calendarGrid.appendChild(dayElement);
    }

    // Add empty cells to complete the grid (5 rows * 7 columns = 35)
    const totalCells = firstDayIndex + daysInMonth;
    const remainingCells = 35 - totalCells;

    for (let i = 0; i < remainingCells; i++) {
      const emptyDay = this.createCalendarDayElement('');
      calendarGrid.appendChild(emptyDay);
    }
  }

  private createCalendarDayElement(content: string, dayData?: CalendarDay): HTMLElement {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = content;

    if (dayData) {
      if (dayData.isToday) {
        dayElement.classList.add('today');
      }
      if (dayData.hasHours) {
        dayElement.classList.add('has-hours');
        dayElement.setAttribute('data-hours', dayData.hours.toString());
      }

      dayElement.addEventListener('click', (e) => {
        this.handleDayClick(dayData.date, e);
      });
    }

    return dayElement;
  }

  private handleDayClick(dateString: string, event: MouseEvent): void {
    this.selectedDate = dateString;
    this.showHoursModal(dateString);
  }

  private showHoursModal(dateString: string): void {
    const modal = document.getElementById('hoursModal');
    const dateDisplay = document.getElementById('modalDateDisplay');
    const hoursInput = document.getElementById('hoursInput') as HTMLInputElement;

    if (modal && dateDisplay && hoursInput) {
      const date = parseDate(dateString);
      dateDisplay.textContent = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const currentHours = this.dpHours[dateString] || 0;
      hoursInput.value = currentHours.toString();

      modal.classList.add('visible');
      hoursInput.focus();
      hoursInput.select();
    }
  }

  private hideModal(): void {
    const modal = document.getElementById('hoursModal');
    modal?.classList.remove('visible');
  }

  private saveHours(): void {
    const hoursInput = document.getElementById('hoursInput') as HTMLInputElement;
    if (!hoursInput || !this.selectedDate) return;

    const validatedHours = validateHoursInput(hoursInput.value);
    
    if (validatedHours === null) {
      alert('Please enter a number between 0 and 24.');
      return;
    }

    if (validatedHours > 0) {
      this.dpHours[this.selectedDate] = validatedHours;
    } else {
      delete this.dpHours[this.selectedDate];
    }

    this.saveData();
    this.hideModal();
    this.renderCalendar();
    this.updateSummary();
  }

  private updateSummary(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    let monthTotal = 0;
    const monthDays = new Set<string>();

    Object.entries(this.dpHours).forEach(([dateString, hours]) => {
      if (hours <= 0) return;

      const date = parseDate(dateString);
      
      if (date.getFullYear() === year && date.getMonth() === month) {
        monthTotal += hours;
        monthDays.add(dateString);
      }
    });

    // Update UI
    const monthHoursText = document.getElementById('monthHoursText');
    const monthDaysText = document.getElementById('monthDaysText');

    if (monthHoursText) monthHoursText.textContent = monthTotal.toString();
    if (monthDaysText) monthDaysText.textContent = monthDays.size.toString();
  }

  private setTheme(theme: 'light' | 'dark'): void {
    this.settings.theme = theme;
    this.saveData();
    this.applyTheme();
  }

  private applyTheme(): void {
    const body = document.body;
    const lightThemeBtn = document.getElementById('lightThemeBtn');
    const darkThemeBtn = document.getElementById('darkThemeBtn');

    if (this.settings.theme === 'light') {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
      lightThemeBtn?.classList.add('active');
      darkThemeBtn?.classList.remove('active');
    } else {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
      darkThemeBtn?.classList.add('active');
      lightThemeBtn?.classList.remove('active');
    }
  }

  private showSidebar(): void {
    if (!this.sidebarVisible) {
      this.sidebarVisible = true;
      this.stopSidebarHideTimer();
      
      const sidebar = document.getElementById('sidebar');
      sidebar?.classList.add('visible');
    }
  }

  private hideSidebar(): void {
    if (this.sidebarVisible) {
      this.sidebarVisible = false;
      
      const sidebar = document.getElementById('sidebar');
      sidebar?.classList.remove('visible');
    }
  }

  private startSidebarHideTimer(): void {
    this.stopSidebarHideTimer();
    this.sidebarHideTimer = window.setTimeout(() => {
      this.hideSidebar();
    }, 1000);
  }

  private stopSidebarHideTimer(): void {
    if (this.sidebarHideTimer) {
      clearTimeout(this.sidebarHideTimer);
      this.sidebarHideTimer = null;
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DPHoursCounter();
});

export {}; 