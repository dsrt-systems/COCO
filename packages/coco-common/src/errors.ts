/**
 * COCO's standard error hierarchy.
 * Every error carries: category, code, retryable flag, and optional root cause.
 */

export type ErrorCategory =
  | 'unknown'
  | 'logic'
  | 'dependency'
  | 'config'
  | 'environment'
  | 'integration'
  | 'requirement'
  | 'security'
  | 'performance'
  | 'network'
  | 'permission';

export type ErrorSeverity = 'info' | 'warn' | 'error' | 'critical' | 'fatal';

export interface CocoErrorInit {
  category: ErrorCategory;
  code: string;
  message: string;
  severity?: ErrorSeverity;
  retryable?: boolean;
  retryAfterMs?: number;
  rootCause?: string;
  suggestedRepair?: string;
  cause?: unknown;
  data?: Record<string, unknown>;
}

export class CocoError extends Error {
  public readonly category: ErrorCategory;
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly retryable: boolean;
  public readonly retryAfterMs?: number;
  public readonly rootCause?: string;
  public readonly suggestedRepair?: string;
  public readonly data?: Record<string, unknown>;
  public readonly occurredAt: string;

  constructor(init: CocoErrorInit) {
    super(init.message, init.cause ? { cause: init.cause } : undefined);
    this.name = 'CocoError';
    this.category = init.category;
    this.code = init.code;
    this.severity = init.severity ?? 'error';
    this.retryable = init.retryable ?? false;
    this.retryAfterMs = init.retryAfterMs;
    this.rootCause = init.rootCause;
    this.suggestedRepair = init.suggestedRepair;
    this.data = init.data;
    this.occurredAt = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      category: this.category,
      code: this.code,
      severity: this.severity,
      message: this.message,
      retryable: this.retryable,
      retryAfterMs: this.retryAfterMs,
      rootCause: this.rootCause,
      suggestedRepair: this.suggestedRepair,
      data: this.data,
      occurredAt: this.occurredAt,
    };
  }
}

// Specialized error subclasses for common categories

export class ConfigError extends CocoError {
  constructor(code: string, message: string, data?: Record<string, unknown>) {
    super({ category: 'config', code, message, data });
    this.name = 'ConfigError';
  }
}

export class PermissionError extends CocoError {
  constructor(code: string, message: string, data?: Record<string, unknown>) {
    super({ category: 'permission', code, message, data });
    this.name = 'PermissionError';
  }
}

export class SecurityError extends CocoError {
  constructor(code: string, message: string, data?: Record<string, unknown>) {
    super({ category: 'security', code, message, severity: 'critical', data });
    this.name = 'SecurityError';
  }
}

export class NetworkError extends CocoError {
  constructor(code: string, message: string, retryAfterMs?: number) {
    super({ category: 'network', code, message, retryable: true, retryAfterMs });
    this.name = 'NetworkError';
  }
}

export class RequirementError extends CocoError {
  constructor(code: string, message: string, data?: Record<string, unknown>) {
    super({ category: 'requirement', code, message, data });
    this.name = 'RequirementError';
  }
}
