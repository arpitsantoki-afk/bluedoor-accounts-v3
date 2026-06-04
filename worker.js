--73d2ab57f07671bd9dc6ad368783909bd9e8b3f983a79321ea24e66f1567
Content-Disposition: form-data; name="worker.js"

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// worker.js
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,X-Session-Token"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}
__name(json, "json");
function err(msg, status = 400) {
  return json({ ok: false, error: msg }, status);
}
__name(err, "err");
function ok(data = {}) {
  return json({ ok: true, ...data });
}
__name(ok, "ok");
function genToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(genToken, "genToken");
async function getSession(env2, req) {
  const token = req.headers.get("X-Session-Token") || "";
  if (!token) return null;
  const raw = await env2.SESSIONS.get(`sess:${token}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
__name(getSession, "getSession");
async function requireSession(env2, req) {
  const sess = await getSession(env2, req);
  if (!sess) return { sess: null, resp: err("Unauthorized", 401) };
  return { sess, resp: null };
}
__name(requireSession, "requireSession");
var worker_default = {
  async fetch(request, env2, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (method === "POST" && url.pathname === "/api") {
      let body;
      try {
        body = await request.json();
      } catch {
        return err("Invalid JSON");
      }
      const { action, ...params } = body;
      return await route(action, params, request, env2, ctx);
    }
    if (method === "GET" && url.pathname === "/") {
      return ok({ service: "BlueDoor Accounts V3", status: "running" });
    }
    return err("Not found", 404);
  }
};
async function route(action, params, req, env2, ctx) {
  if (action === "login") return handleLogin(params, env2);
  if (action === "logout") return handleLogout(params, req, env2);
  const { sess, resp } = await requireSession(env2, req);
  if (resp) return resp;
  switch (action) {
    // ── Auth / Users ──────────────────────────────────────────────────────────
    case "getMe":
      return handleGetMe(sess, env2);
    case "listUsers":
      return handleListUsers(params, sess, env2);
    case "addUser":
      return handleAddUser(params, sess, env2);
    case "updateUser":
      return handleUpdateUser(params, sess, env2);
    case "changePassword":
      return handleChangePassword(params, sess, env2);
    // ── Companies ─────────────────────────────────────────────────────────────
    case "listCompanies":
      return handleListCompanies(env2);
    case "addCompany":
      return handleAddCompany(params, sess, env2);
    case "updateCompany":
      return handleUpdateCompany(params, sess, env2);
    // ── Projects ──────────────────────────────────────────────────────────────
    case "listProjects":
      return handleListProjects(params, env2);
    case "addProject":
      return handleAddProject(params, sess, env2);
    case "updateProject":
      return handleUpdateProject(params, sess, env2);
    // ── Vendors ───────────────────────────────────────────────────────────────
    case "listVendors":
      return handleListVendors(params, env2);
    case "addVendor":
      return handleAddVendor(params, sess, env2);
    case "updateVendor":
      return handleUpdateVendor(params, sess, env2);
    // ── Chart of Accounts ─────────────────────────────────────────────────────
    case "listAccounts":
      return handleListAccounts(env2);
    case "addAccount":
      return handleAddAccount(params, sess, env2);
    // ── Cost Heads ────────────────────────────────────────────────────────────
    case "listCostHeads":
      return handleListCostHeads(env2);
    case "addCostHead":
      return handleAddCostHead(params, sess, env2);
    // ── Entry Types ───────────────────────────────────────────────────────────
    case "listEntryTypes":
      return handleListEntryTypes(env2);
    case "addEntryType":
      return handleAddEntryType(params, sess, env2);
    case "updateEntryType":
      return handleUpdateEntryType(params, sess, env2);
    // ── Entries ───────────────────────────────────────────────────────────────
    case "listEntries":
      return handleListEntries(params, sess, env2);
    case "addEntry":
      return handleAddEntry(params, sess, env2);
    case "updateEntry":
      return handleUpdateEntry(params, sess, env2);
    case "deleteEntry":
      return handleDeleteEntry(params, sess, env2);
    // ── Pending Entries ───────────────────────────────────────────────────────
    case "listPending":
      return handleListPending(params, sess, env2);
    case "submitPending":
      return handleSubmitPending(params, sess, env2);
    case "approvePending":
      return handleApprovePending(params, sess, env2);
    case "rejectPending":
      return handleRejectPending(params, sess, env2);
    case "deletePending":
      return handleDeletePending(params, sess, env2);
    // ── Ledger ────────────────────────────────────────────────────────────────
    case "getLedger":
      return handleGetLedger(params, sess, env2);
    case "getTrialBalance":
      return handleGetTrialBalance(params, sess, env2);
    case "getPL":
      return handleGetPL(params, sess, env2);
    case "getBS":
      return handleGetBS(params, sess, env2);
    // ── Opening Balances ──────────────────────────────────────────────────────
    case "listOpeningBalances":
      return handleListOpeningBalances(params, env2);
    case "saveOpeningBalance":
      return handleSaveOpeningBalance(params, sess, env2);
    case "listVendorOpeningBalances":
      return handleListVendorOpeningBalances(params, env2);
    case "saveVendorOpeningBalance":
      return handleSaveVendorOpeningBalance(params, sess, env2);
    // ── Reports ───────────────────────────────────────────────────────────────
    case "getProjectReport":
      return handleGetProjectReport(params, sess, env2);
    case "getVendorReport":
      return handleGetVendorReport(params, sess, env2);
    case "getDashboard":
      return handleGetDashboard(params, sess, env2);
    // ── Drive Proxy ───────────────────────────────────────────────────────────
    case "driveProxy":
      return handleDriveProxy(params, sess, env2);
    case "gasProxy":
      return handleGasProxy(params, sess, env2);
    default:
      return err(`Unknown action: ${action}`, 400);
  }
}
__name(route, "route");
async function handleLogin({ username, password }, env2) {
  if (!username || !password) return err("username and password required");
  const user = await env2.DB.prepare(
    "SELECT * FROM users WHERE username = ? AND active = 1"
  ).bind(username).first();
  if (!user) return err("Invalid credentials", 401);
  if (user.password !== password) return err("Invalid credentials", 401);
  const token = genToken();
  const companies = user.companies ? JSON.parse(user.companies) : [];
  const sessData = {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    companies
  };
  await env2.SESSIONS.put(`sess:${token}`, JSON.stringify(sessData), {
    expirationTtl: 28800
  });
  return ok({
    token,
    user: {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      companies
    }
  });
}
__name(handleLogin, "handleLogin");
async function handleLogout({ token }, req, env2) {
  const t = token || req.headers.get("X-Session-Token") || "";
  if (t) await env2.SESSIONS.delete(`sess:${t}`);
  return ok({ message: "Logged out" });
}
__name(handleLogout, "handleLogout");
async function handleGetMe(sess) {
  return ok({ user: sess });
}
__name(handleGetMe, "handleGetMe");
async function handleListUsers(params, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  const rows = await env2.DB.prepare(
    "SELECT user_id, username, role, active, companies FROM users ORDER BY username"
  ).all();
  return ok({ users: rows.results });
}
__name(handleListUsers, "handleListUsers");
async function handleAddUser({ username, password, role, companies = [] }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  if (!username || !password || !role) return err("username, password, role required");
  const uid = `U${Date.now()}`;
  await env2.DB.prepare(
    "INSERT INTO users (user_id, username, password, role, active, companies) VALUES (?,?,?,?,1,?)"
  ).bind(uid, username, password, role, JSON.stringify(companies)).run();
  return ok({ user_id: uid });
}
__name(handleAddUser, "handleAddUser");
async function handleUpdateUser({ user_id, role, active, companies }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  if (!user_id) return err("user_id required");
  const fields = [];
  const vals = [];
  if (role !== void 0) {
    fields.push("role = ?");
    vals.push(role);
  }
  if (active !== void 0) {
    fields.push("active = ?");
    vals.push(active ? 1 : 0);
  }
  if (companies !== void 0) {
    fields.push("companies = ?");
    vals.push(JSON.stringify(companies));
  }
  if (!fields.length) return err("Nothing to update");
  vals.push(user_id);
  await env2.DB.prepare(`UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`).bind(...vals).run();
  return ok();
}
__name(handleUpdateUser, "handleUpdateUser");
async function handleChangePassword({ old_password, new_password }, sess, env2) {
  if (!old_password || !new_password) return err("old_password and new_password required");
  const user = await env2.DB.prepare("SELECT password FROM users WHERE user_id = ?").bind(sess.user_id).first();
  if (!user || user.password !== old_password) return err("Old password incorrect", 401);
  await env2.DB.prepare("UPDATE users SET password = ? WHERE user_id = ?").bind(new_password, sess.user_id).run();
  return ok();
}
__name(handleChangePassword, "handleChangePassword");
async function handleListCompanies(env2) {
  const rows = await env2.DB.prepare("SELECT * FROM companies ORDER BY company_name").all();
  return ok({ companies: rows.results });
}
__name(handleListCompanies, "handleListCompanies");
async function handleAddCompany({ company_name, drive_folder = "" }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  if (!company_name) return err("company_name required");
  const cid = `CO${Date.now()}`;
  await env2.DB.prepare(
    "INSERT INTO companies (company_id, company_name, drive_folder, active) VALUES (?,?,?,1)"
  ).bind(cid, company_name, drive_folder).run();
  return ok({ company_id: cid });
}
__name(handleAddCompany, "handleAddCompany");
async function handleUpdateCompany({ company_id, company_name, drive_folder, active }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  if (!company_id) return err("company_id required");
  const fields = [], vals = [];
  if (company_name !== void 0) {
    fields.push("company_name = ?");
    vals.push(company_name);
  }
  if (drive_folder !== void 0) {
    fields.push("drive_folder = ?");
    vals.push(drive_folder);
  }
  if (active !== void 0) {
    fields.push("active = ?");
    vals.push(active ? 1 : 0);
  }
  if (!fields.length) return err("Nothing to update");
  vals.push(company_id);
  await env2.DB.prepare(`UPDATE companies SET ${fields.join(", ")} WHERE company_id = ?`).bind(...vals).run();
  return ok();
}
__name(handleUpdateCompany, "handleUpdateCompany");
async function handleListProjects({ company_id, fyid, status }, env2) {
  let q = "SELECT * FROM projects WHERE 1=1";
  const vals = [];
  if (fyid) {
    q += " AND fyid = ?";
    vals.push(fyid);
  }
  if (status) {
    q += " AND status = ?";
    vals.push(status);
  }
  q += " ORDER BY project_name";
  const rows = await env2.DB.prepare(q).bind(...vals).all();
  return ok({ projects: rows.results });
}
__name(handleListProjects, "handleListProjects");
async function handleAddProject({ project_name, client = "", location = "", start_date = "", budget = 0, fyid = "", status = "Active" }, sess, env2) {
  if (!project_name) return err("project_name required");
  const pid2 = `P${Date.now()}`;
  await env2.DB.prepare(
    "INSERT INTO projects (project_id, project_name, client, location, status, start_date, budget, fyid) VALUES (?,?,?,?,?,?,?,?)"
  ).bind(pid2, project_name, client, location, status, start_date, budget, fyid).run();
  return ok({ project_id: pid2 });
}
__name(handleAddProject, "handleAddProject");
async function handleUpdateProject({ project_id, project_name, client, location, status, start_date, budget, fyid }, sess, env2) {
  if (!project_id) return err("project_id required");
  const fields = [], vals = [];
  if (project_name !== void 0) {
    fields.push("project_name = ?");
    vals.push(project_name);
  }
  if (client !== void 0) {
    fields.push("client = ?");
    vals.push(client);
  }
  if (location !== void 0) {
    fields.push("location = ?");
    vals.push(location);
  }
  if (status !== void 0) {
    fields.push("status = ?");
    vals.push(status);
  }
  if (start_date !== void 0) {
    fields.push("start_date = ?");
    vals.push(start_date);
  }
  if (budget !== void 0) {
    fields.push("budget = ?");
    vals.push(budget);
  }
  if (fyid !== void 0) {
    fields.push("fyid = ?");
    vals.push(fyid);
  }
  if (!fields.length) return err("Nothing to update");
  vals.push(project_id);
  await env2.DB.prepare(`UPDATE projects SET ${fields.join(", ")} WHERE project_id = ?`).bind(...vals).run();
  return ok();
}
__name(handleUpdateProject, "handleUpdateProject");
async function handleListVendors({ vendor_type } = {}, env2) {
  let q = "SELECT * FROM vendors";
  const vals = [];
  if (vendor_type) {
    q += " WHERE vendor_type = ?";
    vals.push(vendor_type);
  }
  q += " ORDER BY vendor_name";
  const rows = await env2.DB.prepare(q).bind(...vals).all();
  return ok({ vendors: rows.results });
}
__name(handleListVendors, "handleListVendors");
async function handleAddVendor({ vendor_id, vendor_name, vendor_type = "", contact = "", gstin = "", details = "" }, sess, env2) {
  if (!vendor_id || !vendor_name) return err("vendor_id and vendor_name required");
  await env2.DB.prepare(
    "INSERT INTO vendors (vendor_id, vendor_name, vendor_type, contact, gstin, details) VALUES (?,?,?,?,?,?)"
  ).bind(vendor_id, vendor_name, vendor_type, contact, gstin, details).run();
  return ok({ vendor_id });
}
__name(handleAddVendor, "handleAddVendor");
async function handleUpdateVendor({ vendor_id, vendor_name, vendor_type, contact, gstin, details }, sess, env2) {
  if (!vendor_id) return err("vendor_id required");
  const fields = [], vals = [];
  if (vendor_name !== void 0) {
    fields.push("vendor_name = ?");
    vals.push(vendor_name);
  }
  if (vendor_type !== void 0) {
    fields.push("vendor_type = ?");
    vals.push(vendor_type);
  }
  if (contact !== void 0) {
    fields.push("contact = ?");
    vals.push(contact);
  }
  if (gstin !== void 0) {
    fields.push("gstin = ?");
    vals.push(gstin);
  }
  if (details !== void 0) {
    fields.push("details = ?");
    vals.push(details);
  }
  if (!fields.length) return err("Nothing to update");
  vals.push(vendor_id);
  await env2.DB.prepare(`UPDATE vendors SET ${fields.join(", ")} WHERE vendor_id = ?`).bind(...vals).run();
  return ok();
}
__name(handleUpdateVendor, "handleUpdateVendor");
async function handleListAccounts(env2) {
  const rows = await env2.DB.prepare("SELECT * FROM chart_of_accounts ORDER BY ac_code").all();
  return ok({ accounts: rows.results });
}
__name(handleListAccounts, "handleListAccounts");
async function handleAddAccount({ ac_key, ac_code, ac_name, ac_type, category = "" }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  if (!ac_key || !ac_code || !ac_name || !ac_type) return err("ac_key, ac_code, ac_name, ac_type required");
  await env2.DB.prepare(
    "INSERT INTO chart_of_accounts (ac_key, ac_code, ac_name, ac_type, category) VALUES (?,?,?,?,?)"
  ).bind(ac_key, ac_code, ac_name, ac_type, category).run();
  return ok({ ac_key });
}
__name(handleAddAccount, "handleAddAccount");
async function handleListCostHeads(env2) {
  const rows = await env2.DB.prepare("SELECT * FROM cost_heads ORDER BY ch_name").all();
  return ok({ cost_heads: rows.results });
}
__name(handleListCostHeads, "handleListCostHeads");
async function handleAddCostHead({ ch_id, ch_name, ac_key = "" }, sess, env2) {
  if (!ch_id || !ch_name) return err("ch_id and ch_name required");
  await env2.DB.prepare(
    "INSERT INTO cost_heads (ch_id, ch_name, ac_key) VALUES (?,?,?)"
  ).bind(ch_id, ch_name, ac_key).run();
  return ok({ ch_id });
}
__name(handleAddCostHead, "handleAddCostHead");
async function handleListEntryTypes(env2) {
  const rows = await env2.DB.prepare("SELECT * FROM entry_types ORDER BY label").all();
  return ok({ entry_types: rows.results });
}
__name(handleListEntryTypes, "handleListEntryTypes");
async function handleAddEntryType({ et_key, label, category, dr, cr, needs_ch = 0, active = 1 }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  if (!et_key || !label || !category || !dr || !cr) return err("et_key, label, category, dr, cr required");
  await env2.DB.prepare(
    "INSERT INTO entry_types (et_key, label, category, dr, cr, needs_ch, active) VALUES (?,?,?,?,?,?,?)"
  ).bind(et_key, label, category, dr, cr, needs_ch ? 1 : 0, active ? 1 : 0).run();
  return ok({ et_key });
}
__name(handleAddEntryType, "handleAddEntryType");
async function handleUpdateEntryType({ et_key, label, category, dr, cr, needs_ch, active }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  if (!et_key) return err("et_key required");
  const fields = [], vals = [];
  if (label !== void 0) {
    fields.push("label = ?");
    vals.push(label);
  }
  if (category !== void 0) {
    fields.push("category = ?");
    vals.push(category);
  }
  if (dr !== void 0) {
    fields.push("dr = ?");
    vals.push(dr);
  }
  if (cr !== void 0) {
    fields.push("cr = ?");
    vals.push(cr);
  }
  if (needs_ch !== void 0) {
    fields.push("needs_ch = ?");
    vals.push(needs_ch ? 1 : 0);
  }
  if (active !== void 0) {
    fields.push("active = ?");
    vals.push(active ? 1 : 0);
  }
  if (!fields.length) return err("Nothing to update");
  vals.push(et_key);
  await env2.DB.prepare(`UPDATE entry_types SET ${fields.join(", ")} WHERE et_key = ?`).bind(...vals).run();
  return ok();
}
__name(handleUpdateEntryType, "handleUpdateEntryType");
async function handleListEntries({ fyid, company_id, project_id, vendor_id, entry_type, date_from, date_to, limit = 200, offset = 0 }, sess, env2) {
  let q = "SELECT * FROM entries WHERE 1=1";
  const vals = [];
  if (fyid) {
    q += " AND fyid = ?";
    vals.push(fyid);
  }
  if (company_id) {
    q += " AND company_id = ?";
    vals.push(company_id);
  }
  if (project_id) {
    q += " AND project_id = ?";
    vals.push(project_id);
  }
  if (vendor_id) {
    q += " AND vendor_id = ?";
    vals.push(vendor_id);
  }
  if (entry_type) {
    q += " AND entry_type = ?";
    vals.push(entry_type);
  }
  if (date_from) {
    q += " AND date >= ?";
    vals.push(date_from);
  }
  if (date_to) {
    q += " AND date <= ?";
    vals.push(date_to);
  }
  if (sess.role !== "Supervisor" && sess.companies?.length) {
    q += ` AND company_id IN (${sess.companies.map(() => "?").join(",")})`;
    vals.push(...sess.companies);
  }
  q += " ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?";
  vals.push(limit, offset);
  const rows = await env2.DB.prepare(q).bind(...vals).all();
  return ok({ entries: rows.results });
}
__name(handleListEntries, "handleListEntries");
async function handleAddEntry(params, sess, env2) {
  const {
    date,
    fyid,
    project_id = "",
    cost_head_id = "",
    vendor_id = "",
    entry_type,
    amount,
    narration = "",
    company_id = ""
  } = params;
  if (!date || !fyid || !entry_type || !amount) {
    return err("date, fyid, entry_type, amount required");
  }
  const et = await env2.DB.prepare("SELECT * FROM entry_types WHERE et_key = ?").bind(entry_type).first();
  if (!et) return err("Invalid entry_type");
  const eid = `E${Date.now()}${Math.floor(Math.random() * 1e3)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const drAc = await env2.DB.prepare("SELECT ac_code, ac_name FROM chart_of_accounts WHERE ac_key = ?").bind(et.dr).first();
  const crAc = await env2.DB.prepare("SELECT ac_code, ac_name FROM chart_of_accounts WHERE ac_key = ?").bind(et.cr).first();
  await env2.DB.prepare(
    `INSERT INTO entries (entry_id, date, fyid, project_id, cost_head_id, vendor_id,
     entry_type, amount, narration, created_by, created_at, company_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    eid,
    date,
    fyid,
    project_id,
    cost_head_id,
    vendor_id,
    entry_type,
    amount,
    narration,
    sess.username,
    now,
    company_id
  ).run();
  if (drAc) {
    await env2.DB.prepare(
      `INSERT INTO ledger (entry_id, date, fyid, ac_code, ac_name, dr_cr, debit, credit,
       project_id, cost_head_id, vendor_id, narration, created_by, created_at, company_id)
       VALUES (?,?,?,?,?,'DR',?,0,?,?,?,?,?,?)`
    ).bind(
      eid,
      date,
      fyid,
      drAc.ac_code,
      drAc.ac_name,
      amount,
      project_id,
      cost_head_id,
      vendor_id,
      narration,
      sess.username,
      now,
      company_id
    ).run();
  }
  if (crAc) {
    await env2.DB.prepare(
      `INSERT INTO ledger (entry_id, date, fyid, ac_code, ac_name, dr_cr, debit, credit,
       project_id, cost_head_id, vendor_id, narration, created_by, created_at, company_id)
       VALUES (?,?,?,?,?,'CR',0,?,?,?,?,?,?,?)`
    ).bind(
      eid,
      date,
      fyid,
      crAc.ac_code,
      crAc.ac_name,
      amount,
      project_id,
      cost_head_id,
      vendor_id,
      narration,
      sess.username,
      now,
      company_id
    ).run();
  }
  return ok({ entry_id: eid });
}
__name(handleAddEntry, "handleAddEntry");
async function handleUpdateEntry(params, sess, env2) {
  const { entry_id, date, project_id, cost_head_id, vendor_id, amount, narration, company_id } = params;
  if (!entry_id) return err("entry_id required");
  const existing = await env2.DB.prepare("SELECT * FROM entries WHERE entry_id = ?").bind(entry_id).first();
  if (!existing) return err("Entry not found", 404);
  if (sess.role !== "Supervisor" && existing.created_by !== sess.username) return err("Forbidden", 403);
  const fields = [], vals = [];
  if (date !== void 0) {
    fields.push("date = ?");
    vals.push(date);
  }
  if (project_id !== void 0) {
    fields.push("project_id = ?");
    vals.push(project_id);
  }
  if (cost_head_id !== void 0) {
    fields.push("cost_head_id = ?");
    vals.push(cost_head_id);
  }
  if (vendor_id !== void 0) {
    fields.push("vendor_id = ?");
    vals.push(vendor_id);
  }
  if (amount !== void 0) {
    fields.push("amount = ?");
    vals.push(amount);
  }
  if (narration !== void 0) {
    fields.push("narration = ?");
    vals.push(narration);
  }
  if (!fields.length) return err("Nothing to update");
  vals.push(entry_id);
  await env2.DB.prepare(`UPDATE entries SET ${fields.join(", ")} WHERE entry_id = ?`).bind(...vals).run();
  const ledgerFields = [], ledgerVals = [];
  if (date !== void 0) {
    ledgerFields.push("date = ?");
    ledgerVals.push(date);
  }
  if (amount !== void 0) {
    await env2.DB.prepare(`UPDATE ledger SET debit = CASE WHEN dr_cr='DR' THEN ? ELSE 0 END,
      credit = CASE WHEN dr_cr='CR' THEN ? ELSE 0 END WHERE entry_id = ?`).bind(amount, amount, entry_id).run();
  }
  if (narration !== void 0) {
    ledgerFields.push("narration = ?");
    ledgerVals.push(narration);
  }
  if (project_id !== void 0) {
    ledgerFields.push("project_id = ?");
    ledgerVals.push(project_id);
  }
  if (ledgerFields.length) {
    ledgerVals.push(entry_id);
    await env2.DB.prepare(`UPDATE ledger SET ${ledgerFields.join(", ")} WHERE entry_id = ?`).bind(...ledgerVals).run();
  }
  return ok();
}
__name(handleUpdateEntry, "handleUpdateEntry");
async function handleDeleteEntry({ entry_id }, sess, env2) {
  if (!entry_id) return err("entry_id required");
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  await env2.DB.batch([
    env2.DB.prepare("DELETE FROM entries WHERE entry_id = ?").bind(entry_id),
    env2.DB.prepare("DELETE FROM ledger WHERE entry_id = ?").bind(entry_id)
  ]);
  return ok();
}
__name(handleDeleteEntry, "handleDeleteEntry");
async function handleListPending({ fyid, company_id, status, submitted_by }, sess, env2) {
  let q = "SELECT * FROM pending_entries WHERE 1=1";
  const vals = [];
  if (fyid) {
    q += " AND fyid = ?";
    vals.push(fyid);
  }
  if (company_id) {
    q += " AND company_id = ?";
    vals.push(company_id);
  }
  if (status) {
    q += " AND status = ?";
    vals.push(status);
  }
  if (submitted_by) {
    q += " AND submitted_by = ?";
    vals.push(submitted_by);
  }
  if (sess.role !== "Supervisor") {
    q += " AND submitted_by = ?";
    vals.push(sess.username);
  }
  q += " ORDER BY submitted_at DESC";
  const rows = await env2.DB.prepare(q).bind(...vals).all();
  return ok({ pending: rows.results });
}
__name(handleListPending, "handleListPending");
async function handleSubmitPending(params, sess, env2) {
  const {
    date,
    fyid = "",
    entry_type,
    project_id = "",
    cost_head_id = "",
    vendor_id = "",
    amount,
    narration = "",
    drive_file_url = "",
    company_id = ""
  } = params;
  if (!date || !entry_type || !amount) return err("date, entry_type, amount required");
  const eid = `PE${Date.now()}${Math.floor(Math.random() * 1e3)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env2.DB.prepare(
    `INSERT INTO pending_entries (entry_id, date, fyid, entry_type, project_id, cost_head_id,
     vendor_id, amount, narration, submitted_by, submitted_at, status, drive_file_url, company_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,'Pending',?,?)`
  ).bind(
    eid,
    date,
    fyid,
    entry_type,
    project_id,
    cost_head_id,
    vendor_id,
    amount,
    narration,
    sess.username,
    now,
    drive_file_url,
    company_id
  ).run();
  return ok({ entry_id: eid });
}
__name(handleSubmitPending, "handleSubmitPending");
async function handleApprovePending({ entry_id }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  const pe = await env2.DB.prepare("SELECT * FROM pending_entries WHERE entry_id = ?").bind(entry_id).first();
  if (!pe) return err("Pending entry not found", 404);
  if (pe.status !== "Pending") return err("Entry is not in Pending status");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env2.DB.prepare(
    `UPDATE pending_entries SET status='Approved', reviewed_by=?, reviewed_at=? WHERE entry_id=?`
  ).bind(sess.username, now, entry_id).run();
  const addParams = {
    date: pe.date,
    fyid: pe.fyid,
    project_id: pe.project_id,
    cost_head_id: pe.cost_head_id,
    vendor_id: pe.vendor_id,
    entry_type: pe.entry_type,
    amount: pe.amount,
    narration: pe.narration,
    company_id: pe.company_id
  };
  const fakeSess = { ...sess, username: pe.submitted_by };
  return await handleAddEntry(addParams, fakeSess, env2);
}
__name(handleApprovePending, "handleApprovePending");
async function handleRejectPending({ entry_id, reject_reason = "" }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env2.DB.prepare(
    `UPDATE pending_entries SET status='Rejected', reviewed_by=?, reviewed_at=?, reject_reason=? WHERE entry_id=?`
  ).bind(sess.username, now, reject_reason, entry_id).run();
  return ok();
}
__name(handleRejectPending, "handleRejectPending");
async function handleDeletePending({ entry_id }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  await env2.DB.prepare("DELETE FROM pending_entries WHERE entry_id = ?").bind(entry_id).run();
  return ok();
}
__name(handleDeletePending, "handleDeletePending");
async function handleGetLedger({ fyid, ac_code, company_id, date_from, date_to }, sess, env2) {
  let q = "SELECT * FROM ledger WHERE 1=1";
  const vals = [];
  if (fyid) {
    q += " AND fyid = ?";
    vals.push(fyid);
  }
  if (ac_code) {
    q += " AND ac_code = ?";
    vals.push(ac_code);
  }
  if (company_id) {
    q += " AND company_id = ?";
    vals.push(company_id);
  }
  if (date_from) {
    q += " AND date >= ?";
    vals.push(date_from);
  }
  if (date_to) {
    q += " AND date <= ?";
    vals.push(date_to);
  }
  q += " ORDER BY date ASC, id ASC";
  const rows = await env2.DB.prepare(q).bind(...vals).all();
  return ok({ ledger: rows.results });
}
__name(handleGetLedger, "handleGetLedger");
async function handleGetTrialBalance({ fyid, company_id }, sess, env2) {
  let q = `
    SELECT ac_code, ac_name,
      SUM(debit) as total_dr, SUM(credit) as total_cr,
      SUM(debit) - SUM(credit) as net
    FROM ledger WHERE 1=1`;
  const vals = [];
  if (fyid) {
    q += " AND fyid = ?";
    vals.push(fyid);
  }
  if (company_id) {
    q += " AND company_id = ?";
    vals.push(company_id);
  }
  q += " GROUP BY ac_code, ac_name ORDER BY ac_code";
  const rows = await env2.DB.prepare(q).bind(...vals).all();
  return ok({ trial_balance: rows.results });
}
__name(handleGetTrialBalance, "handleGetTrialBalance");
async function handleGetPL({ fyid, company_id }, sess, env2) {
  let q = `
    SELECT l.ac_code, l.ac_name, c.ac_type, c.category,
      SUM(l.debit) as total_dr, SUM(l.credit) as total_cr
    FROM ledger l
    LEFT JOIN chart_of_accounts c ON c.ac_code = l.ac_code
    WHERE c.ac_type IN ('Income','Expense')`;
  const vals = [];
  if (fyid) {
    q += " AND l.fyid = ?";
    vals.push(fyid);
  }
  if (company_id) {
    q += " AND l.company_id = ?";
    vals.push(company_id);
  }
  q += " GROUP BY l.ac_code, l.ac_name, c.ac_type, c.category ORDER BY c.ac_type, l.ac_code";
  const rows = await env2.DB.prepare(q).bind(...vals).all();
  return ok({ pl: rows.results });
}
__name(handleGetPL, "handleGetPL");
async function handleGetBS({ fyid, company_id }, sess, env2) {
  let q = `
    SELECT l.ac_code, l.ac_name, c.ac_type, c.category,
      SUM(l.debit) as total_dr, SUM(l.credit) as total_cr
    FROM ledger l
    LEFT JOIN chart_of_accounts c ON c.ac_code = l.ac_code
    WHERE c.ac_type IN ('Asset','Liability','Equity')`;
  const vals = [];
  if (fyid) {
    q += " AND l.fyid = ?";
    vals.push(fyid);
  }
  if (company_id) {
    q += " AND l.company_id = ?";
    vals.push(company_id);
  }
  q += " GROUP BY l.ac_code, l.ac_name, c.ac_type, c.category ORDER BY c.ac_type, l.ac_code";
  const rows = await env2.DB.prepare(q).bind(...vals).all();
  return ok({ balance_sheet: rows.results });
}
__name(handleGetBS, "handleGetBS");
async function handleListOpeningBalances({ fyid, company_id }, env2) {
  let q = "SELECT * FROM opening_balances WHERE 1=1";
  const vals = [];
  if (fyid) {
    q += " AND fyid = ?";
    vals.push(fyid);
  }
  if (company_id) {
    q += " AND company_id = ?";
    vals.push(company_id);
  }
  q += " ORDER BY ac_name";
  const rows = await env2.DB.prepare(q).bind(...vals).all();
  return ok({ opening_balances: rows.results });
}
__name(handleListOpeningBalances, "handleListOpeningBalances");
async function handleSaveOpeningBalance({ fyid, ac_key, ac_name, dr_cr, amount, company_id }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  if (!fyid || !ac_key || !dr_cr || amount === void 0) return err("fyid, ac_key, dr_cr, amount required");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await env2.DB.prepare(`
    INSERT INTO opening_balances (fyid, ac_key, ac_name, dr_cr, amount, entered_by, entered_at, company_id)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT DO NOTHING
  `).bind(fyid, ac_key, ac_name || "", dr_cr, amount, sess.username, now, company_id || "").run();
  const existing = await env2.DB.prepare(
    "SELECT id FROM opening_balances WHERE fyid=? AND ac_key=? AND company_id=?"
  ).bind(fyid, ac_key, company_id || "").first();
  if (existing) {
    await env2.DB.prepare(
      "UPDATE opening_balances SET dr_cr=?, amount=?, entered_by=?, entered_at=? WHERE id=?"
    ).bind(dr_cr, amount, sess.username, now, existing.id).run();
  }
  return ok();
}
__name(handleSaveOpeningBalance, "handleSaveOpeningBalance");
async function handleListVendorOpeningBalances({ fyid, company_id }, env2) {
  let q = "SELECT * FROM vendor_opening_balances WHERE 1=1";
  const vals = [];
  if (fyid) {
    q += " AND fyid = ?";
    vals.push(fyid);
  }
  if (company_id) {
    q += " AND company_id = ?";
    vals.push(company_id);
  }
  q += " ORDER BY vendor_id";
  const rows = await env2.DB.prepare(q).bind(...vals).all();
  return ok({ vendor_opening_balances: rows.results });
}
__name(handleListVendorOpeningBalances, "handleListVendorOpeningBalances");
async function handleSaveVendorOpeningBalance({ fyid, vendor_id, dr_cr, amount, company_id }, sess, env2) {
  if (sess.role !== "Supervisor") return err("Forbidden", 403);
  if (!fyid || !vendor_id || !dr_cr || amount === void 0) return err("fyid, vendor_id, dr_cr, amount required");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const existing = await env2.DB.prepare(
    "SELECT id FROM vendor_opening_balances WHERE fyid=? AND vendor_id=? AND company_id=?"
  ).bind(fyid, vendor_id, company_id || "").first();
  if (existing) {
    await env2.DB.prepare(
      "UPDATE vendor_opening_balances SET dr_cr=?, amount=?, entered_by=?, entered_at=? WHERE id=?"
    ).bind(dr_cr, amount, sess.username, now, existing.id).run();
  } else {
    await env2.DB.prepare(
      "INSERT INTO vendor_opening_balances (fyid, vendor_id, dr_cr, amount, entered_by, entered_at, company_id) VALUES (?,?,?,?,?,?,?)"
    ).bind(fyid, vendor_id, dr_cr, amount, sess.username, now, company_id || "").run();
  }
  return ok();
}
__name(handleSaveVendorOpeningBalance, "handleSaveVendorOpeningBalance");
async function handleGetProjectReport({ project_id, fyid }, sess, env2) {
  if (!project_id) return err("project_id required");
  const project = await env2.DB.prepare("SELECT * FROM projects WHERE project_id = ?").bind(project_id).first();
  if (!project) return err("Project not found", 404);
  let q = "SELECT * FROM entries WHERE project_id = ?";
  const vals = [project_id];
  if (fyid) {
    q += " AND fyid = ?";
    vals.push(fyid);
  }
  q += " ORDER BY date DESC";
  const entries = await env2.DB.prepare(q).bind(...vals).all();
  const total = entries.results.reduce((s, e) => s + (e.amount || 0), 0);
  return ok({ project, entries: entries.results, total });
}
__name(handleGetProjectReport, "handleGetProjectReport");
async function handleGetVendorReport({ vendor_id, fyid, company_id }, sess, env2) {
  if (!vendor_id) return err("vendor_id required");
  const vendor = await env2.DB.prepare("SELECT * FROM vendors WHERE vendor_id = ?").bind(vendor_id).first();
  if (!vendor) return err("Vendor not found", 404);
  let q = "SELECT * FROM entries WHERE vendor_id = ?";
  const vals = [vendor_id];
  if (fyid) {
    q += " AND fyid = ?";
    vals.push(fyid);
  }
  if (company_id) {
    q += " AND company_id = ?";
    vals.push(company_id);
  }
  q += " ORDER BY date DESC";
  const entries = await env2.DB.prepare(q).bind(...vals).all();
  const total = entries.results.reduce((s, e) => s + (e.amount || 0), 0);
  return ok({ vendor, entries: entries.results, total });
}
__name(handleGetVendorReport, "handleGetVendorReport");
async function handleGetDashboard({ fyid, company_id }, sess, env2) {
  const vals_base = [];
  let where = "1=1";
  if (fyid) {
    where += " AND fyid = ?";
    vals_base.push(fyid);
  }
  if (company_id) {
    where += " AND company_id = ?";
    vals_base.push(company_id);
  }
  const [entriesCount, pendingCount, totalAmount] = await Promise.all([
    env2.DB.prepare(`SELECT COUNT(*) as cnt FROM entries WHERE ${where}`).bind(...vals_base).first(),
    env2.DB.prepare(`SELECT COUNT(*) as cnt FROM pending_entries WHERE status='Pending' AND ${where}`).bind(...vals_base).first(),
    env2.DB.prepare(`SELECT SUM(amount) as total FROM entries WHERE ${where}`).bind(...vals_base).first()
  ]);
  return ok({
    entries_count: entriesCount?.cnt || 0,
    pending_count: pendingCount?.cnt || 0,
    total_amount: totalAmount?.total || 0
  });
}
__name(handleGetDashboard, "handleGetDashboard");
async function handleDriveProxy({ file_url }, sess, env2) {
  if (!file_url) return err("file_url required");
  if (!file_url.includes("drive.google.com") && !file_url.includes("docs.google.com")) {
    return err("Only Google Drive URLs are allowed");
  }
  try {
    const resp = await fetch(file_url);
    const blob = await resp.arrayBuffer();
    return new Response(blob, {
      status: resp.status,
      headers: {
        "Content-Type": resp.headers.get("Content-Type") || "application/octet-stream",
        ...CORS
      }
    });
  } catch (e) {
    return err(`Drive fetch failed: ${e.message}`);
  }
}
__name(handleDriveProxy, "handleDriveProxy");
async function handleGasProxy({ gas_action, payload = {} }, sess, env2) {
  const gasUrl = env2.GAS_URL;
  if (!gasUrl) return err("GAS_URL not configured");
  try {
    const url = new URL(gasUrl);
    url.searchParams.set("action", gas_action);
    const resp = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    return ok({ gas_response: data });
  } catch (e) {
    return err(`GAS proxy failed: ${e.message}`);
  }
}
__name(handleGasProxy, "handleGasProxy");
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map

--73d2ab57f07671bd9dc6ad368783909bd9e8b3f983a79321ea24e66f1567--
