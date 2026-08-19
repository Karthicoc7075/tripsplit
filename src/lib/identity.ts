import type { LucideIcon } from "lucide-react";
import {
  UtensilsCrossed, Car, BedDouble, Clapperboard, ShoppingBag, Ticket,
  ParkingCircle, Gift, Stethoscope, Camera, Receipt,
  Plane, Landmark, Film, MapPin,
  CupSoda, Cake, HandCoins, Flame, Flower2, Footprints,
  Fuel, CarFront, Cookie, Percent, FerrisWheel, Compass, Tag,
} from "lucide-react";

/**
 * A stable colour per person.
 *
 * Every avatar shared one background, so two friends whose names start with the
 * same letter — Arun and Anita — were visually identical in member lists,
 * splits and the activity feed. Hashing the id spreads them across the wheel
 * and keeps each person the same colour everywhere, forever.
 */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getAvatarHue(seed: string): number {
  return hashString(seed) % 360;
}

/** Tinted background + readable text, tuned to work on light and dark. */
export function getAvatarStyle(seed: string): React.CSSProperties {
  const hue = getAvatarHue(seed);
  return {
    backgroundColor: `hsl(${hue} 70% 50% / 0.18)`,
    color: `hsl(${hue} 70% 38%)`,
  };
}

/**
 * Icons per expense category.
 *
 * Categories already carry a colour, but colour alone is both slower to scan
 * and invisible to colourblind users. An icon reads instantly.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Food: UtensilsCrossed,
  Transport: Car,
  Accommodation: BedDouble,
  Entertainment: Clapperboard,
  Shopping: ShoppingBag,
  "Entry Tickets": Ticket,
  Parking: ParkingCircle,
  Gifts: Gift,
  Medical: Stethoscope,
  Photography: Camera,
  // Outing categories share the map.
  Trip: Plane,
  Temple: Landmark,
  Restaurant: UtensilsCrossed,
  Movies: Film,
  Other: Receipt,

  // Preset categories (see CATEGORY_PRESETS in types/index.ts).
  Drinks: CupSoda,
  Desserts: Cake,
  Snacks: Cookie,
  Tip: HandCoins,
  "Taxes / Service Charge": Percent,
  Activities: FerrisWheel,
  "Fuel & Tolls": Fuel,
  "Rental Vehicle": CarFront,
  "Tour / Guide": Compass,
  "Convenience Fee": Percent,
  "Darshan / Special Entry": Ticket,
  "Pooja / Archana": Flame,
  Prasadam: Flower2,
  "Donation / Hundi": HandCoins,
  "Footwear / Locker": Footprints,
};

/**
 * Fallback is `Tag`, deliberately not an icon used by any real category —
 * otherwise a genuine assignment is indistinguishable from a missing one, and
 * the coverage test cannot tell them apart.
 */
export function getCategoryIcon(category?: string): LucideIcon {
  if (!category) return Tag;
  return CATEGORY_ICONS[category] ?? Tag;
}
