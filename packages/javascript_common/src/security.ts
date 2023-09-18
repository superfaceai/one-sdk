export type IdBase = {
  id: string;
};

export type ApiKeySecurityValues = IdBase & {
  apikey: string;
};

export type BasicAuthSecurityValues = IdBase & {
  username: string;
  password: string;
};

export type BearerTokenSecurityValues = IdBase & {
  token: string;
};

export type SecurityValues = ApiKeySecurityValues | BasicAuthSecurityValues | BearerTokenSecurityValues;
export type SecurityValuesMap = { [key: string]: Omit<SecurityValues, 'id'> };