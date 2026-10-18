# syntax=docker/dockerfile:1

# ---- Build: compile and package with JDK 21 ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Resolve dependencies first so this layer is cached until pom.xml changes.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
# Tests run in CI (skip tests in Docker container build)
RUN ./mvnw -B -q package -DskipTests

# ---- Runtime: JRE only, non-root ----
FROM eclipse-temurin:21-jre AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/* \
 && groupadd --system bos && useradd --system --gid bos --home-dir /app bos
WORKDIR /app

# Copy the packaged Spring Boot executable jar
COPY --from=build --chown=bos:bos /workspace/target/business-os.jar /app/business-os.jar

USER bos
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=50.0 -XX:+UseSerialGC -Xss512k -XX:MaxMetaspaceSize=256m -XX:TieredStopAtLevel=1 -Dspring.jmx.enabled=false -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["java", "-jar", "/app/business-os.jar"]
