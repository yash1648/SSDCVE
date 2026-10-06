package com.ssdcve.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory fixed-window rate limiter for public endpoints.
 * Single-instance, per-IP; bypasses localhost/loopback.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private record Limit(int maxRequests, long windowMillis) {}

    private static final Map<String, Limit> LIMITS = Map.of(
            "/api/auth/login", new Limit(10, 15 * 60_000L),
            "/api/auth/register", new Limit(10, 15 * 60_000L),
            "/api/auth/refresh", new Limit(30, 15 * 60_000L),
            "/api/verifier/verify", new Limit(60, 15 * 60_000L),
            "/api/verifier/verify/batch", new Limit(30, 15 * 60_000L)
    );

    private record Bucket(long windowStart, int count) {}

    private final Map<String, Bucket> buckets =
            new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        Limit limit = LIMITS.get(request.getRequestURI());

        if (limit == null
                || !"POST".equalsIgnoreCase(request.getMethod())
                || "127.0.0.1".equals(request.getRemoteAddr())
                || "0:0:0:0:0:0:0:1".equals(request.getRemoteAddr())
                || "::1".equals(request.getRemoteAddr())) {
            filterChain.doFilter(request, response);
            return;
        }

        String key =
                request.getRemoteAddr()
                        + "|"
                        + request.getRequestURI();

        long now = System.currentTimeMillis();

        Bucket bucket = buckets.compute(key, (k, existing) -> {

            if (existing == null
                    || now - existing.windowStart()
                    >= limit.windowMillis()) {

                return new Bucket(now, 1);
            }

            return new Bucket(
                    existing.windowStart(),
                    existing.count() + 1
            );
        });

        if (bucket.count() > limit.maxRequests()) {

            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Too many requests\"}"
            );
            return;
        }

        if (buckets.size() > 10_000) {

            buckets.entrySet().removeIf(
                    e -> now - e.getValue().windowStart()
                            >= limit.windowMillis()
            );
        }

        filterChain.doFilter(request, response);
    }
}
