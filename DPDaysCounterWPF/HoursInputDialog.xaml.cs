using System;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Input;

namespace DPDaysCounterWPF
{
    public partial class HoursInputDialog : Window
    {
        public int Hours { get; private set; }
        
        public HoursInputDialog(string dateString, int currentHours)
        {
            InitializeComponent();
            
            Hours = currentHours;
            HoursInput.Text = Hours.ToString();
            
            // Format and display date
            var date = DateTime.Parse(dateString);
            DateDisplay.Text = date.ToString("dddd, MMMM d, yyyy", CultureInfo.InvariantCulture);
            
            // Set owner for modal behavior
            this.Owner = Application.Current.MainWindow;
        }
        
        private void DecreaseButton_Click(object sender, RoutedEventArgs e)
        {
            if (int.TryParse(HoursInput.Text, out int currentValue))
            {
                if (currentValue > 0)
                {
                    HoursInput.Text = (currentValue - 1).ToString();
                }
            }
            else
            {
                HoursInput.Text = "0";
            }
        }
        
        private void IncreaseButton_Click(object sender, RoutedEventArgs e)
        {
            if (int.TryParse(HoursInput.Text, out int currentValue))
            {
                if (currentValue < 24)
                {
                    HoursInput.Text = (currentValue + 1).ToString();
                }
            }
            else
            {
                HoursInput.Text = "1";
            }
        }
        
        private void HoursInput_PreviewTextInput(object sender, TextCompositionEventArgs e)
        {
            // Allow only numbers
            var regex = new Regex("[^0-9]");
            e.Handled = regex.IsMatch(e.Text);
        }
        
        private void HoursInput_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                SaveButton_Click(sender, e);
            }
            else if (e.Key == Key.Escape)
            {
                CancelButton_Click(sender, e);
            }
        }
        
        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            if (int.TryParse(HoursInput.Text, out int hours))
            {
                if (hours >= 0 && hours <= 24)
                {
                    Hours = hours;
                    this.DialogResult = true;
                    this.Close();
                }
                else
                {
                    MessageBox.Show("Please enter a number between 0 and 24.", "Invalid Input", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
            else
            {
                MessageBox.Show("Please enter a valid number.", "Invalid Input", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }
        
        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            this.DialogResult = false;
            this.Close();
        }
        
        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            CancelButton_Click(sender, e);
        }
    }
} 