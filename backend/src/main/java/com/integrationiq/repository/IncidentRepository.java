package com.integrationiq.repository;

import com.integrationiq.model.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {

    List<Incident> findAllByOrderByCreatedAtDesc();

    List<Incident> findTop50ByOrderByCreatedAtDesc();

    List<Incident> findBySeverityOrderByCreatedAtDesc(String severity);
}
