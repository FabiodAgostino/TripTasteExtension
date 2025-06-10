# 🍽️ Salento Restaurant Scraper - Chrome Extension

Una Chrome Extension per estrarre automaticamente dati di ristoranti da TripAdvisor e aggiungerli al database del progetto Salento Restaurant Explorer.

## 🚀 Caratteristiche

- ✅ **Scraping Automatico**: Estrae dati direttamente dalle pagine TripAdvisor
- ✅ **Integrazione Firebase**: Aggiunge automaticamente i ristoranti al database
- ✅ **UI Intuitiva**: Interfaccia semplice e responsive
- ✅ **Statistiche**: Traccia le operazioni di scraping
- ✅ **Notifiche**: Feedback immediato per ogni operazione
- ✅ **Backup Locale**: Salva i dati localmente come backup

## 📋 Dati Estratti

L'extension estrae automaticamente:

- **Nome del ristorante**
- **Rating** (con validazione 1.0-5.0)
- **Fascia di prezzo** (€, €€, €€€, €€€€)
- **Tipi di cucina** (italiana, pugliese, mediterranea, etc.)
- **Descrizione**
- **Indirizzo completo**
- **Coordinate GPS** (quando disponibili)
- **Numero di telefono** (quando disponibile)
- **URL immagine principale**

## 🛠️ Installazione

### 1. Preparazione File

Crea una cartella `salento-scraper-extension/` con i seguenti file:

```
salento-scraper-extension/
├── manifest.json
├── background.js
├── content-script.js
├── popup.html
├── popup.js
├── popup.css
├── extension-styles.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 2. Configurazione Firebase

In `background.js`, aggiorna la configurazione Firebase:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com", 
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 3. Icone Extension

Crea le icone nei formati richiesti:
- `icon16.png` - 16x16px (toolbar)
- `icon48.png` - 48x48px (extension management)
- `icon128.png` - 128x128px (Chrome Web Store)

### 4. Caricamento in Chrome

1. Apri Chrome e vai su `chrome://extensions/`
2. Attiva la "Modalità sviluppatore" (in alto a destra)
3. Clicca "Carica estensione non pacchettizzata"
4. Seleziona la cartella `salento-scraper-extension/`
5. L'extension apparirà nella barra degli strumenti

## 📖 Utilizzo

### Metodo 1: Pulsante Floating
1. Naviga su una pagina ristorante TripAdvisor
2. Apparirà automaticamente il pulsante "🍽️ Aggiungi a Salento"
3. Clicca per estrarre e aggiungere automaticamente

### Metodo 2: Popup Extension
1. Naviga su una pagina ristorante TripAdvisor
2. Clicca l'icona dell'extension nella barra degli strumenti
3. Usa i pulsanti per estrarre dati e/o aggiungere al database

### Metodo 3: Operazione Rapida
1. Su una pagina ristorante TripAdvisor
2. Clicca l'icona dell'extension
3. Clicca "⚡ Estrai e Aggiungi Subito"

## ⚙️ Configurazione

### Impostazioni Disponibili
- **Estrazione automatica**: Estrae automaticamente i dati quando apri il popup
- **Mostra notifiche**: Mostra notifiche di successo/errore

### Gestione Dati
- **Statistiche**: Visualizza contatori di operazioni
- **Attività recente**: Cronologia delle ultime operazioni
- **Test database**: Verifica la connessione Firebase
- **Pulisci cache**: Cancella tutti i dati locali

## 🔧 Sviluppo

### Struttura del Codice

#### Content Script (`content-script.js`)
- Estrae dati dal DOM di TripAdvisor
- Mostra pulsante floating
- Gestisce notifiche nella pagina

#### Background Script (`background.js`)
- Gestisce comunicazione con Firebase
- Salva backup in storage locale
- Coordina operazioni tra tabs

#### Popup (`popup.js`)
- Interface utente principale
- Gestisce statistiche e impostazioni
- Controlla stato dell'extension

### Selettori CSS Utilizzati

L'extension usa gli stessi selettori del TripAdvisorScrapingAPI:

```javascript
const SCRAPER_CONFIG = {
  selectors: {
    name: ['.biGQs._P.hzzSG.rRtyp', 'h1', '.HjBfq'],
    rating: '.biGQs._P.pZUbB.KxBGd',
    priceRange: '.biGQs._P.pZUbB.xARtZ.KxBGd',
    // ... altri selettori
  }
};
```

### Debug

Per debuggare l'extension:

1. **Content Script**: Console della pagina TripAdvisor
2. **Background Script**: `chrome://extensions/` → "Visualizza Service Worker"
3. **Popup**: Click destro sul popup → "Ispeziona"

## 🔒 Sicurezza

### Permessi Richiesti
- `activeTab`: Accesso alla tab corrente
- `storage`: Salvataggio dati locali
- `host_permissions`: Accesso a domini TripAdvisor

### Privacy
- I dati vengono estratti solo dalle pagine TripAdvisor visitate
- Nessuna raccolta di dati personali
- Backup locale opzionale

## 🚨 Risoluzione Problemi

### Problemi Comuni

#### "Non su TripAdvisor"
- Assicurati di essere su una pagina ristorante TripAdvisor
- URL deve contenere "Restaurant_Review"

#### "Database offline"
- Verifica la configurazione Firebase in `background.js`
- Controlla la connessione internet
- Usa il pulsante "Test Database"

#### "Errore estrazione"
- TripAdvisor potrebbe aver cambiato la struttura HTML
- Aggiorna i selettori CSS in `content-script.js`
- Ricarica la pagina e riprova

### Reset Extension

Per resettare completamente:
1. Apri il popup dell'extension
2. Clicca "Pulisci Cache"
3. Ricarica l'extension in `chrome://extensions/`

## 🔄 Aggiornamenti

### Aggiornamento Selettori
Se TripAdvisor cambia la struttura HTML:

1. Ispeziona la pagina per trovare nuovi selettori
2. Aggiorna `SCRAPER_CONFIG.selectors` in `content-script.js`
3. Testa l'estrazione

### Aggiornamento Versione
1. Incrementa `version` in `manifest.json`
2. Ricarica l'extension in `chrome://extensions/`

## 📞 Supporto

Per problemi o suggerimenti:
1. Controlla i log della console
2. Verifica la configurazione Firebase
3. Testa con diverse pagine TripAdvisor

## 🎯 Roadmap

### Funzionalità Future
- [ ] Scraping batch di più ristoranti
- [ ] Export dati in CSV/JSON
- [ ] Sincronizzazione cross-device
- [ ] Supporto altre piattaforme (Google Maps, Yelp)
- [ ] Dashboard statistiche avanzate

---

**Made with ❤️ for Salento Restaurant Explorer**