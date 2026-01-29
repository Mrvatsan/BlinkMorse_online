import pyttsx3
import threading
import queue
import time

class TTSEngine:
    def __init__(self):
        self.queue = queue.Queue()
        self.running = True
        self.speaking = False  # Track if currently speaking
        # Set thread as non-daemon and with higher priority for audio
        self.thread = threading.Thread(target=self._loop, daemon=False)
        self.engine_failed = False
        self.thread.start()

    def _loop(self):
        """
        Worker thread that initializes the engine once and processes the queue.
        """
        engine = None
        try:
            # Initialize engine inside the thread with explicit driver
            import pythoncom
            pythoncom.CoInitialize()  # Initialize COM in this thread
            
            engine = pyttsx3.init('sapi5')  # Explicitly use SAPI5
            
            # Configure engine properties
            engine.setProperty('rate', 140)  # Slightly slower for clarity
            engine.setProperty('volume', 1.0)
            
            # Try to get voices and use a different one if default fails
            voices = engine.getProperty('voices')
            if voices and len(voices) > 0:
                print(f"[TTS Init] Available voices: {len(voices)}")
                # Use first available voice
                engine.setProperty('voice', voices[0].id)
            
            print(f"[TTS Init] Engine initialized successfully")
            
        except Exception as e:
            print(f"TTS Initialization Error: {e}")
            self.engine_failed = True
            return
            
        while self.running:
            try:
                text = self.queue.get(timeout=0.1)
            except queue.Empty:
                continue
            
            if text is None: # Sentinel to stop
                break
            
            try:
                self.speaking = True
                print(f"[TTS Speaking] Now speaking: '{text}'")
                
                # Ensure previous speech is stopped
                try:
                    engine.stop()
                except:
                    pass
                
                # Add text and run - this blocks until speech completes
                engine.say(text)
                engine.runAndWait()
                
                # Additional delay to ensure audio buffer is fully flushed
                time.sleep(0.2)
                
                self.speaking = False
                print(f"[TTS Done] Finished speaking: '{text}'")
            except Exception as e:
                self.speaking = False
                print(f"TTS Error during playback: {e}")
                print(f">>> FALLBACK TEXT OUTPUT: {text} <<<")
            
            self.queue.task_done()
        
        # Cleanup COM
        try:
            if engine:
                engine.stop()
            pythoncom.CoUninitialize()
        except:
            pass

    def speak(self, text):
        """Add text to the speech queue."""
        if not text:
            return
        
        if self.engine_failed:
            print(f"[TTS FAILED] Cannot speak (engine failed): '{text}'")
            print(f">>> TEXT OUTPUT: {text} <<<")
            return
            
        print(f"[TTS Queue] Adding to queue: '{text}'")
        self.queue.put(text)

    def stop(self):
        """Stop the background thread."""
        self.running = False
        self.queue.put(None)
        if self.thread.is_alive():
            self.thread.join(timeout=1.0)
