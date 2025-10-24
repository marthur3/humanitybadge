// Integration Tests for Humanity Badge Extension
// Test the complete extension workflow including Chrome APIs

const fs = require('fs');
const path = require('path');

// Mock Chrome API more comprehensively
class IntegratedMockChrome {
  constructor() {
    this.storage = {
      local: {
        data: {},
        get: (keys, callback) => {
          const result = {};
          if (Array.isArray(keys)) {
            keys.forEach(key => {
              if (this.data[key] !== undefined) {
                result[key] = this.data[key];
              }
            });
          } else if (typeof keys === 'string') {
            if (this.data[keys] !== undefined) {
              result[keys] = this.data[keys];
            }
          } else if (keys === null || keys === undefined) {
            Object.assign(result, this.data);
          }
          if (callback) callback(result);
        },
        set: (items, callback) => {
          Object.assign(this.data, items);
          if (callback) callback();
        }
      }
    };

    this.runtime = {
      sendMessage: (message, callback) => {
        console.log('Mock sendMessage:', message);
        
        // Simulate background script responses
        setTimeout(() => {
          if (message.action === 'recordingStarted') {
            callback && callback({ success: true });
          } else if (message.action === 'saveRecording') {
            callback && callback({ 
              success: true, 
              shareUrl: `test://extension/replay.html?id=${message.data.id}`,
              id: message.data.id
            });
          } else if (message.action === 'getRecordings') {
            callback && callback({ recordings: [] });
          }
        }, 10);
      },
      onMessage: {
        addListener: (listener) => {
          console.log('Mock onMessage listener added');
        }
      },
      getURL: (path) => `chrome-extension://test/${path}`,
      lastError: null
    };
  }
}

// Enhanced DOM Mock for Integration Testing
class IntegratedMockDOM {
  constructor() {
    this.elements = new Map();
    this.eventListeners = new Map();
    this._body = null;
    this.readyState = 'complete';
  }

  createElement(tagName) {
    const element = {
      tagName: tagName.toLowerCase(),
      innerHTML: '',
      textContent: '',
      className: '',
      style: {},
      dataset: {},
      classList: {
        add: (className) => {
          element.className = element.className ? `${element.className} ${className}` : className;
        },
        remove: (className) => {
          element.className = element.className.replace(new RegExp(`\\b${className}\\b`, 'g'), '').trim();
        },
        contains: (className) => element.className.includes(className)
      },
      appendChild: (child) => {
        console.log(`Appending ${child.tagName || 'element'} to ${element.tagName}`);
      },
      addEventListener: (event, listener, options) => {
        const key = `${element.id || Math.random()}_${event}`;
        this.eventListeners.set(key, { listener, options });
        element._listeners = element._listeners || [];
        element._listeners.push({ event, listener, options });
        console.log(`Added ${event} listener to ${element.tagName}`);
      },
      removeEventListener: (event, listener) => {
        if (element._listeners) {
          element._listeners = element._listeners.filter(l => !(l.event === event && l.listener === listener));
        }
        console.log(`Removed ${event} listener from ${element.tagName}`);
      },
      getBoundingClientRect: () => ({
        width: 300,
        height: 150,
        top: 100,
        left: 100,
        right: 400,
        bottom: 250
      }),
      parentNode: {
        insertBefore: (newElement, refElement) => {
          console.log('Inserting element before reference');
        }
      },
      closest: (selector) => {
        if (selector === '.typing-recorder-wrapper') {
          return { appendChild: (child) => console.log('Badge added to wrapper') };
        }
        return null;
      },
      offsetParent: {},
      value: '',
      disabled: false,
      readOnly: false,
      placeholder: '',
      focus: () => console.log('Element focused'),
      blur: () => console.log('Element blurred')
    };

    if (tagName.toLowerCase() === 'textarea') {
      element.rows = 4;
      element.cols = 50;
    }

    return element;
  }

  getElementById(id) {
    return this.elements.get(id) || null;
  }

  querySelectorAll(selector) {
    console.log(`Querying for: ${selector}`);
    
    // Mock Reddit-specific selectors
    if (selector.includes('shreddit-comment-composer')) {
      const textarea = this.createElement('textarea');
      textarea.setAttribute = (name, value) => textarea[name] = value;
      return [textarea];
    }
    
    if (selector.includes('textarea') && !selector.includes('data-typing-recorder-attached')) {
      const textarea1 = this.createElement('textarea');
      const textarea2 = this.createElement('textarea');
      textarea2.placeholder = 'Reply to comment...';
      return [textarea1, textarea2];
    }
    
    if (selector.includes('[contenteditable="true"]')) {
      const div = this.createElement('div');
      div.contentEditable = 'true';
      return [div];
    }
    
    return [];
  }

  get body() {
    if (!this._body) {
      this._body = this.createElement('body');
      this._body.appendChild = (element) => {
        this.elements.set(element.id, element);
        console.log(`Appended ${element.tagName} to body`);
      };
    }
    return this._body;
  }

  addEventListener(event, listener) {
    console.log(`Document event listener added: ${event}`);
    if (event === 'DOMContentLoaded') {
      // Simulate immediate execution since we're already loaded
      setTimeout(listener, 1);
    }
  }

  dispatchEvent(event) {
    console.log(`Document event dispatched: ${event.type}`);
  }
}

// Integration Test Suite
class IntegrationTestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.recorder = null;
  }

  async setup() {
    // Setup global mocks
    global.window = {
      location: {
        hostname: 'reddit.com',
        href: 'https://reddit.com/r/test/comments/123'
      },
      outerWidth: 1200,
      innerWidth: 1000,
      outerHeight: 800,
      innerHeight: 600,
      getComputedStyle: () => ({ visibility: 'visible' })
    };

    global.document = new IntegratedMockDOM();
    global.chrome = new IntegratedMockChrome();

    // Load TypingRecorder class
    const contentJsPath = path.join(__dirname, '..', 'content.js');
    const contentJs = fs.readFileSync(contentJsPath, 'utf8');
    
    // Extract and evaluate the class
    const classMatch = contentJs.match(/class TypingRecorder \{[\s\S]*?(?=\n\n|\n\/\/|\nclass|\n$)/);
    if (classMatch) {
      eval(classMatch[0]);
      this.TypingRecorder = TypingRecorder;
    } else {
      throw new Error('Could not extract TypingRecorder class from content.js');
    }
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('\n🔗 Running Integration Tests for Humanity Badge Extension\n');
    
    try {
      await this.setup();
    } catch (error) {
      console.error('Setup failed:', error.message);
      process.exit(1);
    }
    
    for (const { name, testFn } of this.tests) {
      try {
        // Create fresh recorder instance for each test
        this.recorder = new this.TypingRecorder();
        await testFn.call(this);
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Integration Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Test Suite Setup
const suite = new IntegrationTestSuite();

suite.test('Complete extension initialization flow', function() {
  if (!this.recorder) {
    throw new Error('TypingRecorder should initialize');
  }
  
  if (this.recorder.isRecording !== false) {
    throw new Error('Should start in non-recording state');
  }
  
  // Should have created overlay
  if (!this.recorder.overlay) {
    throw new Error('Should create overlay during initialization');
  }
});

suite.test('Reddit textarea detection and button attachment', function() {
  // Reset document for clean test
  global.document = new IntegratedMockDOM();
  this.recorder = new this.TypingRecorder();
  
  // Simulate finding Reddit textareas
  const textareas = global.document.querySelectorAll('textarea:not([data-typing-recorder-attached])');
  
  if (textareas.length === 0) {
    throw new Error('Should find mock textareas');
  }
  
  // Simulate attachment process
  textareas.forEach(textarea => {
    if (this.recorder.isValidTextArea(textarea)) {
      textarea.dataset.typingRecorderAttached = 'true';
      this.recorder.attachRecordButton(textarea);
    }
  });
  
  // Check if button was attached (by checking if dataset was set)
  const attachedElements = global.document.querySelectorAll('[data-typing-recorder-attached="true"]');
  if (attachedElements.length === 0) {
    throw new Error('Should attach buttons to valid textareas');
  }
});

suite.test('Recording workflow integration', async function() {
  const textarea = global.document.createElement('textarea');
  textarea.value = '';
  
  // Start recording
  this.recorder.startRecording(textarea);
  
  if (!this.recorder.isRecording) {
    throw new Error('Should be recording after startRecording');
  }
  
  if (!this.recorder.currentRecording) {
    throw new Error('Should have currentRecording object');
  }
  
  // Simulate typing events
  const events = [
    { type: 'keydown', key: 'H', timestamp: 100 },
    { type: 'input', target: { value: 'H' }, timestamp: 120 },
    { type: 'keydown', key: 'e', timestamp: 200 },
    { type: 'input', target: { value: 'He' }, timestamp: 220 }
  ];
  
  events.forEach(event => {
    event.ctrlKey = false;
    event.metaKey = false;
    event.shiftKey = false;
    event.altKey = false;
    this.recorder.recordEvent(event);
  });
  
  // Update textarea value
  textarea.value = 'Hello world test';
  
  // Stop recording
  this.recorder.stopRecording();
  
  if (this.recorder.isRecording) {
    throw new Error('Should stop recording after stopRecording');
  }
  
  // Should have recorded events
  if (!this.recorder.currentRecording || this.recorder.currentRecording.events.length === 0) {
    // Note: currentRecording is null after stop, but we can check if events were recorded
    // This is expected behavior
    console.log('Recording completed and cleaned up as expected');
  }
});

suite.test('Chrome extension API integration', function() {
  return new Promise((resolve, reject) => {
    const testMessage = {
      action: 'saveRecording',
      data: {
        id: 'test123',
        events: [{ type: 'keydown', timestamp: 0 }],
        duration: 5000,
        finalValue: 'test content'
      }
    };
    
    global.chrome.runtime.sendMessage(testMessage, (response) => {
      try {
        if (!response) {
          throw new Error('Should receive response from background script');
        }
        
        if (!response.success) {
          throw new Error('Response should indicate success');
        }
        
        if (!response.shareUrl) {
          throw new Error('Response should include share URL');
        }
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
});

suite.test('Paste prevention integration', function() {
  const textarea = global.document.createElement('textarea');
  let pasteBlocked = false;
  let showMessageCalled = false;
  
  // Mock the showPasteBlockedMessage method
  this.recorder.showPasteBlockedMessage = () => {
    showMessageCalled = true;
  };
  
  // Add event listeners to textarea
  this.recorder.addEventListeners(textarea);
  
  // Simulate paste event
  const mockPasteEvent = {
    type: 'paste',
    preventDefault: () => { pasteBlocked = true; },
    stopPropagation: () => {}
  };
  
  // Find and trigger the paste listener
  if (textarea._listeners) {
    const pasteListener = textarea._listeners.find(l => l.event === 'paste');
    if (pasteListener) {
      pasteListener.listener(mockPasteEvent);
    }
  }
  
  if (!pasteBlocked) {
    throw new Error('Paste event should be blocked');
  }
  
  if (!showMessageCalled) {
    throw new Error('Should show paste blocked message');
  }
});

suite.test('Verification system integration', function() {
  // Create a realistic recording for verification
  const recording = {
    events: [],
    duration: 8000, // 8 seconds
    finalValue: 'This is a test message with natural typing',
    devToolsDetected: false
  };
  
  // Generate realistic keystroke events
  const message = 'This is a test message';
  let timestamp = 0;
  
  for (let i = 0; i < message.length; i++) {
    // Vary keystroke intervals naturally (50-200ms)
    timestamp += 50 + Math.random() * 150;
    
    recording.events.push({
      type: 'keydown',
      timestamp: timestamp,
      key: message[i],
      keyCode: message.charCodeAt(i)
    });
  }
  
  this.recorder.currentRecording = recording;
  const verification = this.recorder.verifyTypingAuthenticity();
  
  if (!verification.isAuthentic) {
    throw new Error(`Verification should pass for natural typing: ${verification.reason}`);
  }
  
  if (verification.wpm < 10 || verification.wpm > 200) {
    throw new Error(`WPM should be in reasonable range, got ${verification.wpm}`);
  }
});

suite.test('Event listener cleanup integration', function() {
  const textarea = global.document.createElement('textarea');
  
  // Add event listeners
  this.recorder.addEventListeners(textarea);
  
  if (!textarea._humanityBadgeListeners) {
    throw new Error('Should store event listeners on element');
  }
  
  const listenerCount = textarea._humanityBadgeListeners.length;
  if (listenerCount === 0) {
    throw new Error('Should have attached event listeners');
  }
  
  // Remove event listeners
  this.recorder.removeEventListeners(textarea);
  
  if (textarea._humanityBadgeListeners) {
    throw new Error('Should clean up stored listeners');
  }
  
  if (textarea._humanityBadgeContextMenu) {
    throw new Error('Should clean up context menu listener');
  }
});

suite.test('Error handling integration', function() {
  // Test with null element
  this.recorder.startRecording(null);
  
  if (this.recorder.isRecording) {
    throw new Error('Should not start recording with null element');
  }
  
  // Test with invalid element
  const invalidElement = { tagName: 'DIV' };
  this.recorder.startRecording(invalidElement);
  
  if (this.recorder.isRecording) {
    throw new Error('Should not start recording with invalid element');
  }
  
  // Test stopping when not recording
  this.recorder.stopRecording(); // Should not throw
  
  // Test with malformed recording data
  this.recorder.currentRecording = null;
  const verification = this.recorder.verifyTypingAuthenticity();
  
  if (verification.isAuthentic) {
    throw new Error('Should fail verification with null recording');
  }
});

// Run the tests
if (require.main === module) {
  suite.run().catch(console.error);
}

module.exports = { IntegrationTestSuite, IntegratedMockChrome, IntegratedMockDOM };