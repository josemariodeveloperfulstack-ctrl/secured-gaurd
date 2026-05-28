package com.z7design.secured_guard.dto.sendgrid;

import java.util.List;

public record RejectedCheckResponse(List<String> rejected) {
}
