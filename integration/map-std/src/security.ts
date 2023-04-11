/**
  * Type of security value.
  */
export declare enum SecurityType {
  APIKEY = "apiKey",
  HTTP = "http"
}
/**
 * The placement of the API key.
 **/
export declare enum ApiKeyPlacement {
  HEADER = "header",
  BODY = "body",
  PATH = "path",
  QUERY = "query"
}
export declare enum HttpScheme {
  BASIC = "basic",
  BEARER = "bearer",
  DIGEST = "digest"
}
/**
 * Security scheme for api key authorization.
 **/
export declare type ApiKeySecurityScheme = {
  type: SecurityType.APIKEY;
  /**
   * @$ref ApiKeyPlacement
   */
  in: ApiKeyPlacement;
  name?: string;
};
/**
 * Security scheme for basic authorization.
 **/
export declare type BasicAuthSecurityScheme = {
  type: SecurityType.HTTP;
  scheme: HttpScheme.BASIC;
};
/**
 * Security scheme for bearer authorization.
 **/
export declare type BearerTokenSecurityScheme = {
  type: SecurityType.HTTP;
  scheme: HttpScheme.BEARER;
  bearerFormat?: string;
};
/**
 * Security scheme for digest authorization.
 **/
export declare type DigestSecurityScheme = {
  type: SecurityType.HTTP;
  scheme: HttpScheme.DIGEST;
  /**
   * Code that should be returned from initial call for challenge eg. 401
   */
  statusCode?: number;
  /**
   * Name of header containing challenge from the server eg. www-authenticate
   */
  challengeHeader?: string;
  /**
   * Name of header containing authorization eg. Authorization
   */
  authorizationHeader?: string;
};

/**
 * 
 **/
export declare type ApiKeySecurityValues = {
  apikey: string;
};
/**
 * 
 **/
export declare type BasicAuthSecurityValues = {
  username: string;
  password: string;
};
/**
 * 
 **/
export declare type BearerTokenSecurityValues = {
  token: string;
};
/**
 * Security values for digest security scheme
 **/
export declare type DigestSecurityValues = {
  username: string;
  password: string;
};

export type SecurityConfiguration =
  | (ApiKeySecurityScheme & ApiKeySecurityValues)
  | (BasicAuthSecurityScheme & BasicAuthSecurityValues)
  | (BearerTokenSecurityScheme & BearerTokenSecurityValues)
  | (DigestSecurityScheme & DigestSecurityValues);