// Date utilities
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const parseDate = (dateString: string): Date => {
  return new Date(dateString);
};

export const getMonthInfo = (date: Date) => {
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

// Validation utilities
export const isValidHours = (hours: number): boolean => {
  return Number.isInteger(hours) && hours >= 0 && hours <= 24;
};

export const validateHoursInput = (input: string): number | null => {
  const hours = parseInt(input);
  return isValidHours(hours) ? hours : null;
};

// Storage utilities
export interface StorageData {
  [key: string]: any;
}

export const safeJsonParse = (jsonString: string, defaultValue: any = {}): any => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return defaultValue;
  }
};

export const safeJsonStringify = (data: any): string => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Error stringifying JSON:', error);
    return '{}';
  }
}; 