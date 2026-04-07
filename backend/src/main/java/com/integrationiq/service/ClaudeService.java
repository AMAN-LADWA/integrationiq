package com.integrationiq.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.integrationiq.model.FlowMetric;
import com.integrationiq.model.Incident;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class ClaudeService {

    private static final Logger log = LoggerFactory.getLogger(ClaudeService.class);

    private static final String ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";

    private static final String SYSTEM_PROMPT =
            "You are a SAP Cloud Integration reliability expert. Analyse the integration flow metrics " +
            "and return ONLY valid JSON with fields: summary, root_cause, severity (CRITICAL/HIGH/MEDIUM), " +
            "recommended_action.";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${anthropic.api-key}")
    private String apiKey;

    @Value("${anthropic.model:claude-sonnet-4-20250514}")
    private String model;

    @Value("${anthropic.max-tokens:1024}")
    private int maxTokens;

    public ClaudeService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Calls the Claude API to analyse an anomalous flow and returns an Incident.
     */
    public Incident analyse(FlowMetric metric, String from, String to) {
        String userMessage = metric.toPromptContext();

        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", model);
        requestBody.put("max_tokens", maxTokens);
        requestBody.put("system", SYSTEM_PROMPT);

        ArrayNode messages = requestBody.putArray("messages");
        ObjectNode userMsg = messages.addObject();
        userMsg.put("role", "user");
        userMsg.put("content", userMessage);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", apiKey);
        headers.set("anthropic-version", ANTHROPIC_VERSION);

        HttpEntity<String> request;
        try {
            request = new HttpEntity<>(objectMapper.writeValueAsString(requestBody), headers);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialise Claude request", e);
        }

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    ANTHROPIC_API_URL, HttpMethod.POST, request, String.class);

            String responseBody = response.getBody();
            JsonNode root = objectMapper.readTree(responseBody);

            // Extract the text content from the response
            String contentText = root.path("content").get(0).path("text").asText();

            // Strip markdown code fences if present
            contentText = contentText.trim();
            if (contentText.startsWith("```")) {
                contentText = contentText.replaceAll("```(?:json)?", "").trim();
            }

            JsonNode analysisJson = objectMapper.readTree(contentText);

            Incident incident = new Incident();
            incident.setFlowName(metric.getFlowName());
            incident.setAnonymisedTenant(metric.getAnonymisedTenant());
            incident.setFromTime(from);
            incident.setToTime(to);
            incident.setSummary(analysisJson.path("summary").asText("No summary available"));
            incident.setRootCause(analysisJson.path("root_cause").asText("Unknown"));
            incident.setSeverity(normaliseSeverity(analysisJson.path("severity").asText("MEDIUM")));
            incident.setRecommendedAction(analysisJson.path("recommended_action").asText("Investigate further"));
            incident.setErrorRate(metric.getErrorRate());
            incident.setAvgLatencyMs(metric.getAvgLatencyMs());
            incident.setAnomalyScore(metric.getAnomalyScore());

            log.info("Claude analysed flow '{}' → severity={}", metric.getFlowName(), incident.getSeverity());
            return incident;

        } catch (Exception e) {
            log.error("Claude API call failed for flow '{}': {}", metric.getFlowName(), e.getMessage());
            // Return a fallback incident rather than propagating the exception
            return buildFallbackIncident(metric, from, to, e.getMessage());
        }
    }

    private String normaliseSeverity(String raw) {
        return switch (raw.toUpperCase()) {
            case "CRITICAL" -> "CRITICAL";
            case "HIGH" -> "HIGH";
            default -> "MEDIUM";
        };
    }

    private Incident buildFallbackIncident(FlowMetric metric, String from, String to, String error) {
        Incident incident = new Incident();
        incident.setFlowName(metric.getFlowName());
        incident.setAnonymisedTenant(metric.getAnonymisedTenant());
        incident.setFromTime(from);
        incident.setToTime(to);
        incident.setSummary("Anomaly detected — AI analysis unavailable: " + error);
        incident.setRootCause("Unable to determine — Claude API error");
        incident.setSeverity("MEDIUM");
        incident.setRecommendedAction("Review flow manually in SAP Cloud Integration monitoring");
        incident.setErrorRate(metric.getErrorRate());
        incident.setAvgLatencyMs(metric.getAvgLatencyMs());
        incident.setAnomalyScore(metric.getAnomalyScore());
        return incident;
    }
}
