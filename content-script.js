// content-script.js - VERSIONE CORRETTA con Firebase funzionante


// Classe principale per l'estrazione dati - ALGORITMI IDENTICI
class TripAdvisorScraper {
  constructor() {
    this.currentUrl = window.location.href;
    this.extractedData = null;
    this.warnings = []; // Array per raccogliere i warning
  }

  // Metodo principale di estrazione
  extractRestaurantData() {
    
    
    try {
      this.warnings = []; // Reset warnings
      
      const data = {
        name: this.extractName(),
        rating: this.extractRating(),
        priceRange: this.extractPriceRange(),
        cuisine: '', // Sarà impostato dopo l'estrazione delle cucine
        cuisines: this.extractCuisines(),
        description: this.extractDescription(),
        address: this.extractAddress(),
        location: this.extractLocation(),
        latitude: this.extractCoordinates().latitude,
        longitude: this.extractCoordinates().longitude,
        phone: this.extractPhone(),
        // CONTINUAZIONE content-script.js - PARTE 2

        imageUrl: this.extractImageUrl(),
        extractedAt: new Date().toISOString(),
        sourceUrl: this.currentUrl
      };

      // Imposta cuisine come primo elemento di cuisines (come nell'API)
      data.cuisine = data.cuisines[0] || 'italiana';

      // Validazione dati base
      if (!data.name) {
        throw new Error('Nome ristorante non trovato');
      }

      // Mostra warnings se ci sono valori mancanti
      if (this.warnings.length > 0) {
        this.showWarnings();
      }

      this.extractedData = data;
      
      return data;

    } catch (error) {
      console.error('❌ Errore durante l\'estrazione:', error);
      throw error;
    }
  }

  // Mostra warnings per valori non trovati
  showWarnings() {
    const warningMessage = '⚠️ Alcuni valori non sono stati trovati:\n\n' + this.warnings.join('\n');
    alert(warningMessage);
  }

  // Estrazione nome - SENZA fallback
  extractName() {
    const selectors = [
      '.biGQs._P.hzzSG.rRtyp',
      'h1[data-automation="restaurant-detail-name"]',
      'h1.ui_header',
      '.HjBfq',
      'h1'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text && text.length > 2 && !text.toLowerCase().includes('tripadvisor')) {
          
          return text;
        }
      }
    }
    
    // NESSUN FALLBACK - solo warning
    this.warnings.push('• Nome del ristorante non trovato');
    
    return undefined;
  }

  // Estrazione rating - SENZA fallback
  extractRating() {
    const selectors = [
      '.biGQs._P.pZUbB.KxBGd',
      '[data-automation="rating"]',
      '.ZDEqb',
      '.overallRating'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        const ratingMatch = text.match(/(\d+[.,]\d+|\d+)/);
        if (ratingMatch) {
          const rating = ratingMatch[1].replace(',', '.');
          
          return rating;
        }
      }
    }
    
    // NESSUN FALLBACK - solo warning
    this.warnings.push('• Rating non trovato');
    
    return undefined;
  }

  // Estrazione fascia prezzo - SENZA fallback
  extractPriceRange() {
    // SELETTORE SPECIFICO dal tuo HTML: cerca nel container delle cucine
    const cuisineContainer = document.querySelector('.HUMGB.cPbcf');
    if (cuisineContainer) {
      // Cerca tutti i link nel container cucine/prezzo
      const priceLinks = cuisineContainer.querySelectorAll('a .biGQs._P.pZUbB.KxBGd');
      
      for (const elem of priceLinks) {
        const text = elem.textContent.trim();
        
        // Cerca solo elementi che contengono €
        if (text.includes('€€€€')) {
          console.log(`💰 Fascia prezzo trovata: €€€€ (da "${text}")`);
          return "€€€€";
        } else if (text.includes('€€€')) {
          console.log(`💰 Fascia prezzo trovata: €€€ (da "${text}")`);
          return "€€€";
        } else if (text.includes('€€')) {
          console.log(`💰 Fascia prezzo trovata: €€ (da "${text}")`);
          return "€€";
        } else if (text.includes('€') && !text.includes('€€')) {
          console.log(`💰 Fascia prezzo trovata: € (da "${text}")`);
          return "€";
        }
      }
    }
    
    // Fallback con selettori originali
    const priceSelectors = [
      '.biGQs._P.pZUbB.KxBGd',
      '.dlMOJ',
      '[data-automation="price-range"]'
    ];
    
    for (const selector of priceSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const elem of elements) {
        const text = elem.textContent.trim();
        if (text.includes('€€€€')) {
          console.log(`💰 Fascia prezzo trovata (fallback): €€€€`);
          return "€€€€";
        } else if (text.includes('€€€')) {
          console.log(`💰 Fascia prezzo trovata (fallback): €€€`);
          return "€€€";
        } else if (text.includes('€€')) {
          console.log(`💰 Fascia prezzo trovata (fallback): €€`);
          return "€€";
        } else if (text.includes('€') && !text.includes('€€')) {
          console.log(`💰 Fascia prezzo trovata (fallback): €`);
          return "€";
        }
      }
    }
    
    // NESSUN FALLBACK - solo warning
    this.warnings.push('• Fascia di prezzo non trovata');
    
    return undefined;
  }

  // Estrazione cucine - SENZA fallback
  extractCuisines() {
    const cuisines = [];
    const cuisineMapping = {
      'pugliese': ['pugliese', 'apulian', 'puglia', 'salentina', 'salento'],
      'italiana': ['italiana', 'italian', 'italy'],
      'mediterranea': ['mediterranea', 'mediterranean'],
      'pesce': ['pesce', 'seafood', 'fish', 'mare', 'frutti di mare'],
      'barbecue': ['barbecue', 'grill', 'griglia', 'bbq', 'braceria'],
      'steakhouse': ['steakhouse', 'steak', 'bistecca', 'carne']
    };

    // SELETTORE SPECIFICO dal tuo HTML: <span class="HUMGB cPbcf">
    const cuisineContainer = document.querySelector('.HUMGB.cPbcf');
    if (cuisineContainer) {
      // Cerca tutti i link con cucine dentro il container
      const cuisineLinks = cuisineContainer.querySelectorAll('a .biGQs._P.pZUbB.KxBGd');
      
      cuisineLinks.forEach(elem => {
        const text = elem.textContent.trim().toLowerCase();
        
        // SALTA se è il prezzo (contiene €)
        if (text.includes('€')) {
          
          return;
        }
        
        Object.entries(cuisineMapping).forEach(([cuisineType, keywords]) => {
          if (keywords.some(keyword => text.includes(keyword))) {
            if (!cuisines.includes(cuisineType)) {
              cuisines.push(cuisineType);
              console.log(`🍝 Cucina trovata: ${cuisineType} (da "${text}")`);
            }
          }
        });
      });
    }

    // Fallback con selettori originali se non trova nulla
    if (cuisines.length === 0) {
      const searchAreas = [
        '.biGQs._P.pZUbB.KxBGd',
        '[data-test-target="restaurant-detail-overview"] span',
        '.breadcrumbs span, .breadcrumbs a',
        '.cuisine-type'
      ];

      searchAreas.forEach(area => {
        const elements = document.querySelectorAll(area);
        elements.forEach(elem => {
          const text = elem.textContent.trim().toLowerCase();
          
          // Salta anche qui gli elementi con €
          if (text.includes('€')) {
            return;
          }
          
          Object.entries(cuisineMapping).forEach(([cuisineType, keywords]) => {
            if (keywords.some(keyword => text.includes(keyword))) {
              if (!cuisines.includes(cuisineType)) {
                cuisines.push(cuisineType);
                console.log(`🍝 Cucina trovata (fallback): ${cuisineType} (da "${text.substring(0, 30)}...")`);
              }
            }
          });
        });
      });
    }

    if (cuisines.length === 0) {
      // NESSUN FALLBACK - solo warning
      this.warnings.push('• Tipi di cucina non trovati');
      
      return [];
    }

    console.log(`🍽️ Cucine finali: [${cuisines.join(', ')}]`);
    return cuisines;
  }

  // Estrazione descrizione - SENZA fallback
  extractDescription() {
    const selectors = [
      '.biGQs._P.pZUbB.avBIb.KxBGd',
      '.biGQs._P.pZUbB.hmDzD',
      '[data-automation="restaurant-detail-description"]',
      '.restaurants-detail-overview-cards-LocationOverviewCard__section--description'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text && text.length > 20) {
          console.log(`📝 Descrizione estratta: "${text.substring(0, 50)}..."`);
          return text;
        }
      }
    }
    
    // NESSUN FALLBACK - solo warning
    this.warnings.push('• Descrizione non trovata');
    
    return undefined;
  }

  // Estrazione indirizzo - SENZA fallback
  extractAddress() {
    const selectors = [
      '.biGQs._P.fiohW.fOtGX',
      '.AYHFM',
      '[data-automation="restaurant-detail-address"]',
      '.restaurants-detail-overview-cards-LocationOverviewCard__address'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text && text.length > 5) {
          
          return text;
        }
      }
    }
    
    // NESSUN FALLBACK - solo warning
    this.warnings.push('• Indirizzo non trovato');
    
    return undefined;
  }

  // Estrazione coordinate - CON fallback coordinate del Salento ma WARNING
  extractCoordinates() {
    let latitude = "40.3515";
    let longitude = "18.1750";
    let location = "Salento";
    let found = false;

    // Cerca nei link di Google Maps
    const mapLinks = document.querySelectorAll('a[href*="maps.google"], a[href*="goo.gl/maps"]');
    mapLinks.forEach(elem => {
      const href = elem.getAttribute('href');
      if (href) {
        const coordMatch = href.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (coordMatch) {
          latitude = coordMatch[1];
          longitude = coordMatch[2];
          found = true;
          
        }
        
        const addressMatch = href.match(/daddr=([^@&]+)/);
        if (addressMatch) {
          const addressParts = decodeURIComponent(addressMatch[1]).split(',');
          if (addressParts.length > 1) {
            location = addressParts[addressParts.length - 2].trim();
          }
        }
      }
    });

    if (!found) {
      this.warnings.push('• Coordinate geografiche non trovate (usando coordinate del Salento)');
      
    }

    return { latitude, longitude, location };
  }

  // Estrazione località - SENZA fallback
  extractLocation() {
    const coords = this.extractCoordinates();
    const address = this.extractAddress();
    
    // Se abbiamo trovato una location dalle coordinate, usala
    if (coords.location !== "Salento") {
      
      return coords.location;
    }
    
    // Altrimenti cerca nell'indirizzo
    if (address) {
      const salentoTowns = ['lecce', 'gallipoli', 'otranto', 'maglie', 'nardò', 'galatina', 'brindisi', 'taranto'];
      const addressLower = address.toLowerCase();
      
      for (const town of salentoTowns) {
        if (addressLower.includes(town)) {
          
          return town.charAt(0).toUpperCase() + town.slice(1);
        }
      }
    }
    
    // NESSUN FALLBACK - solo warning
    this.warnings.push('• Località specifica non trovata (usando Salento generico)');
    
    return 'Salento';
  }

  // Estrazione telefono - SENZA fallback
  extractPhone() {
    // SELETTORE SPECIFICO dal tuo HTML: <a href="tel:+39 376 184 6939">
    const phoneLink = document.querySelector('a[href^="tel:"]');
    if (phoneLink) {
      // Cerca il numero nel span: <span class="biGQs _P XWJSj Wb">+39 376 184 6939</span>
      const phoneSpan = phoneLink.querySelector('.biGQs._P.XWJSj.Wb');
      if (phoneSpan) {
        const phoneText = phoneSpan.textContent.trim();
        
        return phoneText;
      }
      
      // Fallback: estrai dal href
      const href = phoneLink.getAttribute('href');
      if (href) {
        const phone = href.replace('tel:', '').trim();
        
        return phone;
      }
    }

    // Fallback originale
    const phoneSelectors = [
      '.biGQs._P.pZUbB.KxBGd',
      '[data-automation="restaurant-phone"]',
      '.phone-number'
    ];
    
    for (const selector of phoneSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const elem of elements) {
        const text = elem.textContent.trim();
        const phoneMatch = text.match(/(\+39\s?)?(\d{2,4}\s?\d{6,8}|\d{3}\s?\d{3}\s?\d{4})/);
        if (phoneMatch) {
          console.log(`📞 Telefono estratto (fallback): ${phoneMatch[0]}`);
          return phoneMatch[0];
        }
      }
    }
    
    // NESSUN FALLBACK - solo warning
    this.warnings.push('• Numero di telefono non trovato');
    
    return undefined;
  }

  // Estrazione immagine - SENZA fallback
  extractImageUrl() {
    const imageSelectors = [
      'picture img[src*="tripadvisor.com/media/photo"]',
      'img[src*="tripadvisor.com/media/photo"]',
      '.photo img'
    ];
    
    for (const selector of imageSelectors) {
      const img = document.querySelector(selector);
      if (img) {
        const src = img.getAttribute('src');
        const srcset = img.getAttribute('srcset');
        
        // ESCLUDI avatar di default
        if (src && src.includes('default-avatar')) {
          
          continue;
        }
        
        if (srcset && srcset.includes('tripadvisor.com/media/photo')) {
          // ESCLUDI avatar anche nel srcset
          if (srcset.includes('default-avatar')) {
            
            continue;
          }
          
          const srcsetUrls = srcset.split(',').map(item => item.trim().split(' ')[0]);
          const bestUrl = srcsetUrls[srcsetUrls.length - 1];
          console.log(`🎯 Immagine estratta da srcset (${selector}): ${bestUrl}`);
          return bestUrl;
        } else if (src && src.includes('tripadvisor.com/media/photo')) {
          console.log(`🖼️ Immagine estratta da src (${selector}): ${src}`);
          return src;
        }
      }
    }
    
    // Cerca tutte le immagini e filtra meglio
    const allImages = document.querySelectorAll('img[src*="tripadvisor.com/media/photo"]');
    for (const img of allImages) {
      const src = img.getAttribute('src');
      if (src && src.includes('photo-o') && !src.includes('default-avatar')) {
        console.log(`🖼️ Immagine trovata (scan completo): ${src}`);
        return src;
      }
    }
    
    // NESSUN FALLBACK - solo warning
    this.warnings.push('• Immagine del ristorante non trovata');
    
    return undefined;
  }
}

// Funzione per controllare se siamo su una pagina ristorante valida
function isRestaurantPage() {
  return window.location.href.includes('Restaurant_Review') &&
         (window.location.href.includes('tripadvisor.com') || 
          window.location.href.includes('tripadvisor.it'));
}

// Inizializzazione dello scraper
let scraper = null;

if (isRestaurantPage()) {
  
  // Attendi che la pagina sia completamente caricata
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeScraper);
  } else {
    initializeScraper();
  }
} else {
  
}

function initializeScraper() {
  scraper = new TripAdvisorScraper();
  
  // Mostra l'interfaccia di scraping
  showScrapingInterface();
  
  // Listener per messaggi dal popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractData') {
      try {
        const data = scraper.extractRestaurantData();
        sendResponse({ success: true, data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
    return true; // Mantiene il canale aperto per la risposta asincrona
  });
}

// Mostra interfaccia di scraping nella pagina
function showScrapingInterface() {
  // Evita duplicati
  if (document.getElementById('salento-scraper-button')) {
    return;
  }
  
  // Crea un pulsante floating per il quick scraping
  const scrapingButton = document.createElement('div');
  scrapingButton.id = 'salento-scraper-button';
  scrapingButton.innerHTML = `
    <div class="salento-scraper-btn">
      🍽️ Aggiungi a TripTaste
    </div>
  `;
  
  document.body.appendChild(scrapingButton);
  
  // Event listener per il pulsante
  scrapingButton.addEventListener('click', () => {
    quickScrapeAndAdd();
  });
}

// Funzione per scraping rapido e aggiunta
async function quickScrapeAndAdd() {
  try {
    
    
    // Mostra overlay di caricamento
    showLoadingOverlay();
    
    const data = scraper.extractRestaurantData();
    
    // Nascondi overlay di caricamento
    hideLoadingOverlay();
    
    // Mostra modale con dati estratti invece di inviare direttamente
    showDataModal(data);
    
  } catch (error) {
    console.error('❌ Errore scraping rapido:', error);
    hideLoadingOverlay();
    showErrorNotification(`Errore durante l'estrazione: ${error.message}`);
  }
}

// CONTINUAZIONE content-script.js - PARTE 3: MODALE E FIREBASE

// Mostra modale con dati estratti per revisione e completamento
function showDataModal(extractedData) {
  // Rimuovi modale esistente se presente
  const existingModal = document.getElementById('trippaste-data-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'trippaste-data-modal';
  modal.className = 'trippaste-modal-overlay';
  
  modal.innerHTML = `
    <div class="trippaste-modal-container">
      <div class="trippaste-modal-header">
        <h2>🍽️ Dati Estratti da TripAdvisor</h2>
        <button class="trippaste-modal-close" type="button">&times;</button>
      </div>
      
      <div class="trippaste-modal-content">
        <!-- Dati Estratti -->
        <div class="trippaste-extracted-section">
          <h3>📋 Informazioni Estratte</h3>
          <div class="trippaste-extracted-data">
            <div class="trippaste-data-grid">
              <div class="trippaste-data-item">
                <strong>Nome:</strong> ${extractedData.name || 'Non trovato'}
              </div>
              <div class="trippaste-data-item">
                <strong>Rating:</strong> ${extractedData.rating || 'Non trovato'}
              </div>
              <div class="trippaste-data-item">
                <strong>Prezzo:</strong> ${extractedData.priceRange || 'Non trovato'}
              </div>
              <div class="trippaste-data-item">
                <strong>Cucine:</strong> ${extractedData.cuisines ? extractedData.cuisines.join(', ') : 'Non trovate'}
              </div>
              <div class="trippaste-data-item">
                <strong>Località:</strong> ${extractedData.location || 'Non trovata'}
              </div>
              <div class="trippaste-data-item">
                <strong>Telefono:</strong> ${extractedData.phone || 'Non trovato'}
              </div>
            </div>
            ${extractedData.description ? `
              <div class="trippaste-description">
                <strong>Descrizione:</strong> ${extractedData.description}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Form Dati Aggiuntivi -->
        <form id="trippaste-additional-form" class="trippaste-form">
          <h3>✨ Informazioni Aggiuntive (Opzionale)</h3>
          
          <div class="trippaste-form-grid">
            <!-- Modifica dati estratti -->
            <div class="trippaste-form-group">
              <label for="modal-name">Nome Ristorante *</label>
              <input type="text" id="modal-name" value="${extractedData.name || ''}" required>
            </div>
            
            <div class="trippaste-form-group">
              <label for="modal-rating">Rating *</label>
              <input type="number" id="modal-rating" min="1" max="5" step="0.1" value="${extractedData.rating || ''}" required>
            </div>
            
            <div class="trippaste-form-group">
              <label for="modal-price">Fascia Prezzo *</label>
              <select id="modal-price" required>
                <option value="">Seleziona...</option>
                <option value="€" ${extractedData.priceRange === '€' ? 'selected' : ''}>€ - Budget</option>
                <option value="€€" ${extractedData.priceRange === '€€' ? 'selected' : ''}>€€ - Moderato</option>
                <option value="€€€" ${extractedData.priceRange === '€€€' ? 'selected' : ''}>€€€ - Costoso</option>
                <option value="€€€€" ${extractedData.priceRange === '€€€€' ? 'selected' : ''}>€€€€ - Fine Dining</option>
              </select>
            </div>
            
            <div class="trippaste-form-group">
              <label for="modal-location">Località *</label>
              <input type="text" id="modal-location" value="${extractedData.location || 'Salento'}" required>
            </div>
            
            <div class="trippaste-form-group">
              <label for="modal-phone">Telefono</label>
              <input type="text" id="modal-phone" value="${extractedData.phone || ''}" placeholder="+39 0832 123456">
            </div>
            
            <div class="trippaste-form-group">
              <label for="modal-address">Indirizzo</label>
              <input type="text" id="modal-address" value="${extractedData.address || ''}" placeholder="Via Roma 123, Lecce">
            </div>
          </div>
          
          <!-- Cucine -->
          <div class="trippaste-form-group trippaste-cuisines-group">
            <label>Tipi di Cucina *</label>
            <div class="trippaste-cuisines-container">
              <div class="trippaste-cuisines-selected" id="modal-cuisines-selected">
                ${extractedData.cuisines ? extractedData.cuisines.map(cuisine => 
                  `<span class="trippaste-cuisine-tag">${cuisine} <button type="button" data-cuisine="${cuisine}">&times;</button></span>`
                ).join('') : ''}
              </div>
              <div class="trippaste-cuisines-options" id="modal-cuisines-options">
                ${getCuisineOptions(extractedData.cuisines || [])}
              </div>
            </div>
          </div>
          
          <!-- Descrizione -->
          <div class="trippaste-form-group">
            <label for="modal-description">Descrizione</label>
            <textarea id="modal-description" rows="3" placeholder="Breve descrizione del ristorante">${extractedData.description || ''}</textarea>
          </div>
          
          <!-- Valutazioni Utente -->
          <div class="trippaste-user-ratings">
            <h4>⭐ Le Tue Valutazioni (Opzionale)</h4>
            <div class="trippaste-ratings-grid">
              <div class="trippaste-form-group">
                <label for="modal-location-rating">Rating Posizione (0-5)</label>
                <input type="number" id="modal-location-rating" min="0" max="5" step="0.1" placeholder="4.2">
                <small>Posizione, accessibilità, parcheggio</small>
              </div>
              
              <div class="trippaste-form-group">
                <label for="modal-quality-rating">Qualità/Prezzo (0-5)</label>
                <input type="number" id="modal-quality-rating" min="0" max="5" step="0.1" placeholder="4.0">
                <small>Rapporto qualità vs prezzo</small>
              </div>
              
              <div class="trippaste-form-group">
                <label for="modal-avg-price">Prezzo Medio (€)</label>
                <input type="number" id="modal-avg-price" min="0" max="1000" step="0.5" placeholder="25.00">
                <small>Prezzo medio per persona</small>
              </div>
            </div>
          </div>
        </form>
      </div>
      
      <div class="trippaste-modal-footer">
        <button type="button" class="trippaste-btn trippaste-btn-secondary" id="close-modal-btn">
          Annulla
        </button>
        <button type="button" class="trippaste-btn trippaste-btn-primary" id="submit-modal-btn">
          🍽️ Aggiungi a TripTaste
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // EVENT LISTENERS per la modale
  setupModalEventListeners(modal, extractedData);
  
  // Focus sul primo input
  setTimeout(() => {
    const firstInput = modal.querySelector('input');
    if (firstInput) firstInput.focus();
  }, 100);
}

// Setup degli event listeners per la modale
function setupModalEventListeners(modal, extractedData) {
  // Bottone di chiusura (X)
  const closeBtn = modal.querySelector('.trippaste-modal-close');
  closeBtn.addEventListener('click', closeDataModal);
  
  // Bottone Annulla
  const cancelBtn = modal.querySelector('#close-modal-btn');
  cancelBtn.addEventListener('click', closeDataModal);
  
  // Bottone Submit
  const submitBtn = modal.querySelector('#submit-modal-btn');
  submitBtn.addEventListener('click', submitModalData);
  
  // Click fuori dalla modale per chiudere
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeDataModal();
    }
  });
  
  // Escape key per chiudere
  document.addEventListener('keydown', handleModalKeydown);
  
  // Event listeners per le cucine
  setupCuisineEventListeners();
}

// Gestione tasti per la modale
function handleModalKeydown(e) {
  if (e.key === 'Escape') {
    closeDataModal();
  }
}

// Setup event listeners per le cucine
function setupCuisineEventListeners() {
  // Rimuovi cucina
  document.addEventListener('click', (e) => {
    if (e.target.matches('.trippaste-cuisine-tag button')) {
      const cuisine = e.target.getAttribute('data-cuisine');
      if (cuisine) {
        removeCuisine(cuisine);
      }
    }
  });
  
  // Aggiungi cucina
  document.addEventListener('click', (e) => {
    if (e.target.matches('.trippaste-cuisine-option')) {
      const cuisine = e.target.textContent.trim();
      addCuisine(cuisine);
    }
  });
}

// Genera opzioni cucine disponibili
function getCuisineOptions(selectedCuisines) {
  const allCuisines = [
    'italiana', 'mediterranea', 'pesce', 'pizza', 'pugliese', 'salentina',
    'griglia', 'barbecue', 'steakhouse', 'vegetariana', 'vegana',
    'contemporanea', 'tradizionale', 'frutti di mare', 'carne'
  ];
  
  return allCuisines
    .filter(cuisine => !selectedCuisines.includes(cuisine))
    .map(cuisine => 
      `<button type="button" class="trippaste-cuisine-option">${cuisine}</button>`
    ).join('');
}

// Aggiungi cucina
function addCuisine(cuisine) {
  const selectedContainer = document.getElementById('modal-cuisines-selected');
  const optionsContainer = document.getElementById('modal-cuisines-options');
  
  if (!selectedContainer || !optionsContainer) return;
  
  // Verifica se già presente
  const existing = selectedContainer.querySelector(`[data-cuisine="${cuisine}"]`);
  if (existing) return;
  
  // Aggiungi tag selezionato
  const tagElement = document.createElement('span');
  tagElement.className = 'trippaste-cuisine-tag';
  tagElement.innerHTML = `${cuisine} <button type="button" data-cuisine="${cuisine}">&times;</button>`;
  selectedContainer.appendChild(tagElement);
  
  // Rimuovi opzione
  const optionButton = optionsContainer.querySelector(`button:contains("${cuisine}")`);
  if (optionButton) {
    optionButton.remove();
  } else {
    // Fallback: cerca per testo
    const options = optionsContainer.querySelectorAll('button');
    options.forEach(btn => {
      if (btn.textContent.trim() === cuisine) {
        btn.remove();
      }
    });
  }
}

// Rimuovi cucina
function removeCuisine(cuisine) {
  const selectedContainer = document.getElementById('modal-cuisines-selected');
  const optionsContainer = document.getElementById('modal-cuisines-options');
  
  if (!selectedContainer || !optionsContainer) return;
  
  // Rimuovi tag
  const tagElement = selectedContainer.querySelector(`[data-cuisine="${cuisine}"]`)?.parentElement;
  if (tagElement) {
    tagElement.remove();
  }
  
  // Aggiungi opzione di nuovo se non esiste
  const existing = optionsContainer.querySelector(`button:contains("${cuisine}")`);
  if (!existing) {
    const optionButton = document.createElement('button');
    optionButton.type = 'button';
    optionButton.className = 'trippaste-cuisine-option';
    optionButton.textContent = cuisine;
    optionsContainer.appendChild(optionButton);
  }
}

// Chiudi modale
function closeDataModal() {
  const modal = document.getElementById('trippaste-data-modal');
  if (modal) {
    // Rimuovi event listener per l'escape
    document.removeEventListener('keydown', handleModalKeydown);
    modal.remove();
  }
}

function generateRandomId() {
  const randomNumber = Math.floor(Math.random() * 1999999999) - 999999999;
  return randomNumber;
}

// Invia dati della modale - VERSIONE CORRETTA
async function submitModalData() {
  try {
    
    // Raccogli dati dal form
    const modalData = {
      id: generateRandomId(),
      name: document.getElementById('modal-name')?.value.trim(),
      rating: document.getElementById('modal-rating')?.value,
      priceRange: document.getElementById('modal-price')?.value,
      location: document.getElementById('modal-location')?.value.trim(),
      phone: document.getElementById('modal-phone')?.value.trim() || undefined,
      address: document.getElementById('modal-address')?.value.trim() || undefined,
      description: document.getElementById('modal-description')?.value.trim() || undefined,
      cuisines: Array.from(document.querySelectorAll('#modal-cuisines-selected .trippaste-cuisine-tag'))
        .map(tag => {
          const button = tag.querySelector('button[data-cuisine]');
          return button ? button.getAttribute('data-cuisine') : null;
        })
        .filter(Boolean),
      locationUser: document.getElementById('modal-location-rating')?.value ? 
        parseFloat(document.getElementById('modal-location-rating').value) : undefined,
      qualitàPrezzoUser: document.getElementById('modal-quality-rating')?.value ? 
        parseFloat(document.getElementById('modal-quality-rating').value) : undefined,
      mediaPrezzo: document.getElementById('modal-avg-price')?.value ? 
        parseFloat(document.getElementById('modal-avg-price').value) : undefined,
      extractedAt: new Date().toISOString(),
      sourceUrl: scraper.currentUrl,
      latitude: scraper.extractedData?.latitude,
      longitude: scraper.extractedData?.longitude,
      imageUrl: scraper.extractedData?.imageUrl
    };
    
    
    // Validazione
    if (!modalData.name || !modalData.rating || !modalData.priceRange || !modalData.location) {
      showErrorNotification('Compila tutti i campi obbligatori (Nome, Rating, Prezzo, Località)');
      return;
    }
    
    if (modalData.cuisines.length === 0) {
      showErrorNotification('Seleziona almeno un tipo di cucina');
      return;
    }
    
    // Converti rating a numero
    modalData.rating = parseFloat(modalData.rating);
    if (isNaN(modalData.rating)) {
      showErrorNotification('Rating deve essere un numero valido');
      return;
    }
    
    // Imposta cuisine principale
    modalData.cuisine = modalData.cuisines[0] || 'italiana';
    
    // Mostra loading
    showLoadingOverlay('Aggiunta al database TripTaste...');
    modalData.id
    
    // Invia al background script - CON PROMESSA
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'addToFirebase',
        data: modalData
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
    
    
    
    hideLoadingOverlay();
    closeDataModal();
    
    if (response && response.success) {
      showSuccessNotification('Ristorante aggiunto con successo al database TripTaste!');
    } else {
      showErrorNotification(response?.error || 'Errore durante l\'aggiunta al database');
    }
    
  } catch (error) {
    console.error('❌ Errore invio dati modale:', error);
    hideLoadingOverlay();
    showErrorNotification(`Errore durante l'invio: ${error.message}`);
  }
}

// Mostra overlay di caricamento con messaggio personalizzato
function showLoadingOverlay(message = 'Estrazione in corso...') {
  // Evita duplicati
  const existing = document.getElementById('salento-loading-overlay');
  if (existing) {
    existing.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'salento-loading-overlay';
  overlay.className = 'salento-extraction-overlay';
  overlay.innerHTML = `
    <div class="salento-extraction-modal">
      <div class="salento-extraction-spinner"></div>
      <div class="salento-extraction-text">${message}</div>
      <div class="salento-extraction-subtext">TripTaste Extension</div>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

// Nascondi overlay di caricamento
function hideLoadingOverlay() {
  const overlay = document.getElementById('salento-loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// Notifiche di successo ed errore
function showSuccessNotification(message) {
  showNotification(message, 'success');
}

function showErrorNotification(message) {
  showNotification(message, 'error');
}

function showNotification(message, type) {
  // Rimuovi notifiche esistenti
  const existingNotifications = document.querySelectorAll('.salento-notification');
  existingNotifications.forEach(notif => notif.remove());
  
  const notification = document.createElement('div');
  notification.className = `salento-notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Auto rimozione dopo 5 secondi
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 5000);
  
  // Click per rimuovere
  notification.addEventListener('click', () => {
    if (notification.parentNode) {
      notification.remove();
    }
  });
}

// Gestione errori globali del content script
window.addEventListener('error', (event) => {
  console.error('❌ Errore globale content script:', event.error);
});

// Helper per querySelector con contains
Element.prototype.querySelector = Element.prototype.querySelector;
NodeList.prototype.querySelector = function(selector) {
  return Array.from(this).find(el => el.matches && el.matches(selector));
};

// Polyfill per :contains se necessario
if (!CSS.supports('selector(:contains(""))')) {
  // Fallback per browser che non supportano :contains
  
}



// Inietta gli stili CSS se non già presenti
function injectStyles() {
  if (document.getElementById('trippaste-extension-styles')) {
    return; // Già iniettati
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'trippaste-extension-styles';
  styleElement.textContent = `
    /* Stili di base per la modale - fallback se CSS esterni non caricano */
    .trippaste-modal-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.8) !important;
      z-index: 999999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    .trippaste-modal-container {
      background: white !important;
      border-radius: 12px !important;
      max-width: 800px !important;
      width: 90% !important;
      max-height: 90vh !important;
      overflow: hidden !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
    }
    
    .trippaste-modal-header {
      padding: 20px !important;
      background: #FF6B35 !important;
      color: white !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
    }
    
    .trippaste-modal-close {
      background: none !important;
      border: none !important;
      color: white !important;
      font-size: 24px !important;
      cursor: pointer !important;
      padding: 5px !important;
      border-radius: 50% !important;
    }
    
    .trippaste-modal-content {
      padding: 20px !important;
      max-height: 60vh !important;
      overflow-y: auto !important;
    }
    
    .trippaste-btn {
      padding: 12px 24px !important;
      border: none !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      font-weight: 600 !important;
    }
    
    .trippaste-btn-primary {
      background: #FF6B35 !important;
      color: white !important;
    }
    
    .trippaste-btn-secondary {
      background: #6c757d !important;
      color: white !important;
    }
  `;
  
  document.head.appendChild(styleElement);
}

// Inietta gli stili all'avvio
injectStyles();
