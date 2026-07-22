package com.z7design.secured_guard.dto;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class ErrorResponse extends com.z7design.secured_guard.exception.ErrorResponse {
}