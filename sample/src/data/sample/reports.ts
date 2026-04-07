import type { DailyFlashReport, DemandForecastItem } from "@/types";

export const sampleDailyReports: DailyFlashReport[] = [
  {
    date: "2026-03-25",
    content: `DNEVNI IZVJESTAJ NABAVE — 25.03.2026.

HITNO:
- Negativan stok piletine (-12 kg) — greska u POS2 receptu. Auto-narudzba suspendovana. Ne narucivati rucno.
- Ghost surplus orade (25 kg prikazano, ali 35 porcija prodano bez promjene). Potrebna inventura.
- Ugovor s Jadranska Riba istice za 5 dana — pokrenuti obnovu.

NARUDZBE:
- 3 PO na cekanju odobrenja: meso (3.420 EUR), riba (5.680 EUR), voce/povrce (890 EUR).
- Vjencanje Markovic subota 120 pax — kolicine uvecane 30%.
- Ukupno kreirano danas: 9.990,00 EUR.

FAKTURE:
- 1 sporna faktura (620 EUR, Mesnica Brkic — nema PO, tvrdnja o telefonskoj narudzbi).
- 1 moguca duplikatna faktura (2.890 EUR — provjera u tijeku).
- Velpro maslac +25,5% iznad ugovorene cijene — ceka provjeru.

POPUNJENOST: 78% danas, 87% subota (vjencanje), 80% sljedeci tjedan (IT konferencija).

BUDGET: F&B potrosnja MTD 67% od mjesecnog budzeta. Na dobrom putu.`,
  },
  {
    date: "2026-03-24",
    content: `DNEVNI IZVJESTAJ NABAVE — 24.03.2026.

NARUDZBE:
- 2 PO odobrena: posteljina (3.850 EUR), mljecni proizvodi (1.180 EUR).
- 1 PO poslan dobavljacu: vino (4.200 EUR) za nadolazece dogadjaje.

FAKTURE:
- 5 faktura obradeno. 4 perfect match, 1 minor (CleanPro — 2 kom manje deterdzenta).
- Sporna faktura od Mesnica Brkic — bez PO. Email reklamacije poslan.

ZALIHE:
- Rajcica i paprika ispod reorder tocke — auto-narudzba ce se pokrenuti sutra.
- Negativan stok piletine i ghost surplus orade i dalje aktivan.

POPUNJENOST: 76% danas, raste prema suboti 87%.`,
  },
  {
    date: "2026-03-23",
    content: `DNEVNI IZVJESTAJ NABAVE — 23.03.2026.

NARUDZBE:
- 1 PO odobren: mljecni proizvodi za Mljekara Livno (1.180 EUR).
- IT konferencija u srijedu zahtijeva dodatni catering.

FAKTURE:
- Velpro faktura s odstupanjem — maslac 25,5% iznad ugovorene cijene. Proslijedeno Controlleru.

DOBAVLJACI:
- CleanPro mjesecna ocjena: 5,4/10. Preporuka: REPLACE ili plan poboljsanja.

POPUNJENOST: 74% danas. Vikend vjencanje 87%.`,
  },
];

export const sampleDemandForecast: DemandForecastItem[] = [
  { item_name: "Pileca prsa", category: "Meso", current_stock: -12, forecasted_demand: 65, days_until_stockout: 0, urgency: "red", recommended_order_qty: 80, unit: "kg" },
  { item_name: "Orada svjeza", category: "Riba", current_stock: 25, forecasted_demand: 55, days_until_stockout: 1, urgency: "red", recommended_order_qty: 60, unit: "kg" },
  { item_name: "Brancin svjezi", category: "Riba", current_stock: 12, forecasted_demand: 40, days_until_stockout: 1, urgency: "red", recommended_order_qty: 45, unit: "kg" },
  { item_name: "Skampi", category: "Riba", current_stock: 7, forecasted_demand: 22, days_until_stockout: 1, urgency: "red", recommended_order_qty: 25, unit: "kg" },
  { item_name: "Janjetina but", category: "Meso", current_stock: 8, forecasted_demand: 35, days_until_stockout: 1, urgency: "red", recommended_order_qty: 40, unit: "kg" },
  { item_name: "Rajcica", category: "Voce/Povrce", current_stock: 10, forecasted_demand: 35, days_until_stockout: 2, urgency: "amber", recommended_order_qty: 40, unit: "kg" },
  { item_name: "Paprika crvena", category: "Voce/Povrce", current_stock: 6, forecasted_demand: 20, days_until_stockout: 2, urgency: "amber", recommended_order_qty: 25, unit: "kg" },
  { item_name: "Vrhnje za kuhanje", category: "Mlijeko", current_stock: 15, forecasted_demand: 45, days_until_stockout: 2, urgency: "amber", recommended_order_qty: 60, unit: "L" },
  { item_name: "Deterdzent univerzalni", category: "Cistoca", current_stock: 5, forecasted_demand: 12, days_until_stockout: 3, urgency: "amber", recommended_order_qty: 30, unit: "kom" },
  { item_name: "Maslac", category: "Mlijeko", current_stock: 22, forecasted_demand: 30, days_until_stockout: 5, urgency: "green", recommended_order_qty: 0, unit: "kg" },
  { item_name: "Brasno T-55", category: "Suha roba", current_stock: 75, forecasted_demand: 40, days_until_stockout: 13, urgency: "green", recommended_order_qty: 0, unit: "kg" },
  { item_name: "Secer kristal", category: "Suha roba", current_stock: 35, forecasted_demand: 15, days_until_stockout: 16, urgency: "green", recommended_order_qty: 0, unit: "kg" },
  { item_name: "Plavac Mali", category: "Pica", current_stock: 32, forecasted_demand: 25, days_until_stockout: 9, urgency: "green", recommended_order_qty: 0, unit: "boca" },
];
