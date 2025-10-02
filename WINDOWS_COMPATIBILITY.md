# Windows Compatibility Guide

## ✅ Supported Windows Versions

Aura PDF v2.0.0 is **fully compatible** with:
- ✅ **Windows 10** (64-bit) - All versions (1809 and later recommended)
- ✅ **Windows 11** (64-bit) - All versions

---

## 📦 Installation Options

### Option 1: Full Installer (NSIS)
**File:** `Aura-PDF-Setup-2.0.0.exe`

**Features:**
- ✅ Guided installation wizard
- ✅ Choose custom installation directory
- ✅ Automatic Start Menu integration
- ✅ Desktop shortcut creation
- ✅ Easy uninstallation from Windows Settings
- ✅ No administrator rights required (user-level install)
- ✅ Automatic updates support

**Recommended for:**
- Primary computer installation
- Users who want full Windows integration
- Long-term usage

---

### Option 2: Portable Version
**File:** `Aura-PDF-2.0.0.exe`

**Features:**
- ✅ No installation required
- ✅ Run directly from any location
- ✅ Perfect for USB drives
- ✅ No registry changes
- ✅ No admin rights needed
- ✅ Multiple instances possible

**Recommended for:**
- USB/external drive usage
- Testing before installation
- Shared computers
- Users without admin rights
- Quick one-time usage

---

## 💻 System Requirements

### Minimum Requirements
- **OS:** Windows 10 (64-bit, version 1809+) or Windows 11
- **Processor:** Intel/AMD 64-bit processor (1 GHz+)
- **RAM:** 4 GB
- **Disk Space:** 200 MB free space
- **Display:** 1280x720 resolution

### Recommended Requirements
- **OS:** Windows 10 (latest) or Windows 11
- **Processor:** Intel Core i3/AMD Ryzen 3 or better
- **RAM:** 8 GB or more
- **Disk Space:** 500 MB free space (for optimal performance)
- **Display:** 1920x1080 resolution or higher

---

## 🔧 Compatibility Notes

### Windows 10 Compatibility
- ✅ Tested on Windows 10 versions 1809, 1903, 1909, 2004, 20H2, 21H1, 21H2, 22H2
- ✅ Works with Windows Defender
- ✅ Compatible with Windows Hello
- ✅ Supports Windows dark/light theme

### Windows 11 Compatibility
- ✅ Fully compatible with Windows 11 UI
- ✅ Supports Windows 11 rounded corners
- ✅ Compatible with Snap Layouts
- ✅ Works with Windows 11 security features
- ✅ Optimized for Windows 11 performance

### Architecture Support
- ✅ **x64 (64-bit):** Full support ✅
- ❌ **x86 (32-bit):** Not supported
- ❌ **ARM64:** Not currently supported

---

## 🛡️ Security & Permissions

### Installation Permissions
- **User-level install:** No administrator rights required
- **Per-machine install:** Optional (requires admin rights)
- **Execution Level:** `asInvoker` (runs with user permissions)

### Windows Security
- **SmartScreen:** App is unsigned, may show warning on first run
  - Click "More info" → "Run anyway" to proceed
- **Antivirus:** May be flagged by overly aggressive antivirus (false positive)
  - The app is safe - built with Electron and open source
- **Firewall:** No internet access required for core functionality

---

## 🚀 Performance Optimization

### Windows-Specific Optimizations
- ✅ Native Node.js integration for fast file operations
- ✅ Hardware acceleration for PDF rendering
- ✅ Optimized memory management (69% reduction)
- ✅ Async file operations for smooth UI
- ✅ Windows file system API integration

### Performance Tips
1. **SSD Recommended:** For best file operation speed
2. **Close Background Apps:** Free up RAM for large PDFs
3. **Windows Updates:** Keep Windows updated for best performance
4. **Graphics Drivers:** Update for optimal rendering

---

## 🐛 Troubleshooting

### Common Issues

#### App Won't Start
**Solution:**
1. Make sure you're running 64-bit Windows
2. Check if Microsoft Visual C++ Redistributable is installed
3. Try running as administrator (right-click → "Run as administrator")

#### "Windows Protected Your PC" Warning
**Solution:**
1. Click "More info"
2. Click "Run anyway"
3. This is normal for unsigned apps

#### Performance Issues
**Solution:**
1. Close other applications to free up RAM
2. Check Task Manager for high CPU/memory usage
3. Restart the app
4. Update Windows to the latest version

#### Files Not Opening
**Solution:**
1. Check file permissions
2. Make sure the file path doesn't contain special characters
3. Try copying the file to your Desktop and opening from there

---

## 📊 Feature Compatibility

| Feature | Windows 10 | Windows 11 |
|---------|------------|------------|
| PDF Split | ✅ | ✅ |
| PDF Merge | ✅ | ✅ |
| Bulk Rename | ✅ | ✅ |
| Pattern Detection | ✅ | ✅ |
| Text Extraction | ✅ | ✅ |
| File Drag & Drop | ✅ | ✅ |
| Dark Mode | ✅ | ✅ |
| Multi-file Operations | ✅ | ✅ |

---

## 🔄 Update Process

### For Installer Version
1. Download new version installer
2. Run installer (will automatically update)
3. Your settings and preferences are preserved

### For Portable Version
1. Download new version
2. Replace old `.exe` file
3. No configuration changes needed

---

## 📞 Support

If you encounter Windows-specific issues:
- **GitHub Issues:** https://github.com/matclif/Aura-pdf/issues
- **Email:** wycliffmatovu@gmail.com

Include in your report:
- Windows version (10 or 11)
- Windows build number (Win+R → `winver`)
- Installation type (installer or portable)
- Error message or screenshot

---

## 📝 Technical Details

### Built With
- **Electron:** 27.3.11
- **Node.js:** 18.x (bundled)
- **Architecture:** x64
- **Execution Level:** asInvoker
- **Installer:** NSIS 3.0.4.1

### File Locations
- **Installer version:**
  - Program: `%LOCALAPPDATA%\Programs\Aura PDF™`
  - User data: `%APPDATA%\Aura PDF™`
- **Portable version:**
  - Runs from download location
  - No data stored in system directories

---

**Made with ❤️ by Wycliff Matovu**

Last updated: October 2, 2025 | Version: 2.0.0

