/// <reference types="vite/client" />

declare module "bwip-js" {
  const bwipjs: {
    toCanvas(
      canvas: HTMLCanvasElement | string,
      options: { bcid: string; text: string; scale?: number; padding?: number; [k: string]: unknown }
    ): HTMLCanvasElement;
  };
  export default bwipjs;
}

declare module "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/*";
