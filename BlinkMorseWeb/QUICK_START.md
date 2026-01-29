# Quick Start Guide - Blink Morse Web

## 🚀 Installation & Setup

### Step 1: Install Dependencies

```bash
cd BlinkMorseWeb
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables

Create a `.env` file in the `BlinkMorseWeb` directory:

```bash
# Copy the example file
copy .env.example .env
```

Edit `.env` and add your NVIDIA API key:

```env
NVIDIA_API_KEY=your_actual_nvidia_api_key_here
HOST=0.0.0.0
PORT=8000
```

**Get your NVIDIA API key:**
1. Visit: https://build.nvidia.com/
2. Sign in with NVIDIA account
3. Navigate to Magpie-TTS API
4. Generate API key

### Step 3: Run the Application

```bash
python run.py
```

The server will start on `http://localhost:8000`

## 🎮 How to Use

### First Time Setup

1. **Open Browser**: Navigate to `http://localhost:8000`

2. **Login Screen**:
   - Enter your name
   - Select role (Patient/Caregiver/User)
   - Click "Continue"

3. **Select Mode**:
   - **Patient Mode**: For quick communication
   - **Morse Learning**: To learn Morse code patterns

### Patient Mode

1. Click "Start Detection"
2. Allow camera access when prompted
3. Position your face in frame
4. Start blinking:
   - **Quick blink** (< 0.4s) = DOT (.)
   - **Long blink** (≥ 0.4s) = DASH (-)
   - **Wait ~1s** = Complete letter
   - **Wait ~2.5s** = Complete word & speak

**Quick Commands Available:**
- FOOD
- WATER
- HELP
- EMERGENCY (SOS)
- PAIN
- BATHROOM
- YES
- NO

### Morse Learning Mode

- Browse complete A-Z Morse code reference
- View timing guidelines
- Click any letter to see pattern

## 🔧 Troubleshooting

### Camera Not Working

**Issue**: "Camera access denied"

**Solution**:
- Grant camera permissions in browser
- Check if another app is using the camera
- Try refreshing the page

---

**Issue**: "No face detected"

**Solution**:
- Ensure good lighting
- Position face directly toward camera
- Remove glasses if causing issues

### TTS Not Working

**Issue**: "Speech generation failed"

**Solution**:
1. Verify NVIDIA_API_KEY is set in `.env`
2. Check internet connection (TTS is online only)
3. Verify API key is valid at https://build.nvidia.com/

---

**Issue**: "TTS service unavailable"

**Solution**:
- Check NVIDIA API status
- Verify account has API credits
- Check server logs for detailed error

### Connection Issues

**Issue**: "WebSocket connection failed"

**Solution**:
- Restart the server
- Clear browser cache
- Check firewall settings
- Try different browser

## 📊 System Requirements

- **Python**: 3.8 or higher
- **Webcam**: Built-in or external
- **Browser**: Chrome 90+, Firefox 88+, Edge 90+
- **Internet**: Required for TTS only
- **RAM**: Minimum 4GB (8GB recommended)

## 🔐 Privacy & Security

- **Camera Access**: Only used locally, no video uploaded
- **API Key**: Stored in `.env`, never committed to git
- **Data**: No personal data stored or logged
- **TTS**: Only decoded text sent to NVIDIA for speech

## ⚙️ Advanced Configuration

### Adjust Blink Sensitivity

Edit `backend/config.py`:

```python
# Make detection more sensitive
EAR_THRESHOLD = 0.23  # Default: 0.21

# Adjust blink duration thresholds
DOT_DURATION_MAX = 0.3  # Default: 0.4 (faster dots)
DASH_DURATION_MIN = 0.5  # Default: 0.4 (longer dashes)
```

### Change Timing Pauses

```python
LETTER_PAUSE = 1.5  # Default: 1.0 (more time between letters)
WORD_PAUSE = 3.0    # Default: 2.5 (more time for word)
```

### Run on Different Port

Edit `.env`:

```env
PORT=3000
```

## 📝 Common Use Cases

### Healthcare Facility

1. Set up dedicated computer with webcam
2. Create patient profiles with pre-configured settings
3. Train caregivers on Morse patterns
4. Use Patient Mode for quick needs

### Home Care

1. Install on family member's computer
2. Practice with Morse Learning Mode
3. Gradually move to Patient Mode
4. Customize common phrases if needed

### Learning & Practice

1. Start with Morse Learning Mode
2. Learn A-Z patterns
3. Practice timing with visual guide
4. Test in Patient Mode

## 🆘 Emergency Protocol

**If patient signals EMERGENCY (SOS):**

1. Pattern: `... --- ...` (3 short, 3 long, 3 short)
2. System will speak "SOS" immediately
3. Alert caregivers immediately
4. Follow facility emergency procedures

## 📞 Support Resources

- Check `README.md` for full documentation
- Review code comments in source files
- Check browser console for error details
- Review server logs for backend issues

## 🎯 Tips for Best Results

1. **Lighting**: Ensure face is well-lit
2. **Position**: Keep face centered in frame
3. **Distance**: Stay 1-2 feet from camera
4. **Practice**: Start with simple patterns
5. **Patience**: System adapts to your blink style
6. **Consistency**: Use consistent blink durations

---

**Ready to communicate! 👁️💬**
