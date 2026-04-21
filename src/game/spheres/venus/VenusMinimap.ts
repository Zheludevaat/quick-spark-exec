/**
 * Venus minimap publisher — surfaces zone metadata to the React shell
 * via gameUiBridge. The shell turns this into the minimap panel.
 */
import { setSceneSnapshot } from "../../gameUiBridge";
import { VENUS_MINIMAP_NODES, VENUS_ZONE_LABEL, type VenusZoneId } from "./VenusData";

export function publishVenusMinimap(zone: VenusZoneId): void {
  setSceneSnapshot({
    key: "VenusPlateau",
    label: "Venus - Eternal Biennale",
    act: 5,
    zone: VENUS_ZONE_LABEL[zone],
    nodes: VENUS_MINIMAP_NODES.map((n) => ({
      id: n.id,
      label: n.label,
      x: n.x,
      y: n.y,
      active: n.id === zone,
    })),
    marker: null,
  });
}

export function publishVenusTrialMinimap(phaseLabel: string): void {
  setSceneSnapshot({
    key: "VenusTrial",
    label: "Venus - Kypria's Trial",
    act: 5,
    zone: phaseLabel,
    nodes: null,
    marker: null,
  });
}
