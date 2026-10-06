package com.ssdcve.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final RateLimitFilter rateLimitFilter;
    private final boolean swaggerEnabled;

    public SecurityConfig(
            JwtFilter jwtFilter,
            RateLimitFilter rateLimitFilter,
            @Value("${ssdcve.swagger.enabled:true}")
            boolean swaggerEnabled) {

        this.jwtFilter = jwtFilter;
        this.rateLimitFilter = rateLimitFilter;
        this.swaggerEnabled = swaggerEnabled;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http)
            throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )
                .headers(headers -> headers
                        .httpStrictTransportSecurity(hsts ->
                                hsts.includeSubDomains(true)
                                        .preload(true)
                        )
                        .referrerPolicy(referrer ->
                                referrer.policy(
                                        ReferrerPolicyHeaderWriter
                                                .ReferrerPolicy
                                                .NO_REFERRER
                                )
                        )
                        .contentSecurityPolicy(csp ->
                                csp.policyDirectives(
                                        "default-src 'self'"
                                )
                        )
                )
                .authorizeHttpRequests(auth -> {

                    if (swaggerEnabled) {

                        auth.requestMatchers(
                                "/v3/api-docs",
                                "/v3/api-docs/**",
                                "/v3/api-docs.yaml",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll();
                    }

                    auth.requestMatchers("/api/auth/**")
                            .permitAll()
                            .requestMatchers("/error")
                            .permitAll()
                            .requestMatchers(
                                    HttpMethod.POST,
                                    "/api/verifier/verify",
                                    "/api/verifier/verify/batch",
                                    "/api/verifier/verify/batch/csv"
                            )
                            .permitAll()
                            .requestMatchers(
                                    HttpMethod.GET,
                                    "/api/verifier/anchor/**",
                                    "/api/verifier/verify/**"
                            )
                            .permitAll()
                            .requestMatchers("/api/issuer/**")
                            .hasAnyRole("ISSUER", "ADMIN")
                            .requestMatchers("/api/holder/**")
                            .hasAnyRole("HOLDER", "ADMIN")
                            .requestMatchers(
                                    HttpMethod.GET,
                                    "/api/verifier/history"
                            )
                            .authenticated()
                            .requestMatchers("/api/admin/**")
                            .hasRole("ADMIN")
                            .anyRequest()
                            .authenticated();
                })
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(
                                (request, response, authException) -> {
                                    response.setStatus(401);
                                    response.setContentType(
                                            "application/json"
                                    );
                                    response.getWriter().write(
                                            "{\"error\":\"Unauthorized\"}"
                                    );
                                }
                        )
                        .accessDeniedHandler(
                                (request, response, accessDeniedException) -> {
                                    response.setStatus(403);
                                    response.setContentType(
                                            "application/json"
                                    );
                                    response.getWriter().write(
                                            "{\"error\":\"Forbidden\"}"
                                    );
                                }
                        )
                )
                .addFilterBefore(
                        rateLimitFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .addFilterBefore(
                        jwtFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}