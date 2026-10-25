package com.aura.service;

import com.aura.model.Order;
import com.aura.repository.OrderRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final ObjectMapper objectMapper;

    /**
     * Tool: get_order_details
     * Returns a JSON string describing the order, or an error message if not found.
     */
    public String getOrderDetails(String orderId) {
        log.info("Tool call: get_order_details({})", orderId);

        if (orderId == null || orderId.isBlank()) {
            return "{\"error\": \"No order ID provided. Please ask the customer for their order ID.\"}";
        }

        String normalizedId = orderId.trim().toUpperCase();
        Optional<Order> optOrder = orderRepository.findById(normalizedId);

        if (optOrder.isEmpty()) {
            return String.format(
                "{\"error\": \"Order %s not found. Please verify the order ID with the customer.\"}",
                normalizedId
            );
        }

        Order order = optOrder.get();
        ObjectNode node = objectMapper.createObjectNode();
        node.put("order_id",       order.getId());
        node.put("customer_name",  order.getCustomerName());
        node.put("product",        order.getProduct());
        node.put("value",          "₹" + order.getValue().toPlainString());
        node.put("status",         order.getStatus());
        node.put("tracking_id",    order.getTrackingId() != null ? order.getTrackingId() : "N/A");
        node.put("courier",        order.getCourier() != null ? order.getCourier() : "N/A");
        node.put("notes",          order.getNotes() != null ? order.getNotes() : "");

        // Add actionability hints for the LLM
        boolean canCancel = "Processing".equalsIgnoreCase(order.getStatus());
        boolean canReturn  = "Delivered".equalsIgnoreCase(order.getStatus());
        node.put("can_cancel", canCancel);
        node.put("can_return",  canReturn);

        try {
            return objectMapper.writeValueAsString(node);
        } catch (Exception e) {
            return "{\"error\": \"Failed to serialize order details.\"}";
        }
    }

    /**
     * Tool: cancel_order
     * Cancels an order only if its status is "Processing".
     * Returns a JSON string with the result.
     */
    public String cancelOrder(String orderId) {
        log.info("Tool call: cancel_order({})", orderId);

        if (orderId == null || orderId.isBlank()) {
            return "{\"error\": \"No order ID provided.\"}";
        }

        String normalizedId = orderId.trim().toUpperCase();
        Optional<Order> optOrder = orderRepository.findById(normalizedId);

        if (optOrder.isEmpty()) {
            return String.format(
                "{\"error\": \"Order %s not found. Please verify the order ID.\"}",
                normalizedId
            );
        }

        Order order = optOrder.get();
        String status = order.getStatus();

        if (!"Processing".equalsIgnoreCase(status)) {
            return String.format(
                "{\"error\": \"Order %s cannot be cancelled. Its current status is '%s'. " +
                "Cancellation is only possible when an order is in Processing status. " +
                "If the order is Out for Delivery, the customer may refuse delivery at the doorstep.\", " +
                "\"order_id\": \"%s\", \"status\": \"%s\"}",
                normalizedId, status, normalizedId, status
            );
        }

        // Perform cancellation
        order.setStatus("Cancelled");
        order.setNotes("Cancelled by customer via voice agent.");
        orderRepository.save(order);

        log.info("Order {} successfully cancelled.", normalizedId);

        return String.format(
            "{\"success\": true, \"message\": \"Order %s has been successfully cancelled. " +
            "A confirmation will be sent to %s. Any payment will be refunded within 5-7 business days.\", " +
            "\"order_id\": \"%s\", \"new_status\": \"Cancelled\"}",
            normalizedId, order.getCustomerName(), normalizedId
        );
    }
}
