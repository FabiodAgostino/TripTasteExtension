// popup.js - VERSIONE MODIFICATA con configurazione integrata

// Gestione stato dell'applicazione
class PopupManager {
  constructor() {
    this.currentTab = null;
    this.extractedData = null;
    this.isOnTripAdvisor = false;
    this.isConfigured = false; // NUOVO: stato configurazione
    this.settings = {
      autoExtract: true,
      showNotifications: true
    };
    
    this.initialize();
  }

  // MODIFICATO: Inizializzazione dell'app con controllo configurazione
  async initialize() {
    try {
      // NUOVO: Prima controlla se è configurato
      await this.checkConfiguration();
      
      if (!this.isConfigured) {
        // Mostra schermata configurazione
        this.showConfigSection();
        this.setupConfigEventListeners();
        return;
      }
      
      // Procedi con inizializzazione normale solo se configurato
      this.showMainInterface();
      
      // Carica impostazioni salvate
      await this.loadSettings();
      
      // Controlla la tab corrente
      await this.checkCurrentTab();
      
      // Inizializza gli event listeners
      this.setupEventListeners();
      
      // Carica le statistiche
      await this.loadStatistics();
      
      // Carica l'attività recente
      await this.loadRecentActivity();
      
      // Test connessione Firebase
      await this.testFirebaseConnection();
      
    } catch (error) {
      console.error('❌ Errore inizializzazione popup:', error);
      this.showToast('Errore durante l\'inizializzazione', 'error');
    }
  }

  // NUOVO: Controlla se l'estensione è configurata
  async checkConfiguration() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkConfig' });
      this.isConfigured = response.configured;
      
    } catch (error) {
      console.error('❌ Errore controllo configurazione:', error);
      this.isConfigured = false;
    }
  }

  // NUOVO: Mostra sezione configurazione
  showConfigSection() {
    document.getElementById('config-section').style.display = 'block';
    document.getElementById('main-content').style.display = 'none';
  }

  // NUOVO: Mostra interfaccia principale
  showMainInterface() {
    document.getElementById('config-section').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
  }

  // NUOVO: Setup event listeners per configurazione
  setupConfigEventListeners() {
    const configureBtn = document.getElementById('configure-btn');
    const secretInput = document.getElementById('secret-input');
    
    if (configureBtn) {
      configureBtn.addEventListener('click', () => this.handleConfiguration());
    }
    
    if (secretInput) {
      secretInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleConfiguration();
        }
      });
    }
  }

  // NUOVO: Gestisce la configurazione
  async handleConfiguration() {
    const secretKey = document.getElementById('secret-input').value.trim();
    
    if (!secretKey) {
      this.showConfigStatus('❌ Inserisci la secret key', 'error');
      return;
    }
    
    this.showConfigStatus('🔄 Configurazione in corso...', 'info');
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'configure', 
        secretKey: secretKey 
      });
      
      if (response.success) {
        this.showConfigStatus('✅ Configurazione completata!', 'success');
        this.isConfigured = true;
        
        // Aspetta un po' e poi mostra l'interfaccia principale
        setTimeout(async () => {
          this.showMainInterface();
          // Inizializza tutto il resto
          await this.loadSettings();
          await this.checkCurrentTab();
          this.setupEventListeners();
          await this.loadStatistics();
          await this.loadRecentActivity();
          await this.testFirebaseConnection();
        }, 1500);
        
      } else {
        this.showConfigStatus(`❌ ${response.error}`, 'error');
      }
    } catch (error) {
      this.showConfigStatus(`❌ Errore: ${error.message}`, 'error');
    }
  }

  // NUOVO: Mostra status configurazione
  showConfigStatus(message, type) {
    const statusDiv = document.getElementById('config-status');
    statusDiv.innerHTML = message;
    statusDiv.className = type;
  }

  // RESTO DEL CODICE ESISTENTE rimane uguale...

  // Controlla su quale tab siamo
  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      
      // Controlla se siamo su TripAdvisor
      const isTripAdvisor = tab.url && (
        tab.url.includes('tripadvisor.com') || 
        tab.url.includes('tripadvisor.it')
      );
      
      const isRestaurantPage = tab.url && tab.url.includes('Restaurant_Review');
      
      this.isOnTripAdvisor = isTripAdvisor && isRestaurantPage;
      
      // Aggiorna UI
      this.updatePageStatus(this.isOnTripAdvisor);
      this.updateSections();
      
      // Se siamo su TripAdvisor e auto-extract è attivo, estrai subito
      if (this.isOnTripAdvisor && this.settings.autoExtract) {
        setTimeout(() => this.extractData(), 1000);
      }
      
    } catch (error) {
      console.error('❌ Errore controllo tab:', error);
      this.updatePageStatus(false);
    }
  }

  // Aggiorna lo stato della pagina nell'UI
  updatePageStatus(isValidPage) {
    const statusIndicator = document.getElementById('page-status');
    const statusText = document.getElementById('page-status-text');
    
    if (statusIndicator && statusText) {
      if (isValidPage) {
        statusIndicator.className = 'status-indicator online';
        statusText.textContent = 'Pagina ristorante TripAdvisor';
      } else {
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'Non su TripAdvisor';
      }
    }
  }

  // Mostra/nasconde sezioni appropriate
  updateSections() {
    const tripAdvisorSection = document.getElementById('tripadvisor-section');
    const nonTripAdvisorSection = document.getElementById('non-tripadvisor-section');
    
    if (tripAdvisorSection && nonTripAdvisorSection) {
      if (this.isOnTripAdvisor) {
        tripAdvisorSection.classList.remove('hidden');
        nonTripAdvisorSection.classList.add('hidden');
      } else {
        tripAdvisorSection.classList.add('hidden');
        nonTripAdvisorSection.classList.remove('hidden');
      }
    }
  }

  // Setup degli event listeners
  setupEventListeners() {
    // Pulsanti principali
    document.getElementById('extract-btn')?.addEventListener('click', () => this.extractData());
    document.getElementById('add-btn')?.addEventListener('click', () => this.addToDatabase());
    document.getElementById('quick-add-btn')?.addEventListener('click', () => this.quickAddToDatabase());
    
    // Pulsanti footer
    document.getElementById('test-firebase-btn')?.addEventListener('click', () => this.testFirebaseConnection());
    document.getElementById('clear-data-btn')?.addEventListener('click', () => this.clearLocalData());
    
    // Impostazioni
    document.getElementById('auto-extract')?.addEventListener('change', (e) => {
      this.settings.autoExtract = e.target.checked;
      this.saveSettings();
    });
    
    document.getElementById('show-notifications')?.addEventListener('change', (e) => {
      this.settings.showNotifications = e.target.checked;
      this.saveSettings();
    });
  }

  // MODIFICATO: Aggiunge controllo configurazione prima delle operazioni Firebase
  async addToDatabase() {
    if (!this.isConfigured) {
      this.showToast('Estensione non configurata', 'error');
      return;
    }

    if (!this.extractedData) {
      this.showToast('Prima estrai i dati del ristorante', 'warning');
      return;
    }

    try {
      this.setButtonState('add-btn', false, 'Aggiungendo...');
      
      // Invia al background script per l'aggiunta a Firebase
      const response = await chrome.runtime.sendMessage({
        action: 'addToFirebase',
        data: this.extractedData
      });
      
      // NUOVO: Controlla se richiede configurazione
      if (response.needsConfig) {
        this.isConfigured = false;
        this.showConfigSection();
        this.setupConfigEventListeners();
        this.showToast('Configurazione richiesta', 'warning');
        return;
      }
      
      if (response.success) {
        this.showToast('Ristorante aggiunto con successo!', 'success');
        
        // Aggiorna statistiche
        await this.saveToLocalStats('added');
        await this.addToRecentActivity('added', this.extractedData.name);
        await this.loadStatistics();
        await this.loadRecentActivity();
        
        // Reset UI
        this.resetExtractionUI();
        
      } else {
        throw new Error(response.error || 'Errore durante l\'aggiunta');
      }
      
    } catch (error) {
      console.error('❌ Errore aggiunta database:', error);
      this.showToast(`Errore aggiunta: ${error.message}`, 'error');
      await this.saveToLocalStats('failed');
    } finally {
      this.setButtonState('add-btn', true, 'Aggiungi a Database');
    }
  }

  // MODIFICATO: Test Firebase con controllo configurazione
  async testFirebaseConnection() {
    if (!this.isConfigured) {
      this.showToast('Estensione non configurata', 'error');
      return;
    }

    const statusIndicator = document.getElementById('firebase-status');
    const statusText = document.getElementById('firebase-status-text');
    
    try {
      if (statusIndicator && statusText) {
        statusIndicator.className = 'status-indicator loading';
        statusText.textContent = 'Testando connessione...';
      }
      
      const response = await chrome.runtime.sendMessage({
        action: 'testFirebase'
      });
      
      if (response.success) {
        if (statusIndicator && statusText) {
          statusIndicator.className = 'status-indicator online';
          statusText.textContent = 'Database connesso';
        }
        this.showToast('Connessione database OK', 'success');
      } else {
        throw new Error(response.error);
      }
      
    } catch (error) {
      console.error('❌ Errore test Firebase:', error);
      if (statusIndicator && statusText) {
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'Database offline';
      }
      this.showToast(`Errore database: ${error.message}`, 'error');
    }
  }

  // RESTO DEI METODI ESISTENTI rimangono identici...
  
  // Estrae i dati dalla pagina TripAdvisor
  async extractData() {
    if (!this.isOnTripAdvisor) {
      this.showToast('Non sei su una pagina ristorante TripAdvisor', 'warning');
      return;
    }

    try {
      // Mostra loading
      this.showExtractionLoading(true);
      this.setButtonState('extract-btn', false);
      
      // Invia messaggio al content script per estrarre i dati
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'extractData'
      });
      
      if (response.success) {
        this.extractedData = response.data;
        this.showExtractedData(response.data);
        this.setButtonState('add-btn', true);
        
        if (this.settings.showNotifications) {
          this.showToast(`Dati estratti per: ${response.data.name}`, 'success');
        }
        
        // Salva nei dati locali
        await this.saveToLocalStats('extracted');
        
      } else {
        throw new Error(response.error || 'Errore sconosciuto durante l\'estrazione');
      }
      
    } catch (error) {
      console.error('❌ Errore estrazione:', error);
      this.showToast(`Errore estrazione: ${error.message}`, 'error');
      this.showExtractionError(error.message);
    } finally {
      this.showExtractionLoading(false);
      this.setButtonState('extract-btn', true);
    }
  }

  // Estrae e aggiunge in un'unica operazione
  async quickAddToDatabase() {
    try {
      await this.extractData();
      
      // Aspetta un momento per permettere all'UI di aggiornarsi
      setTimeout(async () => {
        if (this.extractedData) {
          await this.addToDatabase();
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Errore quick add:', error);
      this.showToast(`Errore operazione rapida: ${error.message}`, 'error');
    }
  }

  // Mostra i dati estratti nell'UI
  showExtractedData(data) {
    const preview = document.getElementById('restaurant-preview');
    
    if (preview) {
      preview.innerHTML = `
        <div class="restaurant-data">
          <div class="restaurant-name">${data.name}</div>
          <div class="restaurant-details">
            <div class="detail-item">
              <span class="detail-icon">⭐</span>
              <span>${data.rating}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">💰</span>
              <span>${data.priceRange}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">🍝</span>
              <span>${data.cuisines.join(', ')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-icon">📍</span>
              <span>${data.location}</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Mostra loading durante l'estrazione
  showExtractionLoading(show) {
    const preview = document.getElementById('restaurant-preview');
    
    if (preview) {
      if (show) {
        preview.innerHTML = `
          <div class="preview-loading">
            <div class="spinner"></div>
            <span>Estrazione dati in corso...</span>
          </div>
        `;
      }
    }
  }

  // Mostra errore estrazione
  showExtractionError(error) {
    const preview = document.getElementById('restaurant-preview');
    
    if (preview) {
      preview.innerHTML = `
        <div class="preview-loading">
          <span style="color: #dc3545;">❌ Errore: ${error}</span>
        </div>
      `;
    }
  }

  // Reset dell'UI dopo aggiunta
  resetExtractionUI() {
    this.extractedData = null;
    this.setButtonState('add-btn', false);
    
    const preview = document.getElementById('restaurant-preview');
    if (preview) {
      preview.innerHTML = `
        <div class="preview-loading">
          <span style="color: #28a745;">✅ Ristorante aggiunto con successo!</span>
        </div>
      `;
      
      // Reset dopo 3 secondi
      setTimeout(() => {
        preview.innerHTML = `
          <div class="preview-loading">
            <div class="spinner"></div>
            <span>Pronto per l'estrazione...</span>
          </div>
        `;
      }, 3000);
    }
  }

  // Gestione stato pulsanti
  setButtonState(buttonId, enabled, text = null) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = !enabled;
      if (text) {
        // Mantieni l'icona e cambia solo il testo
        const icon = button.querySelector('.btn-icon');
        const iconHTML = icon ? icon.outerHTML : '';
        button.innerHTML = iconHTML + text;
      }
    }
  }

  // Carica statistiche
  async loadStatistics() {
    try {
      const stats = await chrome.storage.local.get(['stats']);
      const data = stats.stats || { extracted: 0, added: 0, failed: 0 };
      
      const scrapedCountEl = document.getElementById('scraped-count');
      const addedCountEl = document.getElementById('added-count');
      const failedCountEl = document.getElementById('failed-count');
      
      if (scrapedCountEl) scrapedCountEl.textContent = data.extracted;
      if (addedCountEl) addedCountEl.textContent = data.added;
      if (failedCountEl) failedCountEl.textContent = data.failed;
      
    } catch (error) {
      console.error('❌ Errore caricamento statistiche:', error);
    }
  }

  // AGGIUNGI questi metodi se mancano nel tuo codice originale:

  showToast(message, type) {
    // Implementa notifiche toast se non esistono già
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  async loadSettings() {
    // Implementa caricamento impostazioni se non esiste già
    try {
      const stored = await chrome.storage.local.get(['settings']);
      if (stored.settings) {
        this.settings = { ...this.settings, ...stored.settings };
      }
    } catch (error) {
      console.error('❌ Errore caricamento impostazioni:', error);
    }
  }

  async saveSettings() {
    // Implementa salvataggio impostazioni se non esiste già
    try {
      await chrome.storage.local.set({ settings: this.settings });
    } catch (error) {
      console.error('❌ Errore salvataggio impostazioni:', error);
    }
  }

  async loadRecentActivity() {
    // Implementa se non esiste già
    
  }

  async saveToLocalStats(action) {
    // Implementa se non esiste già
    try {
      const stats = await chrome.storage.local.get(['stats']);
      const data = stats.stats || { extracted: 0, added: 0, failed: 0 };
      data[action] = (data[action] || 0) + 1;
      await chrome.storage.local.set({ stats: data });
    } catch (error) {
      console.error('❌ Errore salvataggio stats:', error);
    }
  }

  async addToRecentActivity(action, name) {
    // Implementa se non esiste già
    
  }
}

// Inizializza l'app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
  
  new PopupManager();
});