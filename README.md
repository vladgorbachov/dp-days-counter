# DP Days Counter

A desktop application for tracking Dynamic Positioning (DP) hours on vessels, built with Electron.js and React.

**Developed by DeLion Software**

## Features

- 📅 Calendar interface for daily DP hour entries
- 📊 Statistics with multi-day range selection
- 🎨 Theme switching (light/dark mode)
- 🖼️ Custom background customization
- 💾 Local JSON data storage
- 🔄 Auto-update system
- 🖱️ Multi-day selection with Ctrl+click

## Installation

### For Users

1. Download the latest release from [Releases](https://github.com/your-username/dp-days-counter/releases)
2. Run the installer `DP-Days-Counter-Setup.exe`
3. Follow the installation wizard

### For Developers

1. Clone the repository:
```bash
git clone https://github.com/your-username/dp-days-counter.git
cd dp-days-counter
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm start
```

4. Build for production:
```bash
npm run build:win
```

## Usage

- Click on any date in the calendar to add/edit DP hours
- Use Ctrl+click to select multiple days for range statistics
- Press Enter in the input dialog to save DP hours
- Use the sidebar to customize themes and backgrounds
- Check for updates using the "Check for Updates" button

## Development

### Project Structure

```
dp-days-counter/
├── src/                    # Source files
│   ├── assets/            # Images and icons
│   ├── styles/            # CSS files
│   ├── index.html         # Main window HTML
│   ├── index.js           # Main window logic
│   ├── main.js            # Electron main process
│   └── update.html        # Update window HTML
├── updater/               # Update installer
├── update.js              # Update logic
└── package.json           # Project configuration
```

### Scripts

- `npm start` - Run in development mode
- `npm run build:win` - Build Windows installer
- `npm run build-updater` - Build update installer

## License

MIT License - see LICENSE file for details

## About DeLion Software

DeLion Software specializes in developing professional desktop applications for maritime and industrial sectors. Our solutions are designed with reliability, security, and user experience in mind.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/your-username/dp-days-counter/issues) page.

For commercial support and custom development, contact DeLion Software. 