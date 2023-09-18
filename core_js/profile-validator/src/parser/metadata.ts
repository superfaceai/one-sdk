type FullVersion = {
  major: number;
  minor: number;
  patch: number;
  label?: string;
};

export const PARSED_VERSION: FullVersion = { major: 0, minor: 1, patch: 0 };
export const PARSED_AST_VERSION: FullVersion = { major: 0, minor: 1, patch: 0 };
