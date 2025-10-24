
export enum AppMode {
  OneModelNOutfits = "1 Model : N Outfits",
  NModelsOneOutfit = "N Models : 1 Outfit",
  Editor = "AI Image Editor",
  Generator = "AI Image Generator",
  PosterPlacement = "Poster Placement"
}

export interface ImageFile {
  file: File;
  preview: string;
  name: string;
}

export interface ResultImage {
  src: string;
  name: string;
}