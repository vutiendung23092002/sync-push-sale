import { delay } from "./src/utils/common/date-helper.js";
import { writeJsonFile } from "./src/utils/common/file-helper.js";
import { getOrders } from "./src/core/push-sale-api.js";
import { callWithRetry } from "./src/utils/push-sale/call-with-retry.js";
import {
  ordersFormatted,
  orderToOrderItems,
} from "./src/utils/push-sale/orders-formartted.js";
import { getAllCostMap } from "./src/services/kiot/get-all-cost-map.js";
import { syncDataToLarkBaseFilterDate } from "./src/services/larkbase/index.js";
import {
  vnTimeToUTCTimestampMiliseconds,
  buildPushSaleDateRange,
} from "./src/utils/common/time-helper.js";
import {
  orderFieldMap,
  orderTypeMap,
  orderUiTypeMap,
  orderItemFieldMap,
  orderItemTypeMap,
  orderItemUiTypeMap,
} from "./src/utils/larkbase/field-map.js";
import { createLarkClient } from "./src/core/larkbase-client.js";
import dotenv from "dotenv";
dotenv.config();

async function syncAllOrders(
  baseId,
  tableOrdersName,
  tableOrderItemsName,
  from,
  to
) {
  const {
    newMap: newCostMap,
    oldMap: oldCostMap,
    merged: mergedCostRaw,
  } = await getAllCostMap();

  const mergedCost = Object.fromEntries(
    Object.entries(mergedCostRaw).map(([sku, cost]) => [
      sku.toLowerCase(),
      cost,
    ])
  );

  const clientId = process.env.PUSH_SALE_CLIENT;
  const apiToken = process.env.PUSH_SALE_API_TOKEN;

  const { fromDate, toDate } = buildPushSaleDateRange(
    process.env.FROM,
    process.env.TO
  );

  const pageSize = 100;
  let pageIndex = 1;
  let allOrders = [];
  let allOrderItems = [];

  while (true) {
    console.log(`📦 Đang lấy page ${pageIndex}...`);

    const res = await callWithRetry(() =>
      getOrders(clientId, apiToken, pageIndex, pageSize, fromDate, toDate)
    );

    const rawOrders = res?.result || [];
    const formattedOrders = rawOrders.map((order) =>
      ordersFormatted(order, mergedCost)
    );
    const formattedOrderItems = rawOrders.flatMap((order) =>
      orderToOrderItems(order, mergedCost)
    );

    allOrders.push(...formattedOrders);
    allOrderItems.push(...formattedOrderItems);

    console.log(`✅ Page ${pageIndex}: ${rawOrders.length} đơn`);

    if (rawOrders.length < pageSize) {
      break;
    }

    pageIndex++;

    console.log("😴 Nghỉ 1 phút cho Pushsale bớt cáu...");
    await delay(60000);
  }

  writeJsonFile("./logs/orders.json", allOrders);
  writeJsonFile("./logs/order_items.json", allOrderItems);

  console.log(`🎉 Tổng đơn sync được: ${allOrders.length}`);

  const larkClient = await createLarkClient(
    process.env.LARK_APP_ID_PS,
    process.env.LARK_APP_SECRET_PS
  );

  const ONE_DAY = 24 * 60 * 60 * 1000;
  const timestampFrom = vnTimeToUTCTimestampMiliseconds(from) - ONE_DAY;
  const timestampTo = vnTimeToUTCTimestampMiliseconds(to) + ONE_DAY;

  await syncDataToLarkBaseFilterDate(
    larkClient,
    baseId,
    {
      tableName: tableOrdersName,
      records: allOrders,
      fieldMap: orderFieldMap,
      typeMap: orderTypeMap,
      uiType: orderUiTypeMap,
      currencyCode: "VND",
      idLabel: "OrderID",
      excludeUpdateField: ["Tổng giá vốn"],
    },
    "Thời gian sale tác nghiệp",
    timestampFrom,
    timestampTo
  );

  await syncDataToLarkBaseFilterDate(
    larkClient,
    baseId,
    {
      tableName: tableOrderItemsName,
      records: allOrderItems,
      fieldMap: orderItemFieldMap,
      typeMap: orderItemTypeMap,
      uiType: orderItemUiTypeMap,
      currencyCode: "VND",
      idLabel: "ID",
      excludeUpdateField: ["Tổng giá vốn quà tặng", "Tổng giá vốn sản phẩm", "Giá vốn / sản phẩm"],
    },
    "Thời gian sale tác nghiệp",
    timestampFrom,
    timestampTo
  );
}

const baseId = process.env.BASE_ID;

const tableOrdersName = process.env.TABLE_ORDERS_NAME;
const tableOrderItemsName = process.env.TABLE_ORDER_ITEMS_NAME;

// input hoặc env đều đã có yyyy/mm/dd
const from = process.env.FROM ? `${process.env.FROM} 00:00:00` : null;

const to = process.env.TO ? `${process.env.TO} 23:59:59` : null;

syncAllOrders(baseId, tableOrdersName, tableOrderItemsName, from, to);
