# Raport Profesionist — Proiect TSS
## Testare automată E2E: Playwright vs. Cypress pe o platformă de e-commerce

---

## 1. Sumar Executiv

Acest proiect implementează și compară două suite de teste automate end-to-end (E2E) pe platforma de e-commerce **NopCommerce**, utilizând două framework-uri de testare de referință din industrie: **Playwright** (Python) și **Cypress** (TypeScript). Aceleași 6 scenarii de testare sunt implementate în ambele framework-uri, oferind o comparație directă a capabilităților, limitărilor și experienței de dezvoltare.

---

## 2. Structura Proiectului

```
ProiectTSS/
├── docker-compose.nopcommerce.yml    # Orchestrare Docker pentru mediul local
├── DOCKER-NOPCOMMERCE.md             # Documentație setup Docker
├── README.md                         # Descrierea workflow-urilor cu diagrame Mermaid
│
├── playwright/                       # Suita Playwright (Python)
│   ├── requirements.txt              # Dependențe Python
│   └── test_workflows.py             # Implementarea celor 6 teste
│
├── cypress/                          # Suita Cypress (TypeScript)
│   ├── package.json                  # Dependențe Node.js
│   ├── cypress.config.js             # Configurație Cypress
│   ├── tsconfig.json                 # Configurație TypeScript
│   └── cypress/
│       ├── e2e/
│       │   └── workflows.cy.ts       # Implementarea celor 6 teste
│       └── support/
│           └── e2e.ts                # Configurare globală (plugins)
│
└── docs/                             # Documentație LaTeX completă
    ├── main.tex                      # Fișier principal LaTeX
    ├── introducere.tex               # Capitol: Introducere
    ├── scenarii.tex                  # Capitol: Scenarii de testare
    ├── playwright.tex                # Capitol: Analiza Playwright
    ├── cypress.tex                   # Capitol: Analiza Cypress
    ├── concluzii.tex                 # Capitol: Concluzii comparative
    └── diagrams/                     # Diagrame de flux (imagini PNG)
```

---

## 3. Aplicația Testată — NopCommerce

| Caracteristică | Detalii |
|---|---|
| **Tip** | Platformă e-commerce open-source |
| **Tehnologie** | ASP.NET Core |
| **Funcționalități acoperite** | Catalog, filtrare AJAX, wishlist, coș, checkout multi-pas, înregistrare, autentificare, persistență sesiune |
| **Instanță de test** | Locală via Docker (port 8080) |
| **Protecție anti-bot** | Cloudflare pe instanța publică (bypass cu playwright-stealth) |

---

## 4. Mediul de Testare — Infrastructura Docker

### Fișier: `docker-compose.nopcommerce.yml`

Orchestrează două servicii containerizate:

| Serviciu | Imagine | Port | Rol |
|---|---|---|---|
| `nopcommerce-db` | `mcr.microsoft.com/mssql/server:2022-latest` | 1433 | Baza de date SQL Server Express |
| `nopcommerce-web` | `nopcommerceteam/nopcommerce:latest` | 8080 | Aplicația NopCommerce |

**Caracteristici tehnice:**
- Health check pe baza de date (TCP port 1433, retry la 10s, max 15 încercări)
- Volume persistente pentru date SQL și App_Data
- Pornire condiționată: aplicația web așteaptă ca DB-ul să fie healthy

**Comenzi de operare:**
```powershell
# Pornire
docker compose -f docker-compose.nopcommerce.yml up -d

# Oprire
docker compose -f docker-compose.nopcommerce.yml down

# Oprire cu ștergere volume
docker compose -f docker-compose.nopcommerce.yml down -v
```

---

## 5. Scenariile de Testare (6 Workflow-uri E2E)

### Workflow 1 — Cumpărături ca vizitator (Guest Mega-Flow)

| Aspect | Detalii |
|---|---|
| **Precondiții** | Sesiune incognito, coș și wishlist goale |
| **Complexitate** | Ridicată — 9 pași cu 5 aserțiuni |
| **Acoperire** | Filtrare AJAX, wishlist, transfer în coș, calcul preț, checkout complet ca guest |

**Flux:** Filtrare 16GB RAM → Wishlist → Transfer în coș → Qty=2 (verificare preț dublu) → Checkout as guest → Billing address → Next Day Air → Credit card → Confirmare comandă

**Aserțiuni cheie:**
- Răspunsul AJAX de filtrare returnează HTTP 200
- Notificarea verde de succes este vizibilă
- Prețul total = preț unitar × 2
- URL final conține `/checkout/completed`
- Mesaj: *"Your order has been successfully processed!"*

---

### Workflow 2 — Configurator PC cu prețuri dinamice

| Aspect | Detalii |
|---|---|
| **Precondiții** | Sesiune guest, coș gol |
| **Complexitate** | Ridicată — include soft assert și adresă de livrare separată |
| **Acoperire** | Schimbare valută, configurare produs cu AJAX, cupon invalid, checkout cu adrese diferite |

**Flux:** Valută → Euro → "Build your own computer" → Selectare componente (RAM + HDD + software) → Verificare preț dinamic → Add to cart → Cupon invalid → Checkout → Billing ≠ Shipping → Check/Money Order → Confirmare

**Aserțiuni cheie:**
- Simbolul € apare pe prețuri
- Prețul nou > prețul de bază (după selectare componente)
- **Soft assert:** mesaj eroare roșu pentru cupon invalid
- Mesaj de confirmare succes

---

### Workflow 3 — Validarea tabelului de comparare

| Aspect | Detalii |
|---|---|
| **Precondiții** | Sesiune fără autentificare, listă comparare goală |
| **Complexitate** | Medie — focalizat pe validare structură HTML |
| **Acoperire** | Funcționalitatea de comparare produse, validare tabel, ștergere listă |

**Flux:** Căutare "HTC" → Add to compare → Căutare "Apple" → Add to compare → Pagina de comparare → Validare tabel → Clear list

**Aserțiuni cheie:**
- Tabelul HTML are exact 3 coloane
- Rândul "name" conține ambele produse (HTC + Apple)
- După ștergere: *"You have no items to compare."*

---

### Workflow 4 — Produs digital (livrare omisă)

| Aspect | Detalii |
|---|---|
| **Precondiții** | Sesiune nouă, coș gol |
| **Complexitate** | Medie — testează logica de business (skip shipping) |
| **Acoperire** | Produse digitale, checkout simplificat fără livrare fizică |

**Flux:** Digital Downloads → Add to cart → Checkout as guest → Billing address → (verificare: se sare peste shipping?) → Credit card → Confirmare

**Aserțiuni cheie:**
- **Soft assert:** pasul de Shipping Method este omis automat
- Mesaj de confirmare a comenzii virtuale

---

### Workflow 5 — Înregistrare cont cu email dinamic

| Aspect | Detalii |
|---|---|
| **Precondiții** | Email generat dinamic cu timestamp (`testuser_{timestamp}@example.com`) |
| **Complexitate** | Medie — flux complet de la registrare la comandă |
| **Acoperire** | Registrare, autentificare automată post-registrare, comandă din cont nou |

**Flux:** Register → Completare formular → Verificare succes → Căutare "Nokia Lumia" → Add to cart → Checkout (fără pas login/guest) → Adresă → Plată → Confirmare

**Aserțiuni cheie:**
- Mesaj: *"Your registration completed"*
- Pasul login/guest este omis (cont deja autentificat)
- URL conține `/checkout/completed`

---

### Workflow 6 — Persistența sesiunii (coș și adresă)

| Aspect | Detalii |
|---|---|
| **Precondiții** | Cont persistent hardcodat (`persistent.tester2026@example.com`) |
| **Complexitate** | Ridicată — testează persistența datelor între sesiuni |
| **Acoperire** | Login, adrese salvate, coș persistent, ciclu logout/login |

**Flux:** Login → My Account → Adăugare adresă → Add to cart → Logout → Verificare logout → Re-login → Verificare coș persistent → Checkout → Verificare adresă în dropdown

**Aserțiuni cheie:**
- Link "My account" vizibil (login reușit)
- Link "Login" reapare (logout reușit)
- Badge coș > 0 (persistență coș după re-login)
- Adresa salvată apare în dropdown-ul de billing

---

## 6. Implementarea Playwright (Python)

### Configurare

| Element | Valoare |
|---|---|
| **Limbaj** | Python |
| **Runner** | pytest |
| **Fișier teste** | `playwright/test_workflows.py` |
| **Dependențe** | playwright 1.58.0, pytest 9.0.3, pytest-playwright 0.7.2, playwright-stealth 2.0.3 |

### Instalare și rulare
```bash
pip install -r requirements.txt
playwright install
pytest test_workflows.py
```

### Tehnici implementate

| Tehnică | Descriere |
|---|---|
| **Stealth mode** | Fixture `autouse=True` cu `playwright-stealth` pentru bypass Cloudflare |
| **Interceptare AJAX** | `page.expect_response()` cu regex/lambda pentru sincronizare |
| **Auto-wait** | Mecanismul nativ Playwright pentru stabilitatea elementelor |
| **Soft assertions** | Blocuri `try/except` care logează eroarea și continuă execuția |
| **Izolare contexte** | Fiecare test rulează într-un `BrowserContext` separat |
| **Extragere prețuri** | `re.sub(r'[^\d.]', '', text)` pentru conversie text → float |

### Funcții implementate (6 teste)

```python
def test_guest_shopping(page: Page)        # Workflow 1
def test_pc_configurator(page: Page)       # Workflow 2
def test_compare_products_table(page: Page) # Workflow 3
def test_digital_product(page: Page)       # Workflow 4
def test_register_and_order(page: Page)    # Workflow 5
def test_login_persistence(page: Page)     # Workflow 6
```

### Avantaje identificate
- Suport multi-browser nativ (Chromium, Firefox, WebKit)
- Interceptare rețea puternică cu `expect_response()`
- Auto-wait robust
- Izolare contexte de browser
- Bypass Cloudflare prin stealth
- Trace Viewer pentru debugging post-mortem

### Dezavantaje identificate
- Configurare inițială mai complexă
- Cod mai verbose (comparativ cu Cypress)
- Fără Time Travel debugging nativ (necesită Trace Viewer)
- Soft assertions manuale prin `try/except`

---

## 7. Implementarea Cypress (TypeScript)

### Configurare

| Element | Valoare |
|---|---|
| **Limbaj** | TypeScript (strict) |
| **Runner** | Mocha (integrat în Cypress) |
| **Fișier teste** | `cypress/cypress/e2e/workflows.cy.ts` |
| **Dependențe** | cypress 15.14.0, typescript 6.0.3, cypress-real-events 1.15.0 |

### Instalare și rulare
```bash
npm install
npm test                    # Headless
npm run cy:open             # Mod interactiv (Cypress App)
npm run cy:run:chrome       # Chrome headed
npm run cy:open:local       # Interactiv pe Docker localhost
```

### Configurația principală (`cypress.config.js`)
- `baseUrl`: `http://localhost:8080`
- `viewportWidth`: 1440, `viewportHeight`: 900
- `defaultCommandTimeout`: 10000ms
- `chromeWebSecurity`: false (necesar pentru cross-origin la checkout)
- `screenshotOnRunFailure`: true

### Tehnici implementate

| Tehnică | Descriere |
|---|---|
| **cy.intercept()** | Interceptare cereri HTTP cu aliasuri și aserțiuni |
| **Retry-ability** | Așteptare automată a condițiilor din `should()` |
| **cypress-real-events** | `realHover()` pentru meniuri dropdown cu CSS :hover |
| **Helper functions** | `fillAddressForm()`, `selectPaymentMethodAndContinue()`, `completeCheckoutAndAssertSuccess()` |
| **Soft assertions** | `cy.get('body').then($body => {...})` cu verificare condițională |
| **DOM inspection** | Inspecția stării DOM-ului înainte de acțiuni (metode de plată variabile) |

### Structura testelor

```typescript
describe('NopCommerce Workflows', () => {
  describe('Guest Purchase Journeys', () => {
    it('Guest shopping flow: wishlist -> cart -> checkout success')
    it('PC configurator flow: dynamic pricing + invalid coupon + order completion')
    it('Compare table flow: add two products, validate table, clear list')
    it('Digital product flow: verify checkout works with skipped shipping')
  });

  describe('Account-Based Journeys', () => {
    it('Register and place an order in the same session')
    it('Login persistence: saved address and cart survive logout/login cycle')
  });
});
```

### Avantaje identificate
- Time Travel Debugging (vizualizare live a fiecărui pas)
- Retry-ability built-in
- `cy.intercept()` intuitiv și expresiv
- TypeScript nativ cu detectare erori la compilare
- Setup rapid (`npm install` suficient)
- Screenshots automate la eșec

### Dezavantaje identificate
- Suport browser limitat (doar Chromium + Firefox)
- JavaScript/TypeScript exclusiv
- Fără stealth mode (necesită Docker local)
- Arhitectură single-tab
- Soft assertions manuale
- Asincronicitate implicită (command queue — curbă de învățare)

---

## 8. Analiză Comparativă

### Tabel de sinteză

| Criteriu | Playwright | Cypress |
|---|---|---|
| **Browsere suportate** | Chromium, Firefox, WebKit | Chromium, Firefox |
| **Limbaje** | Python, TS, Java, C# | JavaScript / TypeScript |
| **Multi-tab / multi-window** | ✅ Da | ❌ Nu |
| **Stealth / bypass bot** | ✅ Da (plugin oficial) | ❌ Nu |
| **Paralelism nativ** | ✅ Da | ⚠️ Parțial (Cypress Cloud) |
| **Time Travel Debugging** | ⚠️ Trace Viewer (post-mortem) | ✅ Da (live) |
| **Developer experience** | Bun | Excelent |
| **Setup inițial** | Mediu | Simplu |
| **Integrare CI/CD** | Excelentă | Bună |
| **Retry-ability** | Auto-wait | Retry built-in |
| **Interceptare rețea** | `expect_response()` | `cy.intercept()` |
| **Soft assertions** | `try/except` | `cy.get('body').then()` |

### Metrici de cod

| Metric | Playwright (Python) | Cypress (TypeScript) |
|---|---|---|
| **Fișier principal** | `test_workflows.py` (~530 linii) | `workflows.cy.ts` (~470 linii) |
| **Număr funcții de test** | 6 | 6 |
| **Helper functions** | 3 (`wait_for_cloudflare`, `_login`, `_ensure_account_exists`) | 7 (`fillAddressForm`, `selectPaymentMethodAndContinue`, `completePaymentInfoAndContinue`, etc.) |
| **Dependențe** | 5 pachete Python | 3 pachete npm |

---

## 9. Documentația LaTeX

Proiectul include o documentație academică completă în format LaTeX, structurată în capitole:

| Fișier | Conținut |
|---|---|
| `main.tex` | Document master, configurare pachete, stiluri listings |
| `introducere.tex` | Context, obiective, configurare mediu |
| `scenarii.tex` | Descrierea detaliată a celor 6 workflow-uri cu diagrame |
| `playwright.tex` | Analiza framework-ului, implementare, avantaje/dezavantaje |
| `cypress.tex` | Analiza framework-ului, implementare, avantaje/dezavantaje |
| `concluzii.tex` | Concluzii per framework + analiză de industrie |

Documentul se compilează cu:
```bash
pdflatex main.tex
```

---

## 10. Concluzii

### Playwright
- Framework robust pentru testare multi-browser și scenarii complexe
- Recomandat pentru organizații cu echipe diverse (multi-limbaj) și cerințe de acoperire cross-browser
- Ideal când controlul granular al rețelei și bypass-ul protecțiilor anti-bot sunt necesare
- Tendința din industrie favorizează adoptarea Playwright (State of JS 2023)

### Cypress
- Developer experience superior — cel mai fluid proces de scriere și depanare
- Recomandat pentru proiecte JavaScript/TypeScript cu infrastructură controlată
- Time Travel Debugging rămâne un avantaj semnificativ pentru productivitate
- Alegere optimă când viteza de iterație are prioritate

### Recomandare generală
Alegerea depinde de context: **Cypress** pentru echipe JS/TS cu focus pe DX și iterație rapidă; **Playwright** pentru acoperire cross-browser, CI/CD la scară și flexibilitate de limbaj.

---

## 11. Instrucțiuni de Rulare Rapidă

```powershell
# 1. Pornire mediu Docker
docker compose -f docker-compose.nopcommerce.yml up -d

# 2. Accesare setup NopCommerce (prima dată)
# http://localhost:8080 → configurare DB

# 3. Rulare teste Playwright
cd playwright
pip install -r requirements.txt
playwright install
pytest test_workflows.py -v

# 4. Rulare teste Cypress
cd cypress
npm install
npm test                              # headless
npm run cy:open                       # interactiv

# 5. Oprire mediu Docker
docker compose -f docker-compose.nopcommerce.yml down
```

---

*Raport generat pe baza analizei complete a tuturor fișierelor din proiect.*
