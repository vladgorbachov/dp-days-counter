# DP Days Counter WPF

Professional application for tracking Dynamic Positioning hours on vessels, built with C# WPF.

## Features

- **Calendar Interface**: Monthly calendar view for tracking DP hours
- **Theme Support**: Dark and light themes with smooth transitions
- **Range Selection**: Ctrl+Click to select date ranges for bulk operations
- **Statistics**: Real-time calculation of month hours, days, and selected ranges
- **Data Persistence**: Automatic saving of DP hours and settings
- **Modern UI**: Glassmorphism design with smooth animations

## Functionality

### Calendar Navigation
- Navigate between months using arrow buttons
- Current month and year displayed prominently
- Today's date highlighted

### DP Hours Management
- Click on any date to enter/edit DP hours (0-24)
- Hours are displayed on calendar days
- Days with DP hours are visually distinguished

### Range Selection
- Hold Ctrl and click two dates to select a range
- Selected ranges show statistics in the footer
- Useful for bulk reporting and analysis

### Statistics
- **Month Hours**: Total DP hours for current month
- **Month Days**: Number of days with DP hours in current month
- **Selected Hours**: Total DP hours for selected date range
- **Selected Days**: Number of days with DP hours in selected range

### Settings
- **Theme Toggle**: Switch between dark and light themes
- **Update Check**: Check for application updates
- Settings are automatically saved

## Building the Application

### Prerequisites
- .NET 8 or later
- Visual Studio 2022Visual Studio Code

### Build Steps
1. Open the solution in Visual Studio or navigate to the project directory
2. Restore NuGet packages:
   ```
   dotnet restore
   ```
3. Build the application:
   ```
   dotnet build
   ```
4. Run the application:
   ```
   dotnet run
   ```

### Creating an Executable
To create a standalone executable:
```
dotnet publish -c Release -r win-x64elf-contained true
```

## Data Storage

The application stores data in the following locations:
- **DP Hours**: `%APPDATA%\DPDaysCounter\dp_hours.json`
- **Settings**: `%APPDATA%\DPDaysCounter\settings.json`

## Usage

1. **Adding DP Hours**: Click on any date in the calendar to open the hours input dialog
2**Editing Hours**: Use the +/- buttons or type directly in the input field
3. **Range Selection**: Hold Ctrl and click two dates to select a range
4. **Theme Switching**: Use the theme buttons in the sidebar
5*Navigation**: Use the arrow buttons to navigate between months

## Security Features

- Input validation for hours (0range)
- Safe file I/O operations with error handling
- JSON data validation
- Secure settings storage

## Technical Details

- **Framework**: .NET 8.0 WPF
- **UI Design**: Modern glassmorphism with Material Design principles
- **Data Format**: JSON for easy data portability
- **Architecture**: MVVM-inspired with clean separation of concerns

## License

MIT License - see LICENSE file for details.

## Company

DeLion Software 