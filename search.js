export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const profile = req.body;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "API key missing" });

  const hotelLabel = {
    hostel: "Hostel", hotel3: "3-Sterne Hotel",
    hotel4: "4-5 Sterne Hotel", apartment: "Ferienwohnung", airbnb: "Airbnb"
  }[profile.hotel] || "Hotel";

  const styleMap = {
    budget: "Budget-Reise (günstig & authentisch)",
    comfort: "Komfort-Reise (gutes Preis-Leistungs-Verhältnis)",
    luxury: "Luxusreise (das Beste vom Besten)",
    adventure: "Abenteuerreise (außergewöhnliche Erlebnisse)",
    culture: "Kulturreise (Geschichte & lokales Leben)"
  };

  const prompt = `Du bist ein erfahrener Reiseexperte. Finde 5 perfekte Reiseziele für dieses genaue Profil:

REISEPROFIL:
- Reiseart: ${profile.traveler}
- Abflughafen: ${profile.airport} (${profile.airport === "MUC" ? "München" : profile.airport === "FRA" ? "Frankfurt" : profile.airport === "BER" ? "Berlin" : profile.airport === "DUS" ? "Düsseldorf" : profile.airport === "HAM" ? "Hamburg" : profile.airport})
- Reisezeitraum: ${profile.dateFrom} bis ${profile.dateTo}
- Dauer: ${profile.duration}
- Gesamtbudget p.P.: ${profile.budget}€ (Flug + Hotel zusammen)
- Unterkunft: ${hotelLabel}
- Reisestil: ${styleMap[profile.style] || "Komfort"}
- Gewünschtes Klima: ${profile.climate || "Egal"}
- Gewünschte Aktivitäten: ${(profile.activity || []).join(", ") || "Allgemein"}
- Bevorzugte Region: ${profile.region || "Weltweit"}
- Ausschließen: ${profile.excl || "Nichts"}

WICHTIG:
- Preise müssen REALISTISCH sein für ${profile.dateFrom}
- Flugpreise ab ${profile.airport} berücksichtigen
- Gesamtbudget von ${profile.budget}€ STRIKT einhalten
- Jedes Ziel muss zum Profil passen
- "whyPerfect" soll spezifisch erklären warum dieses Ziel perfekt für DIESEN Reisenden ist

Antworte NUR mit einem JSON-Array ohne Backticks oder Markdown:
[{
  "id": "t1",
  "dest": "Stadtname",
  "country": "Landname",
  "iata": "IATA-CODE",
  "tagline": "Kurze begeisternde Beschreibung",
  "flightPrice": 120,
  "flightTime": "07:30",
  "airline": "Airline Name",
  "duration": "2h 15min",
  "hotelName": "Hotel Name",
  "hotelPPN": 85,
  "total": 290,
  "tip": "Konkreter Spartipp oder Reisehinweis",
  "best": "Warum dieser Trip besonders ist",
  "highlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
  "whyPerfect": "Spezifische Erklärung warum perfekt für diesen Reisenden"
}]`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    const text = (data.content?.[0]?.text || "").trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const trips = JSON.parse(clean);

    return res.status(200).json({ trips });
  } catch (err) {
    return res.status(500).json({ error: "Search failed", detail: err.message });
  }
}
