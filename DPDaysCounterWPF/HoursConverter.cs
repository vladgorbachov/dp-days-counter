using System;
using System.Globalization;
using System.Windows.Data;

namespace DPDaysCounterWPF
{
    public class HoursConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is string tag && tag.StartsWith("HasHours:"))
            {
                var hours = tag.Substring("HasHours:".Length);
                if (int.TryParse(hours, out int hoursValue))
                {
                    return $"{hoursValue} hrs";
                }
            }
            return "";
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
} 