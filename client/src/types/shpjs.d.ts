declare module 'shpjs' {
  export function parseShp(buffer: ArrayBuffer): any;
  export function parseDbf(buffer: ArrayBuffer): any;
  export function combine(data: any[]): any;
  export default function shp(url: string): Promise<any>;
}