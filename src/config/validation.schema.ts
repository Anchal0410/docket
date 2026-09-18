import * as Joi from "joi";

export const validationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid("development", "test", "production")
        .required(),
    PORT: Joi.number().default(3000),
    SWAGGER_ENABLED: Joi.boolean().default(false),
    DATABASE_URL: Joi.string().uri().required(),

    QUEUE_LEASE_SECONDS: Joi.number().min(1).default(30),
    QUEUE_CLAIM_MAX_BATCH: Joi.number().min(1).max(100).default(10),
    QUEUE_BACKOFF_BASE_SECONDS: Joi.number().min(1).default(2),
    QUEUE_BACKOFF_MAX_SECONDS: Joi.number().min(1).default(3600),
    QUEUE_DEAD_WORKER_THRESHOLD_SECONDS: Joi.number().min(1).default(15),
    QUEUE_RECOVERY_INTERVAL_MS: Joi.number().min(500).default(5000),
    QUEUE_PROMOTION_INTERVAL_MS: Joi.number().min(200).default(1000),
});
