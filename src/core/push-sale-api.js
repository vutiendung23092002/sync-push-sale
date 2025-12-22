import http from "./http-client.js";

import crypto from "crypto";

export function generateSecureToken(apiToken, pageIndex, typeDate) {
  const raw = `${apiToken}_${pageIndex}_${typeDate}`;
  return crypto.createHash("md5").update(raw).digest("hex");
}

export async function getOrders(
  clientId,
  apiToken,
  pageIndex,
  pageSize,
  fromDate,
  toDate
) {
  const baseURL = "https://pushsale.vn/v1/getdata/";
  const path = "GetOrderByConditions";
  const typeDate = 1;

  const secure_token = generateSecureToken(apiToken, pageIndex, typeDate);

  const params = {
    clientId: clientId,
    secureToken: secure_token,
    pageIndex: pageIndex,
    pageSize: pageSize,
    fromDate: fromDate,
    toDate: toDate,
    typeDate: typeDate,
    isIncludeDetail: 1,
  };

  const res = await http.post(path, params, {
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return res;
}
