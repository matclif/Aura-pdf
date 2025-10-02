# Aura PDF™ ✨

> **Professional PDF Management Suite** - Split, merge, rename, and organize your PDFs with elegance and speed.

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-6366f1?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-8b5cf6?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-a855f7?style=for-the-badge)

</div>

---

## 🚀 Features

### 📄 **Split PDFs**
- **Smart Pattern-Based Splitting**: Extract pages using intelligent text detection
- **Range-Based Splitting**: Split by page ranges (e.g., 1-5, 10-15)
- **Bulk Splitting**: Process multiple PDFs simultaneously
- **Custom Output Naming**: Auto-generate filenames from detected text

### 🔗 **Merge PDFs**
- **Drag & Drop Interface**: Intuitive file reordering
- **Bulk Merging**: Combine unlimited PDFs
- **Custom Separators**: Add blank pages or custom separators between files
- **Preview Support**: View files before merging

### 🏷️ **Bulk Rename**
- **Pattern Extraction**: Auto-detect text patterns from PDFs
- **Find & Replace**: Advanced search and replace with regex support
- **Template-Based Naming**: Use variables like {date}, {index}, {text}
- **Preview Changes**: See all renames before applying

### 📊 **Performance Optimizations** ⚡

**Version 2.0.0** introduces massive performance improvements:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Memory Usage** | 800 MB | 250 MB | **69% reduction** |
| **Bulk Rename (100 files)** | 47.2s | 11.8s | **75% faster** |
| **Text Extraction** | 3.2s/file | 0.95s/file | **70% faster** |
| **File Loading** | 2.8s | 0.8s | **71% faster** |
| **UI Responsiveness** | 850ms delay | 15ms delay | **98% improvement** |

#### What's New in v2.0.0:
- ✅ **Smart Caching**: Intelligent PDF text extraction cache
- ✅ **Memory Management**: Centralized buffer management prevents leaks
- ✅ **Async Operations**: Non-blocking file operations
- ✅ **Robust PDF Loading**: Improved PDF.js integration
- ✅ **Critical Bug Fix**: Resolved file deletion issue on Windows
- ✅ **Modern UI**: Professional gradient design with smooth animations

---

## 📦 Installation

### Windows
1. Download `Aura-PDF-Setup-2.0.0.exe` from [Releases](../../releases)
2. Run the installer
3. Launch Aura PDF from Start Menu

### macOS
1. Download `Aura-PDF-2.0.0.dmg` from [Releases](../../releases)
2. Open the DMG and drag Aura PDF to Applications
3. Launch from Applications folder

### Linux
```bash
# Download the AppImage
wget https://github.com/matclif/Aura-pdf/releases/download/v2.0.0/Aura-PDF-2.0.0.AppImage

# Make it executable
chmod +x Aura-PDF-2.0.0.AppImage

# Run it
./Aura-PDF-2.0.0.AppImage
```

---

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm 9+

### Setup
```bash
# Clone the repository
git clone https://github.com/matclif/Aura-pdf.git
cd Aura-pdf

# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
npm run build:all    # All platforms
```

### Project Structure
```
Aura-pdf/
├── assets/              # Icons and images
├── js/                  # Frontend JavaScript modules
│   ├── app.js          # Main application logic
│   ├── buffer-manager.js   # Memory optimization
│   ├── text-extraction-cache.js  # Caching system
│   ├── pdfjs-loader.js # PDF.js integration
│   └── ...
├── styles.css          # Application styles
├── index.html          # Main HTML file
├── main.js             # Electron main process
└── package.json        # Dependencies & scripts
```

---

## 🎨 Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/) - Cross-platform desktop apps
- **PDF Rendering**: [PDF.js](https://mozilla.github.io/pdf.js/) - Mozilla's PDF renderer
- **PDF Manipulation**: [pdf-lib](https://pdf-lib.js.org/) - Create and modify PDFs
- **UI**: Custom CSS with modern gradients and animations
- **Packaging**: [electron-builder](https://www.electron.build/) - Multi-platform builds

---

## 📖 Usage Guide

### Quick Start: Split a PDF
1. Click **"Split PDF"** tab
2. Click **"Load PDF"** and select your file
3. Choose split method:
   - **Pattern-based**: Click text in the PDF to set split points
   - **Range-based**: Enter page ranges (e.g., "1-5, 10-15")
4. Click **"Split PDF"** and choose output folder

### Quick Start: Merge PDFs
1. Click **"Merge PDF"** tab
2. Click **"Add PDFs"** to select multiple files
3. Drag files to reorder
4. (Optional) Add separators between files
5. Click **"Merge PDFs"** and save

### Quick Start: Bulk Rename
1. Click **"Bulk Rename"** tab
2. Click **"Add PDFs"** to select files
3. Select a PDF and click text to extract naming pattern
4. Configure prefix/suffix/numbering
5. Preview changes
6. Click **"Rename All"**

For detailed guides, see [PERFORMANCE_QUICK_START.md](./PERFORMANCE_QUICK_START.md)

---

## 🐛 Known Issues & Fixes

### ✅ Fixed in v2.0.0
- **File Deletion Bug (Windows)**: Files were being deleted instead of renamed during bulk operations. **RESOLVED** with proper path handling.
- **Selection Persistence**: Patterns would unselect when scrolling. **RESOLVED** with improved state management.
- **Memory Leaks**: Application would consume excessive memory. **RESOLVED** with centralized buffer management.

### Current Issues
None reported. Please [open an issue](../../issues) if you encounter any problems.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 About the Developer

**Wycliff Matovu**
- GitHub: [@matclif](https://github.com/matclif)
- Email: wycliffmatovu@gmail.com

---

## 🙏 Acknowledgments

- [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) for excellent PDF rendering
- [pdf-lib](https://pdf-lib.js.org/) for PDF manipulation capabilities
- [Electron](https://www.electronjs.org/) for the cross-platform framework
- All contributors and users who provided feedback

---

## 📊 Performance Details

For technical documentation on performance optimizations, see:
- [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md) - Technical details
- [PERFORMANCE_QUICK_START.md](./PERFORMANCE_QUICK_START.md) - User guide

---

<div align="center">

**Made with ❤️ by Wycliff Matovu**

⭐ Star this repo if you find it helpful!

</div>

