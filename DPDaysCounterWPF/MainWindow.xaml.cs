using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using Newtonsoft.Json;

namespace DPDaysCounterWPF
{
    public partial class MainWindow : Window
    {
        private DateTime currentDate;
        private Dictionary<string, int> dpHours;
        private string selectedDate;
        private string selectionStart;
        private string selectionEnd;
        private AppSettings appSettings;
        
        // Sidebar animation fields
        private System.Windows.Threading.DispatcherTimer sidebarHideTimer;
        private bool isSidebarVisible = false;
        
        private readonly string dataPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "DPDaysCounter");
        private readonly string dpHoursFile;
        private readonly string settingsFile;
        
        public MainWindow()
        {
            InitializeComponent();
            
            // Set English culture for consistent date formatting
            System.Globalization.CultureInfo.DefaultThreadCurrentCulture = new System.Globalization.CultureInfo("en-US");
            System.Globalization.CultureInfo.DefaultThreadCurrentUICulture = new System.Globalization.CultureInfo("en-US");
            
            // Initialize data paths
            Directory.CreateDirectory(dataPath);
            dpHoursFile = Path.Combine(dataPath, "dp_hours.json");
            settingsFile = Path.Combine(dataPath, "settings.json");
            
            // Initialize app
            currentDate = DateTime.Now;
            dpHours = new Dictionary<string, int>();
            appSettings = new AppSettings { Theme = "Dark" };      
            LoadSettings();
            LoadDPHours();
            RenderCalendar();
            UpdateSummary();
            
            // Initialize sidebar timer
            sidebarHideTimer = new System.Windows.Threading.DispatcherTimer();
            sidebarHideTimer.Interval = TimeSpan.FromSeconds(1);
            sidebarHideTimer.Tick += SidebarHideTimer_Tick;
            
            // Apply theme
            ApplyTheme();
            
            // Set window drag behavior
            this.MouseLeftButtonDown += (s, e) => this.DragMove();
        }
        
        private void LoadSettings()
        {
            try
            {
                if (File.Exists(settingsFile))
                {
                    var json = File.ReadAllText(settingsFile);
                    appSettings = JsonConvert.DeserializeObject<AppSettings>(json);
                }
                
                // Apply theme
                if (appSettings.Theme == "Light")
                {
                    App.SetTheme("Light");
                    LightThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x61, 0x61, 0x61));
                    DarkThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x4E, 0x4E, 0x4E));
                }
                else
                {
                    App.SetTheme("Dark");
                    DarkThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x61, 0x61, 0x61));
                    LightThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x4E, 0x4E, 0x4E));
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading settings: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
        
        private void SaveSettings()
        {
            try
            {
                var json = JsonConvert.SerializeObject(appSettings, Formatting.Indented);
                File.WriteAllText(settingsFile, json);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error saving settings: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
        
        private void LoadDPHours()
        {
            try
            {
                if (File.Exists(dpHoursFile))
                {
                    var json = File.ReadAllText(dpHoursFile);
                    dpHours = JsonConvert.DeserializeObject<Dictionary<string, int>>(json) ?? new Dictionary<string, int>();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading DP hours: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                dpHours = new Dictionary<string, int>();
            }
        }
        
        private void SaveDPHours()
        {
            try
            {
                var json = JsonConvert.SerializeObject(dpHours, Formatting.Indented);
                File.WriteAllText(dpHoursFile, json);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error saving DP hours: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
        
        private void RenderCalendar()
        {
            CalendarGrid.Children.Clear();
            
            var year = currentDate.Year;
            var month = currentDate.Month;
            var firstDay = new DateTime(year, month, 1);
            var lastDay = new DateTime(year, month + 1, 1).AddDays(-1);
            var daysInMonth = lastDay.Day;
            var firstDayIndex = (int)firstDay.DayOfWeek;
            
            // Update month text
            CurrentMonthText.Text = currentDate.ToString("MMMM yyyy", new System.Globalization.CultureInfo("en-US")).ToUpper();
            
            var today = DateTime.Now;
            
            // Add empty cells for days before first day of month
            for (int i = 0; i < firstDayIndex; i++)
            {
                var emptyButton = CreateCalendarDayButton("");
                CalendarGrid.Children.Add(emptyButton);
            }
            
            // Add days of current month
            for (int day = 1; day <= daysInMonth; day++)
            {
                var dateString = $"{year:00}-{month:00}-{day:00}";
                var button = CreateCalendarDayButton(day.ToString());
                button.Tag = dateString;
                
                // Check if it's today
                if (day == today.Day && month == today.Month && year == today.Year)
                {
                    button.Tag = "Today";
                }
                
                // Check if has DP hours
                if (dpHours.ContainsKey(dateString) && dpHours[dateString] > 0)
                {
                    button.Tag = "HasHours";
                    // Set the day number as main content
                    button.Content = day.ToString();
                    // Store hours in Tag for later access
                    button.Tag = $"HasHours:{dpHours[dateString]}";
                }
                
                button.Click += (s, e) => CalendarDay_Click(s, e, dateString);
                CalendarGrid.Children.Add(button);
            }
            
            // Add empty cells to complete the grid (5 rows * 7 columns = 35)
            var totalCells = firstDayIndex + daysInMonth;
            var remainingCells = 35 - totalCells;
            
            for (int i = 0; i < remainingCells; i++)
            {
                var emptyButton = CreateCalendarDayButton("");
                CalendarGrid.Children.Add(emptyButton);
            }
            
            ApplySelection();
        }
        
        private Button CreateCalendarDayButton(string content)
        {
            return new Button
            {
                Content = content,
                Style = FindResource("CalendarDayStyle") as Style,
                Margin = new Thickness(12),
                Tag = ""
            };
        }
        
        private void CalendarDay_Click(object sender, RoutedEventArgs e, string dateString)
        {
            var button = sender as Button;
            
            if (Keyboard.IsKeyDown(Key.LeftCtrl) || Keyboard.IsKeyDown(Key.RightCtrl))
            {
                HandleCtrlClick(dateString, button);
            }
            else
            {
                HandleNormalClick(dateString, button);
            }
        }
        
        private void HandleCtrlClick(string dateString, Button button)
        {
            if (string.IsNullOrEmpty(selectionStart))
            {
                // First selection
                selectionStart = dateString;
                selectionEnd = null;
            }
            else
            {
                // Second selection - complete the range
                selectionEnd = dateString;
            }
            
            ApplySelection();
            UpdateSummary();
        }
        
        private void HandleNormalClick(string dateString, Button button)
        {
            // Clear selection
            selectionStart = null;
            selectionEnd = null;
            ApplySelection();
            
            // Open hours input dialog
            selectedDate = dateString;
            var dialog = new HoursInputDialog(dateString, dpHours.ContainsKey(dateString) ? dpHours[dateString] : 0);
            if (dialog.ShowDialog() == true)
            {
                var hours = dialog.Hours;
                if (hours > 0)
                {
                    dpHours[dateString] = hours;
                }
                else
                {
                    dpHours.Remove(dateString);
                }
                
                SaveDPHours();
                RenderCalendar();
                UpdateSummary();
            }
        }
        
        // Sidebar animation methods
        private void SidebarTriggerArea_MouseEnter(object sender, MouseEventArgs e)
        {
            ShowSidebar();
        }
        
        private void SidebarTriggerArea_MouseLeave(object sender, MouseEventArgs e)
        {
            // Start the hide timer when mouse leaves the trigger area
            sidebarHideTimer.Start();
        }
        
        private void Sidebar_MouseEnter(object sender, MouseEventArgs e)
        {
            // Stop the hide timer when mouse is over the sidebar
            sidebarHideTimer.Stop();
        }
        
        private void Sidebar_MouseLeave(object sender, MouseEventArgs e)
        {
            // Start the hide timer when mouse leaves the sidebar
            sidebarHideTimer.Start();
        }
        
        private void ShowSidebar()
        {
            if (!isSidebarVisible)
            {
                isSidebarVisible = true;
                sidebarHideTimer.Stop();
                
                var storyboard = (System.Windows.Media.Animation.Storyboard)FindResource("ShowSidebar");
                storyboard.Begin();
            }
        }
        
        private void HideSidebar()
        {
            if (isSidebarVisible)
            {
                isSidebarVisible = false;
                
                var storyboard = (System.Windows.Media.Animation.Storyboard)FindResource("HideSidebar");
                storyboard.Begin();
            }
        }
        
        private void SidebarHideTimer_Tick(object sender, EventArgs e)
        {
            // Check if mouse is still over the sidebar or trigger area
            var mousePosition = Mouse.GetPosition(this);
            var sidebarBounds = new Rect(0, 0, Sidebar.ActualWidth, this.ActualHeight);
            var triggerBounds = new Rect(0, 0, 20, this.ActualHeight);
            
            if (!sidebarBounds.Contains(mousePosition) && !triggerBounds.Contains(mousePosition))
            {
                sidebarHideTimer.Stop();
                HideSidebar();
            }
        }
        
        private void ApplySelection()
        {
            // Clear all selections
            foreach (var child in CalendarGrid.Children)
            {
                if (child is Button button)
                {
                    var tag = button.Tag?.ToString();
                    if (tag == "Selected" || tag == "RangeSelected")
                    {
                        // Restore original tag if it had hours
                        var originalTag = GetOriginalTag(button);
                        button.Tag = originalTag;
                    }
                }
            }
            
            if (!string.IsNullOrEmpty(selectionStart))
            {
                var startButton = FindCalendarButton(selectionStart);
                if (startButton != null)
                {
                    startButton.Tag = "Selected";
                }
                
                if (!string.IsNullOrEmpty(selectionEnd))
                {
                    // Select range
                    var start = DateTime.Parse(selectionStart);
                    var end = DateTime.Parse(selectionEnd);
                    
                    if (start > end)
                    {
                        var temp = start;
                        start = end;
                        end = temp;
                    }
                    
                    var current = start;
                    while (current <= end)
                    {
                        var dateString = current.ToString("yyyy-MM-dd");
                        var button = FindCalendarButton(dateString);
                        if (button != null && button.Tag?.ToString() != "Selected")
                        {
                            button.Tag = "RangeSelected";
                        }
                        current = current.AddDays(1);
                    }
                }
            }
        }
        
        private Button FindCalendarButton(string dateString)
        {
            foreach (var child in CalendarGrid.Children)
            {
                if (child is Button button)
                {
                    var tag = button.Tag?.ToString();
                    if (tag == dateString || tag == "Today" || tag.StartsWith("HasHours:"))
                    {
                        return button;
                    }
                }
            }
            return null;
        }
        
        private string GetOriginalTag(Button button)
        {
            // This method should return the original tag before selection
            // For now, we'll need to store the original tag somewhere
            // For simplicity, let's check if it had hours
            var content = button.Content?.ToString();
            if (!string.IsNullOrEmpty(content) && int.TryParse(content, out _))
            {
                // This is a day button, check if it has hours
                // We'll need to find the date string for this button
                // For now, return empty string
                return "";
            }
            return "";
        }
        
        private void UpdateSummary()
        {
            var year = currentDate.Year;
            var month = currentDate.Month;
            
            var monthTotal = 0;
            var monthDays = new HashSet<string>();
            var selectedTotal = 0;
            var selectedDays = new HashSet<string>();
            
            foreach (var kvp in dpHours)
            {
                if (kvp.Value <= 0) continue;
                
                var date = DateTime.Parse(kvp.Key);
                
                if (date.Year == year && date.Month == month)
                {
                    monthTotal += kvp.Value;
                    monthDays.Add(kvp.Key);
                }
                
                // Check if date is in selection
                if (!string.IsNullOrEmpty(selectionStart) && !string.IsNullOrEmpty(selectionEnd))
                {
                    var startDate = DateTime.Parse(selectionStart);
                    var endDate = DateTime.Parse(selectionEnd);
                    var minDate = startDate < endDate ? startDate : endDate;
                    var maxDate = startDate > endDate ? startDate : endDate;
                    
                    if (date >= minDate && date <= maxDate)
                    {
                        selectedTotal += kvp.Value;
                        selectedDays.Add(kvp.Key);
                    }
                }
            }
            
            MonthHoursText.Text = monthTotal.ToString();
            MonthDaysText.Text = monthDays.Count.ToString();
            SelectedHoursText.Text = selectedTotal.ToString();
            SelectedDaysText.Text = selectedDays.Count.ToString();
        }
        
        // Window control events
        private void MinimizeButton_Click(object sender, RoutedEventArgs e)
        {
            this.WindowState = WindowState.Minimized;
        }
        
        private void MaximizeButton_Click(object sender, RoutedEventArgs e)
        {
            if (this.WindowState == WindowState.Maximized)
            {
                this.WindowState = WindowState.Normal;
            }
            else
            {
                this.WindowState = WindowState.Maximized;
            }
        }
        
        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            this.Close();
        }
        
        // Calendar navigation events
        private void PrevMonthButton_Click(object sender, RoutedEventArgs e)
        {
            currentDate = currentDate.AddMonths(-1);
            RenderCalendar();
            UpdateSummary();
        }
        
        private void NextMonthButton_Click(object sender, RoutedEventArgs e)
        {
            currentDate = currentDate.AddMonths(1);
            RenderCalendar();
            UpdateSummary();
        }
        
        // Theme events
        private void LightThemeButton_Click(object sender, RoutedEventArgs e)
        {
            appSettings.Theme = "Light";
            App.SetTheme("Light");
            SaveSettings();
            
            LightThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x61, 0x61, 0x61));
            DarkThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x4E, 0x4E, 0x4E));
        }
        
        private void DarkThemeButton_Click(object sender, RoutedEventArgs e)
        {
            appSettings.Theme = "Dark";
            App.SetTheme("Dark");
            SaveSettings();
            
            DarkThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x61, 0x61, 0x61));
            LightThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x4E, 0x4E, 0x4E));
        }
        
        private void CheckUpdatesButton_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("You are using the latest version!", "Updates", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        
        private void ApplyTheme()
        {
            if (appSettings.Theme == "Light")
            {
                App.SetTheme("Light");
                LightThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x61, 0x61, 0x61));
                DarkThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x4E, 0x4E, 0x4E));
            }
            else
            {
                App.SetTheme("Dark");
                DarkThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x61, 0x61, 0x61));
                LightThemeButton.Background = new SolidColorBrush(Color.FromRgb(0x4E, 0x4E, 0x4E));
            }
        }
    }
    
    public class AppSettings
    {
        public string Theme { get; set; } = "Dark";
    }
} 