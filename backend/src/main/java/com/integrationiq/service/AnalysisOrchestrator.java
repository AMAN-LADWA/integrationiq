package com.integrationiq.service;

import com.integrationiq.model.AnalysisUpdate;
import com.integrationiq.model.FlowMetric;
import com.integrationiq.model.Incident;
import com.integrationiq.repository.IncidentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class AnalysisOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(AnalysisOrchestrator.class);
    private static final String TOPIC = "/topic/analysis";

    private final InfluxQueryService influxQueryService;
    private final AnomalyDetectionService anomalyDetectionService;
    private final ClaudeService claudeService;
    private final IncidentRepository incidentRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public AnalysisOrchestrator(
            InfluxQueryService influxQueryService,
            AnomalyDetectionService anomalyDetectionService,
            ClaudeService claudeService,
            IncidentRepository incidentRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.influxQueryService = influxQueryService;
        this.anomalyDetectionService = anomalyDetectionService;
        this.claudeService = claudeService;
        this.incidentRepository = incidentRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Runs the full analysis pipeline asynchronously.
     * Progress is broadcast to WebSocket subscribers via /topic/analysis.
     */
    @Async
    public void runAnalysis(String from, String to) {
        log.info("Starting analysis for window [{}, {}]", from, to);

        push(AnalysisUpdate.running("Querying InfluxDB..."));

        List<FlowMetric> allMetrics;
        try {
            allMetrics = influxQueryService.queryMetrics(from, to);
        } catch (Exception e) {
            log.error("InfluxDB query failed", e);
            push(AnalysisUpdate.error("InfluxDB query failed: " + e.getMessage()));
            return;
        }

        if (allMetrics.isEmpty()) {
            push(AnalysisUpdate.error("No data found in InfluxDB for the given time window."));
            return;
        }

        push(AnalysisUpdate.running("Running anomaly detection on " + allMetrics.size() + " flows..."));

        List<FlowMetric> anomalous = anomalyDetectionService.detectAnomalies(allMetrics);

        push(AnalysisUpdate.running(
                "Found " + anomalous.size() + " anomalous flow(s). Calling Claude API..."));

        List<Incident> incidents = new ArrayList<>();
        for (FlowMetric metric : anomalous) {
            push(AnalysisUpdate.running("Analysing flow: " + metric.getFlowName() + "..."));
            Incident incident = claudeService.analyse(metric, from, to);
            Incident saved = incidentRepository.save(incident);
            incidents.add(saved);
        }

        push(AnalysisUpdate.complete(allMetrics, incidents));
        log.info("Analysis complete: {} metrics, {} incidents", allMetrics.size(), incidents.size());
    }

    private void push(AnalysisUpdate update) {
        messagingTemplate.convertAndSend(TOPIC, update);
    }
}
