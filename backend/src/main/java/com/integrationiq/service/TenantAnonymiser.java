package com.integrationiq.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Tenant name handling — controlled by the tenant.anonymise property.
 * When true  (default): replaces tenant names with tenant-{hashCode}.
 * When false           : passes the real tenant name through unchanged.
 * Set TENANT_ANONYMISE=false in the environment to disable masking.
 */
@Component
public class TenantAnonymiser {

    @Value("${tenant.anonymise:true}")
    private boolean anonymise;

    public String anonymise(String rawTenant) {
        if (rawTenant == null || rawTenant.isBlank()) {
            return anonymise ? "tenant-unknown" : "unknown";
        }
        if (!anonymise) {
            return rawTenant;
        }
        return "tenant-" + Math.abs(rawTenant.hashCode());
    }
}
