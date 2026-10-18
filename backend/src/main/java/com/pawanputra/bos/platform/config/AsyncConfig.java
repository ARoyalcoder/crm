package com.pawanputra.bos.platform.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enables Spring's {@code @Async} support for background processing such as
 * workflow rule evaluation. Tasks run on the default {@code SimpleAsyncTaskExecutor}
 * unless a custom {@code TaskExecutor} bean is defined.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
