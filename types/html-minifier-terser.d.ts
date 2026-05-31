declare module "html-minifier-terser" {
  export function minify(input: string, options?: Record<string, unknown>): Promise<string>;
}
