package com.pawanputra.bos.platform.security;

import java.text.Normalizer;
import java.util.regex.Pattern;

/**
 * Centralized security sanitization and validation utilities for defence-in-depth against
 * SQL Injection, Cross-Site Scripting (XSS), Path Traversal, and Protocol Injection.
 */
public final class InputSanitizer {

    private static final Pattern SAFE_SQL_IDENTIFIER = Pattern.compile("^[a-zA-Z_][a-zA-Z0-9_]{0,63}$");
    private static final Pattern SAFE_RELATIVE_PATH = Pattern.compile("^/[a-zA-Z0-9\\-_/?=&%#@:.]*$");
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]*>");
    private static final Pattern DANGEROUS_PROTOCOLS = Pattern.compile("(?i)(javascript:|data:|vbscript:|file:|about:)");
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\p{Cntrl}&&[^\r\n\t]]");

    private InputSanitizer() {
    }

    /**
     * Normalizes text using Unicode NFKC form, strips ASCII control characters, and trims whitespace.
     * Prevents Unicode normalization bypasses and control character injection.
     */
    public static String normalizeText(String input) {
        if (input == null) {
            return "";
        }
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFKC);
        return CONTROL_CHARS.matcher(normalized).replaceAll("").trim();
    }

    /**
     * Strips HTML/XML tags and dangerous pseudo-protocols to defend against Cross-Site Scripting (XSS).
     */
    public static String stripHtml(String input) {
        if (input == null) {
            return "";
        }
        String cleaned = HTML_TAG_PATTERN.matcher(input).replaceAll("");
        cleaned = DANGEROUS_PROTOCOLS.matcher(cleaned).replaceAll("");
        return cleaned.trim();
    }

    /**
     * Escapes critical HTML characters to their corresponding entity equivalents.
     */
    public static String escapeHtml(String input) {
        if (input == null) {
            return "";
        }
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }

    /**
     * Validates that an identifier (table name, column name, sort order) matches strict SQL identifier rules.
     * Prevents SQL injection through dynamic identifiers.
     */
    public static boolean isValidSqlIdentifier(String identifier) {
        return identifier != null && SAFE_SQL_IDENTIFIER.matcher(identifier).matches();
    }

    /**
     * Sanitizes and validates that a path is strictly an internal, relative application URL.
     * Prevents Open Redirect, Protocol Injection (e.g. javascript:), and Path Traversal (e.g. ../).
     *
     * @param path the URL or path to validate
     * @return the safe path if valid, or null if dangerous/invalid
     */
    public static String sanitizeInternalPath(String path) {
        if (path == null) {
            return null;
        }
        String trimmed = path.trim();
        // Must start with a single '/' and not '//' (protocol-relative), and match safe characters
        if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.contains("\\") && !trimmed.contains("..")) {
            if (SAFE_RELATIVE_PATH.matcher(trimmed).matches()) {
                return trimmed;
            }
        }
        return null;
    }
}
