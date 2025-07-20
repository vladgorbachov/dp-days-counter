// Global type declarations
declare global {
  interface Window {
    electronAPI: {
      loadDPDays: () => Promise<Record<string, number>>;
      saveDPDays: (data: Record<string, number>) => Promise<boolean>;
      loadSettings: () => Promise<any>;
      saveSettings: (data: any) => Promise<boolean>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      openExternal: (url: string) => Promise<void>;
    };
  }
}

// Types
interface DPDays {
  [date: string]: number;
}

interface AppSettings {
  theme: 'light' | 'dark';
  lastUpdateCheck?: string;
  autoUpdateCheck?: boolean;
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
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
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
class DPDaysCounter {
  private currentDate: Date;
  private dpDays: DPDays;
  private settings: AppSettings;
  private selectedDate: string | null = null;
  private startDate: Date | null = null;
  private endDate: Date | null = null;

  constructor() {
    this.currentDate = new Date();
    this.dpDays = {};
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
      this.dpDays = await window.electronAPI.loadDPDays();
      this.settings = await window.electronAPI.loadSettings();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private async saveData(): Promise<void> {
    try {
      await window.electronAPI.saveDPDays(this.dpDays);
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
      this.checkForUpdates();
    });

    // Settings modal controls
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      this.showSettingsModal();
    });

    document.getElementById('settingsModalCloseBtn')?.addEventListener('click', () => {
      this.hideSettingsModal();
    });

    document.getElementById('settingsCancelBtn')?.addEventListener('click', () => {
      this.hideSettingsModal();
    });

    // Website link - add after modal setup to ensure element exists
    this.setupWebsiteLink();

    // Date input controls
    document.getElementById('startDateInput')?.addEventListener('click', () => {
      this.showDatePicker('start');
    });

    document.getElementById('endDateInput')?.addEventListener('click', () => {
      this.showDatePicker('end');
    });

    // Context menu controls
    document.getElementById('startDateInput')?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e, 'start');
    });

    document.getElementById('endDateInput')?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e, 'end');
    });

    document.getElementById('resetDateItem')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.resetDateField();
    });

    // Hide context menu when clicking outside
    document.addEventListener('click', (e) => {
      const contextMenu = document.getElementById('contextMenu');
      if (contextMenu && !contextMenu.contains(e.target as Node)) {
        this.hideContextMenu();
      }
    });

    // Prevent context menu from closing when clicking inside it
    document.getElementById('contextMenu')?.addEventListener('click', (e) => {
      e.stopPropagation();
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
      const hours = this.dpDays[dateString] || 0;
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

      const currentHours = this.dpDays[dateString] || 0;
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

    // Check for minimum DP hours requirement
    if (validatedHours === 1) {
      alert('DP day is minimum 2 hours');
      return;
    }

    if (validatedHours > 0) {
      this.dpDays[this.selectedDate] = validatedHours;
    } else {
      delete this.dpDays[this.selectedDate];
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

    Object.entries(this.dpDays).forEach(([dateString, hours]) => {
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

  private showSettingsModal(): void {
    const modal = document.getElementById('settingsModal');
    modal?.classList.add('visible');
  }

  private hideSettingsModal(): void {
    const modal = document.getElementById('settingsModal');
    modal?.classList.remove('visible');
  }

  private showDatePicker(type: 'start' | 'end'): void {
    // Hide any other visible date pickers first
    const allPickers = document.querySelectorAll('.date-picker');
    allPickers.forEach(p => p.classList.remove('visible'));

    const pickerId = type === 'start' ? 'startDatePicker' : 'endDatePicker';
    const picker = document.getElementById(pickerId);
    
    if (picker) {
      picker.classList.add('visible');
      
      // Create calendar for date picker
      this.createDatePickerCalendar(picker, type);

      // Add click outside listener
      setTimeout(() => {
        document.addEventListener('click', this.handleClickOutside.bind(this, picker), { once: true });
      }, 0);
    }
  }

  private handleClickOutside(picker: HTMLElement, event: Event): void {
    if (!picker.contains(event.target as Node)) {
      picker.classList.remove('visible');
    }
  }

  private createDatePickerCalendar(container: HTMLElement, type: 'start' | 'end'): void {
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth() + 1; // Convert to 1-based month

    const updateCalendar = () => {
      container.innerHTML = `
        <div class="date-picker-header">
          <button class="date-picker-nav date-picker-prev">‹</button>
          <span class="date-picker-month">${new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button class="date-picker-nav date-picker-next">›</button>
        </div>
        <div class="date-picker-grid">
          <div class="date-picker-weekday">Sun</div>
          <div class="date-picker-weekday">Mon</div>
          <div class="date-picker-weekday">Tue</div>
          <div class="date-picker-weekday">Wed</div>
          <div class="date-picker-weekday">Thu</div>
          <div class="date-picker-weekday">Fri</div>
          <div class="date-picker-weekday">Sat</div>
          ${this.generateDatePickerDays(currentYear, currentMonth, type)}
        </div>
      `;

      // Add event listeners for navigation
      const prevBtn = container.querySelector('.date-picker-prev');
      const nextBtn = container.querySelector('.date-picker-next');
      
      prevBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        currentMonth--;
        if (currentMonth < 1) {
          currentMonth = 12;
          currentYear--;
        }
        updateCalendar();
      });
      
      nextBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
        updateCalendar();
      });

      // Add event listeners for date selection
      const dateDays = container.querySelectorAll('.date-picker-day:not(.empty)');
      dateDays.forEach(day => {
        day.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent closing when clicking inside
          const dateString = day.getAttribute('data-date');
          if (dateString) {
            this.selectDateFromPicker(dateString, type);
          }
        });
      });

      // Prevent closing when clicking on the header
      const header = container.querySelector('.date-picker-header');
      header?.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Prevent closing when clicking on the grid
      const grid = container.querySelector('.date-picker-grid');
      grid?.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    };

    updateCalendar();
  }

  private generateDatePickerDays(year: number, month: number, type: 'start' | 'end'): string {
    // month is 0-based in JavaScript, so we need to adjust
    const jsMonth = month - 1; // Convert to 0-based
    const firstDay = new Date(year, jsMonth, 1);
    const lastDay = new Date(year, jsMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayIndex = firstDay.getDay();

    let html = '';
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      html += '<div class="date-picker-day empty"></div>';
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, jsMonth, day);
      const dateString = formatDate(date);
      const hasHours = this.dpDays[dateString] && this.dpDays[dateString] > 0;
      
      html += `
        <div class="date-picker-day ${hasHours ? 'has-hours' : ''}" 
             data-date="${dateString}">
          ${day}
        </div>
      `;
    }

    return html;
  }

  private selectDateFromPicker(dateString: string, type: 'start' | 'end'): void {
    const date = parseDate(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    
    if (type === 'start') {
      this.startDate = new Date(date); // Create new Date object
      const startInput = document.getElementById('startDateInput') as HTMLInputElement;
      if (startInput) startInput.value = formattedDate;
    } else {
      this.endDate = new Date(date); // Create new Date object
      const endInput = document.getElementById('endDateInput') as HTMLInputElement;
      if (endInput) endInput.value = formattedDate;
    }

    // Hide the date picker
    const pickerId = type === 'start' ? 'startDatePicker' : 'endDatePicker';
    const picker = document.getElementById(pickerId);
    picker?.classList.remove('visible');

    // Calculate and update results
    this.calculateDateRangeResults();
  }

  private calculateDateRangeResults(): void {
    if (!this.startDate || !this.endDate) return;

    let totalDays = 0;
    let totalHours = 0;
    const currentDate = new Date(this.startDate);

    while (currentDate <= this.endDate) {
      const dateString = formatDate(currentDate);
      const hours = this.dpDays[dateString] || 0;
      
      if (hours > 0) {
        totalDays++;
        totalHours += hours;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Update UI
    const totalDaysResult = document.getElementById('totalDaysResult');
    const totalHoursResult = document.getElementById('totalHoursResult');
    
    if (totalDaysResult) totalDaysResult.textContent = totalDays.toString();
    if (totalHoursResult) totalHoursResult.textContent = totalHours.toString();
  }

  private showContextMenu(event: MouseEvent, type: 'start' | 'end'): void {
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu) return;

    // Store the field type for reset functionality
    (contextMenu as any).fieldType = type;

    // Position the context menu
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
    contextMenu.classList.add('visible');

    // Prevent the default context menu
    event.preventDefault();
  }

  private hideContextMenu(): void {
    const contextMenu = document.getElementById('contextMenu');
    contextMenu?.classList.remove('visible');
  }

  private resetDateField(): void {
    const contextMenu = document.getElementById('contextMenu');
    const fieldType = (contextMenu as any).fieldType;

    if (fieldType === 'start') {
      this.startDate = null;
      const startInput = document.getElementById('startDateInput') as HTMLInputElement;
      if (startInput) startInput.value = '';
    } else if (fieldType === 'end') {
      this.endDate = null;
      const endInput = document.getElementById('endDateInput') as HTMLInputElement;
      if (endInput) endInput.value = '';
    }

    // Hide context menu
    this.hideContextMenu();

    // Reset results to 0
    const totalDaysResult = document.getElementById('totalDaysResult');
    const totalHoursResult = document.getElementById('totalHoursResult');
    
    if (totalDaysResult) totalDaysResult.textContent = '0';
    if (totalHoursResult) totalHoursResult.textContent = '0';
  }

  private setupWebsiteLink(): void {
    // Wait for the element to be available
    const setupLink = () => {
      const websiteLink = document.querySelector('.website-link');
      if (websiteLink) {
        console.log('Website link found, adding click handler');
        websiteLink.addEventListener('click', () => {
          console.log('Website link clicked, opening external URL');
          window.electronAPI.openExternal('https://www.delionsoft.com');
        });
      } else {
        // Retry after a short delay if element not found
        setTimeout(setupLink, 100);
      }
    };
    
    setupLink();
  }

  private async checkForUpdates(): Promise<void> {
    try {
      const updateBtn = document.getElementById('checkUpdatesBtn');
      if (updateBtn) {
        updateBtn.textContent = 'Checking...';
        updateBtn.setAttribute('disabled', 'true');
      }

      // Get current version from package.json
      const currentVersion = '1.0.3'; // This should be read from package.json
      
      // Fetch latest version info from GitHub
      const response = await fetch('https://raw.githubusercontent.com/vladgorbachov/dp-days-counter/main/apps/desktop/version.json');
      
      if (!response.ok) {
        throw new Error('Failed to fetch update info');
      }
      
      const updateInfo = await response.json();
      
      // Update last check time
      this.settings.lastUpdateCheck = new Date().toISOString();
      await this.saveData();
      
      if (this.compareVersions(currentVersion, updateInfo.version) < 0) {
        // New version available
        this.showUpdateAvailableModal(updateInfo);
      } else {
        // Already up to date
        this.showUpToDateMessage();
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      this.showUpdateError();
    } finally {
      const updateBtn = document.getElementById('checkUpdatesBtn');
      if (updateBtn) {
        updateBtn.textContent = 'Check for Updates';
        updateBtn.removeAttribute('disabled');
      }
    }
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }
    
    return 0;
  }

  private showUpdateAvailableModal(updateInfo: any): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay visible';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Update Available</h3>
          <button class="modal-close" id="updateModalClose">✕</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 20px;">
            <strong>Version ${updateInfo.version}</strong> is now available!
          </div>
          <div style="margin-bottom: 20px;">
            <strong>What's new:</strong>
            <ul style="margin-top: 10px; padding-left: 20px;">
              ${updateInfo.changelog.map((item: string) => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          <div style="font-size: 12px; color: #64748b;">
            Released: ${updateInfo.releaseDate}
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn save-btn" id="downloadUpdate">Download Update</button>
          <button class="modal-btn cancel-btn" id="updateLater">Later</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('updateModalClose')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    document.getElementById('updateLater')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    document.getElementById('downloadUpdate')?.addEventListener('click', () => {
      window.electronAPI.openExternal(updateInfo.downloadUrl);
      document.body.removeChild(modal);
    });
  }

  private showUpToDateMessage(): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay visible';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Up to Date</h3>
          <button class="modal-close" id="upToDateModalClose">✕</button>
        </div>
        <div class="modal-body">
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
            <div style="font-size: 18px; margin-bottom: 10px;">You're using the latest version!</div>
            <div style="font-size: 14px; color: #64748b;">
              DP Days Counter is up to date with all the latest features and improvements.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn save-btn" id="upToDateOk">OK</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('upToDateModalClose')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    document.getElementById('upToDateOk')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  private showUpdateError(): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay visible';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Update Check Failed</h3>
          <button class="modal-close" id="errorModalClose">✕</button>
        </div>
        <div class="modal-body">
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <div style="font-size: 18px; margin-bottom: 10px;">Unable to check for updates</div>
            <div style="font-size: 14px; color: #64748b;">
              Please check your internet connection and try again later.
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn save-btn" id="errorOk">OK</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('errorModalClose')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    document.getElementById('errorOk')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }

  private shouldCheckForUpdates(): boolean {
    if (!this.settings.lastUpdateCheck) {
      return true;
    }
    
    const lastCheck = new Date(this.settings.lastUpdateCheck);
    const now = new Date();
    const daysSinceLastCheck = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceLastCheck >= 30; // Check once per month
  }


}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new DPDaysCounter();
  // Make app instance globally available for date picker
  (window as any).dpDaysCounter = app;
  
  // Show app immediately since loading screen already handled the delay
  document.body.style.opacity = '1';
}); 

export {}; 