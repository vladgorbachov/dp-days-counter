const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// DOM Elements
const calendar = document.getElementById('calendar');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthButton = document.getElementById('prevMonth');
const nextMonthButton = document.getElementById('nextMonth');
const hoursInputModal = document.getElementById('hoursInputModal');
const dpHoursInput = document.getElementById('dpHoursInput');
const increaseHoursButton = document.getElementById('increaseHours');
const decreaseHoursButton = document.getElementById('decreaseHours');
const saveHoursButton = document.getElementById('saveHoursBtn');
const cancelHoursButton = document.getElementById('cancelHoursBtn');
const closeModalButton = document.getElementById('closeModal');
const selectedDateElement = document.getElementById('selectedDate');
const monthHoursElement = document.getElementById('monthHours');
const monthDaysElement = document.getElementById('monthDays');
const selectedHoursElement = document.getElementById('selectedHours');
const selectedDaysElement = document.getElementById('selectedDays');
const lightThemeButton = document.getElementById('lightThemeBtn');
const darkThemeButton = document.getElementById('darkThemeBtn');
const minimizeButton = document.getElementById('minimizeBtn');
const maximizeButton = document.getElementById('maximizeBtn');
const closeButton = document.getElementById('closeBtn');
const sidebarTrigger = document.querySelector('.sidebar-trigger');
const sidebar = document.querySelector('.sidebar');
const checkUpdatesButton = document.getElementById('checkUpdatesBtn');

// App State
let currentDate = new Date();
let selectedDate = null;
let dpHours = {}; // Object to store DP hours
let appSettings = {
  theme: 'dark'
};
let sidebarTimeout;

// Selection state
let selectionStart = null;
let selectionEnd = null;
let isSelecting = false;

// Window Controls
minimizeButton.addEventListener('click', () => {
  ipcRenderer.invoke('app-minimize');
});

maximizeButton.addEventListener('click', () => {
  ipcRenderer.invoke('app-maximize');
});

closeButton.addEventListener('click', () => {
  ipcRenderer.invoke('app-close');
});

// Initialize App
async function initApp() {
  await loadAppSettings();
  await loadDPHours();
  renderCalendar(currentDate);
  updateSummary();
  applyAppSettings();
  initSidebarBehavior();
}

// Load DP Hours from storage
async function loadDPHours() {
  try {
    dpHours = await ipcRenderer.invoke('get-dp-hours');
  } catch (error) {
    console.error('Error loading DP hours:', error);
    dpHours = {};
  }
}

// Load App Settings from storage
async function loadAppSettings() {
  try {
    appSettings = await ipcRenderer.invoke('get-app-settings');
    
    // Set default values if not present
    if (appSettings.theme === undefined) {
      appSettings.theme = 'dark';
    }
    
  } catch (error) {
    console.error('Error loading app settings:', error);
  }
}

// Apply App Settings
function applyAppSettings() {
  // Apply theme
  if (appSettings.theme === 'light') {
    document.body.classList.add('light-theme');
    lightThemeButton.classList.add('active');
    darkThemeButton.classList.remove('active');
  } else {
    document.body.classList.remove('light-theme');
    darkThemeButton.classList.add('active');
    lightThemeButton.classList.remove('active');
  }
}

// Initialize Sidebar Behavior
function initSidebarBehavior() {
  sidebarTrigger.addEventListener('mouseenter', () => {
    sidebar.classList.add('show');
    
    if (sidebarTimeout) {
      clearTimeout(sidebarTimeout);
    }
  });
  
  sidebar.addEventListener('mouseenter', () => {
    if (sidebarTimeout) {
      clearTimeout(sidebarTimeout);
    }
  });
  
  sidebar.addEventListener('mouseleave', () => {
    sidebarTimeout = setTimeout(() => {
      sidebar.classList.remove('show');
    }, 500);
  });
  
  sidebarTrigger.addEventListener('mouseleave', () => {
    if (!sidebar.matches(':hover')) {
      sidebarTimeout = setTimeout(() => {
        sidebar.classList.remove('show');
      }, 500);
    }
  });
}

// Render Calendar
function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const firstDayIndex = firstDay.getDay();
  
  // Set current month text
  currentMonthElement.textContent = `${date.toLocaleString('default', { month: 'long' })} ${year}`;
  
  // Clear calendar
  calendar.innerHTML = '';
  
  // Add empty cells for days before first day of month
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.classList.add('calendar-day', 'other-month');
    calendar.appendChild(emptyDay);
  }
  
  // Add days of current month
  const today = new Date();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement('div');
    dayElement.classList.add('calendar-day');
    
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dayElement.dataset.date = dateString;
    
    // Check if it's today
    if (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      dayElement.classList.add('today');
    }
    
    // Add day number
    const dayNumber = document.createElement('div');
    dayNumber.classList.add('day-number');
    dayNumber.textContent = day;
    dayElement.appendChild(dayNumber);
    
    // Add DP hours if exists
    if (dpHours[dateString]) {
      const hours = dpHours[dateString];
      if (hours > 0) {
        dayElement.classList.add('has-dp-hours');
        const hoursElement = document.createElement('div');
        hoursElement.classList.add('dp-hours');
        hoursElement.textContent = `${hours} hrs`;
        dayElement.appendChild(hoursElement);
      }
    }
    
    // Add click event to edit hours
    dayElement.addEventListener('click', (e) => {
      if (e.ctrlKey) {
        handleCtrlClick(dateString, dayElement);
      } else {
        handleNormalClick(dateString, dayElement);
      }
    });
    
    calendar.appendChild(dayElement);
  }
  
  // Add empty cells for days after last day of month to complete the grid
  const totalCells = firstDayIndex + daysInMonth;
  const remainingCells = 42 - totalCells; // 6 rows * 7 columns = 42
  
  for (let i = 0; i < remainingCells; i++) {
    const emptyDay = document.createElement('div');
    emptyDay.classList.add('calendar-day', 'other-month');
    calendar.appendChild(emptyDay);
  }
  
  // Apply current selection
  applySelection();
}

// Handle Ctrl+Click for range selection
function handleCtrlClick(dateString, dayElement) {
  if (!selectionStart) {
    // First selection
    selectionStart = dateString;
    selectionEnd = null;
    isSelecting = true;
  } else {
    // Second selection - complete the range
    selectionEnd = dateString;
    isSelecting = false;
  }
  
  applySelection();
  updateSummary();
}

// Handle normal click
function handleNormalClick(dateString, dayElement) {
  // Clear selection
  selectionStart = null;
  selectionEnd = null;
  isSelecting = false;
  applySelection();
  
  // Open hours input modal
  selectedDate = dateString;
  dpHoursInput.value = dpHours[dateString] || 0;
  selectedDateElement.textContent = formatDate(dateString);
  hoursInputModal.style.display = 'flex';
}

// Apply selection to calendar
function applySelection() {
  // Clear all selections
  document.querySelectorAll('.calendar-day').forEach(day => {
    day.classList.remove('selected', 'range-selected');
  });
  
  if (selectionStart) {
    const startElement = document.querySelector(`[data-date="${selectionStart}"]`);
    if (startElement) {
      startElement.classList.add('selected');
    }
    
    if (selectionEnd) {
      // Select range
      const start = new Date(selectionStart);
      const end = new Date(selectionEnd);
      
      if (start > end) {
        [start, end] = [end, start];
      }
      
      const current = new Date(start);
      while (current <= end) {
        const dateString = current.toISOString().split('T')[0];
        const element = document.querySelector(`[data-date="${dateString}"]`);
        if (element) {
          element.classList.add('range-selected');
        }
        current.setDate(current.getDate() + 1);
      }
    }
  }
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Save App Settings
async function saveAppSettings() {
  try {
    await ipcRenderer.invoke('save-app-settings', appSettings);
  } catch (error) {
    console.error('Error saving app settings:', error);
  }
}

// Update Summary
function updateSummary() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  
  let monthTotal = 0;
  let monthDays = new Set();
  let selectedTotal = 0;
  let selectedDays = new Set();
  
  for (const [date, hours] of Object.entries(dpHours)) {
    if (hours <= 0) continue;
    
    const [y, m, d] = date.split('-').map(Number);
    
    if (y === year && m === month) {
      monthTotal += hours;
      monthDays.add(date);
    }
    
    // Check if date is in selection
    if (selectionStart && selectionEnd) {
      const currentDate = new Date(date);
      const startDate = new Date(selectionStart);
      const endDate = new Date(selectionEnd);
      
      if (currentDate >= Math.min(startDate, endDate) && 
          currentDate <= Math.max(startDate, endDate)) {
        selectedTotal += hours;
        selectedDays.add(date);
      }
    }
  }
  
  monthHoursElement.textContent = monthTotal;
  monthDaysElement.textContent = monthDays.size;
  selectedHoursElement.textContent = selectedTotal;
  selectedDaysElement.textContent = selectedDays.size;
}

// Close modal
function closeModal() {
  hoursInputModal.style.display = 'none';
  dpHoursInput.value = 0;
}

// Set theme
function setTheme(theme) {
  appSettings.theme = theme;
  applyAppSettings();
  saveAppSettings();
}

// Save DP Hours
async function saveDPHours(date, hours) {
  try {
    if (hours > 0) {
      dpHours[date] = hours;
    } else {
      delete dpHours[date];
    }
    
    await ipcRenderer.invoke('save-dp-hours', dpHours);
    
    // Re-render calendar to show updated hours
    renderCalendar(currentDate);
    updateSummary();
    
    closeModal();
  } catch (error) {
    console.error('Error saving DP hours:', error);
    alert('Failed to save hours. Please try again.');
  }
}

// Increase hours
function increaseHours() {
  let value = parseInt(dpHoursInput.value);
  if (value < 24) {
    dpHoursInput.value = value + 1;
  }
}

// Decrease hours
function decreaseHours() {
  let value = parseInt(dpHoursInput.value);
  if (value > 0) {
    dpHoursInput.value = value - 1;
  }
}

// Event Listeners
prevMonthButton.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
  updateSummary();
});

nextMonthButton.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
  updateSummary();
});

// Hours input arrow buttons
increaseHoursButton.addEventListener('click', increaseHours);
decreaseHoursButton.addEventListener('click', decreaseHours);

// Handle Enter key in hours input
dpHoursInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const hours = parseInt(dpHoursInput.value);
    if (hours >= 0 && hours <= 24) {
      saveDPHours(selectedDate, hours);
    } else {
      alert('Please enter a number between 0 and 24.');
    }
  }
});

saveHoursButton.addEventListener('click', () => {
  const hours = parseInt(dpHoursInput.value);
  if (hours >= 0 && hours <= 24) {
    saveDPHours(selectedDate, hours);
  } else {
    alert('Please enter a number between 0 and 24.');
  }
});

cancelHoursButton.addEventListener('click', closeModal);
closeModalButton.addEventListener('click', closeModal);

lightThemeButton.addEventListener('click', () => setTheme('light'));
darkThemeButton.addEventListener('click', () => setTheme('dark'));

checkUpdatesButton.addEventListener('click', async () => {
  try {
    // Show loading state
    checkUpdatesButton.textContent = 'Checking...';
    checkUpdatesButton.disabled = true;
    
    // Check for updates
    const update = await ipcRenderer.invoke('check-updates-manual');
    
    if (update) {
      // Show update window
      ipcRenderer.invoke('open-update-window');
    } else {
      // Show no updates message
      alert('You are using the latest version!');
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
    alert('Failed to check for updates. Please try again.');
  } finally {
    // Reset button state
    checkUpdatesButton.textContent = 'Check for Updates';
    checkUpdatesButton.disabled = false;
  }
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp); 