package com.integrationiq.service;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.QueryApi;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;
import com.integrationiq.model.FlowMetric;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class InfluxQueryService {

    private static final Logger log = LoggerFactory.getLogger(InfluxQueryService.class);

    private final InfluxDBClient influxDBClient;
    private final TenantAnonymiser tenantAnonymiser;

    @Value("${influx.bucket}")
    private String bucket;

    public InfluxQueryService(InfluxDBClient influxDBClient, TenantAnonymiser tenantAnonymiser) {
        this.influxDBClient = influxDBClient;
        this.tenantAnonymiser = tenantAnonymiser;
    }

    /**
     * Queries InfluxDB for the given time window and returns aggregated FlowMetrics,
     * one per (IntegrationFlowName, Tenant) pair.
     *
     * @param from ISO-8601 timestamp string (e.g. 2024-01-01T00:00:00Z)
     * @param to   ISO-8601 timestamp string
     */
    public List<FlowMetric> queryMetrics(String from, String to) {
        Map<String, FlowMetric> metricMap = new LinkedHashMap<>();

        // Query 1: count per (flow, tenant, status)
        String countQuery = String.format("""
                from(bucket: "%s")
                  |> range(start: time(v: "%s"), stop: time(v: "%s"))
                  |> filter(fn: (r) => r["_field"] == "value")
                  |> group(columns: ["IntegrationFlowName", "Tenant", "Status"])
                  |> count()
                """, bucket, from, to);

        // Query 2: mean latency per (flow, tenant)
        String latencyQuery = String.format("""
                from(bucket: "%s")
                  |> range(start: time(v: "%s"), stop: time(v: "%s"))
                  |> filter(fn: (r) => r["_field"] == "value")
                  |> group(columns: ["IntegrationFlowName", "Tenant"])
                  |> mean()
                """, bucket, from, to);

        QueryApi queryApi = influxDBClient.getQueryApi();

        try {
            List<FluxTable> countTables = queryApi.query(countQuery);
            for (FluxTable table : countTables) {
                for (FluxRecord record : table.getRecords()) {
                    String flowName = getTagValue(record, "IntegrationFlowName");
                    String rawTenant = getTagValue(record, "Tenant");
                    String status = getTagValue(record, "Status");
                    Object valueObj = record.getValue();

                    if (flowName == null || rawTenant == null || status == null || valueObj == null) continue;

                    String anonTenant = tenantAnonymiser.anonymise(rawTenant);
                    String key = flowName + "|" + anonTenant;
                    FlowMetric metric = metricMap.computeIfAbsent(key, k -> new FlowMetric(flowName, anonTenant));

                    long count = ((Number) valueObj).longValue();
                    metric.getStatusCounts().merge(status.toLowerCase(), count, Long::sum);
                }
            }

            List<FluxTable> latencyTables = queryApi.query(latencyQuery);
            for (FluxTable table : latencyTables) {
                for (FluxRecord record : table.getRecords()) {
                    String flowName = getTagValue(record, "IntegrationFlowName");
                    String rawTenant = getTagValue(record, "Tenant");
                    Object valueObj = record.getValue();

                    if (flowName == null || rawTenant == null || valueObj == null) continue;

                    String anonTenant = tenantAnonymiser.anonymise(rawTenant);
                    String key = flowName + "|" + anonTenant;
                    FlowMetric metric = metricMap.get(key);
                    if (metric != null) {
                        metric.setAvgLatencyMs(((Number) valueObj).doubleValue());
                    }
                }
            }

        } catch (Exception e) {
            log.error("Failed to query InfluxDB: {}", e.getMessage(), e);
            throw new RuntimeException("InfluxDB query failed: " + e.getMessage(), e);
        }

        List<FlowMetric> metrics = new ArrayList<>(metricMap.values());
        metrics.forEach(FlowMetric::computeErrorRate);
        log.info("Queried {} flow metrics from InfluxDB for window [{}, {}]", metrics.size(), from, to);
        return metrics;
    }

    private String getTagValue(FluxRecord record, String tagKey) {
        Object val = record.getValueByKey(tagKey);
        return val != null ? val.toString() : null;
    }
}
