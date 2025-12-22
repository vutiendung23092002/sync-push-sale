import { generateHash } from "../common/generate-hash.js";

function mergeOrderDetails(details = []) {
  if (!Array.isArray(details) || details.length === 0) return "";

  return details
    .map((item) => {
      const itemCode = item?.itemCode ?? "";
      const itemName = item?.itemName ?? "";
      const quantity = item?.quantity ?? 0;
      const totalPrice = item?.totalPrice ?? 0;

      return `Sku:${itemCode}_TênSP:${itemName}_Số lượng:${quantity}_Tổng tiền sản phẩm:${totalPrice} VND`;
    })
    .join("\n");
}

function mergeOrderSkus(details = []) {
  if (!Array.isArray(details) || details.length === 0) return "";

  return details
    .map((item) => item?.itemCode)
    .filter(Boolean)
    .join("_");
}

function calculateTotalCostStrict(details = [], costMap = {}) {
  if (!Array.isArray(details) || details.length === 0) return null;

  let total = 0;

  for (const item of details) {
    const sku = item?.itemCode?.toLowerCase();
    const quantity = Number(item?.quantity ?? 0);

    // thiếu SKU hoặc không có giá vốn → cả order = null
    if (!sku || costMap[sku] == null) {
      return null;
    }

    const costPerUnit = Number(costMap[sku]);
    total += costPerUnit * quantity;
  }

  return total;
}

export function ordersFormatted(order, costMap = {}) {
  const total_cost = calculateTotalCostStrict(order?.details, costMap);
  const formatted = {
    id: order?.orderNumber ?? "",
    order_code: order?.orderCode ?? "",
    tracking_no: order?.trackingNo ?? "",
    source_id: order?.sourceId ?? "",
    source_name: order?.sourceName ?? "",
    utm_source: order?.UtmSource ?? "",
    marketing_user_name: order?.marketingUserName ?? "",
    marketing_display_name: order?.marketingDisplayName ?? "",
    sale_user_id: order?.saleUserId ?? "",
    sale_display_name: order?.saleDisplayName ?? "",
    customer_phone: order?.customerPhone ?? "",
    customer_name: order?.customerName ?? "",
    customer_type: order?.customerType ?? "",
    operation_result_name: order?.operationResultName ?? "",
    total_quantity: order?.totalQuantity ?? "",
    cost: total_cost,
    total_amount: order?.totalAmount ?? "",
    total_price: order?.totalPrice ?? "",
    total_deposit: order?.totalDeposit ?? "",
    total_discount: order?.totalDiscount ?? "",
    total_shipping_cost: order?.totalShippingCost ?? "",
    total_cod: order?.totalCod ?? "",
    sign_part_cod: order?.signPartCod ?? "",
    skus: mergeOrderSkus(order?.details) ?? "",
    order_items_summary: mergeOrderDetails(order?.details),
    shipping_carrier_name: order?.shippingCarrierName ?? "",
    order_status_name: order?.orderStatusName ?? "",
    reason_to_create: order?.reasonToCreate ?? "",
    create_time: order?.createTime ?? "",
    order_confirm_date: order?.orderConfirmDate ?? "",
    order_confirm_name: order?.orderConfirmName ?? "",
    delivery_adress: order?.deliveryAdress ?? "",
    time_sale_receiving_data: order?.timeSaleReceivingData ?? "",
    time_sales_work_updated: order?.timeSalesWorkUpdated ?? "",
  };

  const hash = generateHash(formatted);

  return {
    ...formatted,
    hash,
  };
}

export function orderToOrderItems(order, costMap = {}) {
  if (!order || !Array.isArray(order.details)) return [];

  return order.details.map((item, idx) => {
    const index = idx + 1;

    const sku = item?.itemCode ?? "";
    const skuKey = sku.toLowerCase();
    const quantity = Number(item?.quantity ?? 0);

    const itemCost = costMap[skuKey] != null ? Number(costMap[skuKey]) : null;

    const itemTotalCost = itemCost != null ? itemCost * quantity : null;
    const giftCost =
      itemCost != null ? itemCost * Number(item?.quantityGift ?? 0) : null;

    const formatted = {
      id: `${order.orderNumber}_${index}`,

      // ===== ORDER LEVEL =====
      order_number: order?.orderNumber ?? "",
      order_code: order?.orderCode ?? "",
      tracking_no: order?.trackingNo ?? "",
      source_id: order?.sourceId ?? "",
      source_name: order?.sourceName ?? "",
      utm_source: order?.UtmSource ?? "",
      marketing_user_name: order?.marketingUserName ?? "",
      marketing_display_name: order?.marketingDisplayName ?? "",
      sale_user_id: order?.saleUserId ?? "",
      sale_display_name: order?.saleDisplayName ?? "",
      customer_phone: order?.customerPhone ?? "",
      customer_name: order?.customerName ?? "",
      customer_type: order?.customerType ?? "",
      operation_result_name: order?.operationResultName ?? "",
      shipping_carrier_name: order?.shippingCarrierName ?? "",
      order_status_name: order?.orderStatusName ?? "",
      reason_to_create: order?.reasonToCreate ?? "",
      create_time: order?.createTime ?? "",
      order_confirm_date: order?.orderConfirmDate ?? "",
      order_confirm_name: order?.orderConfirmName ?? "",
      delivery_adress: order?.deliveryAdress ?? "",
      time_sale_receiving_data: order?.timeSaleReceivingData ?? "",
      time_sales_work_updated: order?.timeSalesWorkUpdated ?? "",

      // ===== ITEM LEVEL =====
      skus: sku ?? "",
      item_name: item?.itemName ?? "",
      quantity,
      quantity_gift: Number(item?.quantityGift ?? 0),
      price: Number(item?.price ?? 0),
      total_price: Number(item?.totalPrice ?? 0),

      discount_percent_1: Number(item?.discountPercent1 ?? 0),
      discount_percent_2: Number(item?.discountPercent2 ?? 0),
      discount_1: Number(item?.discount1 ?? 0),
      discount_2: Number(item?.discount2 ?? 0),

      // ===== COST LEVEL =====
      item_cost: itemCost ?? "", // giá vốn / 1 sp
      item_total_cost: itemTotalCost ?? "", // giá vốn * số lượng
      gift_cost: giftCost ?? "",
    };

    const hash = generateHash(formatted);

    return {
      ...formatted,
      hash,
    };
  });
}
