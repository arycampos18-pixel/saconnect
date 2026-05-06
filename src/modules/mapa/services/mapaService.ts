import { supabase } from "@/integrations/supabase/client";

export type BairroAgregado = {
  bairro: string;
  cidade: string | null;
  uf: string | null;
  total: number;
  lat?: number;
  lng?: number;
};

export type MapaFiltros = {
  cidade?: string;
  tagId?: string;
  liderancaId?: string;
};

const CACHE_KEY = "mapa_geo_cache_v1";

function lerCache(): Record<string, { lat: number; lng: number }> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function salvarCache(cache: Record<string, { lat: number; lng: number }>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* noop */
  }
}

async function geocodeBairro(b: BairroAgregado): Promise<{ lat: number; lng: number } | null> {
  const cidade = b.cidade ?? "";
  const uf = b.uf ?? "";
  const q = encodeURIComponent(`${b.bairro}, ${cidade}, ${uf}, Brasil`.replace(/\s+,/g, ","));
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const data = await r.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export const mapaService = {
  async agregarPorBairro(filtros: MapaFiltros = {}): Promise<BairroAgregado[]> {
    let query = supabase
      .from("eleitores")
      .select("bairro, cidade, uf, lideranca_id, eleitor_tags(tag_id)")
      .not("bairro", "is", null)
      .limit(1000);

    if (filtros.cidade && filtros.cidade !== "todas") query = query.eq("cidade", filtros.cidade);
    if (filtros.liderancaId && filtros.liderancaId !== "todas")
      query = query.eq("lideranca_id", filtros.liderancaId);

    const { data, error } = await query;
    if (error) throw error;

    let rows = (data ?? []) as any[];
    if (filtros.tagId && filtros.tagId !== "todas") {
      rows = rows.filter((r) => (r.eleitor_tags ?? []).some((t: any) => t.tag_id === filtros.tagId));
    }

    const map = new Map<string, BairroAgregado>();
    rows.forEach((r) => {
      const bairro = (r.bairro ?? "").trim();
      if (!bairro) return;
      const cidade = (r.cidade ?? "").trim() || null;
      const uf = (r.uf ?? "").trim() || null;
      const key = `${bairro}|${cidade ?? ""}|${uf ?? ""}`.toLowerCase();
      const cur = map.get(key);
      if (cur) cur.total += 1;
      else map.set(key, { bairro, cidade, uf, total: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  },

  async geocodificar(
    bairros: BairroAgregado[],
    onProgress?: (done: number, total: number) => void
  ): Promise<BairroAgregado[]> {
    const cache = lerCache();
    const result: BairroAgregado[] = [];
    let i = 0;
    for (const b of bairros) {
      const key = `${b.bairro}|${b.cidade ?? ""}|${b.uf ?? ""}`.toLowerCase();
      let coord = cache[key];
      if (!coord) {
        const found = await geocodeBairro(b);
        if (found) {
          coord = found;
          cache[key] = found;
          salvarCache(cache);
        }
        // Nominatim policy: max 1 req/s
        await new Promise((res) => setTimeout(res, 1100));
      }
      if (coord) result.push({ ...b, lat: coord.lat, lng: coord.lng });
      i++;
      onProgress?.(i, bairros.length);
    }
    return result;
  },

  async cidadesDisponiveis(): Promise<string[]> {
    const { data, error } = await supabase
      .from("eleitores")
      .select("cidade")
      .not("cidade", "is", null)
      .limit(1000);
    if (error) throw error;
    const set = new Set<string>();
    (data ?? []).forEach((r: any) => r.cidade && set.add(r.cidade));
    return Array.from(set).sort();
  },
};