package com.integrationiq;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class IntegrationIQApplication {

    public static void main(String[] args) {
        SpringApplication.run(IntegrationIQApplication.class, args);
    }
}
