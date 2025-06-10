// ==========================================
// BACKGROUND.JS - VERSIONE CORRETTA
// ==========================================

// ==========================================
// 1. CLASSE UNIFICATA PER GESTIONE CONFIG
// ==========================================
class ConfigManager {
  constructor() {
    this.initialized = false;
    this.cachedConfig = null;
  }

  async isConfigured() {
    try {
      const stored = await chrome.storage.local.get(['firebaseConfig']);
      if (stored.firebaseConfig && this.validateConfig(stored.firebaseConfig)) {
        this.cachedConfig = stored.firebaseConfig;
        this.initialized = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Errore controllo config:', error);
      return false;
    }
  }

  async getConfigFromServer(secretKey) {
    if (!secretKey || typeof secretKey !== 'string') {
      throw new Error('Secret key richiesta');
    }

    try {
      const response = await fetch('https://trip-advisor-scraping-api.vercel.app/api/get-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret': secretKey
        }
      });

      if (!response.ok) {
        throw new Error(`Secret non valida (${response.status})`);
      }

      const data = await response.json();
      
      if (!this.validateConfig(data.firebaseConfig)) {
        throw new Error('Configurazione Firebase invalida ricevuta dal server');
      }

      // Salva configurazione
      await chrome.storage.local.set({ 
        firebaseConfig: data.firebaseConfig,
        configuredAt: new Date().toISOString()
      });
      
      this.cachedConfig = data.firebaseConfig;
      this.initialized = true;
      
      
      return data.firebaseConfig;
    } catch (error) {
      console.error('❌ Errore recupero config dal server:', error);
      throw error;
    }
  }

  async getConfig() {
    // Se già in cache e valida, restituiscila
    if (this.cachedConfig && this.validateConfig(this.cachedConfig)) {
      return this.cachedConfig;
    }
    
    // Altrimenti carica da storage
    try {
      const stored = await chrome.storage.local.get(['firebaseConfig']);
      if (stored.firebaseConfig && this.validateConfig(stored.firebaseConfig)) {
        this.cachedConfig = stored.firebaseConfig;
        return stored.firebaseConfig;
      }
      throw new Error('Configurazione Firebase non trovata o invalida');
    } catch (error) {
      console.error('❌ Errore caricamento config:', error);
      throw new Error('Firebase non configurato - eseguire l\'autenticazione');
    }
  }

  validateConfig(config) {
    return config && 
           typeof config === 'object' && 
           typeof config.projectId === 'string' && 
           config.projectId.length > 0;
  }

  clearConfig() {
    this.cachedConfig = null;
    this.initialized = false;
    return chrome.storage.local.remove(['firebaseConfig', 'configuredAt']);
  }
}

// ==========================================
// 2. GENERATORE ID SEMPLIFICATO
// ==========================================
class IdGenerator {
  static generate() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${timestamp}_${random}`;
  }
}

// ==========================================
// 3. CLASSE FIREBASE SERVICE CORRETTA
// ==========================================
class FirebaseService {
  constructor(configManager) {
    this.configManager = configManager;
    this.baseUrl = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized && this.baseUrl) {
      return;
    }
    
    try {
      const config = await this.configManager.getConfig();
      this.baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
      this.initialized = true;
      
      console.log('✅ Firebase Service inizializzato:', {
        projectId: config.projectId,
        baseUrl: this.baseUrl
      });
    } catch (error) {
      console.error('❌ Errore inizializzazione Firebase:', error);
      throw error;
    }
  }

  async addRestaurant(restaurantData) {
    await this.initialize();
    
    // Validazione dati obbligatori
    const validationError = this.validateRestaurantData(restaurantData);
    if (validationError) {
      throw new Error(`Dati ristorante invalidi: ${validationError}`);
    }
    
    try {
      
      
      const id = IdGenerator.generate();
      const cleanData = this.cleanRestaurantData({
        id: id,
        ...restaurantData,
        createdAt: new Date().toISOString(),
        approved: false,
        source: 'chrome_extension'
      });

      const firestoreData = this.convertToFirestoreFormat(cleanData);
      
      const response = await fetch(`${this.baseUrl}/restaurants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: firestoreData
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText } };
        }
        throw new Error(`Errore Firestore ${response.status}: ${errorData.error?.message || 'Errore sconosciuto'}`);
      }

      const result = await response.json();
      
      
      return {
        success: true,
        id: id,
        documentId: result.name,
        data: cleanData
      };

    } catch (error) {
      console.error('❌ Errore aggiunta ristorante:', error);
      throw error;
    }
  }

  validateRestaurantData(data) {
    if (!data || typeof data !== 'object') {
      return 'Dati ristorante mancanti';
    }
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      return 'Nome ristorante richiesto';
    }
    
    if (!data.sourceUrl || typeof data.sourceUrl !== 'string') {
      return 'URL sorgente richiesto';
    }
    
    if (data.rating !== undefined && data.rating !== null) {
      const rating = parseFloat(data.rating);
      if (isNaN(rating) || rating < 0 || rating > 5) {
        return 'Rating deve essere tra 0 e 5';
      }
    }
    
    return null; // Validazione passata
  }

  cleanRestaurantData(data) {
    const cleaned = {};
    
    // Campi obbligatori
    cleaned.id = data.id || IdGenerator.generate();
    cleaned.name = data.name.toString().trim();
    cleaned.sourceUrl = data.sourceUrl.toString().trim();
    
    // Campi numerici con validazione
    cleaned.rating = this.validateAndCleanNumber(data.rating, 0, 5, null);
    cleaned.latitude = this.validateAndCleanNumber(data.latitude, -90, 90, 40.3515);
    cleaned.longitude = this.validateAndCleanNumber(data.longitude, -180, 180, 18.1750);
    
    // Campi opzionali stringa
    const stringFields = ['description', 'address', 'phone', 'imageUrl', 'location', 'cuisine'];
    stringFields.forEach(field => {
      if (data[field] && typeof data[field] === 'string') {
        cleaned[field] = data[field].trim();
      }
    });
    
    // Fascia prezzo con validazione
    cleaned.priceRange = this.validatePriceRange(data.priceRange) || '€€';
    
    // Array cucine
    if (Array.isArray(data.cuisines)) {
      cleaned.cuisines = data.cuisines
        .filter(c => typeof c === 'string' && c.trim().length > 0)
        .map(c => c.trim());
    } else if (cleaned.cuisine) {
      cleaned.cuisines = [cleaned.cuisine];
    } else {
      cleaned.cuisines = ['italiana'];
    }
    
    // Valutazioni utente opzionali
    const userFields = ['locationUser', 'qualitàPrezzoUser', 'mediaPrezzo'];
    userFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null) {
        cleaned[field] = this.validateAndCleanNumber(data[field], 0, field === 'mediaPrezzo' ? 1000 : 5, null);
      }
    });
    
    // Metadati
    cleaned.extractedAt = data.extractedAt || new Date().toISOString();
    cleaned.createdAt = data.createdAt || new Date().toISOString();
    cleaned.approved = Boolean(data.approved);
    cleaned.source = data.source || 'chrome_extension';
    
    return cleaned;
  }

  validateAndCleanNumber(value, min, max, defaultValue) {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    
    const num = parseFloat(value);
    if (isNaN(num) || num < min || num > max) {
      return defaultValue;
    }
    
    return num;
  }

  validatePriceRange(priceRange) {
    const validRanges = ['€', '€€', '€€€', '€€€€'];
    return validRanges.includes(priceRange) ? priceRange : null;
  }

  convertToFirestoreFormat(data) {
    const converted = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      
      if (typeof value === 'string') {
        converted[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          converted[key] = { integerValue: value.toString() };
        } else {
          converted[key] = { doubleValue: value };
        }
      } else if (typeof value === 'boolean') {
        converted[key] = { booleanValue: value };
      } else if (Array.isArray(value)) {
        converted[key] = {
          arrayValue: {
            values: value.map(item => ({ stringValue: item.toString() }))
          }
        };
      } else if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
        converted[key] = { timestampValue: value };
      } else {
        converted[key] = { stringValue: value.toString() };
      }
    }
    
    return converted;
  }

  async getRestaurants(limit = 10) {
    await this.initialize();
    
    try {
      const url = `${this.baseUrl}/restaurants?pageSize=${limit}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Errore nel recupero: ${response.status}`);
      }
      
      const result = await response.json();
      return result.documents || [];
      
    } catch (error) {
      console.error('❌ Errore recupero ristoranti:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.initialize();
      const restaurants = await this.getRestaurants(1);
      
      const config = await this.configManager.getConfig();
      return {
        status: 'connected',
        restaurantCount: restaurants.length,
        projectId: config.projectId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    }
  }
}

// ==========================================
// 4. CLASSE STORAGE MANAGER
// ==========================================
class StorageManager {
  static async saveRestaurant(data, result) {
    try {
      const stored = await chrome.storage.local.get(['scrapedRestaurants']);
      const restaurants = stored.scrapedRestaurants || [];
      
      restaurants.push({
        ...data,
        firebaseId: result?.id,
        firebaseDocumentId: result?.documentId,
        savedAt: new Date().toISOString(),
        status: 'synced'
      });
      
      // Mantieni solo gli ultimi 50
      if (restaurants.length > 50) {
        restaurants.splice(0, restaurants.length - 50);
      }
      
      await chrome.storage.local.set({ scrapedRestaurants: restaurants });
      
    } catch (error) {
      console.error('❌ Errore salvataggio locale:', error);
    }
  }

  static async saveFailedRestaurant(data, error) {
    try {
      const stored = await chrome.storage.local.get(['failedRestaurants']);
      const failed = stored.failedRestaurants || [];
      
      failed.push({
        ...data,
        savedAt: new Date().toISOString(),
        status: 'failed',
        error: error,
        retryCount: 0
      });
      
      // Mantieni solo gli ultimi 20
      if (failed.length > 20) {
        failed.splice(0, failed.length - 20);
      }
      
      await chrome.storage.local.set({ failedRestaurants: failed });
      
    } catch (storageError) {
      console.error('❌ Errore salvataggio errore:', storageError);
    }
  }

  static async getStats() {
    try {
      const data = await chrome.storage.local.get(['scrapedRestaurants', 'failedRestaurants']);
      const synced = data.scrapedRestaurants || [];
      const failed = data.failedRestaurants || [];

      return {
        totalSynced: synced.length,
        totalFailed: failed.length,
        lastSyncedAt: synced.length > 0 ? synced[synced.length - 1].savedAt : null,
        lastFailedAt: failed.length > 0 ? failed[failed.length - 1].savedAt : null
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// ==========================================
// 5. CLASSE RETRY MANAGER
// ==========================================
class RetryManager {
  constructor(firebaseService, storageManager) {
    this.firebaseService = firebaseService;
    this.storageManager = storageManager;
  }

  async retryFailedRestaurants() {
    try {
      const stored = await chrome.storage.local.get(['failedRestaurants']);
      const failed = stored.failedRestaurants || [];
      
      if (failed.length === 0) {
        
        return;
      }
      
      
      
      const succeeded = [];
      const stillFailed = [];
      
      for (const restaurant of failed) {
        // Limita tentativi di retry
        if ((restaurant.retryCount || 0) >= 3) {
          console.log(`⏭️ Skip retry per ${restaurant.name} (troppi tentativi)`);
          stillFailed.push(restaurant);
          continue;
        }

        try {
          const result = await this.firebaseService.addRestaurant(restaurant);
          succeeded.push({ ...restaurant, retryResult: result });
          
          // Salva nei successi
          await this.storageManager.saveRestaurant(restaurant, result);
          
        } catch (error) {
          stillFailed.push({
            ...restaurant,
            lastRetryAt: new Date().toISOString(),
            retryError: error.message,
            retryCount: (restaurant.retryCount || 0) + 1
          });
          console.error(`❌ Retry fallito per: ${restaurant.name}`, error.message);
        }
      }
      
      // Aggiorna storage con i fallimenti rimanenti
      await chrome.storage.local.set({ failedRestaurants: stillFailed });
      
      
      
      return {
        succeeded: succeeded.length,
        failed: stillFailed.length
      };
    } catch (error) {
      console.error('❌ Errore durante retry automatico:', error);
      throw error;
    }
  }
}

// ==========================================
// 6. INIZIALIZZAZIONE GLOBALE (CORRETTA)
// ==========================================
const configManager = new ConfigManager();
const firebaseService = new FirebaseService(configManager);
const retryManager = new RetryManager(firebaseService, StorageManager);

// ==========================================
// 7. GESTORI PRINCIPALI
// ==========================================
async function handleAddRestaurant(restaurantData) {
  try {
    
    
    // Aggiunge il ristorante a Firebase
    const result = await firebaseService.addRestaurant(restaurantData);
    
    // Salva backup locale
    await StorageManager.saveRestaurant(restaurantData, result);
    
    
    return result;
    
  } catch (error) {
    console.error('❌ Errore aggiunta ristorante:', error);
    
    // Salva per retry
    await StorageManager.saveFailedRestaurant(restaurantData, error.message);
    throw error;
  }
}

async function handleTestFirebase() {
  try {
    
    const result = await firebaseService.testConnection();
    
    return result;
  } catch (error) {
    console.error('❌ Errore test Firebase:', error);
    throw error;
  }
}

// ==========================================
// 8. MESSAGE LISTENER (CORRETTO)
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  

  // Validazione base del messaggio
  if (!request || !request.action) {
    sendResponse({ success: false, error: 'Messaggio invalido' });
    return false;
  }

  switch (request.action) {
    case 'checkConfig':
      configManager.isConfigured()
        .then(configured => sendResponse({ success: true, configured }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'configure':
      if (!request.secretKey) {
        sendResponse({ success: false, error: 'Secret key richiesta' });
        return false;
      }
      
      configManager.getConfigFromServer(request.secretKey)
        .then(config => sendResponse({ success: true, config }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'addToFirebase':
      if (!request.data) {
        sendResponse({ success: false, error: 'Dati ristorante mancanti' });
        return false;
      }

      configManager.isConfigured()
        .then(configured => {
          if (!configured) {
            throw new Error('Estensione non configurata');
          }
          return handleAddRestaurant(request.data);
        })
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'testFirebase':
      handleTestFirebase()
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'getStats':
      StorageManager.getStats()
        .then(stats => sendResponse({ success: true, stats }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'retryFailed':
      retryManager.retryFailedRestaurants()
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'startAutoRetry':
      autoRetryManager.startAutoRetry()
        .then(() => sendResponse({ success: true, message: 'Auto-retry avviato' }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'stopAutoRetry':
      autoRetryManager.stop();
      sendResponse({ success: true, message: 'Auto-retry fermato' });
      return false;

    case 'getConfig':
      configManager.getConfig()
        .then(config => sendResponse({ 
          success: true, 
          config: {
            projectId: config.projectId,
            environment: 'chrome_extension',
            version: '1.0.0'
          }
        }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    default:
      sendResponse({ success: false, error: 'Azione non riconosciuta' });
      return false;
  }
});

// ==========================================
// 9. GESTORI EVENTI CHROME
// ==========================================
chrome.runtime.onInstalled.addListener(async (details) => {
  
  
  if (details.reason === 'install') {
    try {
      const isConfigured = await configManager.isConfigured();
      if (!isConfigured) {
        chrome.tabs.create({
          url: chrome.runtime.getURL('popup.html')
        });
      }
    } catch (error) {
      console.error('❌ Errore durante onInstalled:', error);
    }
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  
  
  try {
    if (tab.url && (tab.url.includes('tripadvisor.com') || tab.url.includes('tripadvisor.it'))) {
      
      
      if (tab.url.includes('Restaurant_Review')) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-script.js']
        });
        
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['extension-styles.css']
        });
        
        
      } else {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            alert('🍽️ TripTaste Extension\n\nQuesta extension funziona solo sulle pagine dei ristoranti di TripAdvisor.\n\nVai su una pagina di un ristorante e riprova!');
          }
        });
      }
    } else {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          alert('🍽️ TripTaste Extension\n\nQuesta extension funziona solo su TripAdvisor.\n\nVai su www.tripadvisor.com o www.tripadvisor.it e cerca un ristorante!');
        }
      });
    }
  } catch (error) {
    console.error('❌ Errore durante l\'iniezione:', error);
    try {
      await chrome.action.openPopup();
    } catch (popupError) {
      console.error('❌ Errore apertura popup:', popupError);
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('tripadvisor') && tab.url.includes('Restaurant_Review')) {
      
      
      chrome.action.setBadgeText({
        tabId: tabId,
        text: '🍽️'
      });
      
      chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: '#FF6B35'
      });
    } else {
      chrome.action.setBadgeText({
        tabId: tabId,
        text: ''
      });
    }
  }
});

// ==========================================
// 10. GESTIONE RETRY AUTOMATICO (CORRETTA)
// ==========================================

// Classe per gestire retry con fallback per Service Workers
class AutoRetryManager {
  constructor(retryManager) {
    this.retryManager = retryManager;
    this.isRunning = false;
  }

  async startAutoRetry() {
    if (this.isRunning) return;
    
    try {
      // Prova prima con chrome.alarms se disponibile
      if (typeof chrome !== 'undefined' && chrome.alarms) {
        
        
        chrome.alarms.onAlarm.addListener(async (alarm) => {
          if (alarm.name === 'retryFailed') {
            await this.executeRetry();
          }
        });
        
        chrome.alarms.create('retryFailed', { 
          delayInMinutes: 1,
          periodInMinutes: 60
        });
        
        this.isRunning = true;
        return;
      }
    } catch (error) {
      console.warn('⚠️ Chrome Alarms non disponibile:', error.message);
    }
    
    // Fallback: usa setTimeout con reinitializzazione
    console.log('⏰ Usando setTimeout per retry automatico (fallback)');
    this.scheduleRetryWithTimeout();
  }

  scheduleRetryWithTimeout() {
    // Primo retry dopo 2 minuti
    setTimeout(() => {
      this.executeRetry();
      
      // Poi ogni ora (se il Service Worker è ancora attivo)
      const intervalId = setInterval(() => {
        this.executeRetry();
      }, 60 * 60 * 1000); // 1 ora
      
      // Salva l'interval per cleanup
      this.currentInterval = intervalId;
    }, 2 * 60 * 1000); // 2 minuti
    
    this.isRunning = true;
  }

  async executeRetry() {
    if (!this.retryManager) return;
    
    try {
      
      const result = await this.retryManager.retryFailedRestaurants();
      
    } catch (error) {
      console.error('❌ Errore retry automatico:', error);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }
    
    try {
      if (typeof chrome !== 'undefined' && chrome.alarms) {
        chrome.alarms.clear('retryFailed');
      }
    } catch (error) {
      console.warn('⚠️ Errore clearing alarms:', error);
    }
  }
}

const autoRetryManager = new AutoRetryManager(retryManager);

// ==========================================
// 11. INIZIALIZZAZIONE FINALE (CORRETTA)
// ==========================================
async function initializeExtension() {
  try {
    
    
    // Verifica configurazione
    const isConfigured = await configManager.isConfigured();
    if (isConfigured) {
      
      
      // Avvia retry automatico
      await autoRetryManager.startAutoRetry();
      
      // Test connessione iniziale (dopo un breve delay)
      setTimeout(async () => {
        try {
          const testResult = await handleTestFirebase();
          
        } catch (error) {
          console.error('❌ Test automatico fallito:', error);
        }
      }, 5000);
      
    } else {
      
    }
    
    
    
  } catch (error) {
    console.error('❌ Errore inizializzazione extension:', error);
  }
}

// Avvia inizializzazione
initializeExtension();