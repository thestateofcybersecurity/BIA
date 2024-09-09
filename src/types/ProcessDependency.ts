export interface ProcessDependency {
  id: number;
  processFunction: string;
  description: string;
  processOwner: string;
  peoplePrimary: string;
  peopleAlternatives: string;
  itPrimary: string;
  itAlternatives: string;
  devicesPrimary: string;
  devicesAlternatives: string;
  facilityPrimary: string;
  facilityAlternatives: string;
  suppliersPrimary: string;
  suppliersAlternatives: string;
  additionalPrimary: string;
  additionalAlternatives: string;
}
