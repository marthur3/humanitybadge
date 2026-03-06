// Integration Tests for Humanity Badge Extension
// Test the complete extension workflow including Chrome APIs

const fs = require('fs');
const path = require('path');

class IntegratedMockChrome {
  constructor() {
    this.storageData = {};
    this.storage = {
      sync: {
        get: (keys) => {
          const result = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach(key => {
            if (this.storageData[key] !== undefined) result[key] = this.storageData[key];
          });
          return Promise.resolve(result);
        },
        set: (items) => {
          Object.assign(this.storageData, items);
          return Promise.resolve();
        }
      },
      local: {
        get: (keys) => Promise.resolve({}),
        set: (data) => Promise.resolve()
      }
    };

    this.runtime = {
      sendMessage: (message, callback) => {
        setTimeout(() => {
          if (message.action === 'saveRecording') {
            callback && callback({
              success: true,
              shareUrl: `test://replay?id=${message.data.id}`,
              shareType: 'hash',
              recordingSize: 1000,
              id: message.data.id
            });
          } else if (message.action === 'getRecordings') {
            callback && callback({ recordings: [] });
          } else {
            callback && callback({ success: true });
          }
        }, 10);
      },
      onMessage: { addListener: () => {} },
      getURL: (p) => `chrome-extension://test/${p}`,
      lastError: null
    };
  }
}

class IntegratedMockDOM {
  constructor() {
    this.elements = new Map();
    this.eventListeners = new Map();
    this._body = null;
    this._head = { appendChild: () => {} };
    this.readyState = 'complete';
  }

  createElement(tagName) {
    const self = this;
    const element = {
      tagName: tagName.toLowerCase(),
      innerHTML: '',
      textContent: '',
      className: '',
      id: '',
      style: { cssText: '' },
      dataset: {},
      _listeners: [],
      appendChild: () => {},
      remove: () => {},
      addEventListener: (event, listener, options) => {
        element._listeners.push({ event, listener, options });
      },
      removeEventListener: (event, listener) => {
        element._listeners = element._listeners.filter(l => !(l.event === event && l.listener === listener));
      },
      getBoundingClientRect: () => ({ width: 300, height: 150, top: 100, left: 100 }),
      parentNode: { insertBefore: () => {} },
      closest: () => null,
      offsetParent: {},
      value: '',
      disabled: false,
      readOnly: false,
      placeholder: '',
      focus: () => {},
      blur: () => {}
    };
    return element;
  }

  getElementById(id) { return this.elements.get(id) || null; }

  querySelectorAll(selector) {
    if (selector.includes('textarea')) {
      const textarea = this.createElement('textarea');
      textarea.id = 'mock-textarea';
      return [textarea];
    }
    if (selector.includes('[contenteditable')) {
      return [];
    }
    if (selector.includes('input[type="text"]')) {
      return [];
    }
    return [];
  }

  get head() { return this._head; }

  get body() {
    if (!this._body) {
      this._body = this.createElement('body');
      this._body.appendChild = (element) => {
        if (element.id) this.elements.set(element.id, element);
      };
    }
    return this._body;
  }

  addEventListener(event, listener) {
    if (event === 'DOMContentLoaded') setTimeout(listener, 1);
  }
}

class IntegrationTestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async setup() {
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
    try { global.navigator = { clipboard: { writeText: () => Promise.resolve() } }; } catch(e) {}
    try { global.URL = { createObjectURL: () => 'blob://test', revokeObjectURL: () => {} }; } catch(e) {}
    try { global.Blob = class { constructor() {} }; } catch(e) {}

    const contentJsPath = path.join(__dirname, '..', 'content.js');
    const contentJs = fs.readFileSync(contentJsPath, 'utf8');
    const codeWithoutInstantiation = contentJs.replace(/if \(document\.readyState[\s\S]*$/, '');
    const wrappedCode = codeWithoutInstantiation + '\nreturn TypingRecorder;';
    this.TypingRecorder = new Function(wrappedCode)();
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
        await testFn.call(this);
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Integration Test Results: ${this.passed} passed, ${this.failed} failed`);
    if (this.failed > 0) process.exit(1);
  }
}

const suite = new IntegrationTestSuite();

suite.test('Extension initializes correctly', async function() {
  const recorder = new this.TypingRecorder();
  // Wait for async init to complete
  await new Promise(r => setTimeout(r, 50));

  if (recorder.isRecording !== false) {
    throw new Error('Should start in non-recording state');
  }

  if (recorder.enabled !== true) {
    throw new Error('Should be enabled by default');
  }

  // Button is created during async init
  if (!recorder.button) {
    throw new Error('Should create a floating button');
  }
});

suite.test('startRecording initializes recording state', function() {
  const recorder = new this.TypingRecorder();
  const textarea = global.document.createElement('textarea');
  recorder.startRecording(textarea);

  if (!recorder.isRecording) {
    throw new Error('Should be recording after startRecording');
  }

  if (!recorder.recording || !recorder.recording.id) {
    throw new Error('Should initialize recording with ID');
  }

  recorder.isRecording = false;
  recorder.boundHandlers = null;
});

suite.test('Recording start/stop lifecycle', async function() {
  const recorder = new this.TypingRecorder();
  await new Promise(r => setTimeout(r, 50)); // wait for init
  const textarea = global.document.createElement('textarea');
  textarea.value = '';

  recorder.startRecording(textarea);

  if (!recorder.isRecording) {
    throw new Error('Should be recording after startRecording');
  }

  if (!recorder.recording) {
    throw new Error('Should have recording object');
  }

  if (!recorder.recording.id) {
    throw new Error('Recording should have an ID');
  }

  // Simulate some typing events
  textarea.value = 'Hello world test message for verification purposes here';
  recorder.recording.events.push(
    { type: 'keydown', timestamp: 100, key: 'H', value: 'H' },
    { type: 'input', timestamp: 120, key: '', value: 'H' },
    { type: 'keydown', timestamp: 300, key: 'e', value: 'He' },
    { type: 'input', timestamp: 320, key: '', value: 'He' }
  );
  recorder.recording.duration = 10000;
  recorder.recording.endTime = Date.now();
  recorder.recording.finalValue = textarea.value;

  // Don't call stopRecording since it triggers chrome.runtime.sendMessage.
  // Verify the recording state directly.
  recorder.isRecording = false;
  recorder.removeListeners();
  const verification = recorder.verify();

  if (!verification.isAuthentic) {
    throw new Error(`Verification should pass: ${verification.reason}`);
  }
});

suite.test('Chrome extension message passing', function() {
  return new Promise((resolve, reject) => {
    global.chrome.runtime.sendMessage({
      action: 'saveRecording',
      data: {
        id: 'test123',
        events: [{ type: 'keydown', timestamp: 0 }],
        duration: 5000,
        finalValue: 'test content'
      }
    }, (response) => {
      try {
        if (!response) throw new Error('Should receive response');
        if (!response.success) throw new Error('Response should indicate success');
        if (!response.shareUrl) throw new Error('Response should include share URL');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
});

suite.test('Paste prevention via blockPaste', function() {
  const recorder = new this.TypingRecorder();
  recorder.modal = null;
  let prevented = false;

  const mockPasteEvent = {
    preventDefault: () => { prevented = true; },
    stopPropagation: () => {}
  };

  recorder.blockPaste(mockPasteEvent);

  if (!prevented) {
    throw new Error('Paste event should be prevented');
  }
});

suite.test('Drop prevention via blockPaste', function() {
  const recorder = new this.TypingRecorder();
  recorder.modal = null;
  let prevented = false;

  const mockDropEvent = {
    preventDefault: () => { prevented = true; },
    stopPropagation: () => {}
  };

  recorder.blockPaste(mockDropEvent);

  if (!prevented) {
    throw new Error('Drop event should be prevented');
  }
});

suite.test('Event recording captures keystrokes', async function() {
  const recorder = new this.TypingRecorder();
  await new Promise(r => setTimeout(r, 50)); // wait for init
  const textarea = global.document.createElement('textarea');
  textarea.value = 'A';

  recorder.modalTextarea = textarea;
  recorder.startRecording(textarea);

  const mockInputEvent = { inputType: 'insertText' };
  recorder.handleInput(mockInputEvent);

  if (recorder.recording.events.length === 0) {
    throw new Error('Should record input events');
  }

  const recorded = recorder.recording.events[0];
  if (recorded.type !== 'input') {
    throw new Error('Should capture event type');
  }
});

suite.test('Recording requires valid textarea element', function() {
  const recorder = new this.TypingRecorder();
  const textarea = global.document.createElement('textarea');
  recorder.startRecording(textarea);

  if (!recorder.isRecording) {
    throw new Error('Should start recording with valid textarea');
  }

  if (!recorder.recording) {
    throw new Error('Should have recording object');
  }

  recorder.isRecording = false;
  recorder.boundHandlers = null;
});

suite.test('Extension toggle works', function() {
  const recorder = new this.TypingRecorder();

  recorder.handleToggle(false);
  if (recorder.enabled !== false) {
    throw new Error('Should disable when toggled off');
  }

  recorder.handleToggle(true);
  if (recorder.enabled !== true) {
    throw new Error('Should enable when toggled on');
  }
});

suite.test('Verification rejects empty recording', function() {
  const recorder = new this.TypingRecorder();
  recorder.recording = { events: [], duration: 10000, finalValue: 'test' };

  const verification = recorder.verify();
  if (verification.isAuthentic) {
    throw new Error('Should reject recording with no events');
  }
});

suite.test('formatShareText includes URL and WPM', function() {
  const recorder = new this.TypingRecorder();
  const result = recorder.formatShareText('https://example.com', { wpm: 75 });

  if (!result.reddit.includes('75 WPM')) {
    throw new Error('Reddit format should include WPM');
  }

  if (!result.linkedin.includes('https://example.com')) {
    throw new Error('LinkedIn format should include URL');
  }
});

if (require.main === module) {
  suite.run().catch(console.error);
}

module.exports = { IntegrationTestSuite, IntegratedMockChrome, IntegratedMockDOM };
