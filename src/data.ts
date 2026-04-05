export interface KitItem {
  id: string;
  title: string;
  quantity: number;
  perDay: boolean;
  description: string;
  checked: boolean;
}

export interface KitSection {
  id: string;
  title: string;
  items: KitItem[];
}

function item(
  id: string,
  title: string,
  quantity: number,
  description: string,
  perDay = false
): KitItem {
  return { id, title, quantity, perDay, description, checked: false };
}

export const initialSections: KitSection[] = [
  {
    id: "repair",
    title: "Bike Repair Kit",
    items: [
      item("tape", "Tape", 1, "Gaffer or electrical tape for emergency fixes"),
      item("cable-ties", "Cable ties", 10, "Assorted sizes for securing gear and quick repairs"),
      item("multi-tool", "Multi tool", 1, "Bike-specific multi tool with hex keys and screwdrivers"),
      item("chain-lube", "Chain lube", 1, "Wet or dry lube depending on conditions"),
      item("bike-pump", "Bike pump", 1, "Mini pump or CO₂ inflator"),
      item("brake-pads", "Brake pads", 1, "Spare set matching your brake system"),
      item("spanner", "Adjustable spanner", 1, "For axle nuts and other fasteners"),
      item("inner-tubes", "Inner tubes", 2, "Correct size for your tyres"),
      item("tubeless-kit", "Tubeless repair kit", 1, "Plugs and reamer for trail-side puncture repair"),
      item("sealant", "Sealant", 1, "Top-up bottle of tubeless tyre sealant"),
      item("chain-link", "Chain link", 2, "Quick-link compatible with your chain speed"),
      item("drive-belt", "Drive belt", 1, "Spare belt if running a belt drive system"),
      item("rope", "Rope", 1, "Lightweight cordage for tying down gear or emergencies"),
    ],
  },
  {
    id: "storage",
    title: "Storage",
    items: [
      item("pannier-bags", "Pannier bags", 1, "Waterproof rear panniers for bulk gear"),
      item("frame-bag", "Frame bag", 1, "Fits inside the main triangle of the frame"),
      item("top-tube-bag", "Top tube bag", 1, "Easy-access bag for snacks and phone"),
    ],
  },
  {
    id: "food",
    title: "Food & Drink",
    items: [
      item("camping-meals", "Camping meals", 1, "Freeze-dried or dehydrated dinners", true),
      item("porridge", "Porridge", 1, "Instant oats sachets for quick breakfasts", true),
      item("rice-cakes", "Rice cakes", 2, "Homemade or shop-bought on-bike snack", true),
      item("nature-valley", "Nature Valley bars", 2, "Crunchy granola bars for sustained energy", true),
      item("protein-bar", "Protein bars", 1, "For post-ride recovery and hunger", true),
      item("meat-stick", "Meat sticks", 1, "High protein, long-life trail snack", true),
      item("jerky", "Jerky", 1, "Beef or alternative jerky for savoury snacking"),
      item("water-bottles", "Water bottles", 2, "Large capacity bottles, ideally 750 ml+"),
      item("gas-bottles", "Gas bottles", 2, "Isobutane/propane cartridges for stove"),
      item("cutlery", "Cutlery", 1, "Lightweight spork or titanium cutlery set"),
      item("oat-milk", "Oat milk powder", 1, "For tea, coffee and porridge"),
      item("sweets", "Sweets", 1, "Pick-and-mix or haribo for quick sugar hit"),
      item("energy-gel", "Energy gels", 3, "Fast-release carbohydrate for hard efforts", true),
      item("tea-coffee", "Tea / coffee", 2, "Teabags and/or instant coffee sachets", true),
    ],
  },
  {
    id: "camping",
    title: "Camping & Navigation",
    items: [
      item("water-filter", "Water filter", 1, "Sawyer Squeeze or similar for refilling from streams"),
      item("jet-boil", "Jet boil", 1, "Fast boiling stove system for hot meals and drinks"),
      item("head-torches", "Head torches", 2, "One per person, with spare batteries"),
      item("pocket-rocket", "Pocket rocket stove", 1, "Lightweight backup stove"),
      item("pots-pans", "Pots / pans", 1, "Lightweight titanium or aluminium cookset"),
      item("insulated-mugs", "Insulated mugs", 2, "One per person for hot drinks"),
      item("power-bank", "Power bank", 1, "High capacity (20 000 mAh+) for multi-day charging"),
      item("usb-c-cables", "USB C cables", 2, "Short cables for charging devices"),
      item("sleeping-mats", "Sleeping mats", 1, "Inflatable or foam mat per person"),
      item("sleeping-bags", "Sleeping bags", 1, "Rated for expected overnight temperatures"),
      item("tent", "Tent inc pegs and poles", 1, "Lightweight 2-person shelter with full kit"),
      item("midge-spray", "Midge spray", 1, "DEET or Smidge for Scottish/European riding"),
      item("spf", "SPF sunscreen", 1, "Factor 50+ for exposed skin"),
      item("crocs", "Crocs", 1, "Camp shoes for resting feet after cycling"),
      item("helmets", "Helmets", 1, "One per rider, check fit before departure"),
      item("bin-bags", "Bin bags", 3, "For rubbish, wet kit, or waterproofing panniers"),
      item("map", "Map", 1, "Paper backup map of route area"),
      item("fak", "First aid kit", 1, "Blister plasters, bandages, antiseptic, pain relief"),
      item("speaker", "Bluetooth speaker", 1, "For camp vibes, keep it lightweight"),
      item("wall-plug", "Wall plug / adapter", 1, "For charging at hostels or cafés"),
    ],
  },
  {
    id: "clothing",
    title: "Clothing",
    items: [
      item("t-shirts", "T-shirts", 2, "Merino or synthetic, quick-drying"),
      item("pants", "Cycling shorts / pants", 2, "Padded bib shorts or MTB shorts"),
      item("socks", "Socks", 4, "Merino wool cycling socks"),
      item("undies", "Underpants", 4, "Merino or synthetic, quick-drying"),
      item("fleece", "Fleece", 1, "Mid-layer for cold mornings and evenings"),
      item("insulated-jacket", "Insulated jacket", 1, "Packable down or synthetic fill jacket"),
      item("wp-jacket", "Waterproof jacket", 1, "Packable, breathable rain jacket"),
      item("wp-trousers", "Waterproof trousers", 1, "Lightweight overtrousers"),
      item("light-gloves", "Light gloves", 1, "Liner gloves for cool conditions"),
      item("heavy-gloves", "Heavy gloves", 1, "Windproof / waterproof gloves for cold/wet"),
      item("cycling-shorts", "Cycling shorts", 1, "Lightweight shorts for warm weather riding"),
      item("walking-trousers", "Walking trousers", 1, "Zip-off or packable for off-bike use"),
      item("buff", "Buff", 1, "Neck gaiter / balaclava for warmth and dust"),
      item("contacts-glasses", "Contacts / glasses", 1, "Prescription eyewear plus case and solution"),
      item("headband", "Headband", 1, "Ear warmer for under-helmet use"),
      item("airpods", "AirPods / earbuds", 1, "For music and calls, keep one ear free while riding"),
    ],
  },
  {
    id: "toiletries",
    title: "Toiletries",
    items: [
      item("soap", "Bar of soap", 1, "Multi-use for body, hands and laundry"),
      item("shampoo-bar", "Shampoo bar", 1, "Solid shampoo, no liquid spillage risk"),
      item("moisturiser", "Moisturiser", 1, "Travel-size, doubles as lip balm"),
      item("toothbrush", "Toothbrush", 1, "Cut handle down to save weight if needed"),
      item("toothpaste", "Toothpaste", 1, "Travel tube or toothpaste tablets"),
      item("hand-sanitiser", "Hand sanitiser", 1, "Small bottle for before meals"),
      item("tissues", "Tissues", 1, "Pocket pack, for trail emergencies"),
      item("wipes", "Wipes", 1, "Biodegradable wet wipes for quick clean-ups"),
      item("contact-solution", "Contact lens solution", 1, "Full size bottle if wearing lenses"),
    ],
  },
];
