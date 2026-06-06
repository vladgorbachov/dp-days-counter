import type { AppSettings, DPDays, UpdateState } from './electron-api';

interface CalendarDay {
  date: string;
  day: number;
  isToday: boolean;
  hasHours: boolean;
  hours: number;
}

/* ------------------------------------------------------------------ *
 * Date helpers
 *
 * Storage format is `YYYY-MM-DD`. We deliberately work in the local
 * timezone in both directions: the previous code mixed local-formatted
 * keys with `new Date('YYYY-MM-DD')` (UTC midnight) which produced an
 * off-by-one day in negative timezones. parseLocalDate() rebuilds a
 * Date in the local TZ so date keys round-trip cleanly.
 * ------------------------------------------------------------------ */
const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Monday = 0, Sunday = 6. */
function mondayBasedWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function getMonthInfo(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    year,
    month,
    firstDay,
    lastDay,
    daysInMonth: lastDay.getDate(),
    firstDayIndex: mondayBasedWeekday(firstDay)
  };
}

const DP_HOURS_MIN_VALID = 2;
const DP_HOURS_MAX = 24;

function validateHoursInput(input: string): number | null {
  const hours = parseInt(input, 10);
  return Number.isInteger(hours) && hours >= 0 && hours <= DP_HOURS_MAX ? hours : null;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/* ------------------------------------------------------------------ *
 * Toast (replaces alert())
 * ------------------------------------------------------------------ */
let toastTimer: number | null = null;
function showToast(message: string, kind: 'info' | 'success' | 'error' = 'info'): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('error', 'success');
  if (kind !== 'info') el.classList.add(kind);
  el.classList.add('visible');
  if (toastTimer !== null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('visible'), 3500);
}

/* ------------------------------------------------------------------ *
 * Main app
 * ------------------------------------------------------------------ */
class DPDaysCounter {
  private currentDate: Date;
  private dpDays: DPDays = {};
  private settings: AppSettings = { theme: 'dark' };
  private selectedDate: string | null = null;
  private startDate: Date | null = null;
  private endDate: Date | null = null;
  private updateUnsubscribe: (() => void) | null = null;
  private contextMenuField: 'start' | 'end' | null = null;
  private outsideClickHandler: ((event: MouseEvent) => void) | null = null;

  constructor() {
    this.currentDate = new Date();
    void this.initializeApp();
  }

  private async initializeApp(): Promise<void> {
    await this.loadData();
    this.applyTheme();
    this.setupEventListeners();
    this.subscribeToUpdates();
    this.renderCalendar();
    this.updateSummary();
    void this.populateAppVersion();

    requestAnimationFrame(() => {
      document.body.classList.add('ready');
    });
  }

  private async loadData(): Promise<void> {
    try {
      this.dpDays = await window.electronAPI.loadDPDays();
      this.settings = await window.electronAPI.loadSettings();
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load saved data', 'error');
    }
  }

  private async saveDPDays(): Promise<void> {
    try {
      await window.electronAPI.saveDPDays(this.dpDays);
    } catch (error) {
      console.error('Error saving DP days:', error);
      showToast('Failed to save DP days', 'error');
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await window.electronAPI.saveSettings(this.settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  private async populateAppVersion(): Promise<void> {
    try {
      const version = await window.electronAPI.getAppVersion();
      const el = document.getElementById('appVersionText');
      if (el) el.textContent = `v${version}`;
    } catch (error) {
      console.error('Error reading app version:', error);
    }
  }

  /* -------------------- Event wiring -------------------- */
  private setupEventListeners(): void {
    document.getElementById('minimizeBtn')?.addEventListener('click', () => {
      void window.electronAPI.minimizeWindow();
    });
    document.getElementById('maximizeBtn')?.addEventListener('click', () => {
      void window.electronAPI.maximizeWindow();
    });
    document.getElementById('closeBtn')?.addEventListener('click', () => {
      void window.electronAPI.closeWindow();
    });

    document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
      this.renderCalendar();
      this.updateSummary();
    });
    document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
      this.renderCalendar();
      this.updateSummary();
    });

    document.getElementById('lightThemeBtn')?.addEventListener('click', () => this.setTheme('light'));
    document.getElementById('darkThemeBtn')?.addEventListener('click', () => this.setTheme('dark'));

    document.getElementById('checkUpdatesBtn')?.addEventListener('click', () => {
      void this.handleCheckForUpdates();
    });

    document.getElementById('settingsBtn')?.addEventListener('click', () => this.showSettingsModal());
    document.getElementById('settingsModalCloseBtn')?.addEventListener('click', () => this.hideSettingsModal());
    document.getElementById('settingsCancelBtn')?.addEventListener('click', () => this.hideSettingsModal());

    // Website link is in DOM since template render — direct binding, no polling.
    document.querySelector('.website-link')?.addEventListener('click', () => {
      void window.electronAPI.openExternal('https://www.delionsoft.com');
    });

    document.getElementById('startDateInput')?.addEventListener('click', () => this.showDatePicker('start'));
    document.getElementById('endDateInput')?.addEventListener('click', () => this.showDatePicker('end'));

    document.getElementById('startDateInput')?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e as MouseEvent, 'start');
    });
    document.getElementById('endDateInput')?.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e as MouseEvent, 'end');
    });

    document.getElementById('resetDateItem')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.resetDateField();
    });

    document.getElementById('contextMenu')?.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', (e) => {
      const contextMenu = document.getElementById('contextMenu');
      if (contextMenu && !contextMenu.contains(e.target as Node)) this.hideContextMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideHoursModal();
        this.hideSettingsModal();
      }
    });

    this.setupHoursModalEvents();
  }

  private setupHoursModalEvents(): void {
    const modal = document.getElementById('hoursModal');
    const hoursInput = document.getElementById('hoursInput') as HTMLInputElement | null;
    const decreaseBtn = document.getElementById('decreaseBtn');
    const increaseBtn = document.getElementById('increaseBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    hoursInput?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      target.value = target.value.replace(/[^0-9]/g, '');
    });

    decreaseBtn?.addEventListener('click', () => {
      if (!hoursInput) return;
      const current = parseInt(hoursInput.value, 10) || 0;
      if (current > 0) hoursInput.value = (current - 1).toString();
    });
    increaseBtn?.addEventListener('click', () => {
      if (!hoursInput) return;
      const current = parseInt(hoursInput.value, 10) || 0;
      if (current < DP_HOURS_MAX) hoursInput.value = (current + 1).toString();
    });

    saveBtn?.addEventListener('click', () => this.saveHours());
    cancelBtn?.addEventListener('click', () => this.hideHoursModal());
    modalCloseBtn?.addEventListener('click', () => this.hideHoursModal());

    hoursInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.saveHours();
      else if (e.key === 'Escape') this.hideHoursModal();
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.hideHoursModal();
    });
  }

  /* -------------------- Calendar rendering (Monday-first) -------------------- */
  private renderCalendar(): void {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';

    const { year, month, daysInMonth, firstDayIndex } = getMonthInfo(this.currentDate);

    const monthLabel = document.getElementById('currentMonthText');
    if (monthLabel) {
      monthLabel.textContent = this.currentDate
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        .toUpperCase();
    }

    const today = new Date();

    for (let i = 0; i < firstDayIndex; i++) {
      calendarGrid.appendChild(this.createCalendarDayElement(''));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDate(new Date(year, month, day));
      const isToday = isSameDay(today, new Date(year, month, day));
      const hours = this.dpDays[dateString] ?? 0;

      calendarGrid.appendChild(this.createCalendarDayElement(day.toString(), {
        date: dateString,
        day,
        isToday,
        hasHours: hours > 0,
        hours
      }));
    }

    // Always render to a consistent 6-row grid so the layout never reflows.
    const totalCells = firstDayIndex + daysInMonth;
    const remaining = (7 * 6) - totalCells;
    for (let i = 0; i < remaining; i++) {
      calendarGrid.appendChild(this.createCalendarDayElement(''));
    }
  }

  private createCalendarDayElement(content: string, dayData?: CalendarDay): HTMLElement {
    const el = document.createElement('div');
    el.className = 'calendar-day';
    el.textContent = content;

    if (!dayData) {
      el.classList.add('empty');
      return el;
    }

    if (dayData.isToday) el.classList.add('today');
    if (dayData.hasHours) {
      el.classList.add('has-hours');
      el.setAttribute('data-hours', dayData.hours.toString());
    }
    el.addEventListener('click', () => this.handleDayClick(dayData.date));
    return el;
  }

  private handleDayClick(dateString: string): void {
    this.selectedDate = dateString;
    this.showHoursModal(dateString);
  }

  private showHoursModal(dateString: string): void {
    const modal = document.getElementById('hoursModal');
    const dateDisplay = document.getElementById('modalDateDisplay');
    const hoursInput = document.getElementById('hoursInput') as HTMLInputElement | null;
    if (!modal || !dateDisplay || !hoursInput) return;

    const date = parseLocalDate(dateString);
    dateDisplay.textContent = date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    hoursInput.value = (this.dpDays[dateString] ?? 0).toString();
    modal.classList.add('visible');
    hoursInput.focus();
    hoursInput.select();
  }

  private hideHoursModal(): void {
    document.getElementById('hoursModal')?.classList.remove('visible');
  }

  private async saveHours(): Promise<void> {
    const hoursInput = document.getElementById('hoursInput') as HTMLInputElement | null;
    if (!hoursInput || !this.selectedDate) return;

    const validatedHours = validateHoursInput(hoursInput.value);
    if (validatedHours === null) {
      showToast('Please enter a number between 0 and 24.', 'error');
      return;
    }

    if (validatedHours > 0 && validatedHours < DP_HOURS_MIN_VALID) {
      showToast(`DP day is minimum ${DP_HOURS_MIN_VALID} hours`, 'error');
      return;
    }

    if (validatedHours > 0) {
      this.dpDays[this.selectedDate] = validatedHours;
    } else {
      delete this.dpDays[this.selectedDate];
    }

    await this.saveDPDays();
    this.hideHoursModal();
    this.renderCalendar();
    this.updateSummary();
  }

  private updateSummary(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    let monthTotal = 0;
    let monthDays = 0;

    for (const [dateString, hours] of Object.entries(this.dpDays)) {
      if (hours <= 0) continue;
      const date = parseLocalDate(dateString);
      if (date.getFullYear() === year && date.getMonth() === month) {
        monthTotal += hours;
        monthDays += 1;
      }
    }

    const monthHoursText = document.getElementById('monthHoursText');
    const monthDaysText = document.getElementById('monthDaysText');
    if (monthHoursText) monthHoursText.textContent = monthTotal.toString();
    if (monthDaysText) monthDaysText.textContent = monthDays.toString();
  }

  /* -------------------- Theme -------------------- */
  private setTheme(theme: 'light' | 'dark'): void {
    if (this.settings.theme === theme) return;
    this.settings.theme = theme;
    void this.saveSettings();
    this.applyTheme();
  }

  private applyTheme(): void {
    const body = document.body;
    const lightBtn = document.getElementById('lightThemeBtn');
    const darkBtn = document.getElementById('darkThemeBtn');

    if (this.settings.theme === 'light') {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
      body.classList.add('boot-light');
      lightBtn?.classList.add('active');
      darkBtn?.classList.remove('active');
    } else {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme', 'boot-light');
      darkBtn?.classList.add('active');
      lightBtn?.classList.remove('active');
    }
  }

  /* -------------------- Settings modal -------------------- */
  private showSettingsModal(): void {
    document.getElementById('settingsModal')?.classList.add('visible');
    void window.electronAPI.getUpdateState().then((state) => this.renderUpdateState(state));
  }

  private hideSettingsModal(): void {
    document.getElementById('settingsModal')?.classList.remove('visible');
  }

  /* -------------------- Date picker -------------------- */
  private showDatePicker(type: 'start' | 'end'): void {
    document.querySelectorAll('.date-picker').forEach((p) => p.classList.remove('visible'));

    const pickerId = type === 'start' ? 'startDatePicker' : 'endDatePicker';
    const picker = document.getElementById(pickerId);
    if (!picker) return;

    picker.classList.add('visible');
    this.createDatePickerCalendar(picker, type);

    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
    }
    this.outsideClickHandler = (event: MouseEvent) => {
      if (!picker.contains(event.target as Node)) {
        picker.classList.remove('visible');
        if (this.outsideClickHandler) {
          document.removeEventListener('click', this.outsideClickHandler);
          this.outsideClickHandler = null;
        }
      }
    };
    setTimeout(() => {
      if (this.outsideClickHandler) {
        document.addEventListener('click', this.outsideClickHandler);
      }
    }, 0);
  }

  private createDatePickerCalendar(container: HTMLElement, type: 'start' | 'end'): void {
    const seed = type === 'start' && this.startDate ? this.startDate
              : type === 'end' && this.endDate     ? this.endDate
              : new Date();

    let pickerYear = seed.getFullYear();
    let pickerMonth = seed.getMonth() + 1;

    const update = () => {
      container.innerHTML = `
        <div class="date-picker-header">
          <button class="date-picker-nav date-picker-prev" aria-label="Previous">‹</button>
          <span class="date-picker-month">${new Date(pickerYear, pickerMonth - 1)
            .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button class="date-picker-nav date-picker-next" aria-label="Next">›</button>
        </div>
        <div class="date-picker-grid">
          <div class="date-picker-weekday">Mon</div>
          <div class="date-picker-weekday">Tue</div>
          <div class="date-picker-weekday">Wed</div>
          <div class="date-picker-weekday">Thu</div>
          <div class="date-picker-weekday">Fri</div>
          <div class="date-picker-weekday">Sat</div>
          <div class="date-picker-weekday">Sun</div>
          ${this.generateDatePickerDays(pickerYear, pickerMonth)}
        </div>
      `;

      container.querySelector('.date-picker-prev')?.addEventListener('click', (e) => {
        e.stopPropagation();
        pickerMonth -= 1;
        if (pickerMonth < 1) { pickerMonth = 12; pickerYear -= 1; }
        update();
      });
      container.querySelector('.date-picker-next')?.addEventListener('click', (e) => {
        e.stopPropagation();
        pickerMonth += 1;
        if (pickerMonth > 12) { pickerMonth = 1; pickerYear += 1; }
        update();
      });

      container.querySelectorAll<HTMLElement>('.date-picker-day:not(.empty)').forEach((day) => {
        day.addEventListener('click', (e) => {
          e.stopPropagation();
          const dateString = day.getAttribute('data-date');
          if (dateString) this.selectDateFromPicker(dateString, type);
        });
      });

      container.querySelector('.date-picker-header')?.addEventListener('click', (e) => e.stopPropagation());
      container.querySelector('.date-picker-grid')?.addEventListener('click', (e) => e.stopPropagation());
    };

    update();
  }

  private generateDatePickerDays(year: number, month: number): string {
    const jsMonth = month - 1;
    const firstDay = new Date(year, jsMonth, 1);
    const lastDay = new Date(year, jsMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayIndex = mondayBasedWeekday(firstDay);

    let html = '';
    for (let i = 0; i < firstDayIndex; i++) {
      html += '<div class="date-picker-day empty"></div>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDate(new Date(year, jsMonth, day));
      const hasHours = (this.dpDays[dateString] ?? 0) > 0;
      html += `<div class="date-picker-day ${hasHours ? 'has-hours' : ''}" data-date="${dateString}">${day}</div>`;
    }
    return html;
  }

  private selectDateFromPicker(dateString: string, type: 'start' | 'end'): void {
    const date = parseLocalDate(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const formatted = `${day}-${month}-${year}`;

    if (type === 'start') {
      this.startDate = date;
      const input = document.getElementById('startDateInput') as HTMLInputElement | null;
      if (input) input.value = formatted;
    } else {
      this.endDate = date;
      const input = document.getElementById('endDateInput') as HTMLInputElement | null;
      if (input) input.value = formatted;
    }

    document.getElementById(type === 'start' ? 'startDatePicker' : 'endDatePicker')
      ?.classList.remove('visible');
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
      this.outsideClickHandler = null;
    }

    this.calculateDateRangeResults();
  }

  private calculateDateRangeResults(): void {
    if (!this.startDate || !this.endDate) return;

    let totalDays = 0;
    let totalHours = 0;
    const cursor = new Date(this.startDate.getFullYear(), this.startDate.getMonth(), this.startDate.getDate());
    const end = new Date(this.endDate.getFullYear(), this.endDate.getMonth(), this.endDate.getDate());

    while (cursor.getTime() <= end.getTime()) {
      const hours = this.dpDays[formatDate(cursor)] ?? 0;
      if (hours > 0) {
        totalDays += 1;
        totalHours += hours;
      }
      cursor.setTime(cursor.getTime() + DAY_MS);
    }

    const totalDaysResult = document.getElementById('totalDaysResult');
    const totalHoursResult = document.getElementById('totalHoursResult');
    if (totalDaysResult) totalDaysResult.textContent = totalDays.toString();
    if (totalHoursResult) totalHoursResult.textContent = totalHours.toString();
  }

  /* -------------------- Context menu -------------------- */
  private showContextMenu(event: MouseEvent, type: 'start' | 'end'): void {
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu) return;
    this.contextMenuField = type;
    contextMenu.style.left = `${event.pageX}px`;
    contextMenu.style.top = `${event.pageY}px`;
    contextMenu.classList.add('visible');
    event.preventDefault();
  }

  private hideContextMenu(): void {
    document.getElementById('contextMenu')?.classList.remove('visible');
    this.contextMenuField = null;
  }

  private resetDateField(): void {
    if (this.contextMenuField === 'start') {
      this.startDate = null;
      const input = document.getElementById('startDateInput') as HTMLInputElement | null;
      if (input) input.value = '';
    } else if (this.contextMenuField === 'end') {
      this.endDate = null;
      const input = document.getElementById('endDateInput') as HTMLInputElement | null;
      if (input) input.value = '';
    }
    this.hideContextMenu();

    const totalDaysResult = document.getElementById('totalDaysResult');
    const totalHoursResult = document.getElementById('totalHoursResult');
    if (totalDaysResult) totalDaysResult.textContent = '0';
    if (totalHoursResult) totalHoursResult.textContent = '0';
  }

  /* -------------------- Auto updates -------------------- */
  private subscribeToUpdates(): void {
    if (typeof window.electronAPI?.onUpdateState !== 'function') return;
    if (this.updateUnsubscribe) this.updateUnsubscribe();
    this.updateUnsubscribe = window.electronAPI.onUpdateState((state) => {
      this.renderUpdateState(state);
    });
  }

  private async handleCheckForUpdates(): Promise<void> {
    const button = document.getElementById('checkUpdatesBtn') as HTMLButtonElement | null;
    if (button) {
      button.disabled = true;
      button.textContent = 'Checking...';
    }
    try {
      this.settings.lastUpdateCheck = new Date().toISOString();
      void this.saveSettings();
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      console.error('checkForUpdates failed:', error);
      showToast('Failed to check for updates', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Check for Updates';
      }
    }
  }

  private renderUpdateState(state: UpdateState): void {
    const status = document.getElementById('updateStatus');
    const progressContainer = document.getElementById('updateProgressContainer') as HTMLElement | null;
    const progressBar = document.getElementById('updateProgressBar') as HTMLElement | null;
    const checkBtn = document.getElementById('checkUpdatesBtn') as HTMLButtonElement | null;
    if (!status) return;

    status.classList.remove('error', 'visible');
    if (progressContainer) progressContainer.style.display = 'none';

    switch (state.status) {
      case 'idle':
        return;

      case 'checking':
        status.textContent = 'Checking for updates...';
        status.classList.add('visible');
        return;

      case 'not-available':
        status.textContent = `You are on the latest version${state.version ? ' (v' + state.version + ')' : ''}.`;
        status.classList.add('visible');
        return;

      case 'available':
        status.innerHTML = `
          <div><strong>Version ${state.version ?? '?'}</strong> is available.</div>
          ${state.releaseNotes ? `<div style="margin-top:6px;">${this.escapeHtml(state.releaseNotes)}</div>` : ''}
          <div style="margin-top:10px;display:flex;gap:8px;">
            <button class="modal-btn save-btn" id="downloadUpdateBtn">Download</button>
            <button class="modal-btn cancel-btn" id="updateLaterBtn">Later</button>
          </div>
        `;
        status.classList.add('visible');
        document.getElementById('downloadUpdateBtn')?.addEventListener('click', () => {
          void window.electronAPI.downloadUpdate();
        });
        document.getElementById('updateLaterBtn')?.addEventListener('click', () => {
          status.classList.remove('visible');
        });
        return;

      case 'downloading':
        status.textContent = `Downloading update... ${(state.progressPercent ?? 0).toFixed(0)}%`;
        status.classList.add('visible');
        if (progressContainer && progressBar) {
          progressContainer.style.display = 'block';
          progressBar.style.width = `${(state.progressPercent ?? 0).toFixed(1)}%`;
        }
        if (checkBtn) checkBtn.disabled = true;
        return;

      case 'downloaded':
        status.innerHTML = `
          <div>Update <strong>v${this.escapeHtml(state.version ?? '')}</strong> is ready to install.</div>
          <div style="margin-top:10px;display:flex;gap:8px;">
            <button class="modal-btn save-btn" id="installUpdateBtn">Install &amp; Restart</button>
            <button class="modal-btn cancel-btn" id="installLaterBtn">On Next Quit</button>
          </div>
        `;
        status.classList.add('visible');
        if (checkBtn) checkBtn.disabled = false;
        document.getElementById('installUpdateBtn')?.addEventListener('click', () => {
          void window.electronAPI.installUpdate();
        });
        document.getElementById('installLaterBtn')?.addEventListener('click', () => {
          status.classList.remove('visible');
          showToast('The update will install when you close the app.', 'success');
        });
        return;

      case 'error':
        status.textContent = `Update failed: ${state.errorMessage ?? 'unknown error'}`;
        status.classList.add('visible', 'error');
        if (checkBtn) checkBtn.disabled = false;
        return;
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DPDaysCounter();
});

export {};
