declare module 'libxmljs2' {
  export interface ValidationError {
    message: string;
    line?: number | undefined;
    column?: number | undefined;
  }

  export interface Document {
    validationErrors: ValidationError[];
    validate(schema: Document): boolean;
    get(xpath: string, namespaces?: Record<string, string>): unknown;
  }

  export function parseXml(
    xml: string,
    options?: { baseUrl?: string },
  ): Document;
}
