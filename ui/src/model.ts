export type PackageItem = {
  name: string;
  desc: string;
  url: string;
  version: string;
  c_size: number;
  i_size: number;
};

export type FormattedItem = PackageItem & {
  _formatted: PackageItem;
};

export type UnitItem = {
  id: string;
  package: string;
  content: string;
  filename: string;
};

export type FormattedUnitItem = UnitItem & {
  _formatted: UnitItem;
};
