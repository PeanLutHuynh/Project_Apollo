export type PreviewData = {
  fileName: string;
  detected: number;
  validRows: number;
  duplicateExisting: number;
  duplicateInFile: number;
  readyToImport: number;
  invalidRows: Array<{ row: number; reason: string }>;
  skippedRows: Array<{ row: number; reason: string }>;
  supportedFields: string[];
  sampleRow: {
    fullName: string;
    customerType: string;
    contactSource: string;
    phoneNumber: string;
    email: string;
    address: string;
    notes: string;
  };
};
