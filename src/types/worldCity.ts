export type CountryId = "serende" | "dorn" | "kaldur" | "bria" | "belmore" | "eisenheim";

export interface WorldCity {
      id: string;
      name: string;
      countryId: CountryId;
      countryName: string;
      tier: number;
      x: number;
      y: number;
      isCapital: boolean;
      isPlayerHome: boolean;
      owner: "player" | "enemy";
      connections: string[];
}