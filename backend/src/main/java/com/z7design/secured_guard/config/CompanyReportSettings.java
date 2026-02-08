package com.z7design.secured_guard.config;

import lombok.Data;

@Data
public class CompanyReportSettings {
    private String defaultFormat = "html";
    private String logoPath = "static/images/company-logo.png";
    private String templatePath = "templates/reports/";
    private String outputPath = "reports/output/";
}
