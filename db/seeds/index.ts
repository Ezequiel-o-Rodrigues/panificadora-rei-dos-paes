import type { Segmento } from "@/lib/config/tenant";
import type { SegmentSeed } from "./types";
import { panificadoraSeed } from "./panificadora";
import { churrascariaSeed } from "./churrascaria";
import { lanchoneteSeed } from "./lanchonete";
import { restauranteSeed } from "./restaurante";
import { pizzariaSeed } from "./pizzaria";
import { cafeteriaSeed } from "./cafeteria";
import { genericoSeed } from "./generico";

const SEEDS: Record<Segmento, SegmentSeed> = {
  panificadora: panificadoraSeed,
  churrascaria: churrascariaSeed,
  lanchonete: lanchoneteSeed,
  restaurante: restauranteSeed,
  pizzaria: pizzariaSeed,
  cafeteria: cafeteriaSeed,
  generico: genericoSeed,
};

export function getSeedForSegmento(segmento: Segmento): SegmentSeed {
  return SEEDS[segmento] ?? genericoSeed;
}
