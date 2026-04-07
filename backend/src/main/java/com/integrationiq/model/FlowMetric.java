package com.integrationiq.model;

import java.util.HashMap;
import java.util.Map;

public class FlowMetric {

    private String flowName;
    private String anonymisedTenant;
    private Map<String, Long> statusCounts = new HashMap<>();
    private double errorRate;
    private double avgLatencyMs;
    private double anomalyScore;

    public FlowMetric() {}

    public FlowMetric(String flowName, String anonymisedTenant) {
        this.flowName = flowName;
        this.anonymisedTenant = anonymisedTenant;
    }

    /**
     * Computes errorRate from statusCounts.
     * Error statuses: failed, escalated, abandoned, discarded, cancelled
     */
    public void computeErrorRate() {
        long total = statusCounts.values().stream().mapToLong(Long::longValue).sum();
        if (total == 0) {
            this.errorRate = 0.0;
            return;
        }
        long errors = statusCounts.getOrDefault("failed", 0L)
                + statusCounts.getOrDefault("escalated", 0L)
                + statusCounts.getOrDefault("abandoned", 0L)
                + statusCounts.getOrDefault("discarded", 0L)
                + statusCounts.getOrDefault("cancelled", 0L);
        this.errorRate = (double) errors / total * 100.0;
    }

    public long totalMessages() {
        return statusCounts.values().stream().mapToLong(Long::longValue).sum();
    }

    /**
     * Builds a structured context string for the Claude prompt.
     */
    public String toPromptContext() {
        return String.format(
                "Integration Flow: %s\nTenant: %s\nTotal Messages: %d\nStatus Breakdown: %s\n" +
                "Error Rate: %.2f%%\nAverage Latency: %.2f ms\nAnomaly Score (Z-score): %.2f",
                flowName,
                anonymisedTenant,
                totalMessages(),
                statusCounts,
                errorRate,
                avgLatencyMs,
                anomalyScore
        );
    }

    // Getters and setters

    public String getFlowName() { return flowName; }
    public void setFlowName(String flowName) { this.flowName = flowName; }

    public String getAnonymisedTenant() { return anonymisedTenant; }
    public void setAnonymisedTenant(String anonymisedTenant) { this.anonymisedTenant = anonymisedTenant; }

    public Map<String, Long> getStatusCounts() { return statusCounts; }
    public void setStatusCounts(Map<String, Long> statusCounts) { this.statusCounts = statusCounts; }

    public double getErrorRate() { return errorRate; }
    public void setErrorRate(double errorRate) { this.errorRate = errorRate; }

    public double getAvgLatencyMs() { return avgLatencyMs; }
    public void setAvgLatencyMs(double avgLatencyMs) { this.avgLatencyMs = avgLatencyMs; }

    public double getAnomalyScore() { return anomalyScore; }
    public void setAnomalyScore(double anomalyScore) { this.anomalyScore = anomalyScore; }
}
