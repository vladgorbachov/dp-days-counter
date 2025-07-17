using System;
using System.Windows;
using System.Windows.Media;

namespace DPDaysCounterWPF
{
    public partial class App : Application
    {
        // Константы для тем
        public const string LIGHT_THEME = "Light";
        public const string DARK_THEME = "Dark";
        
        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            
            // Установка темной темы по умолчанию
            SetTheme(DARK_THEME);
        }
        
        /// <summary>
        /// Устанавливает тему приложения
        /// </summary>
        /// <param name="theme">Название темы: "Light" или "Dark"</param>
        /// <returns>true если тема успешно установлена, false в противном случае</returns>
        public static bool SetTheme(string theme)
        {
            try
            {
                var app = Current;
                if (app?.Resources == null)
                {
                    return false;
                }

                var resources = app.Resources;
                
                if (theme.Equals("Light", StringComparison.OrdinalIgnoreCase))
                {
                    // Применяем светлую тему
                    resources["BackgroundBrush"] = resources["LightBackgroundBrush"];
                    resources["SurfaceBrush"] = resources["LightSurfaceBrush"];
                    resources["PrimaryBrush"] = resources["LightPrimaryBrush"];
                    resources["PrimaryVariantBrush"] = resources["LightPrimaryVariantBrush"];
                    resources["SecondaryBrush"] = resources["LightSecondaryBrush"];
                    resources["TextPrimaryBrush"] = resources["LightTextPrimaryBrush"];
                    resources["TextSecondaryBrush"] = resources["LightTextSecondaryBrush"];
                    resources["ErrorBrush"] = resources["LightErrorBrush"];
                    resources["CardBrush"] = resources["LightCardBrush"];
                    resources["BorderBrush"] = resources["LightBorderBrush"];
                    resources["HoursBrush"] = resources["LightHoursBrush"];
                    resources["HeaderBackgroundBrush"] = resources["LightHeaderBackgroundBrush"];
                    resources["StatsBackgroundBrush"] = resources["LightStatsBackgroundBrush"];
                    resources["StatsTextBrush"] = resources["LightStatsTextBrush"];
                    
                    // Применяем светлый стиль кнопок
                    var lightButtonStyle = resources["LightModernButtonStyle"] as Style;
                    if (lightButtonStyle != null)
                    {
                        resources["ModernButtonStyle"] = lightButtonStyle;
                    }
                    
                    // Применяем светлый стиль ячеек календаря
                    var lightCalendarStyle = resources["LightCalendarDayStyle"] as Style;
                    if (lightCalendarStyle != null)
                    {
                        resources["CalendarDayStyle"] = lightCalendarStyle;
                    }
                }
                else
                {
                    // Применяем темную тему
                    resources["BackgroundBrush"] = resources["DarkBackgroundBrush"];
                    resources["SurfaceBrush"] = resources["DarkSurfaceBrush"];
                    resources["PrimaryBrush"] = resources["DarkPrimaryBrush"];
                    resources["PrimaryVariantBrush"] = resources["DarkPrimaryVariantBrush"];
                    resources["SecondaryBrush"] = resources["DarkSecondaryBrush"];
                    resources["TextPrimaryBrush"] = resources["DarkTextPrimaryBrush"];
                    resources["TextSecondaryBrush"] = resources["DarkTextSecondaryBrush"];
                    resources["ErrorBrush"] = resources["DarkErrorBrush"];
                    resources["CardBrush"] = resources["DarkCardBrush"];
                    resources["BorderBrush"] = resources["DarkBorderBrush"];
                    resources["HoursBrush"] = resources["DarkHoursBrush"];
                    resources["HeaderBackgroundBrush"] = new SolidColorBrush(Color.FromArgb(0x26, 0x00, 0x00, 0x00));
                    resources["StatsBackgroundBrush"] = new SolidColorBrush(Color.FromArgb(0x99, 0x1E, 0x1E, 0x1E));
                    resources["StatsTextBrush"] = new SolidColorBrush(Colors.White);
                    
                    // Применяем темный стиль кнопок
                    var darkButtonStyle = resources["DarkModernButtonStyle"] as Style;
                    if (darkButtonStyle != null)
                    {
                        resources["ModernButtonStyle"] = darkButtonStyle;
                    }
                    
                    // Применяем темный стиль ячеек календаря
                    var darkCalendarStyle = resources["DarkCalendarDayStyle"] as Style;
                    if (darkCalendarStyle != null)
                    {
                        resources["CalendarDayStyle"] = darkCalendarStyle;
                    }
                }
                
                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Ошибка при установке темы: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// Применяет ресурсы указанной темы
        /// </summary>
        /// <param name="resources">Коллекция ресурсов приложения</param>
        /// <param name="prefix">Префикс темы (Light или Dark)</param>
        private static void ApplyThemeResources(ResourceDictionary resources, string prefix)
        {
            // Список всех ресурсов для применения
            var resourceMappings = new[]
            {
                ("BackgroundBrush", $"{prefix}BackgroundBrush"),
                ("SurfaceBrush", $"{prefix}SurfaceBrush"),
                ("PrimaryBrush", $"{prefix}PrimaryBrush"),
                ("SecondaryBrush", $"{prefix}SecondaryBrush"),
                ("TextPrimaryBrush", $"{prefix}TextPrimaryBrush"),
                ("TextSecondaryBrush", $"{prefix}TextSecondaryBrush"),
                ("ErrorBrush", $"{prefix}ErrorBrush"),
                ("CardBrush", $"{prefix}CardBrush"),
                ("BorderBrush", $"{prefix}BorderBrush")
            };

            // Применяем каждый ресурс с проверкой его существования
            foreach (var (targetKey, sourceKey) in resourceMappings)
            {
                if (resources.Contains(sourceKey))
                {
                    resources[targetKey] = resources[sourceKey];
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine($"Предупреждение: Ресурс '{sourceKey}' не найден");
                }
            }
        }
        
        /// <summary>
        /// Получает текущую тему приложения
        /// </summary>
        /// <returns>Название текущей темы или null если не удалось определить</returns>
        public static string GetCurrentTheme()
        {
            try
            {
                var app = Current;
                if (app?.Resources == null)
                {
                    return null;
                }

                var resources = app.Resources;
                
                // Проверяем, какая тема активна, сравнивая ссылки на ресурсы
                if (resources.Contains("BackgroundBrush") && 
                    resources.Contains("LightBackgroundBrush") &&
                    ReferenceEquals(resources["BackgroundBrush"], resources["LightBackgroundBrush"]))
                {
                    return LIGHT_THEME;
                }
                else if (resources.Contains("BackgroundBrush") && 
                         resources.Contains("DarkBackgroundBrush") &&
                         ReferenceEquals(resources["BackgroundBrush"], resources["DarkBackgroundBrush"]))
                {
                    return DARK_THEME;
                }
                
                return null;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Ошибка при определении текущей темы: {ex.Message}");
                return null;
            }
        }
        
        /// <summary>
        /// Переключает между светлой и темной темой
        /// </summary>
        /// <returns>true если тема успешно переключена</returns>
        public static bool ToggleTheme()
        {
            var currentTheme = GetCurrentTheme();
            var newTheme = currentTheme == LIGHT_THEME ? DARK_THEME : LIGHT_THEME;
            return SetTheme(newTheme);
        }
    }
}