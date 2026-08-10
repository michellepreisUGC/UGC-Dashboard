# Atelier Dashboard

Ein privates Dashboard mit Wetter, Rechnungs- und Vertragsgenerator für UGC-Kund:innen.
Reines HTML/CSS/JavaScript, kein Build-Tool, keine Abhängigkeiten.

## Funktionen

- **Wetter**: 3-Tage-Vorschau für den aktuellen Standort (per Geolocation) oder frei wählbaren Ort, über die kostenlose [Open-Meteo](https://open-meteo.com) API (kein API-Key nötig).
- **Mails**: Platzhalter-Karte – die eigentliche Verbindung wird später gemeinsam eingerichtet.
- **Rechnungen**: Editor mit freien Positionen, automatischer Summenberechnung, deutschen Pflichtangaben nach §14 UStG (Rechnungsnummer, Leistungsdatum, Steuernummer/USt-IdNr., Kleinunternehmerregelung §19 UStG) sowie Druck/PDF-Export über den Browser-Druckdialog.
- **Verträge**: UGC-Vertrags-Grundvorlage mit editierbaren Abschnitten (Leistung, Vergütung, Nutzungsrechte, Vertraulichkeit, Kündigung, Schlussbestimmungen), ebenfalls druckbar.
- **Kund:innen**: Einfache Kontaktverwaltung zur Wiederverwendung in Rechnungen & Verträgen.
- **Firmendaten**: Zentrale Grundvorlage (Firmenname, Sitz, Steuernummer, Bankverbindung, Logo, Standardtexte), die automatisch in alle Dokumente einfließt.

## Wichtiger Hinweis

Die Vertragsvorlagen ersetzen **keine Rechtsberatung**. Bitte bei Bedarf anwaltlich prüfen lassen, bevor echte Verträge damit abgeschlossen werden.

## Lokal starten

Da die App ES-Module verwendet, muss sie über einen lokalen Server aufgerufen werden (nicht per Doppelklick auf `index.html`):

```bash
cd /Users/Michelle/Claude
python3 -m http.server 5173
```

Danach im Browser öffnen: `http://localhost:5173`

Alternativ mit Node.js:

```bash
npx serve .
```

## Daten & Speicherung

Alle Eingaben (Firmendaten, Kund:innen, Rechnungen, Verträge, gewählter Wetter-Ort) werden **ausschließlich lokal im Browser** gespeichert (`localStorage`). Es gibt keinen Server, keine Datenbank, keine Cloud-Synchronisation:

- Die Daten sind an das jeweilige Gerät und den jeweiligen Browser gebunden.
- Beim Löschen der Browserdaten gehen auch die App-Daten verloren.
- Für den Zugriff von mehreren Geräten aus (z. B. Laptop und Handy) müsste künftig eine echte Backend-Anbindung ergänzt werden – das ist bewusst nicht Teil dieser ersten Version.

## Hosten (z. B. für deine Frau zugänglich machen)

Die App besteht nur aus statischen Dateien und lässt sich z. B. kostenlos hosten:

**Netlify (Drag & Drop):**
1. Auf [app.netlify.com/drop](https://app.netlify.com/drop) den Ordner `Claude` (mit `index.html`, `css/`, `js/`) hineinziehen.
2. Fertig – du erhältst eine Live-URL.

**Vercel (CLI):**
```bash
npx vercel /Users/Michelle/Claude
```

Wichtig: Nach dem Hosten die **Firmendaten einmalig direkt im Live-Dashboard** eintragen (nicht hier lokal), da die Daten pro Browser/Domain getrennt gespeichert werden.

## Projektstruktur

```
index.html          Grundgerüst & alle Views
css/styles.css       Design (Rosé/Creme, "Atelier"-Stil) inkl. Druckstile
js/store.js          Datenschicht (localStorage)
js/util.js           Hilfsfunktionen (Formatierung, DOM, Toast, Modal)
js/weather.js        Wetter-Widget (Open-Meteo)
js/settings.js       Firmendaten-Formular
js/clients.js        Kunden-Verwaltung
js/invoices.js        Rechnungs-Editor & -Liste
js/contracts.js       Vertrags-Editor & -Liste
js/main.js            Navigation & Übersicht
```

## Nächste Schritte (optional)

- Mail-Integration (z. B. Gmail/Outlook) einzeln anbinden.
- Bei Bedarf: echtes Backend für geräteübergreifenden Zugriff.
- Weitere Vertragsklauseln oder Rechnungsfelder je nach Bedarf ergänzen – alle Texte in `js/contracts.js` (`DEFAULT_SECTIONS`) und `js/invoices.js` sind einfach anpassbar.
