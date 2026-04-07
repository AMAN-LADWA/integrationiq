package com.integrationiq.service;

import com.integrationiq.model.FlowMetric;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Detects anomalous flows using Z-score analysis on two dimensions:
 * average latency and error rate. The composite anomaly score is the
 * max of the two Z-scores.
 */
@Service
public class AnomalyDetectionService {

    private static final Logger log = LoggerFactory.getLogger(AnomalyDetectionService.class);

    @Value("${anomaly.z-score-threshold:2.0}")
    private double zScoreThreshold;

    /**
     * Computes anomaly scores for all metrics and returns those exceeding the threshold.
     */
    public List<FlowMetric> detectAnomalies(List<FlowMetric> metrics) {
        if (metrics.size() < 2) {
            // Not enough data to compute meaningful Z-scores; flag all if any have errors
            metrics.forEach(m -> m.setAnomalyScore(0.0));
            return metrics.stream()
                    .filter(m -> m.getErrorRate() > 0)
                    .collect(Collectors.toList());
        }

        double[] latencies = metrics.stream().mapToDouble(FlowMetric::getAvgLatencyMs).toArray();
        double[] errorRates = metrics.stream().mapToDouble(FlowMetric::getErrorRate).toArray();

        Stats latencyStats = computeStats(latencies);
        Stats errorRateStats = computeStats(errorRates);

        for (FlowMetric m : metrics) {
            double latencyZ = latencyStats.stdDev > 0
                    ? Math.abs((m.getAvgLatencyMs() - latencyStats.mean) / latencyStats.stdDev)
                    : 0.0;
            double errorZ = errorRateStats.stdDev > 0
                    ? Math.abs((m.getErrorRate() - errorRateStats.mean) / errorRateStats.stdDev)
                    : 0.0;
            // Composite score: max of the two Z-scores
            m.setAnomalyScore(Math.max(latencyZ, errorZ));
        }

        List<FlowMetric> anomalous = metrics.stream()
                .filter(m -> m.getAnomalyScore() >= zScoreThreshold)
                .sorted((a, b) -> Double.compare(b.getAnomalyScore(), a.getAnomalyScore()))
                .collect(Collectors.toList());

        log.info("Anomaly detection: {}/{} flows flagged (threshold={})",
                anomalous.size(), metrics.size(), zScoreThreshold);
        return anomalous;
    }

    private Stats computeStats(double[] values) {
        double mean = 0.0;
        for (double v : values) mean += v;
        mean /= values.length;

        double variance = 0.0;
        for (double v : values) variance += (v - mean) * (v - mean);
        variance /= values.length;

        return new Stats(mean, Math.sqrt(variance));
    }

    private record Stats(double mean, double stdDev) {}
}
