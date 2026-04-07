package com.integrationiq.model;

import java.util.List;

public class AnalysisUpdate {

    public enum Status { RUNNING, COMPLETE, ERROR }

    private Status status;
    private String message;
    private List<FlowMetric> metrics;
    private List<Incident> incidents;

    public static AnalysisUpdate running(String message) {
        AnalysisUpdate u = new AnalysisUpdate();
        u.status = Status.RUNNING;
        u.message = message;
        return u;
    }

    public static AnalysisUpdate complete(List<FlowMetric> metrics, List<Incident> incidents) {
        AnalysisUpdate u = new AnalysisUpdate();
        u.status = Status.COMPLETE;
        u.metrics = metrics;
        u.incidents = incidents;
        u.message = "Analysis complete. Found " + incidents.size() + " incident(s).";
        return u;
    }

    public static AnalysisUpdate error(String message) {
        AnalysisUpdate u = new AnalysisUpdate();
        u.status = Status.ERROR;
        u.message = message;
        return u;
    }

    // Getters

    public Status getStatus() { return status; }
    public String getMessage() { return message; }
    public List<FlowMetric> getMetrics() { return metrics; }
    public List<Incident> getIncidents() { return incidents; }
}
