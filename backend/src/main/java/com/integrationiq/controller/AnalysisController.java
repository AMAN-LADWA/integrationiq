package com.integrationiq.controller;

import com.integrationiq.model.Incident;
import com.integrationiq.repository.IncidentRepository;
import com.integrationiq.service.AnalysisOrchestrator;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AnalysisController {

    private final AnalysisOrchestrator orchestrator;
    private final IncidentRepository incidentRepository;

    public AnalysisController(AnalysisOrchestrator orchestrator, IncidentRepository incidentRepository) {
        this.orchestrator = orchestrator;
        this.incidentRepository = incidentRepository;
    }

    /**
     * Trigger analysis for a time window.
     * Called by the external JS script: POST /api/analyse/trigger?from=<ISO>&to=<ISO>
     */
    @PostMapping("/analyse/trigger")
    public ResponseEntity<Map<String, String>> trigger(
            @RequestParam String from,
            @RequestParam String to) {

        if (from == null || from.isBlank() || to == null || to.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Parameters 'from' and 'to' are required ISO-8601 timestamps"));
        }

        orchestrator.runAnalysis(from, to);

        return ResponseEntity.accepted()
                .body(Map.of(
                        "status", "accepted",
                        "message", "Analysis started for window [" + from + ", " + to + "]"
                ));
    }

    /**
     * Returns the 50 most recent incidents.
     */
    @GetMapping("/incidents")
    public ResponseEntity<List<Incident>> getIncidents() {
        return ResponseEntity.ok(incidentRepository.findTop50ByOrderByCreatedAtDesc());
    }

    /**
     * Health check endpoint.
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "IntegrationIQ"));
    }
}
