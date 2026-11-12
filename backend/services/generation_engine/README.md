# Generation Engine - Module 4

The Generation Engine is a robust, plugin-based media generation pipeline for GoVisual AI. It transforms intelligence data into final assets (images, videos, etc.) while handling external providers, validation, composition, and storage in a decoupled, format-agnostic way.

## Architecture

The pipeline uses an orchestrator to iterate over generic `PipelineStage` objects. All state is maintained in a central `GenerationContext`.

```mermaid
graph TD
    A[API /dispatch] --> B[GenerationContext]
    B --> C[Pipeline Orchestrator]
    C --> D[Cache Stage]
    C --> E[Media Generation Stage]
    C --> F[Background Removal Stage]
    C --> G[Composition Stage]
    C --> H[Validation Stage]
    C --> I[Export Stage]
    C --> J[Finalization Stage (DB)]
```

## API Reference

All routes are mounted at `/api/v1/generation`.

- `POST /dispatch`: Initiates a generation job. Idempotent. Returns `job_id` and `generation_id`.
- `GET /jobs/{job_id}`: Returns progress and status of an ongoing generation.
- `GET /manifests/{generation_id}`: Returns the complete `AssetManifest`.
- `GET /assets/{generation_id}`: Returns standard URLs for finalized assets.
- `GET /events/{generation_id}`: Returns all emitted `LifecycleEvents`.
- `GET /providers`: Lists available generation providers and their capabilities.
- `GET /health`: Detailed system health report.

### Standard Error Format
All endpoints return standard JSON error schemas when failing:
```json
{
  "success": false,
  "error": {
      "code": "ProviderUnavailableError",
      "message": "The selected provider timed out.",
      "details": {}
  },
  "request_id": "req_xyz",
  "timestamp": "2026-07-17T00:00:00Z"
}
```

## Extension Guide

### Adding a New Provider
Create a class inheriting from `BaseGenerationProvider` in `providers/`.
Implement the `generate(context)` and `get_capabilities()` methods.
Register it in `ProviderFactory`.

### Adding a New Stage
Create a class inheriting from `PipelineStage` in `stages/`.
Implement the `execute(context)` method.
Inject the new stage into the `PipelineOrchestrator` chain.

## Storage Guide
The `StorageProvider` interface requires implementing 7 methods:
`upload`, `download`, `delete`, `exists`, `generate_public_url`, `generate_signed_url`, and `list_assets`.
Currently, `LocalStorageProvider` is used, but a `CloudinaryProvider` or `S3Provider` can be seamlessly swapped in without modifying any stages.

## Event Guide
The pipeline emits events from the `LifecycleEvent` enum (e.g., `GenerationStarted`, `ProviderCompleted`).
You can subscribe to these via `event_publisher.subscribe()` for external integrations, analytics, or real-time WebSockets.
