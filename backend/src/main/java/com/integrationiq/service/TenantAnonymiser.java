package com.integrationiq.service;

import org.springframework.stereotype.Component;

/**
 * Stable, one-way anonymisation of tenant names.
 * Pattern: tenant-{abs(hashCode)} — deterministic so the same tenant
 * always maps to the same token across runs.
 */
@Component
public class TenantAnonymiser {

    public String anonymise(String rawTenant) {
        if (rawTenant == null || rawTenant.isBlank()) {
            return "tenant-unknown";
        }
        int hash = rawTenant.hashCode();
        return "tenant-" + Math.abs(hash);
    }
}
