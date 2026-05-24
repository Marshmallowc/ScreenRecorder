/**
 * Capura Screen Recorder - Core Logic Module
 * Features: Multi-stream audio mixing, IndexedDB real-time block-saving, 
 * crash recovery dashboard, flexible resolution presets, and persistent checklists.
 */

// UI State Management
let appState = 'idle'; // idle | sharing | recording | paused | compiling | done
let db = null;
let screenStream = null;
let micStream = null;
let micStreamForVisualizer = null; // Separate stream for pre-record mic testing
let activeRecorderStream = null;
let mediaRecorder = null;
let recordingStartTime = 0;
let recordingDuration = 0; // seconds
let timerInterval = null;
let chunkIndex = 0;
let visualizerAnimationFrame = null;

// Global i18n & Theme State
let currentLang = 'zh';
let currentTheme = 'cosmic-dark';

// Audio Context nodes
let audioContext = null;
let mixedAudioDestination = null;
let micSourceNode = null;
let screenSourceNode = null;
let micAnalyser = null;
let sysAnalyser = null;

// Presets Configurations
const QUALITY_PRESETS = {
  'ultra-4k': {
    width: { ideal: 3840 },
    height: { ideal: 2160 },
    frameRate: { ideal: 60 },
    bitrate: 10000000 // 10 Mbps
  },
  'high-end': {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 60 },
    bitrate: 4500000 // 4.5 Mbps
  },
  'standard': {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
    bitrate: 2500000 // 2.5 Mbps
  },
  'compact': {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    bitrate: 1200000 // 1.2 Mbps
  }
};

let selectedPreset = 'standard';

// Global i18n Dictionaries & Helper Methods
const TRANSLATIONS = {
  zh: {
    logoSub: 'Studio',
    aboutBtnLabel: '关于',
    langBtnLabel: '语言',
    themeBtnLabel: '切换主题',
    placeholderTitle: 'Capura 本地录制仪',
    placeholderSubtitle: '纯客户端沙箱编译 · 双音轨高保真混音 · 100% 隐私安全',
    btnCapture: '开启屏幕分享',
    btnFloatMic: '麦克风',
    btnFloatSysAudio: '系统音',
    btnFloatSettings: '参数设置',
    popoverLabel: '录制视频品质',
    qualityUltra4k: '4K 超清',
    qualityHighEnd: '高清模式',
    qualityStandard: '标准模式',
    qualityCompact: '超长省空间',
    btnFloatPip: '悬浮窗',
    aboutTitle: '✨ 关于 Capura Studio',
    aboutHeroTitle: '高保真沙箱录屏工作舱',
    aboutHeroDesc: 'Capura Studio 是一款专为极客、教程制作者和开发者打造的，完全在浏览器本地沙箱中运行的 4K 高标清多声道实时混音录屏系统。无需安装任何扩展或软件，数据隐私 100% 物理隔离，安全无虞。',
    aboutFeat1Title: '双声道本地混音',
    aboutFeat1Desc: '智能提取浏览器扬声器与您的麦克风人声，在本地 Web Audio API 中完成声轨的亚毫秒级高保真融合与混音。',
    aboutFeat2Title: '增量灾备写入',
    aboutFeat2Desc: '基于本地 IndexedDB 分块灾备，即使录制过程中突发页面关闭、死机或断电，亦可在下一次打开时完美一键挽救视频！',
    aboutFeat3Title: '极客画质支持',
    aboutFeat3Desc: '支持 4K (2160P 60fps) 极客超清至 720P 极速省空间的多档位参数动态调节与实时采集约束重构。',
    aboutFeat4Title: '100% 本地运算',
    aboutFeat4Desc: '真正的 Serverless 离线设计，零后端，零数据上传。即使断网，您依然能够自由流畅地录屏与本地编译。',
    aboutStartBtn: '开始使用',
    btnStop: '结束录制',
    compileTitle: '🎉 视频编译导出成功！',
    compileDesc: '您的录屏已经完全在本地浏览器沙箱中合并封装。您可以在左侧播放器中预览，也可以输入自定义名称下载到本地。',
    metaDurationLabel: '总时长',
    metaSizeLabel: '文件大小',
    metaFormatLabel: '视频格式',
    fileNameLabel: '保存文件名',
    btnDownload: '下载到本地文件夹',
    btnReset: '重新录制',
    recoveryBannerHeadline: '意外中断恢复提醒',
    recoveryBannerDesc: '系统检测到您上次由于意外关闭或崩溃而中断的录像，已为您恢复。',
    recoveryBannerBtnRecover: '一键找回视频',
    recoveryBannerBtnDiscard: '忽略'
  },
  en: {
    logoSub: 'Studio',
    aboutBtnLabel: 'About',
    langBtnLabel: 'Language',
    themeBtnLabel: 'Theme',
    placeholderTitle: 'Capura Screen Recorder',
    placeholderSubtitle: '100% Client-Side Sandbox · Zero-Latency Dual-Mixing · 100% Privacy',
    btnCapture: 'Start Screen Sharing',
    btnFloatMic: 'Microphone',
    btnFloatSysAudio: 'System Audio',
    btnFloatSettings: 'Resolution Specs',
    popoverLabel: 'Recording Quality Presets',
    qualityUltra4k: '4K Ultra HD',
    qualityHighEnd: 'Full HD 1080P',
    qualityStandard: 'Standard HD 1080P',
    qualityCompact: 'Compact SD 720P',
    btnFloatPip: 'Floating Window',
    aboutTitle: '✨ About Capura Studio',
    aboutHeroTitle: 'High-Fidelity Sandbox Recorder',
    aboutHeroDesc: 'Capura Studio is an immersive, elegant screen recorder engineered entirely in your browser sandbox. Designed for educators, developers, and power users, it supports zero-latency dual mixing and IndexedDB real-time segment-saving, keeping your recordings 100% secure and offline.',
    aboutFeat1Title: 'Zero-latency Dual Mixing',
    aboutFeat1Desc: 'Captures your browser speaker loopback and microphone voice in real-time, blending them in sub-milliseconds on the local Web Audio thread.',
    aboutFeat2Title: 'Incremental Crash Recovery',
    aboutFeat2Desc: 'Utilizes live IndexedDB block-saving. Even if your browser crashes, freezes, or experiences power cuts, your video is saved for 100% lossless recovery.',
    aboutFeat3Title: 'Pro Quality Configurations',
    aboutFeat3Desc: 'Supports multiple high-fidelity constraints, ranging from premium 4K (2160P 60fps) ultra-HD down to 720P for long-running, space-saving operations.',
    aboutFeat4Title: '100% Local Execution',
    aboutFeat4Desc: 'True Serverless design. No servers, no APIs, and zero data uploads. Everything works offline in your browser, even when fully disconnected.',
    aboutStartBtn: 'Get Started',
    btnStop: 'Stop Capture',
    compileTitle: '🎉 Video Compiled Successfully!',
    compileDesc: 'Your recording has been compiled and encapsulated fully in your local browser sandbox. You can preview it in the player or enter a custom name below to download.',
    metaDurationLabel: 'Total Duration',
    metaSizeLabel: 'File Size',
    metaFormatLabel: 'Container Format',
    fileNameLabel: 'Export File Name',
    btnDownload: 'Download to Local Folder',
    btnReset: 'Record Again',
    recoveryBannerHeadline: 'Crash Interruption Recovered',
    recoveryBannerDesc: 'We detected a previous recording session interrupted by a sudden tab closure or crash. We have loaded it for you.',
    recoveryBannerBtnRecover: 'Recover Video',
    recoveryBannerBtnDiscard: 'Discard'
  }
};

const MESSAGES = {
  dbInitFail: {
    zh: '本地数据库启动失败，增量存储灾备功能可能无法使用。',
    en: 'Local database failed to start. Disaster recovery features may be unavailable.'
  },
  pipStopRecord: {
    zh: '已通过悬浮窗结束并保存录像！',
    en: 'Recording ended and saved via floating window!'
  },
  langSwitchZh: {
    zh: '已切换为中文语言环境！',
    en: 'Language switched to Chinese!'
  },
  langSwitchEn: {
    zh: '已切换为英文语言环境！',
    en: 'Language switched to English!'
  },
  themeCyber: {
    zh: '已激活：赛博霓虹主题！',
    en: 'Theme: Cyberpunk Neon Active!'
  },
  themeLight: {
    zh: '已激活：极光冷白主题！',
    en: 'Theme: Nordic Light Active!'
  },
  themeCosmic: {
    zh: '已还原：深邃暗黑主题！',
    en: 'Theme: Cosmic Dark Restored!'
  },
  micAccessFail: {
    zh: '无法访问您的麦克风，请检查麦克风硬件及浏览器授权设置。',
    en: 'Cannot access microphone. Please check system permissions and hardware.'
  },
  sysAudioWarn: {
    zh: '⚠️ 未捕获到系统声音。Mac 用户：请在分享弹窗中选择「Chrome 标签页」并勾选左下角的「分享音频」！',
    en: '⚠️ System audio not captured. Mac users: Please select "Chrome Tab" and check "Share Audio"!'
  },
  captureReady: {
    zh: '屏幕分享已就绪，已解锁“开始录制”！',
    en: 'Screen sharing ready. Record button unlocked!'
  },
  captureFail: {
    zh: '未能启动屏幕分享。请重试并确保您在系统对话框中选中了需要分享的屏幕/窗口。',
    en: 'Failed to start screen sharing. Please retry and check system dialog permissions.'
  },
  micUnavailable: {
    zh: '麦克风未授权或硬件不可用，无法录制麦克风。',
    en: 'Microphone not authorized or hardware unavailable. Skipping mic stream.'
  },
  recordStartNotice: {
    zh: '正式开始录制！视频正在本地分片写盘...',
    en: 'Recording started! Writing fragments locally to disk...'
  },
  recordPaused: {
    zh: '录屏已暂停。',
    en: 'Recording paused.'
  },
  recordResumed: {
    zh: '继续录像中...',
    en: 'Recording resumed...'
  },
  videoDownloadNotice: {
    zh: '视频文件已开始下载！',
    en: 'Video download started!'
  },
  recoveryFail: {
    zh: '灾备视频文件组装失败，部分切片可能已经损坏。',
    en: 'Disaster recovery assembly failed. Some video slices might be corrupted.'
  },
  recoverySuccess: {
    zh: '上次意外中断的录像已成功找回！',
    en: 'Interrupted recording recovered successfully!'
  },
  discardSuccess: {
    zh: '已清理历史缓存切片。',
    en: 'Cleaned up orphaned recording slices.'
  },
  pipUnsupported: {
    zh: '您的浏览器不支持悬浮监控功能。',
    en: 'Your browser does not support floating window monitoring.'
  },
  pipClosed: {
    zh: '已关闭悬浮监控窗。',
    en: 'Closed floating window.'
  },
  pipOpened: {
    zh: '已开启桌面置顶悬浮监控！',
    en: 'Desktop floating window monitoring enabled!'
  },
  pipNotReady: {
    zh: '视频流未就绪，请先分享屏幕。',
    en: 'Video stream not ready. Please start screen sharing first.'
  },
  pipFail: {
    zh: '未能启动悬浮窗预览。',
    en: 'Failed to start floating window preview.'
  },
  notificationTitle: {
    zh: 'Capura 录屏制作完成 📹',
    en: 'Capura Recording Complete 📹'
  },
  notificationBody: {
    zh: '演示视频已编译成功！点击此通知卡片立即返回浏览器下载保存。',
    en: 'Demo video compiled successfully! Click this notification to return and download.'
  },
  dynamicNoticeTitleWarning: {
    zh: '⚠️ 系统警告',
    en: '⚠️ System Warning'
  },
  dynamicNoticeTitleInfo: {
    zh: '✨ 系统提示',
    en: '✨ System Notification'
  },
  confirmBtnText: {
    zh: '知道了',
    en: 'Dismiss'
  },
  dialogTitleText: {
    zh: '系统提示',
    en: 'System Notification'
  },
  dialogCloseText: {
    zh: '关闭',
    en: 'Close'
  },
  qualityChanged: {
    zh: '画质已动态调整为：',
    en: 'Recording specs adjusted to: '
  },
  qualitySavedWarn: {
    zh: '提示：画质配置已保存，请点击下方“重新录制”重新分享以彻底开启 4K 极高清模式！',
    en: 'Notice: Resolution saved. Re-share screen to apply ultra resolution fully!'
  },
  reSummonShare: {
    zh: '正在为您重新唤起分享窗口，请务必勾选左下角的「分享音频」！',
    en: 'Re-summoning screen sharing. Please check the "Share Audio" box in the pop-up!'
  },
  recoveryBannerHeadline: {
    zh: '意外中断恢复提醒',
    en: 'Crash Disaster Recovery Alert'
  },
  recoveryBannerDesc: {
    zh: '系统检测到您上次由于意外关闭或崩溃而中断的录像，已为您恢复。',
    en: 'We detected a recording session interrupted by a sudden tab closure or crash.'
  },
  recoveryBannerBtnRecover: {
    zh: '一键找回视频',
    en: 'Recover Video'
  },
  recoveryBannerBtnDiscard: {
    zh: '忽略',
    en: 'Discard'
  },
  approxMinutes: {
    zh: ' 分钟',
    en: ' minutes'
  },
  systemDetectCrash: {
    zh: '系统检测到您上次由于意外刷新、关闭或崩溃而中断的录像，时长约为 ',
    en: 'System detected a past recording session interrupted by a crash or page reload. Estimated duration: '
  },
  recoverOrphanedIntro: {
    zh: '。我们可以为您直接找回并组装视频！',
    en: '. We can rebuild and download this video right now!'
  },
  recoverTimeSuffix: {
    zh: ' (恢复录像)',
    en: ' (Recovered)'
  },
  unsavedWarning: {
    zh: '录屏正在进行中，如果您离开此页面，录屏数据将会丢失！是否确定离开？',
    en: 'A recording session is currently active. If you leave this page, your unsaved recording will be lost!'
  }
};

function applyLanguage() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(elNode => {
    const key = elNode.getAttribute('data-i18n');
    if (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) {
      elNode.textContent = TRANSLATIONS[currentLang][key];
    }
  });

  // Update dropdown menu items active class state
  const langItems = document.querySelectorAll('.lang-dropdown-item');
  if (langItems) {
    langItems.forEach(item => {
      const itemLang = item.getAttribute('data-lang');
      if (itemLang === currentLang) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  document.title = currentLang === 'zh' ? '极简在线录屏工具 - 浏览器免安装录屏 - Adilia' : 'Minimalist Online Screen Recorder - Free Web Screen Recorder - Adilia';
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', currentLang === 'zh' ? '一个基于浏览器沙箱的免安装在线录屏工具，支持屏幕与麦克风本地混音录制。本地高画质导出 WebM/MP4，100% 隐私安全，不上传任何数据。' : 'A 100% private, serverless online screen recorder. Record your screen and microphone with real-time audio mixing, export high-fidelity WebM/MP4, completely offline and secure.');
  }

  const fileNameInput = document.getElementById('preview-file-name');
  if (fileNameInput) {
    fileNameInput.placeholder = currentLang === 'zh' ? '请输入文件名...' : 'Enter file name...';
  }

  updateUIState();
}

// DOM Elements cache
let el = {};

document.addEventListener('DOMContentLoaded', async () => {
  // Bind DOM Cache
  cacheDOMElements();
  
  // Apply default language
  applyLanguage();
  
  // Initialize Database
  try {
    db = await initDB();
    await checkOrphanedChunks();
  } catch (err) {
    console.error('Failed to initialize IndexedDB:', err);
    showNotice(MESSAGES.dbInitFail[currentLang], 'warning');
  }

  // Load Checklist & setup listeners
  setupChecklist();
  setupEventListeners();
  
  // Start the unified mini visualizer loop
  drawMiniVisualizers();
  
  updateUIState();
});

/* ==========================================================================
   1. DOM ELEMENTS & CACHING
   ========================================================================== */
function cacheDOMElements() {
  el = {
    // Layout zones
    viewportVideo: document.getElementById('viewport-video'),
    viewportVideoBlur: document.getElementById('viewport-video-blur'),
    stagePlaceholder: document.querySelector('.stage-placeholder'),
    viewportStage: document.querySelector('.viewport-stage'),
    stageIndicator: document.querySelector('.stage-indicator'),
    stageIndicatorText: document.getElementById('stage-indicator-text'),
    recordingTimer: document.getElementById('recording-timer'),
    
    // Toggles & configs
    presetOptions: document.querySelectorAll('.quality-pill'),
    toggleMic: document.getElementById('toggle-mic'),
    toggleSystemAudio: document.getElementById('toggle-sysaudio'),
    
    // Buttons
    btnCapture: document.getElementById('btn-capture'),
    btnRecord: document.getElementById('btn-record'),
    btnPause: document.getElementById('btn-pause'),
    btnStop: document.getElementById('btn-stop'),
    btnPip: document.getElementById('btn-pip'),
    
    // Floating controls
    btnFloatMic: document.getElementById('btn-float-mic'),
    btnFloatSysAudio: document.getElementById('btn-float-sysaudio'),
    btnFloatPip: document.getElementById('btn-float-pip'),
    btnFloatRecord: document.getElementById('btn-float-record'),
    btnFloatRecordText: document.getElementById('btn-float-record-text'),
    floatControlsBar: document.getElementById('float-controls-bar'),
    btnFloatSettings: document.getElementById('btn-float-settings'),
    floatSettingsPopover: document.getElementById('float-settings-popover'),
    floatSetupGroup: document.getElementById('float-setup-group'),
    floatTimerWrapper: document.getElementById('float-timer-wrapper'),
    floatTimerDivider: document.getElementById('float-timer-divider'),
    
    // Sidebar items
    statusTag1: document.getElementById('status-tag-1'),
    statusTag2: document.getElementById('status-tag-2'),
    statusTag3: document.getElementById('status-tag-3'),
    sidebarTimerPanel: document.getElementById('sidebar-timer-panel'),
    workspaceContainer: document.getElementById('workspace'),
    sidebarContainer: document.querySelector('.stepper-container'),
    
    // Recovery Overlay
    crashBanner: document.getElementById('crash-banner'),
    crashRecoveryDesc: document.getElementById('crash-desc'),
    btnRecover: document.getElementById('btn-recover'),
    btnDiscardRecovery: document.getElementById('btn-discard-recovery'),
    
    // Compilation station
    compileStation: document.getElementById('compile-station'),
    previewVideo: document.getElementById('preview-video'),
    previewFileName: document.getElementById('preview-file-name'),
    metaDuration: document.getElementById('meta-duration'),
    metaSize: document.getElementById('meta-size'),
    metaFormat: document.getElementById('meta-format'),
    btnDownload: document.getElementById('btn-download'),
    btnResetRecorder: document.getElementById('btn-reset-recorder'),
    
    // Checklist DOMs
    checklistInput: document.getElementById('checklist-input'),
    btnAddChecklistItem: document.getElementById('btn-add-checklist-item'),
    checklistContainer: document.getElementById('checklist-items'),
    
    // Modal Dialog
    dialog: document.querySelector('dialog'),
    dialogTitle: document.getElementById('dialog-title'),
    dialogBody: document.getElementById('dialog-body'),
    dialogCloseBtn: document.getElementById('dialog-close-btn'),

    // New Header & About controls
    btnAbout: document.getElementById('btn-about'),
    aboutDialog: document.getElementById('about-dialog'),
    aboutDialogClose: document.getElementById('about-dialog-close'),
    btnAboutClose: document.getElementById('btn-about-close'),
    btnLangToggle: document.getElementById('btn-lang-toggle'),
    langDropdownWrapper: document.getElementById('lang-dropdown-wrapper'),
    langDropdownMenu: document.getElementById('lang-dropdown-menu'),
    langDropdownItems: document.querySelectorAll('.lang-dropdown-item'),
    btnThemeToggle: document.getElementById('btn-theme-toggle')
  };
}

/* ==========================================================================
   2. INDEXEDDB DATABASE OPERATIONS
   ========================================================================== */
const DB_NAME = 'CapuraDB';
const DB_VERSION = 1;
const STORE_NAME = 'chunks';

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'index' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function saveChunkToDB(index, blob) {
  return new Promise((resolve, reject) => {
    if (!db) return resolve();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put({ index, data: blob });
    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(e.target.error);
  });
}

function getStoredChunks() {
  return new Promise((resolve, reject) => {
    if (!db) return resolve([]);
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = (e) => {
      const data = e.target.result;
      // Guarantee key order
      data.sort((a, b) => a.index - b.index);
      resolve(data.map(item => item.data));
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

function clearStoredChunks() {
  return new Promise((resolve, reject) => {
    if (!db) return resolve();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Scanning for orphaned video chunks from past browser crashes/closures.
 */
async function checkOrphanedChunks() {
  try {
    const chunks = await getStoredChunks();
    if (chunks.length > 0) {
      console.log(`[Capura] Detected ${chunks.length} orphaned recording chunks! Showing recovery banner.`);
      // Approximate duration based on standard 3s timeslices
      const approxDuration = Math.round((chunks.length * 3) / 60);
      const intro = MESSAGES.systemDetectCrash[currentLang];
      const suffix = MESSAGES.recoverOrphanedIntro[currentLang];
      el.crashRecoveryDesc.textContent = `${intro}${approxDuration}${MESSAGES.approxMinutes[currentLang]}${suffix}`;
      el.crashBanner.style.display = 'block';
    }
  } catch (err) {
    console.error('Error scanning orphaned chunks:', err);
  }
}

/* ==========================================================================
   3. SYSTEM EVENTS SETUP
   ========================================================================== */
function setupEventListeners() {
  // Preset card selections
  el.presetOptions.forEach(card => {
    card.addEventListener('click', async () => {
      if (appState !== 'idle' && appState !== 'sharing') return;
      el.presetOptions.forEach(opt => opt.classList.remove('selected'));
      card.classList.add('selected');
      selectedPreset = card.getAttribute('data-preset');
      console.log('[Preset Changed] Selected:', selectedPreset);
      
      // Dynamic track update if stream is active but not recording yet
      if (appState === 'sharing' && screenStream) {
        const track = screenStream.getVideoTracks()[0];
        if (track) {
          const preset = QUALITY_PRESETS[selectedPreset];
          try {
            console.log('[Dynamic Specs Update] Applying constraints to active screen track:', preset);
            await track.applyConstraints({
              width: preset.width,
              height: preset.height,
              frameRate: preset.frameRate
            });
            showToast(MESSAGES.qualityChanged[currentLang] + card.querySelector('.q-label').textContent, 'info');
          } catch (err) {
            console.warn('[Dynamic Specs Update] Dynamic constraints application failed:', err);
            showToast(MESSAGES.qualitySavedWarn[currentLang], 'warning');
          }
        }
      }
    });
  });

  // Microphone toggle live checking
  el.toggleMic.addEventListener('change', async (e) => {
    if (e.target.checked) {
      await enableLiveMicTesting();
    } else {
      disableLiveMicTesting();
    }
    // Sync float button
    if (el.btnFloatMic) {
      if (e.target.checked) el.btnFloatMic.classList.add('active');
      else el.btnFloatMic.classList.remove('active');
    }
  });

  // System Audio toggle handler to sync float button
  if (el.toggleSystemAudio) {
    el.toggleSystemAudio.addEventListener('change', (e) => {
      if (el.btnFloatSysAudio) {
        if (e.target.checked) el.btnFloatSysAudio.classList.add('active');
        else el.btnFloatSysAudio.classList.remove('active');
      }
    });
  }

  // Action Buttons
  el.btnCapture.addEventListener('click', startScreenCapture);
  el.btnRecord.addEventListener('click', startRecording);
  el.btnPause.addEventListener('click', togglePauseResume);
  el.btnStop.addEventListener('click', stopRecording);
  el.btnResetRecorder.addEventListener('click', resetRecorderToIdle);
  
  if (el.btnPip) {
    el.btnPip.addEventListener('click', togglePictureInPicture);
  }

  // Picture-in-Picture event listeners for dynamic UI class switching
  el.viewportVideo.addEventListener('enterpictureinpicture', () => {
    if (el.btnPip) {
      el.btnPip.innerHTML = `${CapuraIcons.close} 关闭悬浮`;
      el.btnPip.classList.remove('btn-secondary');
      el.btnPip.classList.add('btn-danger');
    }
  });

  el.viewportVideo.addEventListener('leavepictureinpicture', () => {
    if (el.btnPip) {
      el.btnPip.innerHTML = `${CapuraIcons.screen} 悬浮监控`;
      el.btnPip.classList.remove('btn-danger');
      el.btnPip.classList.add('btn-secondary');
    }
  });

  // Intercept the native PiP '||' (Pause) click and map it to STOP/Terminate the recording
  el.viewportVideo.addEventListener('pause', () => {
    if (appState === 'recording' || appState === 'paused') {
      console.log('[PiP Control] Intercepted native || click -> Stopping and compiling recording.');
      showToast(MESSAGES.pipStopRecord[currentLang], 'info');
      stopRecording();
    }
  });

  // Handle viewport stage aspect ratio auto-adjusting to avoid letterboxes/pillarboxes
  el.viewportVideo.addEventListener('loadedmetadata', () => {
    const w = el.viewportVideo.videoWidth;
    const h = el.viewportVideo.videoHeight;
    if (w && h) {
      console.log(`[Viewport Stage] Video stream loaded metadata: ${w}x${h}. Dynamically setting aspect-ratio to match.`);
      el.viewportStage.style.aspectRatio = `${w}/${h}`;
    }
  });

  // Recovery Actions
  el.btnRecover.addEventListener('click', recoverOrphanedRecording);
  el.btnDiscardRecovery.addEventListener('click', discardOrphanedRecording);

  // Before unload handler to prevent loss during active recording
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Modal Dialog Close
  if (el.dialogCloseBtn) {
    el.dialogCloseBtn.addEventListener('click', () => el.dialog.close());
  }

  // Click outside dialog backdrop (overlay area) to dismiss/close the modal safely
  if (el.dialog) {
    el.dialog.addEventListener('click', (e) => {
      const rect = el.dialog.getBoundingClientRect();
      const isInDialog = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      if (!isInDialog) {
        el.dialog.close();
      }
    });
  }

  // Floating Controls Bar Actions
  if (el.btnFloatMic) {
    el.btnFloatMic.addEventListener('click', () => {
      if (appState !== 'idle' && appState !== 'sharing') return;
      el.toggleMic.checked = !el.toggleMic.checked;
      el.toggleMic.dispatchEvent(new Event('change'));
    });
  }

  if (el.btnFloatSysAudio) {
    el.btnFloatSysAudio.addEventListener('click', async () => {
      if (appState !== 'idle' && appState !== 'sharing') return;
      el.toggleSystemAudio.checked = !el.toggleSystemAudio.checked;
      el.toggleSystemAudio.dispatchEvent(new Event('change'));
      
      // Dynamic verification: check if system audio is checked but actual screenStream lacks audio track
      if (el.toggleSystemAudio.checked && appState === 'sharing') {
        if (!screenStream || screenStream.getAudioTracks().length === 0) {
          // Active intelligent UI loop: Since user wants system audio but capture lacks it,
          // proactively stop the current silent stream and re-summon the browser share dialog!
          showToast(MESSAGES.reSummonShare[currentLang], 'info');
          
          // Gently stop current video track to release native screen sharing banner
          if (screenStream) {
            screenStream.getTracks().forEach(t => t.stop());
            screenStream = null;
          }
          disableLiveSysTesting();
          
          // Keep system audio configuration active so that the next session requests audio
          el.toggleSystemAudio.checked = true;
          el.toggleSystemAudio.dispatchEvent(new Event('change'));
          
          // Re-execute screen capturing with requested audio constraints
          await startScreenCapture();
        } else {
          enableLiveSysTesting();
        }
      } else {
        disableLiveSysTesting();
      }
    });
  }

  if (el.btnFloatPip) {
    el.btnFloatPip.addEventListener('click', togglePictureInPicture);
  }

  if (el.btnFloatRecord) {
    el.btnFloatRecord.addEventListener('click', () => {
      if (appState === 'sharing') {
        startRecording();
      } else if (appState === 'recording' || appState === 'paused') {
        stopRecording();
      }
    });
  }

  // Settings popover toggle & dismiss handlers
  if (el.btnFloatSettings) {
    el.btnFloatSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.floatSettingsPopover) {
        el.floatSettingsPopover.classList.toggle('show');
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (el.floatSettingsPopover && el.floatSettingsPopover.classList.contains('show')) {
      if (!el.floatSettingsPopover.contains(e.target) && e.target !== el.btnFloatSettings) {
        el.floatSettingsPopover.classList.remove('show');
      }
    }
    if (el.langDropdownMenu && el.langDropdownMenu.classList.contains('show')) {
      if (!el.langDropdownWrapper.contains(e.target)) {
        el.langDropdownMenu.classList.remove('show');
        el.langDropdownWrapper.classList.remove('active');
      }
    }
  });

  // Bind About Dialog events
  if (el.btnAbout && el.aboutDialog) {
    el.btnAbout.addEventListener('click', () => {
      el.aboutDialog.showModal();
    });
  }
  if (el.aboutDialogClose && el.aboutDialog) {
    el.aboutDialogClose.addEventListener('click', () => {
      el.aboutDialog.close();
    });
  }
  if (el.btnAboutClose && el.aboutDialog) {
    el.btnAboutClose.addEventListener('click', () => {
      el.aboutDialog.close();
    });
  }
  if (el.aboutDialog) {
    el.aboutDialog.addEventListener('click', (e) => {
      const rect = el.aboutDialog.getBoundingClientRect();
      const isInDialog = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      if (!isInDialog) {
        el.aboutDialog.close();
      }
    });
  }

  // Bind Language Switch Dropdown events
  if (el.btnLangToggle && el.langDropdownMenu && el.langDropdownWrapper) {
    el.btnLangToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      el.langDropdownMenu.classList.toggle('show');
      el.langDropdownWrapper.classList.toggle('active');
    });
  }

  if (el.langDropdownItems) {
    el.langDropdownItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const lang = item.getAttribute('data-lang');
        if (lang && lang !== currentLang) {
          currentLang = lang;
          applyLanguage();
          showToast(currentLang === 'zh' ? MESSAGES.langSwitchZh[currentLang] : MESSAGES.langSwitchEn[currentLang], 'info');
        }
        el.langDropdownMenu.classList.remove('show');
        el.langDropdownWrapper.classList.remove('active');
      });
    });
  }

  // Bind Theme Switcher event (Cosmic Dark <-> Nordic Light)
  if (el.btnThemeToggle) {
    // Make sure we initialize title and icon
    el.btnThemeToggle.addEventListener('click', () => {
      if (currentTheme === 'cosmic-dark') {
        currentTheme = 'light';
        document.body.className = 'theme-light';
        showToast(MESSAGES.themeLight[currentLang], 'info');
      } else {
        currentTheme = 'cosmic-dark';
        document.body.className = '';
        showToast(MESSAGES.themeCosmic[currentLang], 'info');
      }
      
      // Update dynamic icon and title of the theme toggle button
      const iconSpan = el.btnThemeToggle.querySelector('[data-capura-icon]');
      if (iconSpan) {
        iconSpan.setAttribute('data-capura-icon', currentTheme === 'cosmic-dark' ? 'sun' : 'moon');
        CapuraIcons.inject(iconSpan, currentTheme === 'cosmic-dark' ? 'sun' : 'moon');
      }
      el.btnThemeToggle.setAttribute('title', currentTheme === 'cosmic-dark' ? 
        (currentLang === 'zh' ? '切换为亮色模式 / Switch to Light Mode' : 'Switch to Light Mode') : 
        (currentLang === 'zh' ? '切换为暗色模式 / Switch to Dark Mode' : 'Switch to Dark Mode'));
    });
  }
}

function handleBeforeUnload(e) {
  if (appState === 'recording' || appState === 'paused') {
    e.preventDefault();
    e.returnValue = MESSAGES.unsavedWarning[currentLang];
    return e.returnValue;
  }
}

/* ==========================================================================
   4. LIVE MICROPHONE PREVIEW (Sound visualizer)
   ========================================================================== */
/* ==========================================================================
   4. LIVE SOUND PREVIEWS (Embedded Mini LCD Visualizers)
   ========================================================================== */
async function enableLiveMicTesting() {
  if (micStreamForVisualizer) return;
  
  try {
    micStreamForVisualizer = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Force resume - modern browsers may suspend AudioContext until user interaction
    await audioCtx.resume();
    const source = audioCtx.createMediaStreamSource(micStreamForVisualizer);
    micAnalyser = audioCtx.createAnalyser();
    micAnalyser.fftSize = 128;
    source.connect(micAnalyser);
    console.log('[Mic Pre-Record] Connected microphone analyser.');
  } catch (err) {
    console.error('Microphone connection failed:', err);
    el.toggleMic.checked = false;
    el.toggleMic.dispatchEvent(new Event('change'));
    showNotice(MESSAGES.micAccessFail[currentLang], 'warning');
  }
}

function disableLiveMicTesting() {
  if (micStreamForVisualizer) {
    micStreamForVisualizer.getTracks().forEach(t => t.stop());
    micStreamForVisualizer = null;
  }
  micAnalyser = null;
}

let preRecordSysCtx = null;
let sysSourceNodeForVisualizer = null;
let sysStreamForVisualizer = null;

function enableLiveSysTesting() {
  if (!screenStream) return;
  const audioTrack = screenStream.getAudioTracks()[0];
  if (!audioTrack) {
    disableLiveSysTesting();
    return;
  }
  
  try {
    if (sysSourceNodeForVisualizer) return; // Already active
    
    sysStreamForVisualizer = new MediaStream([audioTrack]);
    preRecordSysCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Force resume - Chrome may auto-suspend new AudioContexts
    preRecordSysCtx.resume().catch(() => {});
    const source = preRecordSysCtx.createMediaStreamSource(sysStreamForVisualizer);
    sysAnalyser = preRecordSysCtx.createAnalyser();
    sysAnalyser.fftSize = 128;
    source.connect(sysAnalyser);
    sysSourceNodeForVisualizer = source;
    console.log('[System Pre-Record] Connected system audio track analyser.');
  } catch (e) {
    console.error('Failed to setup pre-record system audio analyser:', e);
  }
}

function disableLiveSysTesting() {
  if (preRecordSysCtx && preRecordSysCtx.state !== 'closed') {
    preRecordSysCtx.close().catch(() => {});
  }
  preRecordSysCtx = null;
  sysSourceNodeForVisualizer = null;
  sysStreamForVisualizer = null;
  sysAnalyser = null;
}

function drawMiniVisualizers() {
  requestAnimationFrame(drawMiniVisualizers);
  
  // 1. Render Mic Mini Visualizer
  const micCanvas = document.getElementById('mini-mic-visualizer');
  if (micCanvas) {
    const ctx = micCanvas.getContext('2d');
    if (micCanvas.width !== micCanvas.clientWidth || micCanvas.height !== micCanvas.clientHeight) {
      micCanvas.width = micCanvas.clientWidth;
      micCanvas.height = micCanvas.clientHeight;
    }
    
    // Completely clear canvas to remain fully transparent
    ctx.clearRect(0, 0, micCanvas.width, micCanvas.height);
    
    const isMicActive = el.toggleMic && el.toggleMic.checked;
    
    if (isMicActive && micAnalyser) {
      const bufferLength = micAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      micAnalyser.getByteFrequencyData(dataArray);
      
      const barCount = 15;
      const barWidth = 1;
      const gap = 1;
      const totalWidth = barCount * (barWidth + gap) - gap;
      const startX = Math.floor((micCanvas.width - totalWidth) / 2);
      
      ctx.fillStyle = '#06b6d4'; // Cyan
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#06b6d4';
      
      for (let i = 0; i < barCount; i++) {
        // Sample frequencies uniformly
        const freqIndex = Math.floor((i / barCount) * (bufferLength / 2));
        const val = dataArray[freqIndex] || 0;
        const barHeight = (val / 255) * micCanvas.height * 0.95;
        const x = startX + i * (barWidth + gap);
        ctx.fillRect(x, micCanvas.height - barHeight, barWidth, barHeight);
      }
    }
    // When inactive OR no analyser: canvas stays completely clear - no baseline drawn
  }
  
  // 2. Render Sys Audio Mini Visualizer
  const sysCanvas = document.getElementById('mini-sys-visualizer');
  if (sysCanvas) {
    const ctx = sysCanvas.getContext('2d');
    if (sysCanvas.width !== sysCanvas.clientWidth || sysCanvas.height !== sysCanvas.clientHeight) {
      sysCanvas.width = sysCanvas.clientWidth;
      sysCanvas.height = sysCanvas.clientHeight;
    }
    
    ctx.clearRect(0, 0, sysCanvas.width, sysCanvas.height);
    
    const isSysActive = el.toggleSystemAudio && el.toggleSystemAudio.checked;
    
    if (isSysActive && sysAnalyser) {
      const bufferLength = sysAnalyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      sysAnalyser.getByteFrequencyData(dataArray);
      
      const barCount = 15;
      const barWidth = 1;
      const gap = 1;
      const totalWidth = barCount * (barWidth + gap) - gap;
      const startX = Math.floor((sysCanvas.width - totalWidth) / 2);
      
      ctx.fillStyle = '#10b981'; // Emerald Green
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#10b981';
      
      for (let i = 0; i < barCount; i++) {
        const freqIndex = Math.floor((i / barCount) * (bufferLength / 2));
        const val = dataArray[freqIndex] || 0;
        const barHeight = (val / 255) * sysCanvas.height * 0.95;
        const x = startX + i * (barWidth + gap);
        ctx.fillRect(x, sysCanvas.height - barHeight, barWidth, barHeight);
      }
    }
    // When inactive OR no analyser: canvas stays completely clear - no baseline drawn
  }
}

let silentAudioStreamCtx = null;
/**
 * Synthesizes a mathematically silent audio track.
 * This is a highly advanced engineering technique to force browsers (like Chrome/macOS)
 * to display Picture-in-Picture window media controls even on silent video streams.
 */
function getSilentAudioTrack() {
  try {
    silentAudioStreamCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = silentAudioStreamCtx.createOscillator();
    const dst = silentAudioStreamCtx.createMediaStreamDestination();
    oscillator.connect(dst);
    oscillator.start();
    return dst.stream.getAudioTracks()[0];
  } catch (e) {
    console.error('Failed to generate silent track:', e);
    return null;
  }
}

/* ==========================================================================
   5. SCREEN CAPTURING ENGINE (Media Ingestion)
   ========================================================================== */
async function startScreenCapture() {
  try {
    appState = 'sharing';
    updateUIState();
    
    // Request system-level Notification permissions for background alert
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    
    const preset = QUALITY_PRESETS[selectedPreset];
    const enableSystemAudio = el.toggleSystemAudio.checked;
    
    // Constraints matching preset
    const constraints = {
      video: {
        width: preset.width,
        height: preset.height,
        frameRate: preset.frameRate
        // NOTE: Intentionally omit displaySurface constraint.
        // Setting displaySurface: 'monitor' blocks the user from selecting a Chrome tab,
        // which is the ONLY way to capture system audio on macOS.
      },
      audio: enableSystemAudio ? {
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: 48000
      } : false
    };

    console.log('[DisplayMedia Constraints]', constraints);
    screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    
    // Check if system audio was requested but not captured
    if (enableSystemAudio && screenStream.getAudioTracks().length === 0) {
      console.warn('[Audio Warning] System audio requested, but no audio tracks were returned by getDisplayMedia.');
      showToast(MESSAGES.sysAudioWarn[currentLang], 'warning');
      
      // Auto-sync UI: switch off the system audio button dynamically since capture was refused/empty
      el.toggleSystemAudio.checked = false;
      el.toggleSystemAudio.dispatchEvent(new Event('change'));
      disableLiveSysTesting();
    }
    
    // To force Chrome's Picture-in-Picture window to display play/pause controls,
    // we must ensure the stream has an active audio track and the video element is unmuted.
    // If the captured stream does not contain audio, we dynamically synthesize and append a silent track.
    const tracks = [...screenStream.getVideoTracks()];
    let audioTrack = screenStream.getAudioTracks()[0];
    
    if (!audioTrack) {
      console.log('[PiP Hack] No audio track found in capture. Appending synthesized silent audio track...');
      audioTrack = getSilentAudioTrack();
    }
    
    if (audioTrack) {
      tracks.push(audioTrack);
    }
    
    const captureStream = new MediaStream(tracks);
    el.viewportVideo.srcObject = captureStream;
    
    // Play blurred background video for real-time ambient glow matching
    if (el.viewportVideoBlur) {
      el.viewportVideoBlur.srcObject = captureStream;
      el.viewportVideoBlur.muted = true;
      el.viewportVideoBlur.volume = 0;
      el.viewportVideoBlur.style.display = 'block';
      el.viewportVideoBlur.play().catch(err => {
        console.warn('[Ambient Blur Video] Play failed:', err);
      });
    }
    
    // Crucial: Set volume to 0 and unmute the preview element.
    // Setting muted=false tells Chrome to display play/pause buttons, while volume=0 avoids echo.
    el.viewportVideo.muted = false;
    el.viewportVideo.volume = 0;
    
    el.viewportVideo.style.display = 'block';
    el.stagePlaceholder.style.display = 'none';
    el.viewportVideo.play().catch(err => {
      console.warn('[Viewport Video] play() failed or was interrupted:', err);
    });
    
    // Listen for user clicking "Stop Sharing" on Chrome native banner
    screenStream.getVideoTracks()[0].onended = () => {
      console.log('[Stream Ended] User stopped sharing screen.');
      resetRecorderToIdle();
    };

    // If microphone is checked, capture microfone stream
    const enableMic = el.toggleMic.checked;
    if (enableMic) {
      // If live microphone testing was active, we reuse it or stop it to get a fresh clean audio node
      disableLiveMicTesting(); 
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    
    // Enable system audio live testing if sharing audio track is available
    if (enableSystemAudio && screenStream.getAudioTracks().length > 0) {
      enableLiveSysTesting();
    }
    
    el.btnRecord.disabled = false;
    showToast(MESSAGES.captureReady[currentLang], 'info');
    
  } catch (err) {
    console.error('Failed to capture screen stream:', err);
    appState = 'idle';
    updateUIState();
    showNotice(MESSAGES.captureFail[currentLang], 'warning');
  }
}

/* ==========================================================================
   6. RECORDING MANAGEMENT (MediaRecorder & AudioContext Mixing)
   ========================================================================== */
async function startRecording() {
  if (appState !== 'sharing') return;
  
  try {
    appState = 'recording';
    updateUIState();
    
    // Clear last session's temporary chunks
    await clearStoredChunks();
    chunkIndex = 0;
    
    // If mic is enabled in UI, ensure we have an active stream
    if (el.toggleMic.checked) {
      if (!micStream || !micStream.active) {
        disableLiveMicTesting();
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (err) {
          console.error('Failed to capture microphone stream dynamically:', err);
          showToast(MESSAGES.micUnavailable[currentLang], 'warning');
        }
      }
    } else {
      // If mic is disabled, make sure we stop any existing micStream tracks to release hardware
      if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
      }
    }
    
    // Setup Audio mixing graph
    const audioTracks = [];
    const screenAudioTracks = screenStream.getAudioTracks();
    const micAudioTracks = (el.toggleMic.checked && micStream) ? micStream.getAudioTracks() : [];
    
    const preset = QUALITY_PRESETS[selectedPreset];
    
    // Disable pre-record sys/mic analysers to prepare for real recording
    disableLiveMicTesting();
    disableLiveSysTesting();
    
    if (screenAudioTracks.length > 0 || micAudioTracks.length > 0) {
      console.log('[Audio Mix] Initializing AudioContext for dual track blending...');
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      mixedAudioDestination = audioContext.createMediaStreamDestination();
      
      // Inject screen system audio track
      if (screenAudioTracks.length > 0) {
        console.log('[Audio Mix] Blending Screen System Audio track.');
        screenSourceNode = audioContext.createMediaStreamSource(new MediaStream([screenAudioTracks[0]]));
        screenSourceNode.connect(mixedAudioDestination);
        
        // Also connect to sysAnalyser for real-time mini visualizer
        sysAnalyser = audioContext.createAnalyser();
        sysAnalyser.fftSize = 128;
        screenSourceNode.connect(sysAnalyser);
      }
      
      // Inject microphone track
      if (micAudioTracks.length > 0) {
        console.log('[Audio Mix] Blending Microphone Voice Audio track.');
        micSourceNode = audioContext.createMediaStreamSource(new MediaStream([micAudioTracks[0]]));
        micSourceNode.connect(mixedAudioDestination);
        
        // Also connect to micAnalyser for real-time mini visualizer
        micAnalyser = audioContext.createAnalyser();
        micAnalyser.fftSize = 128;
        micSourceNode.connect(micAnalyser);
      }
      
      // Take mixed master audio track
      const blendedTrack = mixedAudioDestination.stream.getAudioTracks()[0];
      audioTracks.push(blendedTrack);
    }
    
    // Assemble master recorder stream
    const videoTrack = screenStream.getVideoTracks()[0];
    activeRecorderStream = new MediaStream([videoTrack, ...audioTracks]);
    
    // Define supported mime container (WebM defaults, falling back to basic values on Safari)
    let selectedMime = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(selectedMime)) {
      selectedMime = 'video/webm;codecs=h264,opus';
      if (!MediaRecorder.isTypeSupported(selectedMime)) {
        selectedMime = 'video/webm';
        if (!MediaRecorder.isTypeSupported(selectedMime)) {
          selectedMime = 'video/mp4;codecs=h264'; // Safari fallback
          if (!MediaRecorder.isTypeSupported(selectedMime)) {
            selectedMime = ''; // Browser defaults
          }
        }
      }
    }
    
    console.log(`[MediaRecorder] Initializing with mimeType: "${selectedMime}", Bitrate: ${preset.bitrate} bps`);
    
    const options = { videoBitsPerSecond: preset.bitrate };
    if (selectedMime) {
      options.mimeType = selectedMime;
    }
    
    mediaRecorder = new MediaRecorder(activeRecorderStream, options);
    
    // Listen for incremental data slices (every 3 seconds)
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0) {
        const index = chunkIndex++;
        console.log(`[IndexedDB Async Save] Writing chunk #${index} (${(event.data.size / 1024).toFixed(1)} KB) to disk.`);
        try {
          await saveChunkToDB(index, event.data);
        } catch (err) {
          console.error(`Failed to store chunk #${index} in IndexedDB:`, err);
        }
      }
    };
    
    mediaRecorder.onstop = compileAndLoadPreview;
    
    // Start recording with 3s timeslices to guarantee recovery
    recordingStartTime = Date.now();
    recordingDuration = 0;
    mediaRecorder.start(3000); 
    
    // Launch timer
    startRecordingTimer();
    
    // Setup Native OS Media Controls (System-level Floating Control)
    setupMediaSession();
    
    showToast(MESSAGES.recordStartNotice[currentLang], 'info');
    
  } catch (err) {
    console.error('Failed to initiate recording state:', err);
    appState = 'sharing';
    updateUIState();
    showNotice(currentLang === 'zh' ? `录屏启动失败: ${err.message}` : `Failed to start recording: ${err.message}`, 'warning');
  }
}

function togglePauseResume() {
  if (appState === 'recording') {
    mediaRecorder.pause();
    appState = 'paused';
    updateUIState();
    clearInterval(timerInterval);
    showToast(MESSAGES.recordPaused[currentLang], 'info');
  } else if (appState === 'paused') {
    mediaRecorder.resume();
    appState = 'recording';
    updateUIState();
    startRecordingTimer();
    showToast(MESSAGES.recordResumed[currentLang], 'info');
  }
}

async function stopRecording() {
  if (appState !== 'recording' && appState !== 'paused') return;
  
  appState = 'compiling';
  updateUIState();
  clearInterval(timerInterval);
  
  // Stop media streams
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  
  stopAllMediaStreams();
}

function stopAllMediaStreams() {
  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
  }
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
  }
  if (silentAudioStreamCtx && silentAudioStreamCtx.state !== 'closed') {
    silentAudioStreamCtx.close();
    silentAudioStreamCtx = null;
  }
  
  // Close native Picture-in-Picture window immediately when streams are stopped
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture().catch(() => {});
  }
  
  disableLiveMicTesting();
  disableLiveSysTesting();
}

/* ==========================================================================
   7. CHUNK COMPILATION & GENERATION (Compile & Preview)
   ========================================================================== */
async function compileAndLoadPreview() {
  try {
    console.log('[Compiler] Assembling all stored chunks from IndexedDB...');
    const chunks = await getStoredChunks();
    
    if (chunks.length === 0) {
      throw new Error("无法读取到已录制的视频碎片数据。");
    }
    
    // Mix elements
    const fileMime = chunks[0].type || 'video/webm';
    const compiledBlob = new Blob(chunks, { type: fileMime });
    
    console.log(`[Compiler] Assembled Blob of size: ${(compiledBlob.size / 1024 / 1024).toFixed(2)} MB`);
    
    const previewUrl = URL.createObjectURL(compiledBlob);
    
    // Bind previews
    el.previewVideo.src = previewUrl;
    
    // Bind details card values
    const sizeInMB = (compiledBlob.size / 1024 / 1024).toFixed(1);
    el.metaSize.textContent = `${sizeInMB} MB`;
    
    const min = Math.floor(recordingDuration / 60);
    const sec = recordingDuration % 60;
    el.metaDuration.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    
    const containerFormat = fileMime.split(';')[0].split('/')[1].toUpperCase();
    el.metaFormat.textContent = containerFormat;
    
    // Default file naming config: Capura-Tutorial-YYYYMMDD_HHMMSS
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    el.previewFileName.value = `Capura_Deploy_Tutorial_${dateStr}_${timeStr}`;
    
    // Download action binding
    el.btnDownload.onclick = () => {
      const customName = el.previewFileName.value.trim() || 'Capura_Deploy_Tutorial';
      const fileExt = containerFormat.toLowerCase() === 'mp4' ? 'mp4' : 'webm';
      
      const a = document.createElement('a');
      a.href = previewUrl;
      a.download = `${customName}.${fileExt}`;
      a.click();
      
      showToast(MESSAGES.videoDownloadNotice[currentLang], 'info');
    };
    
    appState = 'done';
    updateUIState();
    
    // Trigger OS-level notification to invite user back to browser
    triggerEndNotification();
    
    // Clear chunks database to keep space clean
    await clearStoredChunks();
    
  } catch (err) {
    console.error('Failed to compile recording preview:', err);
    showNotice(currentLang === 'zh' ? `视频编译失败: ${err.message}` : `Video compilation failed: ${err.message}`, 'warning');
    resetRecorderToIdle();
  }
}

/* ==========================================================================
   8. DISASTER RECOVERY FLOW
   ========================================================================== */
async function recoverOrphanedRecording() {
  try {
    el.crashBanner.style.display = 'none';
    appState = 'compiling';
    updateUIState();
    
    console.log('[Recovery] Initializing disaster recovery merge...');
    const chunks = await getStoredChunks();
    const fileMime = chunks[0].type || 'video/webm';
    
    // Infer duration based on 3s chunks slices
    recordingDuration = chunks.length * 3;
    
    const compiledBlob = new Blob(chunks, { type: fileMime });
    const previewUrl = URL.createObjectURL(compiledBlob);
    
    el.previewVideo.src = previewUrl;
    
    const sizeInMB = (compiledBlob.size / 1024 / 1024).toFixed(1);
    el.metaSize.textContent = `${sizeInMB} MB`;
    
    const min = Math.floor(recordingDuration / 60);
    const sec = recordingDuration % 60;
    el.metaDuration.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')} (恢复录像)`;
    
    const containerFormat = fileMime.split(';')[0].split('/')[1].toUpperCase();
    el.metaFormat.textContent = containerFormat;
    
    el.previewFileName.value = `Capura_Recovered_Recording_${Date.now()}`;
    
    el.btnDownload.onclick = () => {
      const customName = el.previewFileName.value.trim() || 'Capura_Recovered';
      const fileExt = containerFormat.toLowerCase() === 'mp4' ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = previewUrl;
      a.download = `${customName}.${fileExt}`;
      a.click();
    };
    
    appState = 'done';
    updateUIState();
    
    await clearStoredChunks();
    showToast(MESSAGES.recoverySuccess[currentLang], 'info');
    
  } catch (err) {
    console.error('Crash recovery failed:', err);
    showNotice(MESSAGES.recoveryFail[currentLang], 'warning');
    await clearStoredChunks();
    resetRecorderToIdle();
  }
}

async function discardOrphanedRecording() {
  try {
    await clearStoredChunks();
    el.crashBanner.style.display = 'none';
    showToast(MESSAGES.discardSuccess[currentLang], 'info');
  } catch (err) {
    console.error('Discard recovery chunks failed:', err);
  }
}

/* ==========================================================================
   9. RECORDER STATE TIMER
   ========================================================================== */
function startRecordingTimer() {
  timerInterval = setInterval(() => {
    recordingDuration++;
    const min = Math.floor(recordingDuration / 60);
    const sec = recordingDuration % 60;
    el.recordingTimer.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }, 1000);
}

function resetRecorderToIdle() {
  stopAllMediaStreams();
  
  if (timerInterval) clearInterval(timerInterval);
  recordingDuration = 0;
  
  el.previewVideo.src = '';
  el.viewportVideo.srcObject = null;
  el.viewportVideo.style.display = 'none';
  if (el.viewportVideoBlur) {
    el.viewportVideoBlur.srcObject = null;
    el.viewportVideoBlur.style.display = 'none';
  }
  el.viewportStage.style.aspectRatio = '';
  el.stagePlaceholder.style.display = 'flex';
  
  appState = 'idle';
  updateUIState();
  
  // Re-enable mic visualizer if toggle checked
  if (el.toggleMic.checked) {
    enableLiveMicTesting();
  }
}

/* ==========================================================================
   10. INTERACTIVE CLIENT DEPLOYMENT CHECKLIST SYSTEM
   ========================================================================== */
let checklistItems = [];

function setupChecklist() {
  if (!el.checklistInput || !el.btnAddChecklistItem || !el.checklistContainer) {
    console.log('[Capura] Checklist DOM elements not present. Skipping initialization.');
    return;
  }
  // Load standard template elements if localStorage is completely blank
  const stored = localStorage.getItem('capura_checklist_items');
  if (stored) {
    checklistItems = JSON.parse(stored);
  } else {
    checklistItems = [
      { id: '1', text: '安装 Python 与必要的开发依赖环境 (如 Python 3.9)', checked: false },
      { id: '2', text: '下载源码包并解压到您的本地计算机目录中', checked: false },
      { id: '3', text: '双击运行 install_dependencies.bat (安装 requirements.txt)', checked: false },
      { id: '4', text: '配置系统环境变量或修改 env 配置文件 (如需数据库密钥)', checked: false },
      { id: '5', text: '点击 start.bat 开始启动运行程序', checked: false },
      { id: '6', text: '在浏览器中访问 http://localhost:8000 预览项目效果', checked: false }
    ];
    saveChecklistToStorage();
  }
  
  renderChecklist();
  
  // Handlers
  el.btnAddChecklistItem.addEventListener('click', addNewChecklistItem);
  el.checklistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addNewChecklistItem();
  });
}

function renderChecklist() {
  if (!el.checklistContainer) return;
  el.checklistContainer.innerHTML = '';
  
  if (checklistItems.length === 0) {
    el.checklistContainer.innerHTML = `<div class="checklist-empty-state">清单为空，您可在上方输入自定义步骤添加。</div>`;
    return;
  }
  
  checklistItems.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = `checklist-item ${item.checked ? 'checked' : ''}`;
    itemEl.setAttribute('data-id', item.id);
    
    itemEl.innerHTML = `
      <div class="checklist-item-check-area">
        <div class="checklist-checkbox-circle">
          ${CapuraIcons.check}
        </div>
        <span class="checklist-item-text">${item.text}</span>
      </div>
      <button class="btn-item-delete" title="删除步骤">
        ${CapuraIcons.trash}
      </button>
    `;
    
    // Check click event bind
    itemEl.querySelector('.checklist-item-check-area').addEventListener('click', () => {
      toggleChecklistItemState(item.id);
    });
    
    // Delete click event bind
    itemEl.querySelector('.btn-item-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteChecklistItem(item.id);
    });
    
    el.checklistContainer.appendChild(itemEl);
  });
}

function addNewChecklistItem() {
  const text = el.checklistInput.value.trim();
  if (!text) return;
  
  checklistItems.push({
    id: Date.now().toString(),
    text: text,
    checked: false
  });
  
  el.checklistInput.value = '';
  saveChecklistToStorage();
  renderChecklist();
}

function toggleChecklistItemState(id) {
  checklistItems = checklistItems.map(item => {
    if (item.id === id) {
      return { ...item, checked: !item.checked };
    }
    return item;
  });
  saveChecklistToStorage();
  renderChecklist();
}

function deleteChecklistItem(id) {
  checklistItems = checklistItems.filter(item => item.id !== id);
  saveChecklistToStorage();
  renderChecklist();
}

function saveChecklistToStorage() {
  localStorage.setItem('capura_checklist_items', JSON.stringify(checklistItems));
}

/* ==========================================================================
   11. UI DYNAMIC CONTEXTUAL UPDATER (State machine UI renderer)
   ========================================================================== */
function updateUIState() {
  console.log(`[Capura State] -> "${appState}"`);
  
  const isPiPSupported = document.pictureInPictureEnabled;
  const hudPlaceholder = document.getElementById('viewport-placeholder-hud');
  
  // Transition actions
  switch (appState) {
    case 'idle':
      enableConfigToggles(true);
      
      if (el.btnCapture) {
        el.btnCapture.disabled = false;
        el.btnCapture.style.display = 'inline-flex';
      }
      
      // Force viewport stage DOM reset to avoid frozen black screens on share cancellation/failures
      if (el.viewportVideo) {
        el.viewportVideo.srcObject = null;
        el.viewportVideo.style.display = 'none';
      }
      if (el.stagePlaceholder) {
        el.stagePlaceholder.style.display = 'flex';
        el.stagePlaceholder.style.opacity = '1';
      }
      
      // Floating controls bar update
      if (el.floatControlsBar) el.floatControlsBar.classList.add('hidden');
      
      // Metamorphic structures: sharing controls displayed, recording controls hidden
      if (el.floatSetupGroup) el.floatSetupGroup.style.display = 'flex';
      if (el.floatTimerWrapper) el.floatTimerWrapper.style.display = 'none';
      if (el.floatTimerDivider) el.floatTimerDivider.style.display = 'none';
      if (el.btnPause) el.btnPause.style.display = 'none';
      
      if (el.btnRecord) {
        el.btnRecord.disabled = true;
        el.btnRecord.style.display = 'inline-flex';
        el.btnRecord.innerHTML = `<span class="record-indicator-dot"></span> <span id="btn-record-text">${currentLang === 'zh' ? '开始录制' : 'Start Recording'}</span>`;
      }
      if (el.btnStop) el.btnStop.style.display = 'none';
      
      el.stageIndicator.classList.remove('active');
      el.stageIndicatorText.textContent = currentLang === 'zh' ? '已断开' : 'Disconnected';
      el.recordingTimer.textContent = "00:00";
      
      el.compileStation.style.display = 'none';
      break;
      
    case 'sharing':
      enableConfigToggles(true);
      
      if (el.btnCapture) el.btnCapture.style.display = 'none';
      
      // Show Metamorphic sharing setup inputs
      if (el.floatSetupGroup) el.floatSetupGroup.style.display = 'flex';
      if (el.floatTimerWrapper) el.floatTimerWrapper.style.display = 'none';
      if (el.floatTimerDivider) el.floatTimerDivider.style.display = 'none';
      if (el.btnPause) el.btnPause.style.display = 'none';
      
      if (el.btnRecord) {
        el.btnRecord.disabled = false;
        el.btnRecord.style.display = 'inline-flex';
        el.btnRecord.innerHTML = `<span class="record-indicator-dot"></span> <span id="btn-record-text">${currentLang === 'zh' ? '开始录制' : 'Start Recording'}</span>`;
      }
      if (el.btnStop) el.btnStop.style.display = 'none';
      
      if (el.floatControlsBar) el.floatControlsBar.classList.remove('hidden');
      
      // Update toggle buttons active class
      if (el.btnFloatMic) {
        el.btnFloatMic.disabled = false;
        if (el.toggleMic.checked) el.btnFloatMic.classList.add('active');
        else el.btnFloatMic.classList.remove('active');
      }
      if (el.btnFloatSysAudio) {
        el.btnFloatSysAudio.disabled = false;
        if (el.toggleSystemAudio.checked) el.btnFloatSysAudio.classList.add('active');
        else el.btnFloatSysAudio.classList.remove('active');
      }
      if (el.btnFloatPip) el.btnFloatPip.disabled = false;
      if (el.btnFloatSettings) el.btnFloatSettings.disabled = false;
      
      el.stageIndicator.classList.add('active');
      el.stageIndicator.querySelector('.dot').style.backgroundColor = 'var(--accent-cyan)';
      el.stageIndicator.querySelector('.dot').style.boxShadow = '0 0 10px var(--accent-cyan)';
      el.stageIndicatorText.textContent = currentLang === 'zh' ? '分享就绪' : 'Ready';
      
      el.viewportStage.classList.add('sharing-active');
      el.viewportStage.classList.remove('recording-active');
      
      if (hudPlaceholder) hudPlaceholder.style.opacity = '0';
      el.compileStation.style.display = 'none';
      break;
      
    case 'recording':
      enableConfigToggles(false);
      
      if (el.btnCapture) el.btnCapture.style.display = 'none';
      
      // Metamorphic transition: hide settings, slide out timer and pause buttons!
      if (el.floatSetupGroup) el.floatSetupGroup.style.display = 'none';
      if (el.floatTimerWrapper) el.floatTimerWrapper.style.display = 'flex';
      if (el.floatTimerDivider) el.floatTimerDivider.style.display = 'block';
      
      if (el.btnPause) {
        el.btnPause.disabled = false;
        el.btnPause.style.display = 'inline-flex';
        el.btnPause.innerHTML = `<span class="float-btn-icon">${CapuraIcons.pause}</span>`;
      }
      
      if (el.btnRecord) el.btnRecord.style.display = 'none';
      if (el.btnStop) {
        el.btnStop.disabled = false;
        el.btnStop.style.display = 'inline-flex';
      }
      
      if (el.floatControlsBar) el.floatControlsBar.classList.remove('hidden');
      
      el.stageIndicator.classList.add('active');
      el.stageIndicator.querySelector('.dot').style.backgroundColor = 'var(--accent-red)';
      el.stageIndicator.querySelector('.dot').style.boxShadow = '0 0 10px var(--accent-red)';
      el.stageIndicatorText.textContent = currentLang === 'zh' ? '录制中' : 'Recording';
      
      el.viewportStage.classList.remove('sharing-active');
      el.viewportStage.classList.add('recording-active');
      
      if (hudPlaceholder) hudPlaceholder.style.opacity = '0';
      break;
      
    case 'paused':
      if (el.btnPause) {
        el.btnPause.innerHTML = `<span class="float-btn-icon">${CapuraIcons.play}</span>`;
      }
      el.stageIndicatorText.textContent = currentLang === 'zh' ? '暂停中' : 'Paused';
      el.viewportStage.classList.remove('recording-active');
      break;
      
    case 'compiling':
      if (el.btnCapture) el.btnCapture.disabled = true;
      if (el.btnRecord) el.btnRecord.disabled = true;
      if (el.btnPause) el.btnPause.disabled = true;
      if (el.btnStop) el.btnStop.disabled = true;
      el.stageIndicatorText.textContent = currentLang === 'zh' ? '合并中...' : 'Compiling...';
      
      if (el.floatControlsBar) el.floatControlsBar.classList.add('hidden');
      break;
      
    case 'done':
      el.viewportStage.classList.remove('recording-active');
      el.viewportStage.classList.remove('sharing-active');
      el.stageIndicator.classList.remove('active');
      el.stageIndicatorText.textContent = currentLang === 'zh' ? '已编译' : 'Compiled';
      
      if (el.btnCapture) {
        el.btnCapture.style.display = 'inline-flex';
        el.btnCapture.disabled = true;
      }
      if (el.btnRecord) el.btnRecord.style.display = 'none';
      if (el.btnPause) el.btnPause.style.display = 'none';
      if (el.btnStop) el.btnStop.style.display = 'none';
      
      if (el.floatControlsBar) el.floatControlsBar.classList.add('hidden');
      
      el.compileStation.style.display = 'block';
      el.compileStation.scrollIntoView({ behavior: 'smooth' });
      break;
  }
}

function enableConfigToggles(state) {
  el.toggleMic.disabled = !state;
  el.toggleSystemAudio.disabled = !state;
  el.presetOptions.forEach(opt => {
    if (state) {
      opt.style.pointerEvents = 'auto';
      opt.style.opacity = '1';
    } else {
      opt.style.pointerEvents = 'none';
      opt.style.opacity = '0.4';
    }
  });
}

/* ==========================================================================
   12. NOTIFICATION AND MODAL HELPER
   ========================================================================== */
function showNotice(message, type = 'info') {
  el.dialogTitle.textContent = type === 'warning' ? MESSAGES.dynamicNoticeTitleWarning[currentLang] : MESSAGES.dynamicNoticeTitleInfo[currentLang];
  el.dialogBody.innerHTML = `
    <p style="font-size:0.95rem; color:var(--text-secondary); line-height:1.6; margin-bottom: 20px;">${message}</p>
    <div style="display: flex; justify-content: flex-end;">
      <button id="dialog-confirm-btn" class="btn btn-primary" style="padding: 8px 24px; font-size: 0.8rem; border-radius: var(--radius-sm);">
        ${MESSAGES.confirmBtnText[currentLang]}
      </button>
    </div>
  `;
  
  // Bind close action to the dynamic confirm button
  const confirmBtn = document.getElementById('dialog-confirm-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      el.dialog.close();
    });
  }
  
  el.dialog.showModal();
}

/**
 * Native picture-in-picture floating overlay controller.
 * Enables the user to watch the screen and trigger controls outside browser tab boundaries.
 */
async function togglePictureInPicture() {
  try {
    if (!document.pictureInPictureEnabled) {
      showToast(MESSAGES.pipUnsupported[currentLang], 'warning');
      return;
    }
    
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      showToast(MESSAGES.pipClosed[currentLang], 'info');
    } else {
      if (el.viewportVideo.srcObject) {
        await el.viewportVideo.requestPictureInPicture();
        showToast(MESSAGES.pipOpened[currentLang], 'info');
      } else {
        showToast(MESSAGES.pipNotReady[currentLang], 'warning');
      }
    }
  } catch (err) {
    console.error('Failed to trigger Picture-in-Picture:', err);
    showToast(MESSAGES.pipFail[currentLang], 'warning');
  }
}

/**
 * Configures the OS-level System Media Sessions (MediaSession API).
 * Enables native desktop notifications overlay to pause, resume and end recording globally.
 */
function setupMediaSession() {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'Capura 智能录屏系统正在录制中...',
      artist: 'Capura',
      album: '交付部署高保真录像控制台',
      artwork: [
        { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=512', sizes: '512x512', type: 'image/jpeg' }
      ]
    });
    
    // Play Action (Resume)
    navigator.mediaSession.setActionHandler('play', () => {
      console.log('[MediaSession] Play Action triggered.');
      if (appState === 'paused') {
        togglePauseResume();
      }
    });
    
    // Pause Action (Mapped to STOP recording / Terminating)
    navigator.mediaSession.setActionHandler('pause', () => {
      console.log('[MediaSession] Pause Action triggered -> Stopping and compiling recording.');
      if (appState === 'recording' || appState === 'paused') {
        stopRecording();
      }
    });
    
    // Stop Action (End and Compile)
    navigator.mediaSession.setActionHandler('stop', () => {
      console.log('[MediaSession] Stop Action triggered.');
      if (appState === 'recording' || appState === 'paused') {
        stopRecording();
      }
    });
  }
}

/**
 * Custom modern non-intrusive Toast notification system.
 */
function showToast(message, type = 'info') {
  // Ensure toast container exists
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  // Create toast card
  const card = document.createElement('div');
  card.className = `toast-card toast-${type}`;
  
  // Build dynamic content with icon
  const iconSvg = type === 'warning' ? CapuraIcons.warning : CapuraIcons.info;
  card.innerHTML = `
    <div class="toast-icon">${iconSvg}</div>
    <div class="toast-content">${message}</div>
  `;
  
  container.appendChild(card);
  
  // Slide in
  setTimeout(() => {
    card.classList.add('show');
  }, 10);
  
  // Auto slide out and remove
  setTimeout(() => {
    card.classList.remove('show');
    card.classList.add('hide');
    card.addEventListener('transitionend', () => {
      card.remove();
    });
  }, 3500);
}

/**
 * Fires an OS-level native desktop notification.
 * Enables the user to jump back (focus) directly to the browser window by clicking the notification.
 */
function triggerEndNotification() {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      const notification = new Notification(MESSAGES.notificationTitle[currentLang], {
        body: MESSAGES.notificationBody[currentLang],
        icon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128',
        tag: 'capura-record-done' // Prevents duplicates
      });
      
      notification.onclick = () => {
        // Bring browser to foreground
        window.focus();
        parent.focus();
        notification.close();
      };
    } else {
      console.warn('[Notification] Permission is not granted. Cannot trigger desktop alert.');
    }
  }
}
