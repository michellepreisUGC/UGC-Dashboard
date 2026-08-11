# UGC-Dashboard

Ein privates Dashboard mit Wetter, Rechnungs- und Vertragsgenerator für UGC-Kund:innen.
Reines HTML/CSS/JavaScript, kein Build-Tool, keine Abhängigkeiten.

## Funktionen

- **Wetter**: 3-Tage-Vorschau für den aktuellen Standort (per Geolocation) oder frei wählbaren Ort, über die kostenlose [Open-Meteo](https://open-meteo.com) API (kein API-Key nötig).
- **Mails**: Platzhalter-Karte – die eigentliche Verbindung wird später gemeinsam eingerichtet.
- **Rechnungen**: Editor mit freien Positionen, automatischer Summenberechnung, deutschen Pflichtangaben nach §14 UStG (Rechnungsnummer, Leistungsdatum, Steuernummer/USt-IdNr., Kleinunternehmerregelung §19 UStG), optionalem PDF-Anhang für bereits abgeschlossene Rechnungen sowie Druck/PDF-Export mit automatisch vorgeschlagenem Dateinamen.
- **Verträge**: UGC-Vertrags-Grundvorlage mit editierbaren Abschnitten (Leistung, Vergütung, Nutzungsrechte, Vertraulichkeit, Kündigung, Schlussbestimmungen), ebenfalls druckbar mit automatischem Dateinamen. Nutzungsrechte können zeitlich befristet werden (z. B. Paid-Ads-Whitelisting) – die Karte "Fristen im Blick" zeigt ablaufende/abgelaufene Rechte zur Follow-up-Nachverfolgung, inkl. Vorschau auf der Startseite. Auch hier lässt sich ein PDF-Anhang für bereits laufende/abgeschlossene Verträge hinterlegen.
- **Einnahmen & Ausgaben**: Einnahmen-Überschuss-Rechnung (EÜR) für die Steuererfassung. Bezahlte Rechnungen zählen automatisch als Einnahme, dazu manuelle Einnahmen/Ausgaben mit Kategorien, Jahresauswahl, Gewinn/Verlust und Ausgaben-Aufschlüsselung nach Kategorie. Eine Kurzübersicht erscheint auch auf der Startseite. Über "Jahresexport (PDF)" lässt sich die komplette Jahresübersicht (alle Einnahmen, alle Ausgaben nach Kategorie, Summen) als ein druckbares Dokument für die Steuererklärung erzeugen.
- **TikTok-Trends**: Kuratierte Liste aktueller Trends (Sounds, Challenges, Formate, Hashtags, UGC-Tipps) mit Quellenangabe, Schnelllinks zum offiziellen TikTok Creative Center sowie ein eigenes Trend-Journal zum Festhalten selbst entdeckter Ideen. Die kuratierte Liste wird wöchentlich automatisch aktualisiert (siehe unten).
- **Kund:innen**: Einfache Kontaktverwaltung zur Wiederverwendung in Rechnungen & Verträgen.
- **Firmendaten**: Zentrale Grundvorlage (Firmenname, Sitz, Steuernummer, Bankverbindung, Logo, Standardtexte), die automatisch in alle Dokumente einfließt.
- **Social Analytics**: Instagram- & TikTok-Follower und die letzten Beiträge (Likes, Kommentare, Reichweite/Aufrufe, Interaktionsrate) auf einen Blick, inkl. Follower-Trend und automatischem täglichem Sync (~8 Uhr) – siehe [Setup-Anleitung](#social-analytics-instagram--tiktok-einrichten) unten.

## Wichtige Hinweise

- Die Vertragsvorlagen ersetzen **keine Rechtsberatung**. Bitte bei Bedarf anwaltlich prüfen lassen, bevor echte Verträge damit abgeschlossen werden.
- Die EÜR-Ansicht ist eine Arbeitshilfe, **kein Ersatz für Steuerberatung**. Insbesondere wird für Einnahmen aus Rechnungen das Rechnungsdatum verwendet, nicht der tatsächliche Zahlungseingang – für die exakte Zufluss-Buchung ggf. mit dem echten Zahlungsdatum abgleichen.

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

Alle Eingaben (Firmendaten, Kund:innen, Rechnungen, Verträge, hochgeladene PDF-Anhänge, gewählter Wetter-Ort) werden **ausschließlich lokal im Browser** gespeichert (`localStorage`). Es gibt keinen Server, keine Datenbank, keine Cloud-Synchronisation:

- Die Daten sind an das jeweilige Gerät und den jeweiligen Browser gebunden.
- Beim Löschen der Browserdaten gehen auch die App-Daten (inkl. Anhänge) verloren.
- `localStorage` hat ein Limit von üblicherweise 5–10 MB pro Domain. PDF-Anhänge über 8 MB werden abgelehnt (Warnhinweis erscheint); bei vielen/großen Anhängen kann der Speicher trotzdem knapp werden – im Zweifel den Anhang vor dem Hochladen komprimieren.
- Für den Zugriff von mehreren Geräten aus (z. B. Laptop und Handy) müsste künftig eine echte Backend-Anbindung ergänzt werden – das ist bewusst nicht Teil dieser ersten Version.

### PDF-Anhänge für bestehende Rechnungen/Verträge

Rechnungen und Verträge, die bereits abgeschlossen sind oder außerhalb des Dashboards laufen, lassen sich trotzdem erfassen: Eintrag anlegen, Eckdaten (Kundin/Kunde, Betrag bzw. Vergütung, Datum, ggf. Nutzungsrechte-Frist) kurz eintragen, das Original-PDF im Abschnitt „PDF-Anhang" hochladen. So bleiben alle Fristen, Beträge und Follow-ups an einer Stelle sichtbar, ohne dass Inhalte manuell abgetippt werden müssen. Ein automatisches Auslesen der PDF-Inhalte in die Formularfelder gibt es bewusst (noch) nicht – dafür bräuchte es eine KI-gestützte Texterkennung mit eigenem Backend und laufenden Kosten, das wäre ein separates, größeres Vorhaben.

### Als PDF sichern mit sinnvollem Dateinamen

Die Buttons "🖨 Drucken / PDF" (Rechnungen, Verträge, EÜR-Jahresexport) setzen vor dem Öffnen des Druckdialogs automatisch einen sprechenden Dateinamen (z. B. `Rechnung_RE-001_Bloom-Cosmetics_2026-08-10`), der von den meisten Browsern als Vorschlag im "Als PDF sichern"-Dialog übernommen wird. Der Zielordner wird weiterhin frei im Dialog gewählt – ein vollautomatisches Einsortieren in eigene Unterordner ist technisch nur mit browserspezifischen Funktionen (Chrome) oder einem eigenen Hintergrunddienst möglich und bewusst nicht Teil dieser Version.

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

**Repo:** [github.com/michellepreisUGC/UGC-Dashboard](https://github.com/michellepreisUGC/UGC-Dashboard) – wenn dieses Repo z. B. mit Netlify verbunden wird, deployt die gehostete Seite automatisch neu, sobald neuer Code (z. B. aktualisierte Trends, siehe unten) gepusht wird.

## Social Analytics (Instagram & TikTok) einrichten

Anders als der Rest der App braucht diese Funktion echte Zugangsdaten von Meta/TikTok sowie ein kleines Backend (**Netlify Functions**, im Ordner `netlify/functions/`), weil Zugangstoken nicht sicher im Browser gespeichert werden können. Das Backend ist bereits fertig gebaut – es fehlen nur noch deine eigenen App-Zugangsdaten. Diese Schritte kannst du nur selbst erledigen (eigene Logins bei Meta/TikTok):

### 1. Instagram (Meta for Developers)

1. Stelle sicher, dass dein Instagram-Account ein **Business- oder Creator-Konto** ist (Instagram-App → Einstellungen → Konto → Kontotyp wechseln).
2. Gehe zu [developers.facebook.com/apps](https://developers.facebook.com/apps) → **App erstellen** → Typ „Sonstige" → „Unternehmen".
3. Im App-Dashboard: Produkt **„Instagram"** hinzufügen → „Instagram API Setup with Instagram Login".
4. Dort unter „Rollen" deinen eigenen Instagram-Account als **Instagram-Tester** hinzufügen – die Einladung musst du zusätzlich in der Instagram-App selbst annehmen (Einstellungen → Apps und Websites → Tester-Einladungen). So funktioniert die Verbindung sofort, ganz ohne auf eine App-Prüfung durch Meta warten zu müssen.
5. Als **Weiterleitungs-URI** einträgst du:
   ```
   https://stirring-blancmange-6fa926.netlify.app/.netlify/functions/social-instagram-callback
   ```
6. Notiere dir **Instagram-App-ID** und **Instagram-App-Secret** von dieser Produktseite.

### 2. TikTok (TikTok for Developers)

1. Gehe zu [developers.tiktok.com/apps](https://developers.tiktok.com/apps) → **App erstellen**.
2. Produkt **„Login Kit"** hinzufügen, als Redirect-URI:
   ```
   https://stirring-blancmange-6fa926.netlify.app/.netlify/functions/social-tiktok-callback
   ```
3. Unter „Scopes" folgende Berechtigungen anfragen: `user.info.basic`, `user.info.stats`, `video.list`.
4. Die App startet im Sandbox-/Entwicklungsmodus – unter „Target Users" (Sandbox) deinen eigenen TikTok-Account als Test-User hinzufügen, dann funktioniert die Verbindung sofort ohne Wartezeit auf eine App-Prüfung.
5. **Client Key** und **Client Secret** findest du unter „Basic Information".

### 3. Zugangsdaten in Netlify eintragen

Im Netlify-Dashboard (nicht hier im Chat, das sind Zugangsdaten): **Site settings → Environment variables → Add a variable**, jeweils einzeln:

| Variable | Wert |
|---|---|
| `INSTAGRAM_APP_ID` | aus Schritt 1.6 |
| `INSTAGRAM_APP_SECRET` | aus Schritt 1.6 |
| `INSTAGRAM_REDIRECT_URI` | `https://stirring-blancmange-6fa926.netlify.app/.netlify/functions/social-instagram-callback` |
| `TIKTOK_CLIENT_KEY` | aus Schritt 2.5 |
| `TIKTOK_CLIENT_SECRET` | aus Schritt 2.5 |
| `TIKTOK_REDIRECT_URI` | `https://stirring-blancmange-6fa926.netlify.app/.netlify/functions/social-tiktok-callback` |
| `BLOBS_SITE_ID` | Site ID aus **Project configuration → General → Site details** |
| `BLOBS_TOKEN` | ein Personal Access Token aus **User settings → Applications → Personal access tokens → New access token** |

Die letzten beiden werden gebraucht, weil Netlifys automatische Blobs-Erkennung (Speicher für Token & Sync-Daten) in der Praxis nicht zuverlässig funktioniert hat – mit den beiden Werten verbindet sich das Backend stattdessen manuell.

Danach unter **Deploys → Trigger deploy → Clear cache and deploy site**, damit die neuen Umgebungsvariablen und die Backend-Abhängigkeit (`@netlify/blobs`) sauber übernommen werden.

### 4. Verbinden

Im Dashboard unter **Firmendaten → „Social Media verbinden"** auf „Verbinden" klicken (Instagram und/oder TikTok), einmalig einloggen und bestätigen. Danach unter **Social Analytics** auf „Jetzt aktualisieren" klicken, um den ersten Datenabruf anzustoßen. Ab dann läuft der Sync automatisch jeden Tag gegen 8 Uhr (Berliner Zeit).

**Hinweise:**
- Follower-Zahlen und Beitrags-Kennzahlen sind bewusst über einen Server-Endpunkt statt direkt im Frontend abrufbar – die eigentlichen Zugangstoken verlassen den Server nie. Die Analytics-Daten selbst (Follower, Post-Likes etc.) sind aber weitgehend ohnehin öffentlich auf den Profilen sichtbar; eine zusätzliche Passwortsperre für das Dashboard gibt es (wie schon bisher) nicht – bei Bedarf lässt sich das Netlify-Site-Passwort (Site settings → Visitor access) nachrüsten.
- Instagram-Long-Lived-Token laufen nach 60 Tagen ab und werden automatisch beim täglichen Sync erneuert; TikTok-Access-Token laufen sogar nur 24h, werden aber ebenfalls automatisch per Refresh-Token erneuert. Solange mindestens alle paar Wochen ein Sync läuft, bleibt die Verbindung aktiv.
- Falls Meta oder TikTok ihre API-Felder mal ändern: Die komplette API-Anbindung liegt gebündelt in `netlify/functions/lib/instagram.js` und `netlify/functions/lib/tiktok.js`.

## TikTok-Trends: wöchentliche Auto-Recherche

Es gibt keine offizielle kostenlose TikTok-API für Trends, daher wird die kuratierte Liste stattdessen durch einen automatisierten Claude-Routine-Lauf aktuell gehalten:

- **Was passiert**: Jeden Montag ca. 8:05 Uhr recherchiert ein Cloud-Agent per Websuche aktuelle TikTok-Trends und überschreibt `js/trends-data.js` im GitHub-Repo mit einem Commit + Push.
- **Verwaltung**: Einsehbar/änderbar unter [claude.ai/code/routines](https://claude.ai/code/routines) (Name: „TikTok-Trends wöchentlich aktualisieren").
- **Lokale Kopie aktuell halten**: Damit dein lokales Verzeichnis die neuen Trends sieht, einmal pro Woche `git pull` ausführen:
  ```bash
  cd /Users/Michelle/Claude
  git pull
  ```
  Falls das Repo mit einem Hosting-Anbieter (z. B. Netlify) verbunden ist, übernimmt der das automatisch – dann ist kein manueller `git pull` nötig, nur für die lokale Version.
- **Eigene Notizen bleiben unberührt**: Das Trend-Journal (selbst eingetragene Ideen) liegt separat im Browser-`localStorage` und wird von der Automatisierung nicht angefasst.

## Projektstruktur

```
index.html            Grundgerüst & alle Views
css/styles.css         Design (Rosé/Creme, "Atelier"-Stil) inkl. Druckstile
js/store.js            Datenschicht (localStorage)
js/util.js             Hilfsfunktionen (Formatierung, DOM, Toast, Modal)
js/weather.js           Wetter-Widget (Open-Meteo)
js/settings.js          Firmendaten-Formular
js/clients.js           Kunden-Verwaltung
js/invoices.js          Rechnungs-Editor & -Liste
js/contracts.js         Vertrags-Editor & -Liste
js/finance.js           Einnahmen & Ausgaben (EÜR) inkl. Jahresexport
js/trends.js            TikTok-Trends-Ansicht & Trend-Journal
js/trends-data.js       Kuratierte Trends-Liste (wöchentlich automatisch aktualisiert)
js/social.js            Social-Analytics-Ansicht & Connect-UI in den Firmendaten
js/main.js              Navigation & Übersicht

netlify.toml                              Netlify-Konfiguration (Functions, Redirects, Scheduled Sync)
netlify/functions/social-*-start.js        OAuth-Start (Weiterleitung zu Instagram/TikTok)
netlify/functions/social-*-callback.js     OAuth-Callback (Token-Austausch, Speicherung)
netlify/functions/social-status.js         Verbindungsstatus für die Connect-UI
netlify/functions/social-disconnect.js     Verbindung trennen
netlify/functions/social-sync-now.js       Manueller Sync-Trigger ("Jetzt aktualisieren")
netlify/functions/social-fetch-scheduled.js Täglicher Auto-Sync (~8 Uhr Berliner Zeit)
netlify/functions/social-analytics-data.js  Liefert Snapshot + Follower-Verlauf ans Frontend
netlify/functions/lib/                     Instagram-/TikTok-API-Anbindung, Sync-Logik, Blob-Speicher
```

## Nächste Schritte (optional)

- Mail-Integration (z. B. Gmail/Outlook) einzeln anbinden.
- Bei Bedarf: echtes Backend für geräteübergreifenden Zugriff.
- Weitere Vertragsklauseln oder Rechnungsfelder je nach Bedarf ergänzen – alle Texte in `js/contracts.js` (`DEFAULT_SECTIONS`) und `js/invoices.js` sind einfach anpassbar.
- Repo mit Netlify/Vercel verbinden, damit Trend-Updates automatisch live gehen (siehe oben).
